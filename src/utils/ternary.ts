/**
 * Locator for the `?` and `:` of a top-level ternary inside a Data7 Basic
 * source line.
 *
 * Lives in `src/utils/` because both `src/project/transpiler.ts` (the
 * Builder pipeline) and `src/diagnostics/diagnostics.ts` (the live linter)
 * need to find ternaries — `diagnostics/` cannot import from `project/` per
 * the architectural fences in `governance.mdc`, so the shared parser has to
 * live in a leaf folder.
 *
 * The parser respects:
 *  - String literals `"..."` (with `""` escape) — `?` and `:` inside strings
 *    are NOT operators.
 *  - Interpolated strings `$"..."` — same treatment as regular strings.
 *  - Line comments `'...` — everything from the apostrophe to the end of
 *    the line is ignored.
 *  - Parenthesis / bracket nesting — only the outermost ternary is
 *    considered. The parser correctly pairs `?` with its matching `:`,
 *    skipping nested ternaries (so `a ? b ? c : d : e` returns the
 *    positions of the OUTER `?` and `:`).
 */

export interface TernaryPositions {
  /** 0-based column of the outermost `?`. */
  readonly questionAt: number;
  /** 0-based column of the matching `:` for that `?`. */
  readonly colonAt: number;
}

/**
 * Returns the positions of the outermost ternary `?`/`:` pair on `line`, or
 * `null` when no top-level ternary is present.
 *
 * "Top-level" means: at parenthesis/bracket nesting depth 0, outside any
 * string literal, and outside any line comment. Nested ternaries inside
 * parentheses are handled correctly (`(a ? b : c) + d` does NOT match —
 * the `?` is at depth 1 inside `(...)`).
 */
export function findTopLevelTernary(line: string): TernaryPositions | null {
  let depth = 0;
  let questionAt = -1;
  // Counts ternary `?`s opened AFTER `questionAt` whose matching `:` we
  // still need to consume before we can use a `:` as our match.
  let pendingNestedQuestions = 0;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    // Skip a string literal (regular or interpolated). Both consume content
    // up to the next unescaped `"`.
    if (c === '"' || (c === "$" && line[i + 1] === '"')) {
      i = skipStringLiteral(line, c === "$" ? i + 1 : i);
      continue;
    }

    // Line comment — `?` and `:` after this are ignored.
    if (c === "'") return questionAt !== -1 ? null : null;

    if (c === "(" || c === "[") {
      depth++;
      continue;
    }
    if (c === ")" || c === "]") {
      depth--;
      continue;
    }

    if (depth !== 0) continue;

    if (c === "?") {
      if (questionAt === -1) {
        questionAt = i;
      } else {
        pendingNestedQuestions++;
      }
      continue;
    }
    if (c === ":" && questionAt !== -1) {
      if (pendingNestedQuestions > 0) {
        pendingNestedQuestions--;
        continue;
      }
      return { questionAt, colonAt: i };
    }
  }

  return null;
}

/**
 * Advances `i` past a `"..."` string literal starting at the opening quote.
 * Returns the index of the closing quote (so the caller's `for` increment
 * advances to the next character). Honours `""` escape sequences inside the
 * literal.
 */
function skipStringLiteral(line: string, openQuoteIdx: number): number {
  let i = openQuoteIdx + 1;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      if (line[i + 1] === '"') {
        i += 2;
        continue;
      }
      return i; // caller's `for` increment moves past
    }
    i++;
  }
  // Unterminated string — return the last index so the outer loop terminates
  // naturally. We don't emit a diagnostic here; the interpolation parser
  // handles `$"..."` malformation, and a regular `"..."` left open is a
  // syntax error that lands on a different rule.
  return line.length - 1;
}
