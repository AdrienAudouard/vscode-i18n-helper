import * as vscode from 'vscode';
import { LanguageFilesService } from '../services/language-files-service';
import { JsonKeyPathService } from '../services/json-key-path-service';

/**
 * Provider for adding CodeLens items that allow navigation between language files
 * when a user's cursor is on a translation key
 */
export class LanguageNavigationCodeLensProvider implements vscode.CodeLensProvider {
  /**
   * Current cursor position in the active document
   * @private
   */
  private currentCursorPosition: vscode.Position | undefined;
  
  /**
   * Creates a new LanguageNavigationCodeLensProvider instance
   * @param languageFilesService The language files service to use
   * @param jsonKeyPathService The JSON key path service to use
   */
  constructor(
    private readonly languageFilesService: LanguageFilesService,
    private readonly jsonKeyPathService: JsonKeyPathService
  ) {
    // Initialize cursor tracking
    if (vscode.window.activeTextEditor) {
      this.currentCursorPosition = vscode.window.activeTextEditor.selection.active;
    }
  }

  /**
   * Event emitter for CodeLens refresh
   */
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  
  /**
   * Event that fires when CodeLenses need to be refreshed
   */
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  /**
   * Refresh CodeLenses
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Update the current cursor position
   * @param position New cursor position
   */
  public updateCursorPosition(position: vscode.Position | undefined): void {
    this.currentCursorPosition = position;
    this.refresh();
  }

  /**
   * Provides CodeLens items for the given document
   * @param document The document to provide CodeLens for
   * @param token A cancellation token
   * @returns An array of CodeLens items or a thenable that resolves to such
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // Check if the feature is enabled
    const config = vscode.workspace.getConfiguration('i18nHelper');
    const isCodeLensEnabled = config.get<boolean>('showTranslationButtons', true);
    
    if (!isCodeLensEnabled) {
      return [];
    }
    
    // Check if document is a language file
    if (!this.languageFilesService.isLanguageFile(document)) {
      return [];
    }

    // Get available language files
    const languageFiles = this.languageFilesService.getLanguageFiles();
    if (languageFiles.size <= 1) {
      return [];
    }

    // Get current language
    const currentLanguage = this.languageFilesService.getLanguageCodeFromPath(document.uri.fsPath);
    if (!currentLanguage) {
      return [];
    }

    // If there's no cursor position, or cursor is not in this document, return empty array
    if (!this.currentCursorPosition || 
        !vscode.window.activeTextEditor || 
        vscode.window.activeTextEditor.document.uri.fsPath !== document.uri.fsPath) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    
    // Only process the line where the cursor is
    const cursorLineIndex = this.currentCursorPosition.line;
    const line = document.lineAt(cursorLineIndex);
    const text = line.text.trim();

    // Skip empty lines, object opening/closing, and array items
    if (text.length === 0 || text === '{' || text === '}' || text === '[' || text === ']' || text === ',') {
      return [];
    }
    
    // Check if this line contains a key (has a colon)
    if (text.includes(':')) {
      const position = new vscode.Position(cursorLineIndex, 0);
      const keyPath = this.jsonKeyPathService.getKeyPathAtPosition(document, position);
      
      if (keyPath) {
        // Create navigation buttons for all other languages
        const range = line.range;
        
        // Create individual CodeLens for each language for better visibility
        for (const [languageCode, _] of languageFiles) {
          // Skip current language
          if (languageCode === currentLanguage) {
            continue;
          }

          // Create a CodeLens for each language
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `${languageCode.toUpperCase()}`,
              command: 'i18n-studio.navigateToTranslation',
              arguments: [document, position, languageCode],
              tooltip: `Navigate to ${languageCode.toUpperCase()} translation`
            })
          );
        }
      }
    }

    return codeLenses;
  }
}