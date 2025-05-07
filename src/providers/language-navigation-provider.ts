import * as vscode from 'vscode';

import { LanguageFilesService } from '../services/language-files-service';

/**
 * Provider class for navigating between language files
 */
export class LanguageNavigationProvider implements vscode.CodeActionProvider {
  /**
   * Creates a new LanguageNavigationProvider instance
   * @param languageFilesService The language files service to use
   */
  constructor(private readonly languageFilesService: LanguageFilesService) {}
  
  /**
   * Provides code actions for navigating between language files
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
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
    
    // Create code actions for each available language (except current)
    const codeActions: vscode.CodeAction[] = [];
    
    for (const [languageCode, _] of languageFiles) {
      // Skip current language
      if (languageCode === currentLanguage) {
        continue;
      }
      
      const action = new vscode.CodeAction(
        `View in ${languageCode.toUpperCase()} translation file`,
        vscode.CodeActionKind.QuickFix
      );
      
      action.command = {
        title: `Navigate to ${languageCode.toUpperCase()} translation`,
        command: 'i18n-studio.navigateToTranslation',
        arguments: [document, range.start, languageCode]
      };
      
      // Add an icon if possible (VS Code 1.56+)
      if ('isPreferred' in action) {
        action.isPreferred = true;
      }
      
      codeActions.push(action);
    }
    
    return codeActions;
  }
}