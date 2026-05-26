import './setup'; // MUST be first
import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Builder } from '../builder';
import { Decompiler } from '../decompiler';

test('Builder & Decompiler workflow', () => {
  // Create temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'd7-test-'));
  
  try {
    // 1. Create dummy project configuration data7.json
    const config = {
      Id: "{TEST-GUID-1234}",
      Nome: "TestProject",
      Descricao: "Test description",
      version: "1.0.0",
      language: "d7basic",
      targetPlatform: "Win32",
      opcoes: {
        autor: "TestAuthor",
        versao: "1.0.0",
        informacoes: "Test info",
        codEmpresa: 1,
        codFilial: 1,
        nomeUsuario: "TestUser",
        preScript: "",
        identificacaoBancoDados: "",
        minify: false,
        stripComments: false
      },
      virtualFolders: [] as any[],
      Modulos: [
        {
          Nome: "Principal",
          Descricao: "Modulo principal",
          Tipo: 0,
          PastaVirtual: "Root"
        }
      ]
    };
    
    fs.writeFileSync(path.join(tempDir, 'data7.json'), JSON.stringify(config, null, 2), 'utf-8');
    
    // 2. Create src/ folder and Principal.bas
    fs.mkdirSync(path.join(tempDir, 'src'));
    const basContent = `
Namespace mod_principal
   Class TPrincipalClass
      Public Sub Main()
         ' hello world
      End Sub
   End Class
End Namespace
    `;
    fs.writeFileSync(path.join(tempDir, 'src', 'Principal.bas'), basContent, 'utf-8');
    
    // 3. Build project
    const destXml = path.join(tempDir, 'out.7proj');
    const result = Builder.buildProject(tempDir, destXml);
    assert.ok(fs.existsSync(destXml), 'Output XML project file exists');
    assert.strictEqual(result, destXml, 'Returns output file path');
    
    // 4. Decompile project
    const decompileDest = path.join(tempDir, 'decompiled');
    fs.mkdirSync(decompileDest);
    Decompiler.decompileProject(destXml, decompileDest);
    
    assert.ok(fs.existsSync(path.join(decompileDest, 'src', 'Principal.bas')), 'Decompiled src/Principal.bas exists');
    assert.ok(fs.existsSync(path.join(decompileDest, 'data7.json')), 'Decompiled data7.json exists');
    
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
