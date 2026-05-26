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
exports.DependencyScanner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DependencyScanner {
    // Find all files in a directory recursively
    static getFilesRecursive(dir, extensions) {
        let results = [];
        if (!fs.existsSync(dir)) {
            return results;
        }
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(this.getFilesRecursive(filePath, extensions));
            }
            else {
                const ext = path.extname(filePath).toLowerCase();
                if (extensions.includes(ext)) {
                    results.push(filePath);
                }
            }
        });
        return results;
    }
    static scanSharedModules(sharedDir) {
        const map = new Map();
        if (!sharedDir || !fs.existsSync(sharedDir)) {
            return map;
        }
        const files = this.getFilesRecursive(sharedDir, ['.bas']);
        files.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const filename = path.basename(filePath, '.bas');
                // Match "Namespace namespace_name"
                const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
                const modName = nsMatch ? nsMatch[1] : filename;
                map.set(modName.toLowerCase(), {
                    moduleName: modName,
                    sourceFilePath: filePath,
                    isProj: false,
                    code: content,
                    version: '1.0.0.0' // Default fallback for raw files
                });
            }
            catch (err) {
                console.error(`Erro ao ler arquivo .bas no repositório: ${filePath}`, err);
            }
        });
        return map;
    }
    static isIgnoredNamespace(name) {
        const lower = name.toLowerCase();
        if (lower.startsWith('system.') || lower.startsWith('vcl.')) {
            return true;
        }
        // These are native Data7 system namespaces that are always pre-declared in all projects.
        // They do NOT need to be resolved as user modules, but they DO require Imports in each file
        // (just like user modules). This list prevents the module resolver from flagging them as
        // "module not found", while diagnostics.ts still enforces the Imports rule separately.
        const ignoredNames = new Set([
            'system', 'forms', 'sql', 'data7', 'collections', 'drawing', 'xml', 'excel', 'io',
            'environment', 'dateutils', 'datetime', 'math', 'convert', 'application',
            'me', 'mybase', 'vcl'
        ]);
        return ignoredNames.has(lower);
    }
    static stripComments(line) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith("'") || trimmed.startsWith('rem ') || trimmed === 'rem' || trimmed.startsWith('rem\t')) {
            return '';
        }
        const parts = line.split("'");
        return parts[0];
    }
    // Helper to resolve module name using direct name or mod_ prefix
    static resolveModuleName(name, localModules, availableSharedModules) {
        const lowerName = name.toLowerCase();
        if (localModules.has(lowerName)) {
            return null; // Already defined locally in src/
        }
        if (availableSharedModules.has(lowerName)) {
            return lowerName;
        }
        const prefixedName = 'mod_' + lowerName;
        if (availableSharedModules.has(prefixedName)) {
            return prefixedName;
        }
        if (lowerName.startsWith('mod_') && availableSharedModules.has(lowerName.substring(4))) {
            return lowerName.substring(4);
        }
        return null;
    }
    // Scan local src/ files for any references to modules
    static detectReferencedModules(srcDir, availableSharedModules) {
        const referenced = new Set();
        if (!fs.existsSync(srcDir)) {
            return referenced;
        }
        // Get all local .bas files
        const basFiles = this.getFilesRecursive(srcDir, ['.bas']);
        // Find local module names so we don't treat them as external dependencies
        const localModules = new Set();
        basFiles.forEach(file => {
            const filename = path.basename(file, '.bas');
            localModules.add(filename.toLowerCase());
            // Also parse namespace in local file just in case
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
                if (nsMatch) {
                    localModules.add(nsMatch[1].toLowerCase());
                }
            }
            catch { }
        });
        // Regexes to detect references
        const importsRegex = /\bImports\s+([a-zA-Z0-9_]+)/gi;
        const directCallRegex = /\b(mod_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)(?=\.)/gi; // Matches mod_abc.xyz or console.log (captures console/mod_abc)
        basFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                // 1. Scan explicit imports
                let match;
                while ((match = importsRegex.exec(content)) !== null) {
                    const resolved = this.resolveModuleName(match[1], localModules, availableSharedModules);
                    if (resolved) {
                        referenced.add(resolved);
                    }
                }
                // 2. Scan direct references
                let dMatch;
                while ((dMatch = directCallRegex.exec(content)) !== null) {
                    const resolved = this.resolveModuleName(dMatch[1], localModules, availableSharedModules);
                    if (resolved) {
                        referenced.add(resolved);
                    }
                }
            }
            catch (err) {
                console.error(`Erro ao escanear arquivo local para dependências: ${file}`, err);
            }
        });
        return referenced;
    }
    // Extract dependencies and copy them to data7_modules/
    static syncDependencies(srcDir, data7ModulesDir, sharedDir, dependencies) {
        const synced = [];
        if (!sharedDir || !fs.existsSync(sharedDir)) {
            return synced;
        }
        // 1. Scan shared directory
        const sharedModules = this.scanSharedModules(sharedDir);
        // 2. Filter referenced modules based on explicit dependencies if provided
        const depsToSync = new Set();
        if (dependencies) {
            Object.keys(dependencies).forEach(dep => {
                depsToSync.add(dep.toLowerCase());
            });
        }
        else {
            // Fallback: auto-detect from src/ if no dependencies block exists in JSON
            const referenced = this.detectReferencedModules(srcDir, sharedModules);
            referenced.forEach(r => depsToSync.add(r));
        }
        // 3. Resolve to unique source file paths to sync
        const sourceFilePaths = new Set();
        depsToSync.forEach(dep => {
            const info = sharedModules.get(dep);
            if (info) {
                sourceFilePaths.add(info.sourceFilePath);
            }
        });
        if (sourceFilePaths.size === 0) {
            // Clean data7_modules folder if empty
            if (fs.existsSync(data7ModulesDir)) {
                const existingFiles = fs.readdirSync(data7ModulesDir);
                existingFiles.forEach(file => {
                    try {
                        fs.unlinkSync(path.join(data7ModulesDir, file));
                    }
                    catch { }
                });
            }
            return synced;
        }
        // 4. Re-create/update data7_modules folder
        if (!fs.existsSync(data7ModulesDir)) {
            fs.mkdirSync(data7ModulesDir, { recursive: true });
        }
        // 5. Keep track of all files that should remain in data7_modules
        const filesToKeep = new Set();
        // 6. Process each unique source file
        sourceFilePaths.forEach(filePath => {
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.bas') {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const filename = path.basename(filePath);
                    const destPath = path.join(data7ModulesDir, filename);
                    fs.writeFileSync(destPath, content, 'utf-8');
                    filesToKeep.add(filename.toLowerCase());
                    synced.push(path.basename(filePath, '.bas'));
                }
                catch (err) {
                    console.error(`Erro ao copiar dependência bas ${filePath}:`, err);
                }
            }
        });
        // 7. Clean up any files in data7_modules that are not in filesToKeep
        const existingFiles = fs.readdirSync(data7ModulesDir);
        existingFiles.forEach(file => {
            if (!filesToKeep.has(file.toLowerCase())) {
                try {
                    fs.unlinkSync(path.join(data7ModulesDir, file));
                }
                catch { }
            }
        });
        return synced;
    }
}
exports.DependencyScanner = DependencyScanner;
//# sourceMappingURL=dependency-scanner.js.map