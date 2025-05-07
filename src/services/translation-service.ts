import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { I18nTranslations } from '../models/types';

/**
 * Service for handling i18n translations
 */
export class TranslationService {
  private translations: I18nTranslations = {};
  private _translationsLoaded = false;

  /**
   * Indicates whether translations have been successfully loaded
   */
  get translationsLoaded(): boolean {
    return this._translationsLoaded;
  }

  /**
   * Gets all available translations
   */
  getAllTranslations(): I18nTranslations {
    return this.translations;
  }

  /**
   * Loads translations from the i18n file
   * @returns Promise that resolves when translations are loaded
   */
  async loadTranslations(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showWarningMessage('No workspace folder is open');
      this._translationsLoaded = false;
      return;
    }

    const config = vscode.workspace.getConfiguration('i18nHelper');
    const i18nFilePath = config.get('i18nFilePath') as string || 'src/assets/i18n/en.json';
    
    const absolutePath = path.join(workspaceFolders[0].uri.fsPath, i18nFilePath);
    
    try {
      if (await fs.pathExists(absolutePath)) {
        const fileContent = await fs.readFile(absolutePath, 'utf-8');
        this.translations = JSON.parse(fileContent);
        this._translationsLoaded = true;
        console.log(`i18n translations loaded from ${absolutePath}`);
      } else {
        vscode.window.showWarningMessage(`i18n file not found at ${absolutePath}`);
        this._translationsLoaded = false;
      }
    } catch (error) {
      console.error('Error loading i18n translations:', error);
      vscode.window.showErrorMessage(`Error loading i18n file: ${error instanceof Error ? error.message : String(error)}`);
      this._translationsLoaded = false;
    }
  }

  /**
   * Gets translation value for a specific key
   * @param key The translation key (e.g. "general.generate")
   * @returns The translation value or undefined if not found
   */
  getTranslationValue(key: string): string | undefined {
    const keyParts = key.split('.');
    let currentObj: any = this.translations;
    
    for (const part of keyParts) {
      if (currentObj[part] === undefined) {
        return undefined;
      }
      currentObj = currentObj[part];
    }
    
    return typeof currentObj === 'string' ? currentObj : undefined;
  }
}