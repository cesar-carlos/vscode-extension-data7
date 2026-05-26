import './setup'; // MUST be first
import { test } from 'node:test';
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { WorkspaceSymbolIndexer } from '../symbol-indexer';
import { DiagnosticsLinter } from '../diagnostics';

const mockTextDocuments = vscode.workspace.textDocuments as any;

test('DiagnosticsLinter - Advanced Validation rules', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();
  
  // Register mock dependencies
  const dummyFile1Uri = 'file:///dummy/mod_resources.bas';
  const dummyFile1Content = `
Namespace mod_resources
   Class TResourceLoader
      Public Shared Function Load() As TObject
      End Function
   End Class
End Namespace
  `;
  indexer.updateFileContent(dummyFile1Uri, dummyFile1Content);

  const dummyPrincipalUri = 'file:///dummy/Principal.bas';
  const dummyPrincipalContent = `
Namespace mod_principal
   Class TPrincipalClass
    End Class
End Namespace
  `;
  indexer.updateFileContent(dummyPrincipalUri, dummyPrincipalContent);

  const testFileUri = 'file:///dummy/test_file.bas';

  // Mock workspace open documents so isFileValid accepts them during validation
  mockTextDocuments.length = 0;
  mockTextDocuments.push(
    { uri: { toString: () => dummyFile1Uri, fsPath: 'dummy/mod_resources.bas' } } as any,
    { uri: { toString: () => dummyPrincipalUri, fsPath: 'dummy/Principal.bas' } } as any,
    { uri: { toString: () => testFileUri, fsPath: 'dummy/test_file.bas' } } as any
  );

  const runDiagnostics = (content: string) => {
    indexer.updateFileContent(testFileUri, content);
    const mockDocument = {
      uri: {
        toString: () => testFileUri,
        fsPath: 'dummy/test_file.bas'
      },
      getText: () => content,
      split: (regex: any) => content.split(regex),
      lineCount: content.split(/\r?\n/).length,
      lineAt: (lineIdx: number) => ({
        text: content.split(/\r?\n/)[lineIdx]
      })
    } as any;

    const idx = mockTextDocuments.findIndex((doc: any) => doc.uri.toString() === testFileUri);
    if (idx !== -1) {
      mockTextDocuments[idx] = mockDocument;
    }

    return DiagnosticsLinter.runAdvancedDiagnostics(mockDocument, indexer);
  };

  // Case 1: Primitives & Global Net classes (no error expected)
  const d1 = runDiagnostics(`
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim s As String
         Dim len As Integer
         len = s.Length
         Dim client As THTTP
         Dim json As TJSONObject
      End Sub
   End Class
End Namespace
  `);
  assert.strictEqual(d1.length, 0, 'No diagnostics expected for primitives and global THTTP/TJSONObject');

  // Case 2: Missing import for external class (error expected)
  const d2 = runDiagnostics(`
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim loader As TResourceLoader
      End Sub
   End Class
End Namespace
  `);
  assert.strictEqual(d2.length, 1, 'Expects 1 error for missing import of TResourceLoader');
  assert.ok(d2[0].message.includes('não foi importado'), 'Message contains missing import warning');

  // Case 3: Fully qualified external class (no error expected)
  const d3 = runDiagnostics(`
Namespace my_app
   Class TTest
      Public Sub Run()
         Dim loader As mod_resources.TResourceLoader
      End Sub
   End Class
End Namespace
  `);
  assert.strictEqual(d3.length, 0, 'No diagnostics expected for fully qualified type');

  // Case 4: Imported namespace (no error expected)
  const d4 = runDiagnostics(`
Imports mod_resources

Namespace my_app
   Class TTest
      Public Sub Run()
         Dim loader As TResourceLoader
      End Sub
   End Class
End Namespace
  `);
  assert.strictEqual(d4.length, 0, 'No diagnostics expected when namespace is imported');

  // Case 5: Inheriting TPrincipalClass declared in Principal.bas (no error expected)
  const d5 = runDiagnostics(`
Namespace my_app
   Class TTest
      Inherits TPrincipalClass
   End Class
End Namespace
  `);
  assert.strictEqual(d5.length, 0, 'No diagnostics expected when inheriting global Principal class');

  // Case 6: Using Forms.Form without imports (error expected)
  const d6 = runDiagnostics(`
Namespace my_app
   Class TTest
      Inherits Form
   End Class
End Namespace
  `);
  assert.strictEqual(d6.length, 1, 'Expects 1 error for Form (requires Imports Forms)');
});

test('WorkspaceSymbolIndexer - validateCache', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();
  
  // Add a symbol that has a valid path (this test file itself)
  const realFileUri = 'file:///' + __filename.replace(/\\/g, '/');
  indexer.updateFileContent(realFileUri, 'Namespace ns\nEnd Namespace');
  
  // Add a symbol that has a non-existent path but treat it as open in editor initially
  const nonExistentUri = 'file:///dummy/non_existent_file.bas';
  mockTextDocuments.length = 0;
  mockTextDocuments.push({
    uri: {
      toString: () => nonExistentUri,
      fsPath: 'dummy/non_existent_file.bas'
    }
  } as any);

  indexer.updateFileContent(nonExistentUri, 'Namespace ns2\nEnd Namespace');
  
  assert.ok(indexer.getFileSymbols(realFileUri), 'Real file is cached');
  assert.ok(indexer.getFileSymbols(nonExistentUri) !== undefined, 'Non-existent file is cached initially because it is open');
  
  // Now close the file (remove from textDocuments)
  mockTextDocuments.length = 0;

  // Run validation
  indexer.validateCache();
  
  assert.ok(indexer.getFileSymbols(realFileUri), 'Real file is still cached');
  assert.strictEqual(indexer.getFileSymbols(nonExistentUri), undefined, 'Non-existent file has been pruned from cache');
});

test('WorkspaceSymbolIndexer - delete and rename folders', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();
  
  // Set up mock paths
  const oldFolder = 'c:\\dummy_project\\src\\modules\\mod_card';
  const file1 = 'c:\\dummy_project\\src\\modules\\mod_card\\form\\card.bas';
  const file2 = 'c:\\dummy_project\\src\\modules\\mod_card\\helper.bas';
  
  const file1Uri = 'file:///c%3A/dummy_project/src/modules/mod_card/form/card.bas';
  const file2Uri = 'file:///c%3A/dummy_project/src/modules/mod_card/helper.bas';
  
  // Mock them as open in editor so isFileValid accepts them
  mockTextDocuments.length = 0;
  mockTextDocuments.push(
    { uri: { toString: () => file1Uri, fsPath: file1 } } as any,
    { uri: { toString: () => file2Uri, fsPath: file2 } } as any
  );

  indexer.updateFileContent(file1Uri, 'Namespace ns_card\nEnd Namespace');
  indexer.updateFileContent(file2Uri, 'Namespace ns_helper\nEnd Namespace');
  
  assert.ok(indexer.getFileSymbols(file1Uri), 'File 1 is in cache');
  assert.ok(indexer.getFileSymbols(file2Uri), 'File 2 is in cache');
  
  // 1. Test rename workspace folder
  const newFolder = 'c:\\dummy_project\\src\\mod_card';
  const newFile1Uri = 'file:///c%3A/dummy_project/src/mod_card/form/card.bas';
  const newFile2Uri = 'file:///c%3A/dummy_project/src/mod_card/helper.bas';
  
  // Mock the new files as open in editor
  mockTextDocuments.length = 0;
  mockTextDocuments.push(
    { uri: { toString: () => newFile1Uri, fsPath: 'c:\\dummy_project\\src\\mod_card\\form\\card.bas' } } as any,
    { uri: { toString: () => newFile2Uri, fsPath: 'c:\\dummy_project\\src\\mod_card\\helper.bas' } } as any
  );

  indexer.renameWorkspaceFolder(oldFolder, newFolder);
  
  assert.strictEqual(indexer.getFileSymbols(file1Uri), undefined, 'Old File 1 has been removed from cache');
  assert.ok(indexer.getFileSymbols(newFile1Uri), 'New File 1 is now in cache');
  
  // 2. Test delete workspace folder
  indexer.deleteWorkspaceFolder(newFolder);
  assert.strictEqual(indexer.getFileSymbols(newFile1Uri), undefined, 'New File 1 has been deleted from cache');
});

test('WorkspaceSymbolIndexer - dynamic cache validation on lookup', () => {
  const indexer = WorkspaceSymbolIndexer.getInstance();
  
  // Add a symbol with a non-existent file URI, and mark it as open initially
  const staleFileUri = 'file:///c%3A/dummy_project/src/stale_file_not_existing.bas';
  mockTextDocuments.length = 0;
  mockTextDocuments.push({
    uri: {
      toString: () => staleFileUri,
      fsPath: 'c:\\dummy_project\\src\\stale_file_not_existing.bas'
    }
  } as any);

  indexer.updateFileContent(staleFileUri, `
Namespace ns_stale
  Class TStaleClass
    Sub StaleMethod()
    End Sub
  End Class
End Namespace
  `);

  // Verify it exists in cache initially
  assert.ok(indexer.getFileSymbols(staleFileUri) !== undefined, 'Initially stale file is in cache because it is open');

  // Now close the file in the editor (remove from textDocuments)
  mockTextDocuments.length = 0;

  // Since it does not exist on disk and is not open, isFileValid should be false
  assert.strictEqual(indexer.isFileValid(staleFileUri), false, 'stale file is invalid since it does not exist and is closed');

  // Querying the symbol or using getFileSymbols should trigger dynamic validation and return undefined
  const symbol = indexer.findSymbolByName('TStaleClass');
  assert.strictEqual(symbol, undefined, 'Stale symbol is filtered out and purged on lookup');
  
  // Verify it has been purged from cache
  assert.strictEqual(indexer.getFileSymbols(staleFileUri), undefined, 'Stale file is purged from cache after lookup');
});

test('SystemLibrary - inheritance chain resolution (StringList -> TStringList -> TStrings -> TPersistent -> TObject)', () => {
  const { SYSTEM_SYMBOLS } = require('../system-library');

  // Helper: find a symbol by name (class-level) and optional containerName
  const findClass = (name: string, container?: string) =>
    SYSTEM_SYMBOLS.find((s: any) =>
      s.name === name && s.kind === 'class' && (container === undefined || s.containerName === container)
    );

  // Helper: find member of a class
  const findMember = (memberName: string, container: string) =>
    SYSTEM_SYMBOLS.find((s: any) => s.name === memberName && s.containerName === container);

  // 1. Validate StringList exists in Collections and inherits Collections.TStringList
  const stringListClass = findClass('StringList', 'Collections');
  assert.ok(stringListClass, 'Collections.StringList class should exist');
  assert.strictEqual(stringListClass.inheritsFrom, 'Collections.TStringList', 'StringList should inherit from Collections.TStringList');

  // 2. Validate Collections.TStringList inherits Collections.TStrings (direct, no System.Classes.TStringList intermediate)
  const colTStringList = findClass('TStringList', 'Collections');
  assert.ok(colTStringList, 'Collections.TStringList class should exist');
  assert.strictEqual(colTStringList.inheritsFrom, 'Collections.TStrings', 'Collections.TStringList should inherit from Collections.TStrings');

  // 3. Validate Collections.TStrings inherits System.Classes.TPersistent (direct)
  const colTStrings = findClass('TStrings', 'Collections');
  assert.ok(colTStrings, 'Collections.TStrings class should exist');
  assert.strictEqual(colTStrings.inheritsFrom, 'System.Classes.TPersistent', 'Collections.TStrings should inherit from System.Classes.TPersistent');

  // 4. Validate System.Classes.TPersistent inherits System.Classes.TObject
  const sysClassTPersistent = findClass('TPersistent', 'System.Classes');
  assert.ok(sysClassTPersistent, 'System.Classes.TPersistent class should exist');
  assert.strictEqual(sysClassTPersistent.inheritsFrom, 'System.Classes.TObject', 'System.Classes.TPersistent should inherit from System.Classes.TObject');

  // 5. Validate System.Classes.TObject exists (the root) with no parent
  const sysClassTObject = findClass('TObject', 'System.Classes');
  assert.ok(sysClassTObject, 'System.Classes.TObject class should exist');
  assert.strictEqual(sysClassTObject.inheritsFrom, undefined, 'System.Classes.TObject should have no parent (root class)');

  // 6. Validate System.Classes.TStrings and TStringList no longer exist (consolidated into Collections)
  const removedTStrings = SYSTEM_SYMBOLS.find((s: any) => s.name === 'TStrings' && s.containerName === 'System.Classes');
  assert.strictEqual(removedTStrings, undefined, 'System.Classes.TStrings class should NOT exist (consolidated into Collections.TStrings)');
  const removedTStringList = SYSTEM_SYMBOLS.find((s: any) => s.name === 'TStringList' && s.containerName === 'System.Classes');
  assert.strictEqual(removedTStringList, undefined, 'System.Classes.TStringList class should NOT exist (consolidated into Collections.TStringList)');

  // 7. Validate global TObject inherits System.Classes.TObject
  const globalTObject = SYSTEM_SYMBOLS.find((s: any) => s.name === 'TObject' && s.kind === 'class' && !s.containerName);
  assert.ok(globalTObject, 'Global TObject class should exist');
  assert.strictEqual(globalTObject.inheritsFrom, 'System.Classes.TObject', 'Global TObject should inherit from System.Classes.TObject');

  // 8. Validate global TPersistent inherits global TObject
  const globalTPersistent = SYSTEM_SYMBOLS.find((s: any) => s.name === 'TPersistent' && s.kind === 'class' && !s.containerName);
  assert.ok(globalTPersistent, 'Global TPersistent class should exist');
  assert.strictEqual(globalTPersistent.inheritsFrom, 'TObject', 'Global TPersistent should inherit from TObject');

  // 9. Validate Collections.TStringList has its own members (e.g. 'Sort', 'Find')
  const sortMember = findMember('Sort', 'TStringList');
  assert.ok(sortMember, 'Collections.TStringList should have a Sort member');
  const findMemberEl = findMember('Find', 'TStringList');
  assert.ok(findMemberEl, 'Collections.TStringList should have a Find member');

  // 10. Validate Collections.TStrings has all expected members (Add, Count, Text, etc.)
  const addMember = findMember('Add', 'TStrings');
  assert.ok(addMember, 'Collections.TStrings should have an Add member');
  const countProp = findMember('Count', 'TStrings');
  assert.ok(countProp, 'Collections.TStrings should have a Count property');
  const textProp = findMember('Text', 'TStrings');
  assert.ok(textProp, 'Collections.TStrings should have a Text property');
  const indexOfMember = findMember('IndexOf', 'TStrings');
  assert.ok(indexOfMember, 'Collections.TStrings should have an IndexOf method');

  // 11. Validate System.Classes.TPersistent members use the correct containerName
  const assignMember = findMember('Assign', 'System.Classes.TPersistent');
  assert.ok(assignMember, 'System.Classes.TPersistent should have an Assign member');
  const getNamePathMember = findMember('GetNamePath', 'System.Classes.TPersistent');
  assert.ok(getNamePathMember, 'System.Classes.TPersistent should have a GetNamePath member');
});
