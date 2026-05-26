import * as vscode from 'vscode';

export class ExtensionContextHolder {
  private static _storagePath: string = '';
  private static _context: vscode.ExtensionContext | undefined;

  public static setContext(context: vscode.ExtensionContext) {
    this._context = context;
    this._storagePath = context.globalStorageUri.fsPath;
  }

  public static getStoragePath(): string {
    return this._storagePath;
  }

  public static getContext(): vscode.ExtensionContext | undefined {
    return this._context;
  }
}
