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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const builder_1 = require("../builder");
const decompiler_1 = require("../decompiler");
(0, node_test_1.test)('Builder & Decompiler workflow', () => {
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
            virtualFolders: [],
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
        const result = builder_1.Builder.buildProject(tempDir, destXml);
        assert.ok(fs.existsSync(destXml), 'Output XML project file exists');
        assert.strictEqual(result, destXml, 'Returns output file path');
        // 4. Decompile project
        const decompileDest = path.join(tempDir, 'decompiled');
        fs.mkdirSync(decompileDest);
        decompiler_1.Decompiler.decompileProject(destXml, decompileDest);
        assert.ok(fs.existsSync(path.join(decompileDest, 'src', 'Principal.bas')), 'Decompiled src/Principal.bas exists');
        assert.ok(fs.existsSync(path.join(decompileDest, 'data7.json')), 'Decompiled data7.json exists');
    }
    finally {
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=builder.test.js.map