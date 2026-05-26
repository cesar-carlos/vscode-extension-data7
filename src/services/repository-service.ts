import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { XMLParser } from 'fast-xml-parser';
import { ExtensionContextHolder } from './context';
import { DependencyScanner } from '../dependency-scanner';

export class RepositoryService {
  /**
   * Returns the exclusive repository path for decompiled .bas modules
   */
  public static getRepoBasPath(): string {
    const storagePath = ExtensionContextHolder.getStoragePath();
    if (!storagePath) {
      // Fallback safe path for unit tests or before activation
      const fallback = path.join(os.homedir(), '.data7_extension', 'repository');
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    }
    const repoBasPath = path.join(storagePath, 'repository');
    if (!fs.existsSync(repoBasPath)) {
      fs.mkdirSync(repoBasPath, { recursive: true });
    }
    return repoBasPath;
  }

  /**
   * Helper to decode HTML entities in XML code nodes
   */
  private static decodeHtmlEntities(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Configuration helper to ensure Shared Modules path is configured
   */
  public static async ensureSharedModulesPath(config: vscode.WorkspaceConfiguration): Promise<string | undefined> {
    let sharedModulesPath = config.get<string>('sharedModulesPath') || '';
    if (!sharedModulesPath || !fs.existsSync(sharedModulesPath)) {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Selecione a pasta que contém os Módulos Compartilhados (.bas ou .7Proj)'
      });
      if (selected && selected.length > 0) {
        sharedModulesPath = selected[0].fsPath;
        await config.update('sharedModulesPath', sharedModulesPath, vscode.ConfigurationTarget.Global);
      } else {
        return undefined;
      }
    }
    return sharedModulesPath;
  }

  /**
   * Import a single module file (.bas or from .7Proj) into the private repository
   */
  public static async importModuleToRepository() {
    const repoBasPath = this.getRepoBasPath();
    const config = vscode.workspace.getConfiguration('data7');
    const sharedModulesDir = config.get<string>('sharedModulesPath') || '';
    const defaultUri = sharedModulesDir && fs.existsSync(sharedModulesDir) ? vscode.Uri.file(sharedModulesDir) : undefined;

    // 1. Select source file
    const selectedFiles = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri,
      filters: { 'Data7 Modules/Projects': ['bas', '7proj', '7Proj'] },
      title: 'Selecione o arquivo de origem (.bas ou .7Proj) para importar'
    });

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const sourceFile = selectedFiles[0].fsPath;
    const ext = path.extname(sourceFile).toLowerCase();

    if (ext === '.bas') {
      try {
        const content = fs.readFileSync(sourceFile, 'utf-8');
        const contentLower = content.toLowerCase();
        const isModule = contentLower.includes('@module') && !contentLower.includes('@module-imported');
        if (!isModule) {
          vscode.window.showWarningMessage('O arquivo selecionado não possui a flag @Module ou contém @Module-Imported. Importação não permitida.');
          return;
        }

        const filename = path.basename(sourceFile, '.bas');
        const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
        const modName = nsMatch ? nsMatch[1] : filename;
        
        const destPath = path.join(repoBasPath, `${modName}.bas`);
        fs.writeFileSync(destPath, content, 'utf-8');
        
        vscode.window.showInformationMessage(`Módulo "${modName}" importado com sucesso para o repositório.`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Erro ao importar arquivo .bas: ${err.message}`);
      }
    } else if (ext === '.7proj') {
      try {
        const xmlContent = fs.readFileSync(sourceFile, 'utf-8');
        const parser = new XMLParser({
          ignoreAttributes: true,
          parseTagValue: false
        });
        const parsed = parser.parse(xmlContent);
        const root = parsed.Projeto_Data7;
        if (!root || !root.Modulos) {
          vscode.window.showErrorMessage('Nenhum módulo encontrado no arquivo .7Proj selecionado.');
          return;
        }

        const modulosContainer = root.Modulos;
        const modNames = Object.keys(modulosContainer).filter(name => {
          if (name.startsWith('#') || name.startsWith('@_')) { return false; }
          const mod = modulosContainer[name];
          const code = (mod.Codigo || '').toLowerCase();
          return code.includes('@module') && !code.includes('@module-imported');
        });
        
        if (modNames.length === 0) {
          vscode.window.showErrorMessage('Nenhum módulo válido com a flag @Module (e sem @Module-Imported) encontrado na tag <Modulos>.');
          return;
        }

        const pick = await vscode.window.showQuickPick(modNames, {
          placeHolder: 'Selecione o(s) módulo(s) para importar para o repositório:',
          canPickMany: true,
          ignoreFocusOut: true
        });

        if (!pick || pick.length === 0) {
          return;
        }

        let count = 0;
        pick.forEach(modName => {
          const mod = modulosContainer[modName];
          const rawCode = mod.Codigo || '';
          const decodedCode = this.decodeHtmlEntities(rawCode);
          const destPath = path.join(repoBasPath, `${modName}.bas`);
          fs.writeFileSync(destPath, decodedCode, 'utf-8');
          count++;
        });

        vscode.window.showInformationMessage(`${count} módulo(s) importados com sucesso para o repositório.`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Erro ao processar arquivo .7Proj: ${err.message}`);
      }
    }
  }

  /**
   * Scan folder for modules and bulk import selected items to exclusive repository
   */
  public static async bulkImportToRepository() {
    const repoBasPath = this.getRepoBasPath();
    const config = vscode.workspace.getConfiguration('data7');
    const sharedModulesDir = config.get<string>('sharedModulesPath') || '';
    const defaultUri = sharedModulesDir && fs.existsSync(sharedModulesDir) ? vscode.Uri.file(sharedModulesDir) : undefined;

    const selectedFolders = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri,
      title: 'Selecione a pasta de origem para escanear e importar módulos'
    });

    if (!selectedFolders || selectedFolders.length === 0) {
      return;
    }

    const sourceDir = selectedFolders[0].fsPath;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Escaneando pasta por módulos...',
      cancellable: false
    }, async () => {
      try {
        const files = DependencyScanner.getFilesRecursive(sourceDir, ['.bas', '.7proj']);
        if (files.length === 0) {
          vscode.window.showWarningMessage('Nenhum arquivo .bas ou .7Proj encontrado na pasta selecionada.');
          return;
        }

        interface DetectedModule {
          modName: string;
          sourcePath: string;
          code: string;
          type: 'bas' | '7proj';
        }

        const detectedList: DetectedModule[] = [];
        const parser = new XMLParser({
          ignoreAttributes: true,
          parseTagValue: false
        });

        for (const filePath of files) {
          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.bas') {
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              const contentLower = content.toLowerCase();
              if (contentLower.includes('@module') && !contentLower.includes('@module-imported')) {
                const filename = path.basename(filePath, '.bas');
                const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
                const modName = nsMatch ? nsMatch[1] : filename;
                detectedList.push({
                  modName,
                  sourcePath: filePath,
                  code: content,
                  type: 'bas'
                });
              }
            } catch {}
          } else if (ext === '.7proj') {
            try {
              const xmlContent = fs.readFileSync(filePath, 'utf-8');
              const parsed = parser.parse(xmlContent);
              const root = parsed.Projeto_Data7;
              if (root && root.Modulos) {
                const modulosContainer = root.Modulos;
                Object.keys(modulosContainer).forEach(modName => {
                  if (modName.startsWith('#') || modName.startsWith('@_')) { return; }
                  const mod = modulosContainer[modName];
                  const rawCode = mod.Codigo || '';
                  const codeLower = rawCode.toLowerCase();
                  if (codeLower.includes('@module') && !codeLower.includes('@module-imported')) {
                    const decodedCode = this.decodeHtmlEntities(rawCode);
                    detectedList.push({
                      modName,
                      sourcePath: filePath,
                      code: decodedCode,
                      type: '7proj'
                    });
                  }
                });
              }
            } catch {}
          }
        }

        if (detectedList.length === 0) {
          vscode.window.showInformationMessage('Nenhum módulo detectado nos arquivos da pasta de origem.');
          return;
        }

        const quickPickItems = detectedList.map(d => ({
          label: d.modName,
          description: `Origem: ${path.basename(d.sourcePath)} (${d.type === 'bas' ? 'bas' : '7proj'})`,
          detail: d.sourcePath,
          moduleData: d
        }));

        const selected = await vscode.window.showQuickPick(quickPickItems, {
          placeHolder: 'Selecione os módulos que deseja importar/aprovar para o repositório',
          canPickMany: true,
          ignoreFocusOut: true
        });

        if (!selected || selected.length === 0) {
          return;
        }

        const selectedNames = new Set<string>();
        const duplicates = new Set<string>();

        for (const item of selected) {
          const nameLower = item.moduleData.modName.toLowerCase();
          if (selectedNames.has(nameLower)) {
            duplicates.add(item.moduleData.modName);
          }
          selectedNames.add(nameLower);
        }

        if (duplicates.size > 0) {
          vscode.window.showErrorMessage(
            `Importação cancelada. Você selecionou múltiplas fontes para o(s) mesmo(s) módulo(s): ${Array.from(duplicates).join(', ')}. Escolha apenas uma fonte por módulo.`
          );
          return;
        }

        let count = 0;
        for (const item of selected) {
          const d = item.moduleData;
          const destPath = path.join(repoBasPath, `${d.modName}.bas`);
          fs.writeFileSync(destPath, d.code, 'utf-8');
          count++;
        }

        vscode.window.showInformationMessage(`${count} módulo(s) importados e limpos com sucesso no repositório.`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Erro ao realizar varredura/importação: ${err.message}`);
      }
    });
  }

  /**
   * Manage files in the private extension repository folder
   */
  public static async exploreRepository() {
    const repoBasPath = this.getRepoBasPath();

    let files: string[] = [];
    try {
      files = fs.readdirSync(repoBasPath).filter(f => f.toLowerCase().endsWith('.bas'));
    } catch (err: any) {
      vscode.window.showErrorMessage(`Erro ao ler repositório: ${err.message}`);
      return;
    }

    if (files.length === 0) {
      vscode.window.showInformationMessage('Nenhum módulo encontrado no repositório.');
      return;
    }

    const quickPickItems = files.map(file => {
      const filePath = path.join(repoBasPath, file);
      let preview = '';
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        preview = lines.filter(l => l.trim().length > 0).slice(0, 3).join(' | ');
      } catch {}
      return {
        label: path.basename(file, '.bas'),
        description: file,
        detail: preview || filePath,
        filePath
      };
    });

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Selecione o módulo do repositório para gerenciar',
      ignoreFocusOut: true
    });

    if (!selected) {
      return;
    }

    const action = await vscode.window.showQuickPick(
      ['Abrir arquivo para Visualizar/Editar', 'Excluir Módulo do Repositório'],
      {
        placeHolder: `Ação para o módulo "${selected.label}"`,
        ignoreFocusOut: true
      }
    );

    if (!action) {
      return;
    }

    if (action === 'Abrir arquivo para Visualizar/Editar') {
      const doc = await vscode.workspace.openTextDocument(selected.filePath);
      await vscode.window.showTextDocument(doc);
    } else if (action === 'Excluir Módulo do Repositório') {
      const confirm = await vscode.window.showWarningMessage(
        `Deseja realmente excluir o módulo "${selected.label}" do repositório?`,
        { modal: true },
        'Sim',
        'Não'
      );
      if (confirm === 'Sim') {
        try {
          fs.unlinkSync(selected.filePath);
          vscode.window.showInformationMessage(`Módulo "${selected.label}" excluído do repositório.`);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Erro ao excluir módulo: ${err.message}`);
        }
      }
    }
  }
}
