import * as vscode from 'vscode';

import { TranslationService } from '../services/translation-service';
import { I18N_KEY_PATTERN } from '../utils/regex-patterns';

/**
 * Provider class for handling text decorations for i18n keys
 */
export class DecorationProvider {
  private decorationType: vscode.TextEditorDecorationType;

  /**
   * Creates a new DecorationProvider instance
   * @param translationService The translation service to use
   */
  constructor(private readonly translationService: TranslationService) {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1rem',
        color: 'rgba(153, 153, 153, 0.7)'
      }
    });
  }

  /**
   * Gets the decoration type used by this provider
   */
  getDecorationType(): vscode.TextEditorDecorationType {
    return this.decorationType;
  }

  /**
   * Updates decorations in the active editor
   * @param editor The active text editor
   */
  updateDecorations(editor: vscode.TextEditor): void {
    const config = vscode.workspace.getConfiguration('i18nHelper');
    const isEnabled = config.get('enabled');
    
    if (!isEnabled || !this.translationService.translationsLoaded) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    
    const document = editor.document;
    if (document.languageId !== 'typescript' && document.languageId !== 'html') {
      return;
    }
    
    const text = document.getText();
    const decorations: vscode.DecorationOptions[] = [];
    
    // Find potential i18n keys in the document using the shared regex pattern
    const keyPattern = new RegExp(I18N_KEY_PATTERN);
    
    let match;
    while ((match = keyPattern.exec(text))) {
      const key = match[2];
      const translationValue = this.translationService.getTranslationValue(key);
      
      if (translationValue) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        
        const decoration = {
          range,
          renderOptions: {
            after: {
              contentText: `${translationValue}`
            }
          }
        };
        
        decorations.push(decoration);
      }
    }
    
    editor.setDecorations(this.decorationType, decorations);
  }
}