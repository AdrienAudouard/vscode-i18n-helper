import * as vscode from 'vscode';

import { I18nTranslations } from '../models/types';
import { TranslationService } from '../services/translation-service';

/**
 * Provides completion items for i18n keys
 */
export class I18nCompletionProvider implements vscode.CompletionItemProvider {
  /**
   * Creates a new I18nCompletionProvider instance
   * @param translationService The translation service to use
   */
  constructor(private readonly translationService: TranslationService) {}
  
  /**
   * Provides completion items for i18n keys
   */
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    if (!this.translationService.translationsLoaded) {
      return [];
    }

    const completionItems: vscode.CompletionItem[] = [];
    const translations = this.translationService.getAllTranslations();
    
    this.addCompletionItems(translations, completionItems);
    
    return completionItems;
  }
  
  /**
   * Recursively adds completion items for all translation keys
   */
  private addCompletionItems(obj: I18nTranslations, completionItems: vscode.CompletionItem[], prefix: string = ''): void {
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const item = new vscode.CompletionItem(fullKey, vscode.CompletionItemKind.Text);
      
      if (typeof value === 'string') {
        item.detail = value;
      }
      
      completionItems.push(item);

      if (typeof value === 'object') {
        this.addCompletionItems(value, completionItems, fullKey);
      }
    }
  }
}