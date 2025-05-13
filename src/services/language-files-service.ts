import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { JsonKeyPathService } from './json-key-path-service';

/**
 * Service for handling multiple language files
 */
export class LanguageFilesService {
  private languageFiles: Map<string, string> = new Map(); // Map of language code -> file path
  
  /**
   * Creates a new LanguageFilesService instance
   * @param jsonKeyPathService The JSON key path service to use
   */
  constructor(private readonly jsonKeyPathService: JsonKeyPathService) {}
  
  /**
   * Scans for available language files based on the current workspace and configuration
   * @returns Promise that resolves to a map of language codes to file paths
   */
  async scanLanguageFiles(): Promise<Map<string, string>> {
    this.languageFiles.clear();
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return this.languageFiles;
    }
    
    const config = vscode.workspace.getConfiguration('i18nHelper');
    const defaultI18nFilePath = config.get('i18nFilePath') as string || 'src/assets/i18n/en.json';
    
    // Extract directory and pattern from the configured file path
    const parsedPath = path.parse(defaultI18nFilePath);
    const i18nDirPath = path.join(parsedPath.dir);
    const filePattern = parsedPath.base.replace(/^[a-z]{2}\.json$/i, '*.json');
    
    // Get absolute path to the i18n directory
    const absoluteDirPath = path.join(workspaceFolders[0].uri.fsPath, i18nDirPath);
    
    try {
      // Check if directory exists
      if (await fs.pathExists(absoluteDirPath)) {
        // Read all files in the directory
        const files = await fs.readdir(absoluteDirPath);
        
        // Filter for language JSON files using regex pattern
        const languageFilePattern = /^([a-z]{2})\.json$/i;
        
        for (const file of files) {
          const match = file.match(languageFilePattern);
          if (match) {
            const languageCode = match[1].toLowerCase();
            const filePath = path.join(absoluteDirPath, file);
            this.languageFiles.set(languageCode, filePath);
          }
        }
        
        console.log(`Found ${this.languageFiles.size} language files`);
      }
    } catch (error) {
      console.error('Error scanning language files:', error);
      vscode.window.showErrorMessage(`Error scanning language files: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return this.languageFiles;
  }
  
  /**
   * Gets all available language files
   * @returns Map of language codes to file paths
   */
  getLanguageFiles(): Map<string, string> {
    return this.languageFiles;
  }
  
  /**
   * Gets the language code from a file path
   * @param filePath The absolute file path
   * @returns The language code or undefined if not a language file
   */
  getLanguageCodeFromPath(filePath: string): string | undefined {
    const fileName = path.basename(filePath);
    const match = fileName.match(/^([a-z]{2})\.json$/i);
    return match ? match[1].toLowerCase() : undefined;
  }
  
  /**
   * Determines if the current file is a language file
   * @param document The current text document
   * @returns True if the document is a language file
   */
  isLanguageFile(document: vscode.TextDocument): boolean {
    if (document.languageId !== 'json') {
      return false;
    }
    
    const fileName = path.basename(document.uri.fsPath);
    return /^[a-z]{2}\.json$/i.test(fileName);
  }
  
  /**
   * Navigates to the same key in another language file
   * @param document The current document
   * @param position The current position
   * @param targetLanguage The language to navigate to
   * @returns Promise that resolves when navigation completes
   */
  async navigateToTranslation(
    document: vscode.TextDocument,
    position: vscode.Position,
    targetLanguage: string
  ): Promise<void> {
    const keyPath = this.jsonKeyPathService.getKeyPathAtPosition(document, position);
    if (!keyPath) {
      vscode.window.showWarningMessage('No translation key found at cursor position');
      return;
    }
    
    const currentLanguage = this.getLanguageCodeFromPath(document.uri.fsPath);
    if (!currentLanguage) {
      vscode.window.showWarningMessage('Current file is not a recognized language file');
      return;
    }
    
    // Make sure we have scanned language files
    if (this.languageFiles.size === 0) {
      await this.scanLanguageFiles();
    }
    
    // Get target language file path
    const targetFilePath = this.languageFiles.get(targetLanguage);
    if (!targetFilePath) {
      vscode.window.showWarningMessage(`No translation file found for language: ${targetLanguage}`);
      return;
    }
    
    try {
      // Open the target language file
      const targetDocument = await vscode.workspace.openTextDocument(targetFilePath);
      const editor = await vscode.window.showTextDocument(targetDocument);
      
      // Try to find the key in the file to position the cursor
      const text = targetDocument.getText();
      const keyParts = keyPath.split('.');
      
      // Function to find the position of a nested key
      const findPositionForKey = (keySegments: string[]): number => {
        let searchPos = 0;
        let currentDepth = 0;
        
        for (const segment of keySegments) {
          const pattern = new RegExp(`"${segment}"\\s*:`, 'g');
          pattern.lastIndex = searchPos;
          
          const match = pattern.exec(text);
          if (match) {
            searchPos = match.index + match[0].length;
            currentDepth++;
          } else {
            break;
          }
        }
        
        return currentDepth === keySegments.length ? searchPos : -1;
      };
      
      const position = findPositionForKey(keyParts);
      
      if (position !== -1) {
        // Calculate line and character from position
        const pos = targetDocument.positionAt(position);
        
        // Set selection at the found position
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter
        );
      } else {
        // Translation key not found in target language file
        // Ask user if they want to create it
        const quickPickItems: vscode.QuickPickItem[] = [
          { label: 'Yes', description: `Create "${keyPath}" in ${targetLanguage}` },
          { label: 'No', description: 'Cancel' }
        ];
        
        const selectedItem = await vscode.window.showQuickPick(
          quickPickItems,
          {
            placeHolder: `Translation key "${keyPath}" not found in ${targetLanguage}. Create it?`
          }
        );
        
        if (selectedItem && selectedItem.label === 'Yes') {
          await this.createMissingTranslation(document, keyPath, targetLanguage);
        }
      }
    } catch (error) {
      console.error('Error navigating to translation:', error);
      vscode.window.showErrorMessage(`Error navigating to translation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Creates a missing translation key in the target language file
   * @param sourceDocument The source document containing the original translation
   * @param keyPath The dot notation key path of the translation
   * @param targetLanguage The target language code
   * @returns Promise that resolves when the translation has been created
   */
  private async createMissingTranslation(
    sourceDocument: vscode.TextDocument,
    keyPath: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      // Get source and target file paths
      const sourceFilePath = sourceDocument.uri.fsPath;
      const targetFilePath = this.languageFiles.get(targetLanguage);
      
      if (!targetFilePath) {
        vscode.window.showErrorMessage(`Target language file for "${targetLanguage}" not found`);
        return;
      }
      
      // Read content from both files
      const sourceContent = await fs.readFile(sourceFilePath, 'utf8');
      const targetContent = await fs.readFile(targetFilePath, 'utf8');
      
      // Parse JSON content
      const sourceJson = JSON.parse(sourceContent);
      const targetJson = JSON.parse(targetContent);
      
      // Get the source translation value
      let sourceValue: string | null = null;
      let currentSourceObj: any = sourceJson;
      const keyParts = keyPath.split('.');
      
      // Navigate the source object to get the value
      for (const part of keyParts) {
        if (currentSourceObj[part] === undefined) {
          sourceValue = null;
          break;
        }
        currentSourceObj = currentSourceObj[part];
      }
      
      if (typeof currentSourceObj !== 'string') {
        sourceValue = null;
      } else {
        sourceValue = currentSourceObj;
      }
      
      // Ask the user for the translation value
      let translationValue: string | undefined;
      
      if (sourceValue) {
        // If we have the source value, provide it as a suggestion
        translationValue = await vscode.window.showInputBox({
          prompt: `Enter translation for "${keyPath}" in ${targetLanguage.toUpperCase()}`,
          value: sourceValue, // Suggest source value as default
          placeHolder: `Translation for ${keyPath}`
        });
      } else {
        // If no source value found, just ask for input
        translationValue = await vscode.window.showInputBox({
          prompt: `Enter translation for "${keyPath}" in ${targetLanguage.toUpperCase()}`,
          placeHolder: `Translation for ${keyPath}`
        });
      }
      
      if (!translationValue) {
        // User cancelled
        return;
      }
      
      // Create the nested structure and add the translation
      let currentTargetObj = targetJson;
      
      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];
        
        if (!currentTargetObj[part]) {
          currentTargetObj[part] = {};
        } else if (typeof currentTargetObj[part] !== 'object') {
          // Convert value to object if needed (rare edge case)
          const oldValue = currentTargetObj[part];
          currentTargetObj[part] = { _value: oldValue };
        }
        
        currentTargetObj = currentTargetObj[part];
      }
      
      // Add the final value
      const lastPart = keyParts[keyParts.length - 1];
      currentTargetObj[lastPart] = translationValue;
      
      // Write updated content back to file
      await fs.writeFile(targetFilePath, JSON.stringify(targetJson, null, 2), 'utf8');
      
      // Reload document to reflect changes if it's already open
      const targetUri = vscode.Uri.file(targetFilePath);
      const openDoc = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === targetFilePath);
      
      if (openDoc) {
        await vscode.window.showTextDocument(openDoc, { preview: false });
        await vscode.commands.executeCommand('workbench.action.files.revert');
      }
      
      // Now navigate to the newly created translation
      const targetDocument = await vscode.workspace.openTextDocument(targetUri);
      const editor = await vscode.window.showTextDocument(targetDocument);
      
      // Try to find the key in the file to position the cursor
      const text = targetDocument.getText();
      
      // Function to find the position of a nested key
      const findPositionForKey = (keySegments: string[]): number => {
        let searchPos = 0;
        let currentDepth = 0;
        
        for (const segment of keySegments) {
          const pattern = new RegExp(`"${segment}"\\s*:`, 'g');
          pattern.lastIndex = searchPos;
          
          const match = pattern.exec(text);
          if (match) {
            searchPos = match.index + match[0].length;
            currentDepth++;
          } else {
            break;
          }
        }
        
        return currentDepth === keySegments.length ? searchPos : -1;
      };
      
      const newPosition = findPositionForKey(keyParts);
      
      if (newPosition !== -1) {
        // Calculate line and character from position
        const pos = targetDocument.positionAt(newPosition);
        
        // Set selection at the found position
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter
        );
        
        vscode.window.showInformationMessage(`Created translation key "${keyPath}" in ${targetLanguage.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error creating missing translation:', error);
      vscode.window.showErrorMessage(`Error creating missing translation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}