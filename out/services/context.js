"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionContextHolder = void 0;
class ExtensionContextHolder {
    static setContext(context) {
        this._context = context;
        this._storagePath = context.globalStorageUri.fsPath;
    }
    static getStoragePath() {
        return this._storagePath;
    }
    static getContext() {
        return this._context;
    }
}
exports.ExtensionContextHolder = ExtensionContextHolder;
ExtensionContextHolder._storagePath = '';
//# sourceMappingURL=context.js.map