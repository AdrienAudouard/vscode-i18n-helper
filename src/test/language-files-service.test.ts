import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { JsonKeyPathService } from '../services/json-key-path-service';
import { LanguageFilesService } from '../services/language-files-service';

/**
 * Language Files Service Tests
 * Tests the functionality to manage multiple language files
 */
suite('Language Files Service Tests', () => {
  const testWorkspaceDir = path.join(os.tmpdir(), `i18n-language-service-test-${Date.now()}`);
  const i18nDirPath = path.join(testWorkspaceDir, 'src', 'assets', 'i18n');
  let languageFilesService: LanguageFilesService;
  
  suiteSetup(async function() {
    this.timeout(30000);
    
    // Create test workspace with multiple language files
    await fs.ensureDir(i18nDirPath);
    
    // Create sample language files
    await fs.writeFile(
      path.join(i18nDirPath, 'en.json'),
      JSON.stringify({
        general: {
          generate: 'Generate',
          cancel: 'Cancel'
        }
      }, null, 2)
    );
    
    await fs.writeFile(
      path.join(i18nDirPath, 'fr.json'),
      JSON.stringify({
        general: {
          generate: 'Générer',
          cancel: 'Annuler'
        }
      }, null, 2)
    );
    
    await fs.writeFile(
      path.join(i18nDirPath, 'de.json'),
      JSON.stringify({
        general: {
          generate: 'Generieren',
          cancel: 'Abbrechen'
        }
      }, null, 2)
    );
    
    // Also create a non-language file to test filtering
    await fs.writeFile(
      path.join(i18nDirPath, 'config.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );
    
    // Create a new language files service
    const jsonKeyPathService = new JsonKeyPathService();
    languageFilesService = new LanguageFilesService(jsonKeyPathService);
  });
  
  suiteTeardown(async () => {
    try {
      await fs.remove(testWorkspaceDir);
    } catch (error) {
      console.error(`Error cleaning up: ${error}`);
    }
  });
  
  test('Should scan all language files', async function() {
    this.timeout(10000);
    
    // Mock the findFiles method to return our test files
    const originalFindFiles = vscode.workspace.findFiles;
    vscode.workspace.findFiles = async () => {
      return [
        vscode.Uri.file(path.join(i18nDirPath, 'en.json')),
        vscode.Uri.file(path.join(i18nDirPath, 'fr.json')),
        vscode.Uri.file(path.join(i18nDirPath, 'de.json')),
        vscode.Uri.file(path.join(i18nDirPath, 'config.json'))
      ];
    };
    
    // Also mock the workspace configuration
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = (section?: string) => {
      return {
        get: (key: string) => {
          if (section === 'i18nHelper' && key === 'i18nFilePath') {
            return path.relative(testWorkspaceDir, path.join(i18nDirPath, 'en.json'));
          }
          return undefined;
        },
        update: () => Promise.resolve(),
        has: () => false,
        inspect: () => undefined
      } as any;
    };
    
    // Use Object.defineProperty to temporarily mock workspaceFolders
    const mockWorkspaceFolders = [{
      uri: vscode.Uri.file(testWorkspaceDir),
      name: 'test',
      index: 0
    }];
    
    // Save the original descriptor
    const originalDescriptor = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders');
    
    // Mock workspaceFolders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => mockWorkspaceFolders,
      configurable: true
    });
    
    try {
      const languageFiles = await languageFilesService.scanLanguageFiles();
      
      assert.strictEqual(languageFiles.size, 3, 'Should find 3 language files');
      assert.ok(languageFiles.has('en'), 'Should have English language file');
      assert.ok(languageFiles.has('fr'), 'Should have French language file');
      assert.ok(languageFiles.has('de'), 'Should have German language file');
      assert.ok(!languageFiles.has('config'), 'Should not include non-language files');
    } finally {
      // Restore the original methods
      vscode.workspace.findFiles = originalFindFiles;
      vscode.workspace.getConfiguration = originalGetConfiguration;
      
      // Restore original workspaceFolders
      if (originalDescriptor) {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', originalDescriptor);
      }
    }
  });
  
  test('Should identify language files correctly', async function() {
    // Create mock documents for testing
    const enDoc = {
      uri: vscode.Uri.file(path.join(i18nDirPath, 'en.json')),
      fileName: path.join(i18nDirPath, 'en.json'),
      languageId: 'json'
    } as unknown as vscode.TextDocument;
    
    const configDoc = {
      uri: vscode.Uri.file(path.join(i18nDirPath, 'config.json')),
      fileName: path.join(i18nDirPath, 'config.json'),
      languageId: 'json'
    } as unknown as vscode.TextDocument;
    
    assert.strictEqual(
      languageFilesService.isLanguageFile(enDoc), 
      true, 
      'Should identify en.json as language file'
    );
    
    assert.strictEqual(
      languageFilesService.isLanguageFile(configDoc),
      false,
      'Should not identify config.json as language file'
    );
  });
  
  test('Should extract language code from file path', () => {
    const enPath = path.join(i18nDirPath, 'en.json');
    const frPath = path.join(i18nDirPath, 'fr.json');
    const configPath = path.join(i18nDirPath, 'config.json');
    
    assert.strictEqual(languageFilesService.getLanguageCodeFromPath(enPath), 'en', 'Should extract en language code');
    assert.strictEqual(languageFilesService.getLanguageCodeFromPath(frPath), 'fr', 'Should extract fr language code');
    assert.strictEqual(languageFilesService.getLanguageCodeFromPath(configPath), undefined, 'Should return undefined for non-language files');
  });
});