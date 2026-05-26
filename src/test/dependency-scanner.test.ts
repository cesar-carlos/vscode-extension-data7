import './setup'; // MUST be first
import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DependencyScanner } from '../dependency-scanner';

test('DependencyScanner - stripComments', () => {
  assert.strictEqual(DependencyScanner.stripComments("Dim a As String ' this is a comment"), "Dim a As String ");
  assert.strictEqual(DependencyScanner.stripComments("' whole line comment"), "");
  assert.strictEqual(DependencyScanner.stripComments("Rem whole line rem comment"), "");
  assert.strictEqual(DependencyScanner.stripComments("a = b"), "a = b");
});

test('DependencyScanner - isIgnoredNamespace', () => {
  assert.strictEqual(DependencyScanner.isIgnoredNamespace('system.xml'), true);
  assert.strictEqual(DependencyScanner.isIgnoredNamespace('vcl.forms'), true);
  assert.strictEqual(DependencyScanner.isIgnoredNamespace('collections'), true);
  // Net must not be ignored anymore
  assert.strictEqual(DependencyScanner.isIgnoredNamespace('net'), false);
  assert.strictEqual(DependencyScanner.isIgnoredNamespace('my_own_ns'), false);
});

test('DependencyScanner - detectReferencedModules', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'd7-dep-test-'));
  try {
    const fileContent = `
      Imports ModA
      Imports ModB.SubClass
      ' Imports ModC
      mod_external.SomeCall()
    `;
    fs.writeFileSync(path.join(tempDir, 'test.bas'), fileContent, 'utf-8');

    const availableSharedModules = new Map();
    availableSharedModules.set('moda', { name: 'ModA', filePath: 'some/path' });
    availableSharedModules.set('modb', { name: 'ModB', filePath: 'some/path' });
    availableSharedModules.set('mod_external', { name: 'mod_external', filePath: 'some/path' });

    const refs = DependencyScanner.detectReferencedModules(tempDir, availableSharedModules);
    assert.ok(refs.has('moda'));
    assert.ok(refs.has('modb'));
    assert.ok(refs.has('mod_external'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
