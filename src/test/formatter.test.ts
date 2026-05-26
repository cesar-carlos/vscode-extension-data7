import './setup'; // MUST be first
import { test } from 'node:test';
import * as assert from 'node:assert';
import { CodeFormatter } from '../formatter';

test('CodeFormatter - formatKeywordsInLine', () => {
  assert.strictEqual(CodeFormatter.formatKeywordsInLine("namespace my_app"), "Namespace my_app");
  assert.strictEqual(CodeFormatter.formatKeywordsInLine("public sub run()"), "Public Sub run()");
  assert.strictEqual(CodeFormatter.formatKeywordsInLine("dim a as string"), "Dim a As string");
});

test('CodeFormatter - formatCode indentation', () => {
  const code = `Namespace my_app
Class TTest
Public Sub Run()
Dim a As String
End Sub
End Class
End Namespace`;

  const formatted = CodeFormatter.formatCode(code);
  assert.ok(formatted.includes('   Class TTest'), 'Indents Class');
  assert.ok(formatted.includes('      Public Sub Run()'), 'Indents Sub');
  assert.ok(formatted.includes('         Dim a As String'), 'Indents Variable');
});
