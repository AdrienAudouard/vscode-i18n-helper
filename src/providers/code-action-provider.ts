import * as path from 'path';
import * as vscode from 'vscode';

import { TranslationService } from '../services/translation-service';
import { I18N_KEY_PATTERN } from '../utils/regex-patterns';

/**
 * Provides code actions for i18n keys to open the translation file
 */
export class I18nCodeActionProvider implements vscode.CodeActionProvider {
  /**
   * Creates a new I18nCodeActionProvider instance
   * @param translationService The translation service to use
   */
  constructor(private readonly translationService: TranslationService) {}
  
  /**
   * Provides code actions for i18n keys
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    // Only provide code actions if translations are loaded
    if (!this.translationService.translationsLoaded) {
      return [];
    }
    
    const line = document.lineAt(range.start.line);
    const text = line.text;
    
    // Find potential i18n keys in the line using the shared regex pattern
    const keyPattern = new RegExp(I18N_KEY_PATTERN);
    
    const codeActions: vscode.CodeAction[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = keyPattern.exec(text)) !== null) {
      const keyStart = match.index + 1; // +1 to skip the quote
      const keyEnd = keyStart + match[2].length;
      
      // Check if the range intersects with the key
      if (
        (range.start.character >= keyStart && range.start.character <= keyEnd) ||
        (range.end.character >= keyStart && range.end.character <= keyEnd)
      ) {
        const key = match[2];
        const translationValue = this.translationService.getTranslationValue(key);
        
        // Only provide code action if translation exists
        if (translationValue) {
          const action = this.createCodeAction(key);
          codeActions.push(action);
        }
      }
    }
    
    return codeActions;
  }
  
  /**
   * Creates a code action to open the translation file at the i18n key
   */
  private createCodeAction(key: string): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Open translation file for '${key}'`,
      vscode.CodeActionKind.QuickFix
    );
    
    action.command = {
      title: `Open translation file for '${key}'`,
      command: 'i18n-helper.openTranslationFile',
      arguments: [key]
    };
    
    return action;
  }
}