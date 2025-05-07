import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { JsonKeyPathService } from '../services/json-key-path-service';
import { LanguageFilesService } from '../services/language-files-service';
import { TranslationService } from '../services/translation-service';

/**
 * Registers all extension commands
 * @param translationService The translation service to use
 * @param jsonKeyPathService The JSON key path service to use
 * @param languageFilesService The language files service to use
 * @returns Array of disposables for the registered commands
 */
export function registerCommands(
  translationService: TranslationService,
  jsonKeyPathService: JsonKeyPathService,
  languageFilesService: LanguageFilesService
): vscode.Disposable[] {
  // Register a command to manually reload translations
  const reloadCommand = vscode.commands.registerCommand('i18n-studio.reloadTranslations', async () => {
    await translationService.loadTranslations();
    await languageFilesService.scanLanguageFiles();
    vscode.window.showInformationMessage('i18n translations reloaded');
  });

  // Register a command to toggle i18n-studio
  const toggleCommand = vscode.commands.registerCommand('i18n-studio.toggle', () => {
    const config = vscode.workspace.getConfiguration('i18nHelper');
    const isEnabled = config.get('enabled');
    config.update('enabled', !isEnabled, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`i18n-studio ${!isEnabled ? 'enabled' : 'disabled'}`);
  });

  // Register a command to open the translation file at a specific key
  const openTranslationFileCommand = vscode.commands.registerCommand('i18n-studio.openTranslationFile', async (key: string) => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showWarningMessage('No workspace folder is open');
      return;
    }

    const config = vscode.workspace.getConfiguration('i18nHelper');
    const i18nFilePath = config.get('i18nFilePath') as string || 'src/assets/i18n/en.json';
    const absolutePath = path.join(workspaceFolders[0].uri.fsPath, i18nFilePath);

    try {
      if (await fs.pathExists(absolutePath)) {
        // Open the file
        const document = await vscode.workspace.openTextDocument(absolutePath);
        const editor = await vscode.window.showTextDocument(document);
        
        // Try to find the key in the file to position the cursor
        const text = document.getText();
        const keyParts = key.split('.');
        
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
          const pos = document.positionAt(position);
          
          // Set selection at the found position
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(
            new vscode.Range(pos, pos),
            vscode.TextEditorRevealType.InCenter
          );
        }
      } else {
        vscode.window.showWarningMessage(`i18n file not found at ${absolutePath}`);
      }
    } catch (error) {
      console.error('Error opening translation file:', error);
      vscode.window.showErrorMessage(`Error opening i18n file: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Register a command to copy the JSON key path
  const copyJsonKeyPathCommand = vscode.commands.registerCommand('i18n-studio.copyJsonKeyPath', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'json') {
      return;
    }

    const position = editor.selection.active;
    const keyPath = jsonKeyPathService.getKeyPathAtPosition(editor.document, position);

    if (keyPath) {
      await vscode.env.clipboard.writeText(keyPath);
      vscode.window.showInformationMessage(`Copied key path: ${keyPath}`);
    } else {
      vscode.window.showInformationMessage('No valid JSON key found at cursor position');
    }
  });

  // Register a command to add selected text to i18n file
  const addSelectionToI18nCommand = vscode.commands.registerCommand('i18n-studio.addSelectionToI18n', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
      vscode.window.showWarningMessage('No text selected');
      return;
    }

    // Get the selected text
    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText.trim()) {
      vscode.window.showWarningMessage('Selected text is empty');
      return;
    }

    // Prompt for translation key
    const key = await vscode.window.showInputBox({
      prompt: 'Enter translation key (e.g., common.buttons.submit)',
      placeHolder: 'category.subcategory.key',
      validateInput: (input) => {
        if (!input || !input.trim()) {
          return 'Key cannot be empty';
        }
        if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/.test(input)) {
          return 'Invalid key format. Use dot notation with alphanumeric characters and underscores only';
        }
        return null;
      }
    });

    if (!key) {
      // User cancelled
      return;
    }

    // Add the translation
    const success = await translationService.addTranslation(key, selectedText);
    if (success) {
      vscode.window.showInformationMessage(`Added translation key "${key}" with value "${selectedText}"`);
      
      // Reload translations to ensure everything is up to date
      await translationService.loadTranslations();
      
      // Ask if user wants to replace the selected text with the i18n key reference
      const replaceSelection = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Replace selected text with i18n key reference?'
      });
      
      if (replaceSelection === 'Yes') {
        // Determine the appropriate format based on file type
        let replacement = key;
        
        switch (editor.document.languageId) {
          case 'typescript': 
          case 'javascript':
            // Assume Angular's TranslateService usage
            replacement = `this.translateService.instant('${key}')`;
            break;
          case 'html':
            // Assume Angular's translate pipe
            replacement = `{{ '${key}' | translate }}`;
            break;
          // Add more cases for other frameworks as needed
        }
        
        // Replace the selected text
        editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, replacement);
        });
      }
    }
  });

  // Register command to navigate to translations in other language files
  const navigateToTranslationCommand = vscode.commands.registerCommand(
    'i18n-studio.navigateToTranslation',
    async (document: vscode.TextDocument, position: vscode.Position, targetLanguage: string) => {
      await languageFilesService.navigateToTranslation(document, position, targetLanguage);
    }
  );

  return [
    reloadCommand, 
    toggleCommand, 
    openTranslationFileCommand, 
    copyJsonKeyPathCommand,
    addSelectionToI18nCommand,
    navigateToTranslationCommand
  ];
}