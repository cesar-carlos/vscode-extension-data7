"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("./setup"); // MUST be first
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const completion_provider_1 = require("../completion-provider");
const symbol_indexer_1 = require("../symbol-indexer");
(0, node_test_1.test)('TypeResolver - getVariableType', () => {
    const indexer = symbol_indexer_1.WorkspaceSymbolIndexer.getInstance();
    const mockDoc = {
        uri: { toString: () => 'file:///test_auto.bas' },
        getText: () => `
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim s As String
         s = "hello"
      End Sub
   End Class
End Namespace
    `
    };
    const pos = { line: 5, character: 10 }; // Line index 5 is "         s = \"hello\""
    const resolved = completion_provider_1.TypeResolver.getVariableType('s', mockDoc, pos, indexer);
    assert.strictEqual(resolved, 'String');
});
(0, node_test_1.test)('TypeResolver - findClassSymbol resolves qualified names', () => {
    const indexer = symbol_indexer_1.WorkspaceSymbolIndexer.getInstance();
    // Simple name
    const bySimple = completion_provider_1.TypeResolver.findClassSymbol('TStringList', indexer);
    assert.ok(bySimple, 'Should find TStringList by simple name');
    assert.strictEqual(bySimple.name, 'TStringList');
    // Qualified name 'Collections.TStringList'
    const byQualified = completion_provider_1.TypeResolver.findClassSymbol('Collections.TStringList', indexer);
    assert.ok(byQualified, 'Should find TStringList by qualified name Collections.TStringList');
    assert.strictEqual(byQualified.name, 'TStringList');
    // Qualified name 'Collections.TStrings'
    const byTStrings = completion_provider_1.TypeResolver.findClassSymbol('Collections.TStrings', indexer);
    assert.ok(byTStrings, 'Should find TStrings by qualified name Collections.TStrings');
    assert.strictEqual(byTStrings.name, 'TStrings');
    // Nested: System.Classes.TPersistent
    const byPersistent = completion_provider_1.TypeResolver.findClassSymbol('System.Classes.TPersistent', indexer);
    assert.ok(byPersistent, 'Should find TPersistent by qualified name System.Classes.TPersistent');
    assert.strictEqual(byPersistent.name, 'TPersistent');
});
(0, node_test_1.test)('D7BasicCompletionProvider - getAllMembersForType returns inherited members', () => {
    const indexer = symbol_indexer_1.WorkspaceSymbolIndexer.getInstance();
    // TStringList should expose its own members AND TStrings members
    const tStringListMembers = completion_provider_1.D7BasicCompletionProvider.getAllMembersForType('TStringList', indexer);
    const memberNames = tStringListMembers.map(m => m.name.toLowerCase());
    // Own members of TStringList
    assert.ok(memberNames.includes('sort'), 'TStringList should have Sort (own)');
    assert.ok(memberNames.includes('find'), 'TStringList should have Find (own)');
    assert.ok(memberNames.includes('casesensitive'), 'TStringList should have CaseSensitive (own)');
    // Inherited members from TStrings
    assert.ok(memberNames.includes('add'), 'TStringList should inherit Add from TStrings');
    assert.ok(memberNames.includes('count'), 'TStringList should inherit Count from TStrings');
    assert.ok(memberNames.includes('text'), 'TStringList should inherit Text from TStrings');
    assert.ok(memberNames.includes('indexof'), 'TStringList should inherit IndexOf from TStrings');
    assert.ok(memberNames.includes('clear'), 'TStringList should inherit Clear from TStrings');
    // StringList should expose members from the full chain
    const stringListMembers = completion_provider_1.D7BasicCompletionProvider.getAllMembersForType('StringList', indexer);
    const slNames = stringListMembers.map(m => m.name.toLowerCase());
    // Inherited from TStringList
    assert.ok(slNames.includes('sort'), 'StringList should inherit Sort from TStringList');
    assert.ok(slNames.includes('find'), 'StringList should inherit Find from TStringList');
    // Inherited from TStrings (2 levels up)
    assert.ok(slNames.includes('add'), 'StringList should inherit Add from TStrings');
    assert.ok(slNames.includes('count'), 'StringList should inherit Count from TStrings');
    assert.ok(slNames.includes('text'), 'StringList should inherit Text from TStrings');
});
//# sourceMappingURL=autocomplete.test.js.map