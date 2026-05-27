import * as vscode from "vscode";
import type {
  ModuleNotDeclaredPayload,
  ModuleNotFoundPayload,
  MissingImportPayload,
  UnknownMemberPayload,
  UnsupportedMemberPayload,
  UnusedImportPayload,
} from "../diagnostics/diagnostic-codes";
import { DiagnosticCodes } from "../diagnostics/diagnostic-codes";
import { WorkspaceSymbolIndexer } from "../analysis/symbol-indexer";
import { TypeResolver } from "../analysis/type-resolver";
import { detectEnumerable } from "../analysis/enumerable-detector";
import { SugarTranspiler } from "../project/transpiler";

/**
 * Provides Quick Fixes (lightbulb actions) for every canonical diagnostic
 * emitted by the linter.
 *
 *  - `missing-import`        → "Importar \"X\""
 *  - `unused-import`         → "Remover Imports \"X\""
 *  - `duplicate-import`      → "Remover linha duplicada"
 *  - `module-not-declared`   → "Instalar e declarar módulo \"X\""
 *  - `module-not-found`      → "Instalar módulo \"X\"…"
 *  - `unknown-member`        → "Você quis dizer \"Y\"?" (Levenshtein, até 3)
 *  - `unsupported-member`    → "Comentar esta linha" + "Suprimir warning aqui"
 *
 * Also exposes bulk Source actions (Ctrl+Shift+P → "Source Action…"):
 *  - `source.organizeImports` — sort `Imports` block alphabetically + dedupe.
 *  - `source.fixAll.data7`    — apply every available QuickFix
 *                                (add missing imports + remove unused/duplicate).
 */
export class D7BasicCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.RefactorRewrite,
    vscode.CodeActionKind.SourceOrganizeImports,
    vscode.CodeActionKind.SourceFixAll.append("data7"),
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    if (token.isCancellationRequested) return undefined;

    const actions: vscode.CodeAction[] = [];

    // Per-diagnostic QuickFixes.
    for (const diagnostic of context.diagnostics) {
      switch (diagnostic.code) {
        case DiagnosticCodes.MissingImport:
          this.addMissingImportFix(actions, document, diagnostic);
          break;
        case DiagnosticCodes.UnusedImport:
        case DiagnosticCodes.DuplicateImport:
          this.addRemoveImportFix(actions, document, diagnostic);
          break;
        case DiagnosticCodes.ModuleNotDeclared:
          this.addDeclareDependencyFix(actions, document, diagnostic);
          break;
        case DiagnosticCodes.ModuleNotFound:
          this.addInstallModuleFix(actions, diagnostic);
          break;
        case DiagnosticCodes.UnknownMember:
          this.addDidYouMeanFixes(actions, document, diagnostic);
          break;
        case DiagnosticCodes.UnsupportedMember:
          this.addUnsupportedMemberFixes(actions, document, diagnostic);
          break;
        default:
          break;
      }
    }

    // Cursor-driven refactor rewrites for the `For Each` sugar.
    this.addConvertForEachToClassicAction(actions, document, range);
    this.addConvertClassicForToForEachAction(actions, document, range);

    // Source actions (always available; VS Code filters by `only` when relevant).
    this.addOrganizeImportsAction(actions, document);
    this.addFixAllAction(actions, document, context.diagnostics);

    return actions;
  }

  // -------------------------------------------------------------------------
  // RefactorRewrite — For Each sugar ↔ classic For round-trip
  // -------------------------------------------------------------------------

  /**
   * `Converter For Each em For clássico`: replaces the sugar header at the
   * cursor with the same expansion the Builder would emit (`For <idx> = 0 To
   * <src>.Count - 1` + a synthetic `Dim <var> As <Type> = <src>.<Indexer>(<idx>)`).
   *
   * The action is only offered when the operand resolves to an enumerable
   * (Count + integer-indexer pair). Reuses {@link SugarTranspiler.transpile}
   * on the single-line range so the expansion stays in lockstep with the
   * build-time output — drift between Code Action and Builder is impossible.
   */
  private addConvertForEachToClassicAction(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
  ): void {
    const line = range.start.line;
    const lineText = document.lineAt(line).text;
    const match = /^(\s*)For\s+Each\s+(\w+)(?:\s+As\s+([\w.]+))?\s+In\s+([A-Za-z_]\w*)\b/i.exec(
      lineText,
    );
    if (!match) return;

    // Use the SugarTranspiler on a 1-line slice to guarantee the expansion is
    // byte-identical to what the Builder would produce.
    const indexer = WorkspaceSymbolIndexer.getInstance();
    const ctx = {
      detectEnumerable: (typeName: string, preferredElementType?: string) =>
        detectEnumerable(
          typeName,
          (t) => TypeResolver.getAllMembersForType(t, indexer),
          preferredElementType,
        ),
    };
    // The transpiler infers the operand type by walking previous lines, so
    // we pass the document text from (0, 0) up to and including the For Each
    // line. Slicing to `(line, lineText.length)` keeps the input deterministic
    // and avoids feeding the transpiler unrelated content past the cursor.
    const sliceText = document.getText(new vscode.Range(0, 0, line, lineText.length));
    const sliceLineCount = sliceText.split(/\r?\n/).length;
    const { code: transpiled, diagnostics } = SugarTranspiler.transpile(sliceText, ctx);
    if (diagnostics.length > 0) return; // operand wasn't enumerable — no action

    const transpiledLines = transpiled.split(/\r?\n/);
    // The transpiler injects exactly 2 lines per For Each (Dim + For), or 3
    // when a `__src` temp is needed. If nothing was expanded, bail out.
    if (transpiledLines.length <= sliceLineCount) return;
    const expansionLines = transpiledLines.slice(line);
    const replacement = expansionLines.join(document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n");

    const action = new vscode.CodeAction(
      "Converter For Each em For clássico",
      vscode.CodeActionKind.RefactorRewrite,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(line, 0, line, lineText.length), replacement);
    action.edit = edit;
    actions.push(action);
  }

  /**
   * `Converter For clássico em For Each`: detects the canonical
   * `For <idx> = 0 To <operand>.Count - 1` followed immediately by
   * `Dim <var> As <Type> = <operand>.<Indexer>(<idx>)` and collapses both
   * lines into a single `For Each <var> As <Type> In <operand>`.
   *
   * The action is conservative: it only triggers when the next non-blank
   * line matches the exact "Dim element = operand.indexer(idx)" idiom. This
   * keeps the action's behaviour predictable and avoids guessing the loop
   * variable name when the user has structured their body differently.
   */
  private addConvertClassicForToForEachAction(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
  ): void {
    const line = range.start.line;
    const lineText = document.lineAt(line).text;
    const forMatch =
      /^(\s*)For\s+(\w+)\s*=\s*0\s+To\s+([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*-\s*1\b/i.exec(lineText);
    if (!forMatch) return;
    const leadingIndent = forMatch[1] ?? "";
    const idxVar = forMatch[2];
    const operandName = forMatch[3];
    const countMember = forMatch[4];
    if (!idxVar || !operandName || !countMember) return;
    if (countMember.toLowerCase() !== "count") return;

    // Look at the next non-blank line for the synthetic Dim binding.
    let nextLine = line + 1;
    while (nextLine < document.lineCount && document.lineAt(nextLine).text.trim() === "") {
      nextLine++;
    }
    if (nextLine >= document.lineCount) return;
    const nextLineText = document.lineAt(nextLine).text;
    const dimMatch = new RegExp(
      `^\\s*Dim\\s+(\\w+)\\s+As\\s+([\\w.]+)\\s*=\\s*${operandName}\\.([A-Za-z_]\\w*)\\s*\\(\\s*${idxVar}\\s*\\)\\s*$`,
      "i",
    ).exec(nextLineText);
    if (!dimMatch) return;
    const elementVar = dimMatch[1];
    const elementType = dimMatch[2];
    const indexerMember = dimMatch[3];
    if (!elementVar || !elementType || !indexerMember) return;

    // Validate that operandName actually exposes the (Count, indexer) pair.
    const indexer = WorkspaceSymbolIndexer.getInstance();
    const operandType = TypeResolver.getVariableType(
      operandName,
      document,
      new vscode.Position(Math.max(0, line - 1), 0),
      indexer,
    );
    if (!operandType) return;
    const enumerable = detectEnumerable(
      operandType,
      (t) => TypeResolver.getAllMembersForType(t, indexer),
      elementType,
    );
    if (!enumerable) return;
    if (enumerable.indexerMember.toLowerCase() !== indexerMember.toLowerCase()) return;

    const replacement = `${leadingIndent}For Each ${elementVar} As ${elementType} In ${operandName}`;
    const action = new vscode.CodeAction(
      `Converter For em For Each (${operandType})`,
      vscode.CodeActionKind.RefactorRewrite,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(line, 0, nextLine, nextLineText.length),
      replacement,
    );
    action.edit = edit;
    actions.push(action);
  }

  // -------------------------------------------------------------------------
  // Source actions
  // -------------------------------------------------------------------------

  /**
   * `source.organizeImports` — re-emit the `Imports` block alphabetically and
   * without duplicates, preserving the first occurrence of any blank lines.
   */
  private addOrganizeImportsAction(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
  ): void {
    // Collect contiguous `Imports` lines at the top of the file.
    interface Hit {
      line: number;
      name: string;
      raw: string;
    }
    const hits: Hit[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      const text = document.lineAt(i).text;
      const trimmed = text.trim();
      if (trimmed === "") {
        // Allow blank lines inside the imports block — we'll discard them.
        if (hits.length === 0) continue;
        if (hits.length > 0) continue;
      }
      const m = /^\s*Imports\s+([A-Za-z_][\w.]*)\s*$/i.exec(text);
      const importName = m?.[1];
      if (!importName) {
        if (hits.length === 0) continue;
        break; // first non-imports, non-blank line stops the block
      }
      hits.push({ line: i, name: importName, raw: text });
    }
    if (hits.length < 2) return;

    const unique = new Map<string, string>();
    for (const h of hits) {
      const key = h.name.toLowerCase();
      if (!unique.has(key)) unique.set(key, h.name);
    }
    const sorted = Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
    const rewritten = sorted.map((n) => `Imports ${n}`).join("\r\n") + "\r\n";

    // `hits.length >= 2` was just asserted; the `?? hits[0]` guards
    // `noUncheckedIndexedAccess` without changing semantics.
    const firstHit = hits[0];
    const lastHit = hits[hits.length - 1] ?? firstHit;
    if (!firstHit || !lastHit) return;
    const range = new vscode.Range(firstHit.line, 0, lastHit.line + 1, 0);

    const action = new vscode.CodeAction(
      "Source: Organizar Imports",
      vscode.CodeActionKind.SourceOrganizeImports,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, rewritten);
    action.edit = edit;
    actions.push(action);
  }

  /**
   * `source.fixAll.data7` — applies every QuickFix that has an `.edit` (missing-import,
   * unused-import, duplicate-import, did-you-mean) in a single atomic
   * `WorkspaceEdit`. Skips command-only actions (install module dispatchers).
   */
  private addFixAllAction(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    diagnostics: readonly vscode.Diagnostic[],
  ): void {
    if (diagnostics.length === 0) return;
    const collected: vscode.CodeAction[] = [];

    for (const d of diagnostics) {
      switch (d.code) {
        case DiagnosticCodes.MissingImport:
          this.addMissingImportFix(collected, document, d);
          break;
        case DiagnosticCodes.UnusedImport:
        case DiagnosticCodes.DuplicateImport:
          this.addRemoveImportFix(collected, document, d);
          break;
        default:
          break;
      }
    }
    if (collected.length === 0) return;

    const merged = new vscode.WorkspaceEdit();
    let count = 0;
    for (const a of collected) {
      if (!a.edit) continue;
      for (const e of (
        a.edit as unknown as {
          edits: {
            type: string;
            uri: vscode.Uri;
            position?: vscode.Position;
            range?: vscode.Range;
            text?: string;
          }[];
        }
      ).edits) {
        if (e.type === "insert" && e.position && e.text !== undefined) {
          merged.insert(e.uri, e.position, e.text);
        } else if (e.type === "replace" && e.range && e.text !== undefined) {
          merged.replace(e.uri, e.range, e.text);
        } else if (e.type === "delete" && e.range) {
          merged.delete(e.uri, e.range);
        }
        count++;
      }
    }
    if (count === 0) return;

    const action = new vscode.CodeAction(
      `Source: Corrigir todos (${count} edição${count === 1 ? "" : "ões"})`,
      vscode.CodeActionKind.SourceFixAll.append("data7"),
    );
    action.edit = merged;
    actions.push(action);
  }

  // -------------------------------------------------------------------------
  // Per-code fix builders
  // -------------------------------------------------------------------------

  private addMissingImportFix(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): void {
    const payload = readPayload<MissingImportPayload>(diagnostic, DiagnosticCodes.MissingImport);
    const namespaceToImport = payload?.namespace ?? extractNamespaceFromMessage(diagnostic.message);
    if (!namespaceToImport) return;

    const action = new vscode.CodeAction(
      `Importar "${namespaceToImport}"`,
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const edit = new vscode.WorkspaceEdit();
    const insertLine = findImportInsertLine(document);
    edit.insert(
      document.uri,
      new vscode.Position(insertLine, 0),
      `Imports ${namespaceToImport}\r\n`,
    );
    action.edit = edit;
    actions.push(action);
  }

  private addRemoveImportFix(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): void {
    const payload = readPayload<UnusedImportPayload>(diagnostic, DiagnosticCodes.UnusedImport);
    const namespaceToRemove = payload?.namespace;
    const label = namespaceToRemove
      ? `Remover Imports "${namespaceToRemove}"`
      : "Remover esta linha";

    const action = new vscode.CodeAction(label, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const edit = new vscode.WorkspaceEdit();
    const line = diagnostic.range.start.line;
    // Delete the whole line including the trailing newline so we don't leave a blank.
    const start = new vscode.Position(line, 0);
    const end =
      line + 1 < document.lineCount
        ? new vscode.Position(line + 1, 0)
        : document.lineAt(line).range.end;
    edit.delete(document.uri, new vscode.Range(start, end));
    action.edit = edit;
    actions.push(action);
  }

  private addDeclareDependencyFix(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): void {
    const payload = readPayload<ModuleNotDeclaredPayload>(
      diagnostic,
      DiagnosticCodes.ModuleNotDeclared,
    );
    if (!payload) return;

    const action = new vscode.CodeAction(
      `Instalar e declarar módulo "${payload.moduleName}"`,
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.command = {
      title: action.title,
      command: "data7.installModule",
      arguments: [payload.moduleName, document.uri],
    };
    actions.push(action);
  }

  private addInstallModuleFix(actions: vscode.CodeAction[], diagnostic: vscode.Diagnostic): void {
    const payload = readPayload<ModuleNotFoundPayload>(diagnostic, DiagnosticCodes.ModuleNotFound);
    if (!payload) return;

    const action = new vscode.CodeAction(
      `Instalar módulo "${payload.moduleName}" do repositório…`,
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diagnostic];
    action.command = {
      title: action.title,
      command: "data7.installModule",
      arguments: [payload.moduleName],
    };
    actions.push(action);
  }

  private addDidYouMeanFixes(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): void {
    const payload = readPayload<UnknownMemberPayload>(diagnostic, DiagnosticCodes.UnknownMember);
    if (!payload || payload.suggestions.length === 0) return;

    payload.suggestions.forEach((suggestion, idx) => {
      const action = new vscode.CodeAction(
        `Você quis dizer "${suggestion}"?`,
        vscode.CodeActionKind.QuickFix,
      );
      action.diagnostics = [diagnostic];
      if (idx === 0) action.isPreferred = true;
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, diagnostic.range, suggestion);
      action.edit = edit;
      actions.push(action);
    });
  }

  /**
   * Offers two Quick Fixes when the linter flags an `unsupported-member`:
   *
   *  1. **Comentar esta linha** — prefixa a linha com `'` para que o compilador
   *     ignore o trecho e o autor possa revisitar depois.
   *  2. **Suprimir warning aqui** — insere `' data7:disable-line unsupported-member`
   *     ao final da mesma linha. Útil quando o uso é intencional (legado) e a
   *     equipe assumiu o risco.
   */
  private addUnsupportedMemberFixes(
    actions: vscode.CodeAction[],
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): void {
    const payload = readPayload<UnsupportedMemberPayload>(
      diagnostic,
      DiagnosticCodes.UnsupportedMember,
    );
    const memberLabel = payload ? ` "${payload.member}"` : "";

    const line = diagnostic.range.start.line;
    const lineText = document.lineAt(line).text;

    // 1. Comentar a linha (prefixa com `' `).
    const commentAction = new vscode.CodeAction(
      `Comentar linha (membro não suportado${memberLabel})`,
      vscode.CodeActionKind.QuickFix,
    );
    commentAction.diagnostics = [diagnostic];
    commentAction.isPreferred = true;
    {
      const indentMatch = /^(\s*)/.exec(lineText);
      const indent = indentMatch?.[1] ?? "";
      const rest = lineText.slice(indent.length);
      const edit = new vscode.WorkspaceEdit();
      const range = new vscode.Range(line, 0, line, lineText.length);
      edit.replace(document.uri, range, `${indent}' ${rest}`);
      commentAction.edit = edit;
    }
    actions.push(commentAction);

    // 2. Inserir supressão `' data7:disable-line unsupported-member` no fim.
    const suppressAction = new vscode.CodeAction(
      `Suprimir warning unsupported-member nesta linha`,
      vscode.CodeActionKind.QuickFix,
    );
    suppressAction.diagnostics = [diagnostic];
    {
      const insertPos = new vscode.Position(line, lineText.length);
      const trailing = lineText.endsWith(" ") ? "" : " ";
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, insertPos, `${trailing}' data7:disable-line unsupported-member`);
      suppressAction.edit = edit;
    }
    actions.push(suppressAction);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The type parameter T exists for the consumer's benefit (it picks the
// payload type for the matching diagnostic code). The function body deals
// only with the `code` discriminator, so T legitimately appears just once
// here in the signature.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function readPayload<T extends { code: string }>(
  diagnostic: vscode.Diagnostic,
  expectedCode: string,
): T | undefined {
  const data: unknown = (diagnostic as vscode.Diagnostic & { data?: unknown }).data;
  if (data && typeof data === "object" && (data as { code?: unknown }).code === expectedCode) {
    return data as T;
  }
  return undefined;
}

function extractNamespaceFromMessage(message: string): string | undefined {
  const all = Array.from(message.matchAll(/"([a-zA-Z0-9_.]+)"/g));
  if (all.length >= 2) return all[1]?.[1];
  return all[0]?.[1];
}

function findImportInsertLine(document: vscode.TextDocument): number {
  let insertLine = 0;
  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text.trim();
    if (lineText.toLowerCase().startsWith("imports ")) {
      insertLine = i + 1;
    }
  }
  return insertLine;
}
