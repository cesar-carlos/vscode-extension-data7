import type * as vscode from "vscode";
import type { SymbolInfo, WorkspaceSymbolIndexer } from "./symbol-indexer";
import {
  SYSTEM_SYMBOLS,
  lookupSystemByContainer,
  lookupSystemClassByName,
} from "../system-library";

/**
 * Shared scope and type resolution helpers used by every provider and by the
 * linter. Lives in its own module so providers do not import each other
 * (see governance.mdc).
 */
export class TypeResolver {
  /**
   * Resolves the static type of a local variable, parameter, field or
   * namespace-level variable by walking the current method/class/namespace
   * context in the active document.
   *
   * Falls back to `undefined` when the type cannot be determined.
   */
  public static getVariableType(
    varName: string,
    document: vscode.TextDocument,
    position: vscode.Position,
    indexer: WorkspaceSymbolIndexer,
  ): string | undefined {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const varLower = varName.toLowerCase();

    // Walk upward from the cursor to find a `Dim name As Type` declaration in scope.
    const regex = new RegExp(
      `\\b(?:Dim|Private|Public|Protected|Shared)?\\s+${varName}\\b(?:\\s+As\\s+(?:New\\s+)?([a-zA-Z0-9_.]+))?`,
      "i",
    );
    // `For Each <name> As <Type> In ...` introduces `<name>` into the enclosing
    // scope. The sugar transpiler later expands it into a synthetic `Dim`, but
    // hover/completion/signature must already see the variable while the file
    // is still authored in sugared form.
    const forEachRegex = new RegExp(
      `\\bFor\\s+Each\\s+${varName}\\b(?:\\s+As\\s+([a-zA-Z0-9_.]+))?\\s+In\\b`,
      "i",
    );
    // `Dim name = <expr>` (no As clause) — infer from the right-hand side
    // when the RHS is a method call (`me.X()` / `obj.X()` / `New Type()`) or
    // a `Cls.SharedX()` static call.
    const assignmentRegex = new RegExp(
      `\\b(?:Dim|Private|Public|Protected|Shared)?\\s+${varName}\\s*=\\s*(.+?)\\s*(?:'.*)?$`,
      "i",
    );
    for (let i = position.line; i >= 0; i--) {
      const lineRaw = lines[i];
      if (lineRaw === undefined) continue;
      const lineText = lineRaw.trim();
      if (lineText.startsWith("'") || lineText.toLowerCase().startsWith("rem ")) continue;

      const forEachMatch = lineText.match(forEachRegex);
      if (forEachMatch) {
        return forEachMatch[1] ?? "Variant";
      }

      const match = lineText.match(regex);
      if (match) {
        if (match[1]) return match[1];
        // No `As Type` — try inferring from `= <expr>` on the same line.
        const assignMatch = lineText.match(assignmentRegex);
        const rhs = assignMatch?.[1];
        if (rhs) {
          const inferred = TypeResolver.inferExpressionType(rhs, document, i, indexer);
          if (inferred) return inferred;
        }
        return "Variant";
      }
    }

    const fileSyms = indexer.getFileSymbols(document.uri.toString());
    if (!fileSyms) return undefined;

    const currentMethod = fileSyms.symbols.find(
      (s) =>
        s.kind === "method" &&
        position.line >= s.range.startLine &&
        position.line <= s.range.endLine,
    );
    if (currentMethod?.parameters) {
      const param = currentMethod.parameters.find((p) => p.name.toLowerCase() === varLower);
      if (param) return param.type;
    }

    const currentClass = fileSyms.symbols.find(
      (s) =>
        s.kind === "class" &&
        position.line >= s.range.startLine &&
        position.line <= s.range.endLine,
    );
    if (currentClass) {
      // Walk current class + ancestors (workspace + system library) looking for a
      // variable OR property OR method matching the name. Returns the declared type.
      const allWorkspaceSymbols = indexer.getAllSymbols();
      const visited = new Set<string>();
      let cls: SymbolInfo | undefined = currentClass;

      while (cls && !visited.has(cls.name.toLowerCase())) {
        visited.add(cls.name.toLowerCase());
        const classLower = cls.name.toLowerCase();
        const isMember = (s: SymbolInfo): boolean =>
          s.containerName?.toLowerCase() === classLower &&
          s.name.toLowerCase() === varLower &&
          (s.kind === "variable" ||
            s.kind === "property" ||
            s.kind === "indexed-property" ||
            s.kind === "method");

        const wsMember = allWorkspaceSymbols.find(isMember);
        if (wsMember) return wsMember.type;

        const sysMember = lookupSystemByContainer(cls.name).find(
          (s) =>
            s.name.toLowerCase() === varLower &&
            (s.kind === "variable" ||
              s.kind === "property" ||
              s.kind === "indexed-property" ||
              s.kind === "method"),
        );
        if (sysMember) return sysMember.type;

        cls = cls.inheritsFrom
          ? TypeResolver.findClassSymbol(cls.inheritsFrom, indexer)
          : undefined;
      }
    }

    const globalVar = fileSyms.symbols.find(
      (s) =>
        s.name.toLowerCase() === varLower &&
        (s.kind === "variable" || s.kind === "property" || s.kind === "indexed-property") &&
        !s.containerName,
    );
    if (globalVar) return globalVar.type;

    return undefined;
  }

  /**
   * Resolves a class symbol by either simple (`TStrings`) or qualified
   * (`Collections.TStrings`) name. System library is searched first using a
   * pre-built lookup index, then the workspace.
   */
  public static findClassSymbol(
    qualifiedOrSimpleName: string,
    indexer: WorkspaceSymbolIndexer,
  ): SymbolInfo | undefined {
    if (qualifiedOrSimpleName.includes(".")) {
      const lastDot = qualifiedOrSimpleName.lastIndexOf(".");
      const namePart = qualifiedOrSimpleName.substring(lastDot + 1);
      const nsPart = qualifiedOrSimpleName.substring(0, lastDot);

      const exact = lookupSystemClassByName(namePart).find(
        (s) => s.containerName?.toLowerCase() === nsPart.toLowerCase(),
      );
      if (exact) return exact;

      // `noUncheckedIndexedAccess` now widens `[0]` to `T | undefined`
      // automatically, so the explicit cast above is no longer needed.
      const byName = lookupSystemClassByName(namePart)[0];
      if (byName) return byName;

      return indexer.findSymbolByName(namePart);
    }

    const sys = lookupSystemClassByName(qualifiedOrSimpleName)[0];
    if (sys) return sys;

    return indexer.findSymbolByName(qualifiedOrSimpleName);
  }

  /**
   * Best-effort type inference for `Dim x = <expr>` when the user omits the
   * `As <Type>` clause. Handles the cases that pay off the most in real
   * Data7 code:
   *
   *  - `New <Type>(...)` → `<Type>`
   *  - `Me.Method(...)` or `MyBase.Method(...)` → return type of `Method` on
   *    the enclosing class
   *  - `<ident>.Method(...)` → resolves `<ident>` to a type and looks up
   *    `Method` on that type chain
   *  - `<Class>.SharedMethod(...)` → return type of the shared/static method
   *  - `<ident>` (bare identifier) → recurses into {@link getVariableType}
   *
   * Returns `undefined` when the expression's shape is unsupported (literals,
   * string concatenation, arithmetic) — the caller should fall back to
   * `"Variant"` in that case.
   *
   * `lineIdx` is the 0-based line where the declaration sits; recursive
   * lookups walk backwards from that line so we never "see" the variable
   * we are currently resolving.
   */
  public static inferExpressionType(
    expr: string,
    document: vscode.TextDocument,
    lineIdx: number,
    indexer: WorkspaceSymbolIndexer,
  ): string | undefined {
    const trimmed = expr.trim();

    // `New <Type>(...)` — easiest case.
    const newMatch = /^New\s+([\w.]+)\s*\(/i.exec(trimmed);
    if (newMatch?.[1]) return newMatch[1];

    // `<root>.<member>(...)` or `<root>.<member>` (no parens — property access).
    const callMatch = /^([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\(/.exec(trimmed);
    if (callMatch) {
      const root = callMatch[1];
      const member = callMatch[2];
      if (!root || !member) return undefined;
      const containerType = TypeResolver.resolveRootType(root, document, lineIdx, indexer);
      if (!containerType) return undefined;
      const memberSymbol = TypeResolver.findMember(containerType, member, indexer);
      if (memberSymbol?.type && memberSymbol.type !== "Void") {
        return memberSymbol.type;
      }
      return undefined;
    }

    // Bare identifier — recurse via getVariableType (one hop earlier so we
    // do not match the current declaration line again).
    if (/^[A-Za-z_]\w*$/.test(trimmed)) {
      // Construct a position type-erased — we only need `.line` inside the
      // recursive call, and we know the prior declaration sits BEFORE lineIdx.
      const position = { line: lineIdx, character: 0 } as vscode.Position;
      return TypeResolver.getVariableType(trimmed, document, position, indexer);
    }

    return undefined;
  }

  /**
   * Resolves the type of the `<root>` token in expressions like `<root>.X`:
   *
   *  - `me` / `mybase` → the enclosing class declared in the file.
   *  - `<ClassName>` (bare class identifier) → the class itself, so callers
   *    can look up Shared members on it.
   *  - Anything else → fall back to {@link getVariableType}.
   */
  private static resolveRootType(
    root: string,
    document: vscode.TextDocument,
    lineIdx: number,
    indexer: WorkspaceSymbolIndexer,
  ): string | undefined {
    const lower = root.toLowerCase();
    if (lower === "me" || lower === "mybase") {
      const fileSyms = indexer.getFileSymbols(document.uri.toString());
      const currentClass = fileSyms?.symbols.find(
        (s) => s.kind === "class" && lineIdx >= s.range.startLine && lineIdx <= s.range.endLine,
      );
      return currentClass?.name;
    }

    // Bare class/namespace name (static access).
    const classSymbol = TypeResolver.findClassSymbol(root, indexer);
    if (
      classSymbol &&
      (classSymbol.kind === "class" ||
        classSymbol.kind === "structure" ||
        classSymbol.kind === "namespace")
    ) {
      return classSymbol.name;
    }

    // Fallback: resolve as a variable.
    const position = { line: lineIdx, character: 0 } as vscode.Position;
    return TypeResolver.getVariableType(root, document, position, indexer);
  }

  /**
   * Returns inherited members for a class, walking the inheritance chain
   * via `inheritsFrom` and de-duplicating cycles.
   */
  public static getInheritedMembers(
    className: string,
    indexer: WorkspaceSymbolIndexer,
  ): SymbolInfo[] {
    const members: SymbolInfo[] = [];
    const visited = new Set<string>();

    const collect = (currentClassName: string): void => {
      const key = currentClassName.toLowerCase();
      if (visited.has(key)) return;
      visited.add(key);

      const classSymbol = TypeResolver.findClassSymbol(currentClassName, indexer);
      if (!classSymbol) return;

      const shortName = currentClassName.includes(".")
        ? (currentClassName.split(".").pop() ?? currentClassName).toLowerCase()
        : currentClassName.toLowerCase();

      const containerMatch = (containerName: string | undefined): boolean =>
        containerName !== undefined &&
        (containerName.toLowerCase() === key || containerName.toLowerCase() === shortName);

      members.push(...SYSTEM_SYMBOLS.filter((s) => containerMatch(s.containerName)));
      members.push(...indexer.getAllSymbols().filter((s) => containerMatch(s.containerName)));

      const parent = TypeResolver.resolveParent(classSymbol);
      if (parent) collect(parent);
    };

    const startClass = TypeResolver.findClassSymbol(className, indexer);
    if (!startClass) return members;
    const parent = TypeResolver.resolveParent(startClass);
    if (parent) collect(parent);
    return members;
  }

  /**
   * Resolves the effective parent class name for the given symbol, applying
   * the Data7 implicit "every workspace class inherits from TObject" rule.
   *
   * Returns `undefined` for `TObject` itself (root of the hierarchy) and for
   * non-class symbols, so callers can stop walking the chain.
   *
   * System Library symbols are NOT auto-rooted at TObject: their own
   * `inheritsFrom` is authoritative because primitives (`String`, `Integer`),
   * enums (`TAlign`, `TBorderIcon`) and interfaces declared in
   * `src/system-library/` deliberately omit `Inherits` and must NOT expose
   * `TObject` members.
   *
   * **Public so every other inheritance walker in the codebase reuses the
   * exact same rule** — keeping the implicit-TObject policy in a single
   * place (diagnostics, code-actions, symbol-indexer all delegate here).
   */
  public static resolveParent(symbol: SymbolInfo): string | undefined {
    if (symbol.kind !== "class") return symbol.inheritsFrom;
    if (symbol.inheritsFrom) return symbol.inheritsFrom;
    if (symbol.name.toLowerCase() === "tobject") return undefined;
    if (symbol.fileUri.startsWith("system://")) return undefined;
    return "TObject";
  }

  /**
   * Resolves a single member (property/method/variable/event) on a type, walking
   * the full inheritance chain across both the workspace and the System Library.
   *
   * This is the canonical lookup used by Hover, Definition, SignatureHelp and the
   * Diagnostics linter — previously each had their own slightly-different copy.
   *
   *  - `typeName` accepts simple (`TForm`) and qualified (`Forms.TForm`) names.
   *  - Cycles in `inheritsFrom` are guarded by a `visited` set.
   *  - When the same member exists in both workspace and system library, the
   *    workspace declaration wins (matches existing precedence in providers).
   *
   * Returns `undefined` when the member does not exist anywhere in the chain.
   */
  public static findMember(
    typeName: string,
    memberName: string,
    indexer: WorkspaceSymbolIndexer,
  ): SymbolInfo | undefined {
    const memberLower = memberName.toLowerCase();
    const visited = new Set<string>();

    const search = (currentTypeName: string): SymbolInfo | undefined => {
      const key = currentTypeName.toLowerCase();
      if (visited.has(key)) return undefined;
      visited.add(key);

      const shortName = currentTypeName.includes(".")
        ? (currentTypeName.split(".").pop() ?? currentTypeName).toLowerCase()
        : key;

      // A container matches when its (lower-cased) form is either the
      // simple type name, the fully-qualified type name, OR ends with
      // `.<shortName>` so a member declared inside `Forms.Grid` is also
      // visible when the user references `Grid` directly.
      const containerMatch = (containerName: string | undefined): boolean => {
        if (containerName === undefined) return false;
        const c = containerName.toLowerCase();
        return c === key || c === shortName || c.endsWith("." + shortName);
      };

      // Workspace takes precedence over the System Library when both declare the same member.
      const wsHit = indexer
        .getAllSymbols()
        .find((s) => s.name.toLowerCase() === memberLower && containerMatch(s.containerName));
      if (wsHit) return wsHit;

      const sysHit = SYSTEM_SYMBOLS.find(
        (s) => s.name.toLowerCase() === memberLower && containerMatch(s.containerName),
      );
      if (sysHit) return sysHit;

      const classSymbol = TypeResolver.findClassSymbol(currentTypeName, indexer);
      if (!classSymbol) return undefined;

      const parent = TypeResolver.resolveParent(classSymbol);
      if (parent) return search(parent);
      return undefined;
    };

    return search(typeName);
  }

  /**
   * Returns all members (own + inherited) for a given type name. Mirrors the
   * shape used by completion and hover providers.
   */
  public static getAllMembersForType(
    typeName: string,
    indexer: WorkspaceSymbolIndexer,
  ): SymbolInfo[] {
    const members: SymbolInfo[] = [];
    const visited = new Set<string>();

    const collect = (currentTypeName: string): void => {
      const key = currentTypeName.toLowerCase();
      if (visited.has(key)) return;
      visited.add(key);

      const classSymbol = TypeResolver.findClassSymbol(currentTypeName, indexer);
      if (!classSymbol) return;

      const shortName = currentTypeName.includes(".")
        ? (currentTypeName.split(".").pop() ?? currentTypeName).toLowerCase()
        : currentTypeName.toLowerCase();

      const containerMatch = (containerName: string | undefined): boolean => {
        if (containerName === undefined) return false;
        const c = containerName.toLowerCase();
        return c === key || c === shortName || c.endsWith("." + shortName);
      };

      members.push(...SYSTEM_SYMBOLS.filter((s) => containerMatch(s.containerName)));
      members.push(...indexer.getAllSymbols().filter((s) => containerMatch(s.containerName)));

      const parent = TypeResolver.resolveParent(classSymbol);
      if (parent) collect(parent);
    };

    collect(typeName);
    return members;
  }
}
