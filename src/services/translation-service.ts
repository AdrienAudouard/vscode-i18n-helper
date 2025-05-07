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

  /**
   * Adds a new translation key-value pair to the i18n file
   * @param key The translation key (e.g. "general.submit")
   * @param value The translation value
   * @returns Promise that resolves when the translation is added
   */
  async addTranslation(key: string, value: string): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showWarningMessage('No workspace folder is open');
      return false;
    }

    const config = vscode.workspace.getConfiguration('i18nHelper');
    const i18nFilePath = config.get('i18nFilePath') as string || 'src/assets/i18n/en.json';
    
    const absolutePath = path.join(workspaceFolders[0].uri.fsPath, i18nFilePath);
    
    try {
      // Ensure the file exists
      if (!(await fs.pathExists(absolutePath))) {
        vscode.window.showWarningMessage(`i18n file not found at ${absolutePath}`);
        return false;
      }

      // Read existing translations
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      let translations: I18nTranslations;
      
      try {
        translations = JSON.parse(fileContent);
      } catch (parseError) {
        vscode.window.showErrorMessage(`Error parsing i18n file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        return false;
      }

      // Split the key into parts
      const keyParts = key.split('.');
      
      // Navigate and create the necessary objects
      let currentObj = translations;
      
      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];
        
        if (!currentObj[part]) {
          currentObj[part] = {};
        } else if (typeof currentObj[part] !== 'object') {
          // Cannot add nested key to a non-object
          vscode.window.showErrorMessage(`Cannot add key "${key}" because "${keyParts.slice(0, i + 1).join('.')}" is not an object`);
          return false;
        }
        
        currentObj = currentObj[part];
      }
      
      const lastPart = keyParts[keyParts.length - 1];
      
      // Check if the key already exists
      if (currentObj[lastPart] !== undefined) {
        const result = await vscode.window.showWarningMessage(
          `Key "${key}" already exists with value "${currentObj[lastPart]}". Do you want to overwrite it?`,
          { modal: true },
          'Yes',
          'No'
        );
        
        if (result !== 'Yes') {
          return false;
        }
      }
      
      // Add the translation
      currentObj[lastPart] = value;
      
      // Write the updated translations back to file
      await fs.writeFile(absolutePath, JSON.stringify(translations, null, 2), 'utf-8');
      
      // Update in-memory translations
      this.translations = translations;
      this._translationsLoaded = true;
      
      return true;
    } catch (error) {
      console.error('Error adding translation:', error);
      vscode.window.showErrorMessage(`Error adding translation: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}