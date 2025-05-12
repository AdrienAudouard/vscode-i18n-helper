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
      }
    } catch (error) {
      console.error('Error navigating to translation:', error);
      vscode.window.showErrorMessage(`Error navigating to translation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}