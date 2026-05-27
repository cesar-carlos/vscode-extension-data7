import "../_setup/global-hooks";
import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { TypeResolver } from "../../analysis/type-resolver";
import { WorkspaceSymbolIndexer } from "../../analysis/symbol-indexer";
import { expectMembers } from "../_helpers/assertions";

describe("TypeResolver", () => {
  describe("getVariableType", () => {
    test('resolves a local "Dim x As Type" declaration in scope', () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const mockDoc = {
        uri: { toString: () => "file:///test_auto.bas" },
        getText: () => `
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim s As String
         s = "hello"
      End Sub
   End Class
End Namespace
    `,
      } as any;

      const pos = { line: 5, character: 10 } as any;
      assert.equal(TypeResolver.getVariableType("s", mockDoc, pos, indexer), "String");
    });

    test('binds the loop variable from "For Each x As Type In ..." into the enclosing scope', () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const mockDoc = {
        uri: { toString: () => "file:///foreach_scope.bas" },
        getText: () => `
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim list As StringList
         For Each item As String In list
            item.Length()
         Next
      End Sub
   End Class
End Namespace
    `,
      } as any;

      // Cursor on the body line `item.Length()` — `item` must resolve to "String".
      const pos = { line: 6, character: 12 } as any;
      assert.equal(TypeResolver.getVariableType("item", mockDoc, pos, indexer), "String");
    });

    test('infers type from "Dim x = New T(...)" when "As" is omitted', () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const mockDoc = {
        uri: { toString: () => "file:///new_expr.bas" },
        getText: () => `
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim list = New StringList()
      End Sub
   End Class
End Namespace
    `,
      } as any;

      const pos = { line: 5, character: 10 } as any;
      assert.equal(TypeResolver.getVariableType("list", mockDoc, pos, indexer), "StringList");
    });

    test('infers type from "Dim x = me.Method()" using the enclosing class', () => {
      // Lazy import to avoid pulling vscode mock into the top-level imports.
      const { createMockDoc } = require("../_helpers/mock-doc") as {
        createMockDoc: (uri: string, text: string) => any;
      };
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const code = `Namespace mod_app
   Class TFactory
      Public Function MakeList() As StringList
      End Function
      Public Sub Run()
         Dim list = me.MakeList()
      End Sub
   End Class
End Namespace`;
      indexer.updateFileContent("file:///inference.bas", code);
      const mockDoc = createMockDoc("file:///inference.bas", code);

      const pos = { line: 5, character: 10 } as any;
      assert.equal(TypeResolver.getVariableType("list", mockDoc, pos, indexer), "StringList");
    });

    test('falls back to "Variant" when "For Each x In ..." omits the explicit type', () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const mockDoc = {
        uri: { toString: () => "file:///foreach_implicit.bas" },
        getText: () => `
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim list As StringList
         For Each item In list
            item.Length()
         Next
      End Sub
   End Class
End Namespace
    `,
      } as any;

      const pos = { line: 6, character: 12 } as any;
      assert.equal(TypeResolver.getVariableType("item", mockDoc, pos, indexer), "Variant");
    });
  });

  describe("findClassSymbol", () => {
    test("resolves a class by its simple name", () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const c = TypeResolver.findClassSymbol("TStringList", indexer);
      assert.ok(c);
      assert.equal(c.name, "TStringList");
    });

    test("resolves classes by qualified names (Container.Type)", () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();
      for (const qualified of [
        "Collections.TStringList",
        "Collections.TStrings",
        "System.Classes.TPersistent",
      ]) {
        const c = TypeResolver.findClassSymbol(qualified, indexer);
        assert.ok(c, `must resolve ${qualified}`);
        const expectedSimple = qualified.split(".").pop();
        assert.equal(c.name, expectedSimple);
      }
    });
  });

  describe("getAllMembersForType", () => {
    test("returns own AND inherited members up the entire ancestor chain", () => {
      const indexer = WorkspaceSymbolIndexer.getInstance();

      // TStringList own + TStrings inherited.
      const tStringList = TypeResolver.getAllMembersForType("TStringList", indexer);
      expectMembers(tStringList, [
        "Sort",
        "Find",
        "CaseSensitive", // own
        "Add",
        "Count",
        "Text",
        "IndexOf",
        "Clear", // inherited from TStrings
      ]);

      // StringList → TStringList → TStrings (full chain).
      const stringList = TypeResolver.getAllMembersForType("StringList", indexer);
      expectMembers(stringList, ["Sort", "Find", "Add", "Count", "Text"]);
    });

    test("auto-roots workspace classes without an Inherits clause at TObject", () => {
      // Lazy import to mirror the pattern used by the inference test below
      // (avoids pulling the vscode mock into module-level imports).
      const { createMockDoc } = require("../_helpers/mock-doc") as {
        createMockDoc: (uri: string, text: string) => unknown;
      };
      const indexer = WorkspaceSymbolIndexer.getInstance();
      const code = `Namespace mod_card
   Class TCardController
      Public foo As String
   End Class
End Namespace`;
      // Register so `WorkspaceSymbolIndexer.isFileValid` keeps the symbols.
      createMockDoc("file:///auto_tobject.bas", code);
      indexer.updateFileContent("file:///auto_tobject.bas", code);

      // `Free`/`Create`/`Destroy` come from the system-library TObject; a
      // user class that omits `Inherits` must still expose them through
      // the resolver's implicit-TObject rule.
      const members = TypeResolver.getAllMembersForType("TCardController", indexer);
      expectMembers(members, ["Free", "Create", "Destroy"]);
    });
  });

  describe("resolveParent", () => {
    test("returns the explicit inheritsFrom when present", () => {
      assert.equal(
        TypeResolver.resolveParent({
          name: "TStringList",
          kind: "class",
          type: "TStringList",
          isShared: false,
          isPrivate: false,
          range: { startLine: 0, startChar: 0, endLine: 0, endChar: 0 },
          fileUri: "system://library",
          containerName: "Collections",
          inheritsFrom: "TStrings",
        }),
        "TStrings",
      );
    });

    test("auto-roots workspace classes without Inherits at TObject", () => {
      assert.equal(
        TypeResolver.resolveParent({
          name: "TUserClass",
          kind: "class",
          type: "TUserClass",
          isShared: false,
          isPrivate: false,
          range: { startLine: 0, startChar: 0, endLine: 0, endChar: 0 },
          fileUri: "file:///workspace/src/my.bas",
        }),
        "TObject",
      );
    });

    test("does NOT auto-root system-library symbols (primitives / enums / interfaces)", () => {
      assert.equal(
        TypeResolver.resolveParent({
          name: "TAlign",
          kind: "class",
          type: "TAlign",
          isShared: false,
          isPrivate: false,
          range: { startLine: 0, startChar: 0, endLine: 0, endChar: 0 },
          fileUri: "system://library",
          containerName: "Forms",
        }),
        undefined,
      );
    });

    test("returns undefined for TObject itself to stop the walk at the root", () => {
      assert.equal(
        TypeResolver.resolveParent({
          name: "TObject",
          kind: "class",
          type: "TObject",
          isShared: false,
          isPrivate: false,
          range: { startLine: 0, startChar: 0, endLine: 0, endChar: 0 },
          fileUri: "file:///workspace/src/tobject.bas",
        }),
        undefined,
      );
    });
  });
});
