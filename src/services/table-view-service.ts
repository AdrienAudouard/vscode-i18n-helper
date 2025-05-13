import * as path from 'path';
import * as vscode from 'vscode';

import { I18nTranslations } from '../models/types';
import { JsonKeyPathService } from './json-key-path-service';
import { LanguageFilesService } from './language-files-service';

/**
 * Service for handling the translation table view functionality
 */
export class TableViewService {
  private panel: vscode.WebviewPanel | undefined;

  /**
   * Creates a new TableViewService instance
   * @param context The extension context
   * @param languageFilesService The language files service to use
   * @param jsonKeyPathService The JSON key path service to use
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly languageFilesService: LanguageFilesService,
    private readonly jsonKeyPathService: JsonKeyPathService
  ) {}

  /**
   * Shows the translation table view
   * @param document The current JSON document
   */
  async showTableView(document: vscode.TextDocument): Promise<void> {
    // Check if document is a language file
    if (!this.languageFilesService.isLanguageFile(document)) {
      vscode.window.showWarningMessage('Table view is only available for language files');
      return;
    }

    // Get the current language code
    const currentLanguage = this.languageFilesService.getLanguageCodeFromPath(document.uri.fsPath);
    if (!currentLanguage) {
      vscode.window.showWarningMessage('Cannot determine language from file path');
      return;
    }

    // Make sure language files are scanned
    await this.languageFilesService.scanLanguageFiles();
    const languageFiles = this.languageFilesService.getLanguageFiles();

    if (languageFiles.size === 0) {
      vscode.window.showWarningMessage('No language files found');
      return;
    }

    try {
      // Load all language data
      const languageData = new Map<string, I18nTranslations>();
      
      // First load the current language to determine structure
      const currentContent = await this.loadLanguageFile(document.uri.fsPath);
      languageData.set(currentLanguage, currentContent);

      // Load other language files
      for (const [langCode, filePath] of languageFiles) {
        if (langCode !== currentLanguage) {
          const content = await this.loadLanguageFile(filePath);
          languageData.set(langCode, content);
        }
      }

      // Extract all translation keys
      const allKeys = this.extractAllTranslationKeys(languageData);

      // Create or show the webview panel
      const fileName = path.basename(document.uri.fsPath);
      if (!this.panel) {
        this.panel = vscode.window.createWebviewPanel(
          'i18nTranslationTable',
          `Translation Table: ${fileName}`,
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
            retainContextWhenHidden: true
          }
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
          this.panel = undefined;
        });
      } else {
        this.panel.title = `Translation Table: ${fileName}`;
        this.panel.reveal();
      }

      // Generate HTML content for the table view
      this.panel.webview.html = this.generateTableViewHtml(languageData, allKeys, currentLanguage);

      // Register message handler for saving changes
      this.panel.webview.onDidReceiveMessage(
        async (message) => {
          if (message.type === 'saveChanges') {
            await this.saveTranslationChanges(message.changes);
          } else if (message.type === 'backToJson') {
            // Close this panel and reveal the original document
            this.panel?.dispose();
            const textEditor = await vscode.window.showTextDocument(document);
          }
        },
        undefined,
        this.context.subscriptions
      );

    } catch (error) {
      console.error('Error showing table view:', error);
      vscode.window.showErrorMessage(`Error showing table view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Loads a language file and returns its content as a JSON object
   * @param filePath Path to the language file
   * @returns Promise resolving to the parsed JSON content
   */
  private async loadLanguageFile(filePath: string): Promise<I18nTranslations> {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      const content = doc.getText();
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading language file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extracts all unique translation keys from the language data
   * @param languageData Map of language codes to translation data
   * @returns Array of all unique dot-notation keys
   */
  private extractAllTranslationKeys(languageData: Map<string, I18nTranslations>): string[] {
    const allKeys = new Set<string>();

    // Extract keys from each language
    for (const [_, data] of languageData) {
      this.extractKeys(data, '', (key) => allKeys.add(key));
    }

    return Array.from(allKeys).sort();
  }

  /**
   * Recursively extracts keys from translations object
   * @param obj Translation object
   * @param prefix Current key prefix
   * @param callback Function to call for each extracted key
   */
  private extractKeys(obj: I18nTranslations, prefix: string, callback: (key: string) => void): void {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'string') {
        callback(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        this.extractKeys(value as I18nTranslations, fullKey, callback);
      }
    }
  }

  /**
   * Gets the value of a translation by its dot-notation key
   * @param translations Translation object
   * @param key Dot-notation key
   * @returns The translation value or undefined if not found
   */
  private getTranslationValue(translations: I18nTranslations, key: string): string | undefined {
    const keyParts = key.split('.');
    let current: any = translations;

    for (const part of keyParts) {
      if (current[part] === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Generates the HTML content for the table view
   * @param languageData Map of language codes to translation data
   * @param keys Array of all unique dot-notation keys
   * @param currentLanguage The current language code
   * @returns HTML content string
   */
  private generateTableViewHtml(
    languageData: Map<string, I18nTranslations>, 
    keys: string[],
    currentLanguage: string
  ): string {
    const languageCodes = Array.from(languageData.keys()).sort();
    
    // Move current language to first position
    const currentIndex = languageCodes.indexOf(currentLanguage);
    if (currentIndex > 0) {
      languageCodes.splice(currentIndex, 1);
      languageCodes.unshift(currentLanguage);
    }

    // Generate table rows
    let tableRows = '';
    for (const key of keys) {
      tableRows += `<tr data-key="${key}">
        <td class="key-cell">${key}</td>`;

      for (const langCode of languageCodes) {
        const translations = languageData.get(langCode);
        const value = translations ? this.getTranslationValue(translations, key) : undefined;
        const displayValue = value !== undefined ? value : '';
        
        tableRows += `<td>
          <div class="editable-cell" data-lang="${langCode}" data-key="${key}">${this.escapeHtml(displayValue)}</div>
        </td>`;
      }
      
      tableRows += `</tr>`;
    }

    // Generate table header
    let tableHeader = `<th>Key</th>`;
    for (const langCode of languageCodes) {
      tableHeader += `<th>${langCode.toUpperCase()}</th>`;
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>i18n Translation Table</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
          padding: 20px;
        }
        .toolbar {
          position: sticky;
          top: 0;
          background-color: var(--vscode-editor-background);
          padding: 10px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
          margin-bottom: 10px;
          z-index: 100;
          display: flex;
          justify-content: space-between;
        }
        button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 2px;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid var(--vscode-panel-border);
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
          word-break: break-word;
        }
        th {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          position: sticky;
          top: 53px;
          z-index: 99;
        }
        .key-cell {
          width: 250px;
          font-family: var(--vscode-editor-font-family);
          word-break: break-all;
        }
        .editable-cell {
          min-height: 20px;
          padding: 2px;
          white-space: pre-wrap;
        }
        .editable-cell:focus {
          outline: 2px solid var(--vscode-focusBorder);
          background-color: var(--vscode-editor-background);
        }
        .editable-cell[data-modified="true"] {
          background-color: var(--vscode-diffEditor-insertedTextBackground);
        }
        .search-container {
          margin-bottom: 10px;
        }
        #searchInput {
          width: 300px;
          padding: 5px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
        }
        .highlight {
          background-color: var(--vscode-editor-findMatchHighlightBackground);
        }
        .filter-info {
          margin-left: 10px;
          font-style: italic;
          color: var(--vscode-descriptionForeground);
        }
        .back-btn {
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div class="actions">
          <button class="back-btn" id="backButton">Back to JSON View</button>
          <button id="saveButton">Save Changes</button>
        </div>
        <div class="search-container">
          <input type="text" id="searchInput" placeholder="Search keys and translations...">
          <span id="filterInfo" class="filter-info"></span>
        </div>
      </div>
      <table id="translationTable">
        <thead>
          <tr>${tableHeader}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          const changes = new Map();
          let filtered = false;
          
          // Make cells editable
          document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.setAttribute('contenteditable', 'true');
            
            cell.addEventListener('blur', () => {
              const key = cell.getAttribute('data-key');
              const lang = cell.getAttribute('data-lang');
              const newValue = cell.textContent;
              
              if (!changes.has(lang)) {
                changes.set(lang, new Map());
              }
              
              changes.get(lang).set(key, newValue);
              cell.setAttribute('data-modified', 'true');
            });
          });
          
          // Save button click handler
          document.getElementById('saveButton').addEventListener('click', () => {
            const changesObj = {};
            
            for (const [lang, langChanges] of changes.entries()) {
              changesObj[lang] = {};
              for (const [key, value] of langChanges.entries()) {
                changesObj[lang][key] = value;
              }
            }
            
            vscode.postMessage({
              type: 'saveChanges',
              changes: changesObj
            });
          });
          
          // Back button click handler
          document.getElementById('backButton').addEventListener('click', () => {
            if (changes.size > 0) {
              if (confirm('You have unsaved changes. Are you sure you want to go back to JSON view?')) {
                vscode.postMessage({ type: 'backToJson' });
              }
            } else {
              vscode.postMessage({ type: 'backToJson' });
            }
          });
          
          // Search functionality
          const searchInput = document.getElementById('searchInput');
          const filterInfo = document.getElementById('filterInfo');
          
          searchInput.addEventListener('input', () => {
            const searchText = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#translationTable tbody tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
              const key = row.getAttribute('data-key').toLowerCase();
              const cells = Array.from(row.querySelectorAll('td'));
              
              // Check if the key or any translation contains the search text
              const hasMatch = key.includes(searchText) || 
                cells.some(cell => cell.textContent.toLowerCase().includes(searchText));
              
              if (hasMatch) {
                row.style.display = '';
                visibleCount++;
                
                // Highlight matching text
                if (searchText) {
                  cells.forEach(cell => {
                    const text = cell.textContent;
                    if (text.toLowerCase().includes(searchText)) {
                      const regex = new RegExp(searchText, 'gi');
                      cell.innerHTML = text.replace(regex, match => \`<span class="highlight">\${match}</span>\`);
                    }
                  });
                }
              } else {
                row.style.display = 'none';
              }
            });
            
            filtered = searchText.length > 0;
            if (filtered) {
              filterInfo.textContent = \`Showing \${visibleCount} of \${rows.length} entries\`;
            } else {
              filterInfo.textContent = '';
            }
          });
        })();
      </script>
    </body>
    </html>`;
  }

  /**
   * Saves the translation changes back to the language files
   * @param changes Object containing the changes to save
   */
  private async saveTranslationChanges(changes: Record<string, Record<string, string>>): Promise<void> {
    try {
      // For each language with changes
      for (const [langCode, langChanges] of Object.entries(changes)) {
        // Get the file path for this language
        const filePath = this.languageFilesService.getLanguageFiles().get(langCode);
        if (!filePath) {
          console.error(`No file path found for language ${langCode}`);
          continue;
        }

        // Load the current content
        const document = await vscode.workspace.openTextDocument(filePath);
        const currentContent = JSON.parse(document.getText()) as I18nTranslations;

        // Apply changes
        for (const [key, value] of Object.entries(langChanges)) {
          this.setTranslationValue(currentContent, key, value);
        }

        // Write back to file
        const edit = new vscode.WorkspaceEdit();
        const entireRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        edit.replace(
          document.uri,
          entireRange,
          JSON.stringify(currentContent, null, 2)
        );
        
        await vscode.workspace.applyEdit(edit);
        await document.save();
      }

      vscode.window.showInformationMessage('Translations saved successfully');
    } catch (error) {
      console.error('Error saving translation changes:', error);
      vscode.window.showErrorMessage(`Error saving translation changes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sets the value for a translation by its dot-notation key
   * @param translations Translation object to modify
   * @param key Dot-notation key
   * @param value New value to set
   */
  private setTranslationValue(translations: I18nTranslations, key: string, value: string): void {
    const keyParts = key.split('.');
    let current: any = translations;

    // Navigate to the parent object
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      if (current[part] === undefined) {
        current[part] = {};
      } else if (typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    const lastKey = keyParts[keyParts.length - 1];
    current[lastKey] = value;
  }

  /**
   * Escapes HTML special characters to prevent XSS
   * @param text Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}