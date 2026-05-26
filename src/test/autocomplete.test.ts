import './setup'; // MUST be first
import { test } from 'node:test';
import * as assert from 'node:assert';
import { TypeResolver, D7BasicCompletionProvider } from '../completion-provider';
import { WorkspaceSymbolIndexer } from '../symbol-indexer';

test('TypeResolver - getVariableType', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();
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
  } as any;
  
  const pos = { line: 5, character: 10 } as any; // Line index 5 is "         s = \"hello\""
  const resolved = TypeResolver.getVariableType('s', mockDoc, pos, indexer);
  assert.strictEqual(resolved, 'String');
});

test('TypeResolver - findClassSymbol resolves qualified names', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();

  // Simple name
  const bySimple = TypeResolver.findClassSymbol('TStringList', indexer);
  assert.ok(bySimple, 'Should find TStringList by simple name');
  assert.strictEqual(bySimple.name, 'TStringList');

  // Qualified name 'Collections.TStringList'
  const byQualified = TypeResolver.findClassSymbol('Collections.TStringList', indexer);
  assert.ok(byQualified, 'Should find TStringList by qualified name Collections.TStringList');
  assert.strictEqual(byQualified.name, 'TStringList');

  // Qualified name 'Collections.TStrings'
  const byTStrings = TypeResolver.findClassSymbol('Collections.TStrings', indexer);
  assert.ok(byTStrings, 'Should find TStrings by qualified name Collections.TStrings');
  assert.strictEqual(byTStrings.name, 'TStrings');

  // Nested: System.Classes.TPersistent
  const byPersistent = TypeResolver.findClassSymbol('System.Classes.TPersistent', indexer);
  assert.ok(byPersistent, 'Should find TPersistent by qualified name System.Classes.TPersistent');
  assert.strictEqual(byPersistent.name, 'TPersistent');
});

test('D7BasicCompletionProvider - getAllMembersForType returns inherited members', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();

  // TStringList should expose its own members AND TStrings members
  const tStringListMembers = D7BasicCompletionProvider.getAllMembersForType('TStringList', indexer);
  const memberNames = tStringListMembers.map(m => m.name.toLowerCase());

  // Own members of TStringList
  assert.ok(memberNames.includes('sort'),          'TStringList should have Sort (own)');
  assert.ok(memberNames.includes('find'),          'TStringList should have Find (own)');
  assert.ok(memberNames.includes('casesensitive'), 'TStringList should have CaseSensitive (own)');

  // Inherited members from TStrings
  assert.ok(memberNames.includes('add'),           'TStringList should inherit Add from TStrings');
  assert.ok(memberNames.includes('count'),         'TStringList should inherit Count from TStrings');
  assert.ok(memberNames.includes('text'),          'TStringList should inherit Text from TStrings');
  assert.ok(memberNames.includes('indexof'),       'TStringList should inherit IndexOf from TStrings');
  assert.ok(memberNames.includes('clear'),         'TStringList should inherit Clear from TStrings');

  // StringList should expose members from the full chain
  const stringListMembers = D7BasicCompletionProvider.getAllMembersForType('StringList', indexer);
  const slNames = stringListMembers.map(m => m.name.toLowerCase());

  // Inherited from TStringList
  assert.ok(slNames.includes('sort'),  'StringList should inherit Sort from TStringList');
  assert.ok(slNames.includes('find'),  'StringList should inherit Find from TStringList');

  // Inherited from TStrings (2 levels up)
  assert.ok(slNames.includes('add'),   'StringList should inherit Add from TStrings');
  assert.ok(slNames.includes('count'), 'StringList should inherit Count from TStrings');
  assert.ok(slNames.includes('text'),  'StringList should inherit Text from TStrings');
});
