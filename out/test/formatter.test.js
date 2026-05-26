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
const formatter_1 = require("../formatter");
(0, node_test_1.test)('CodeFormatter - formatKeywordsInLine', () => {
    assert.strictEqual(formatter_1.CodeFormatter.formatKeywordsInLine("namespace my_app"), "Namespace my_app");
    assert.strictEqual(formatter_1.CodeFormatter.formatKeywordsInLine("public sub run()"), "Public Sub run()");
    assert.strictEqual(formatter_1.CodeFormatter.formatKeywordsInLine("dim a as string"), "Dim a As string");
});
(0, node_test_1.test)('CodeFormatter - formatCode indentation', () => {
    const code = `Namespace my_app
Class TTest
Public Sub Run()
Dim a As String
End Sub
End Class
End Namespace`;
    const formatted = formatter_1.CodeFormatter.formatCode(code);
    assert.ok(formatted.includes('   Class TTest'), 'Indents Class');
    assert.ok(formatted.includes('      Public Sub Run()'), 'Indents Sub');
    assert.ok(formatted.includes('         Dim a As String'), 'Indents Variable');
});
//# sourceMappingURL=formatter.test.js.map