import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as sinon from 'sinon';
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

  test('Should handle creating missing translations when navigating', async function() {
    this.timeout(15000);
    
    // Setup sandbox for sinon stubs
    const sandbox = sinon.createSandbox();
    
    // Create temporary test files for this test specifically
    const tempDir = path.join(os.tmpdir(), `i18n-missing-translation-test-${Date.now()}`);
    const tempI18nDir = path.join(tempDir, 'i18n');
    await fs.ensureDir(tempI18nDir);
    
    // Create source language file with translation
    const sourceContent = {
      common: {
        buttons: {
          save: "Save",
          cancel: "Cancel"
        }
      },
      dashboard: {
        title: "Dashboard"
      }
    };
    
    await fs.writeFile(
      path.join(tempI18nDir, 'en.json'),
      JSON.stringify(sourceContent, null, 2)
    );
    
    // Create target language file without the dashboard section
    const targetContent = {
      common: {
        buttons: {
          save: "Speichern",
          cancel: "Abbrechen"
        }
      }
      // dashboard section deliberately missing
    };
    
    await fs.writeFile(
      path.join(tempI18nDir, 'de.json'),
      JSON.stringify(targetContent, null, 2)
    );
    
    try {
      // Create a service instance specifically for this test
      const jsonKeyPathService = new JsonKeyPathService();
      const tempLanguageFilesService = new LanguageFilesService(jsonKeyPathService);
      
      // Mock language files to use our temp files
      const tempLanguageFiles = new Map<string, string>();
      tempLanguageFiles.set('en', path.join(tempI18nDir, 'en.json'));
      tempLanguageFiles.set('de', path.join(tempI18nDir, 'de.json'));
      
      // Use reflection to set the language files map
      (tempLanguageFilesService as any).languageFiles = tempLanguageFiles;
      
      // Mock vscode APIs using sinon
      
      // Mock showInputBox to simulate user entering a translation
      const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox').resolves("Übersicht");
      
      // Create a properly typed stub for showQuickPick that returns a QuickPickItem with label "Yes"
      const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
      showQuickPickStub.resolves({ label: 'Yes', description: 'Create "dashboard.title" in de' });
      
      // Mock vscode.workspace.openTextDocument to prevent actual file opening
      const openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument');
      const mockDocument = {
        uri: vscode.Uri.file(path.join(tempI18nDir, 'de.json')),
        getText: () => JSON.stringify(targetContent, null, 2),
        positionAt: () => new vscode.Position(0, 0)
      };
      openTextDocumentStub.resolves(mockDocument as any);
      
      // Mock vscode.window.showTextDocument
      const showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument').resolves({
        selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
        revealRange: () => {}
      } as any);
      
      // Mock the createMissingTranslation method to check if it gets called with correct parameters
      const serviceWithPrivate = tempLanguageFilesService as any;
      const originalCreateMissingTranslation = serviceWithPrivate.createMissingTranslation;
      
      let createMissingTranslationCalled = false;
      let translationCreated = false;
      
      serviceWithPrivate.createMissingTranslation = async (
        sourceDocument: vscode.TextDocument,
        keyPath: string,
        targetLanguage: string
      ) => {
        createMissingTranslationCalled = true;
        
        // Verify parameters
        assert.strictEqual(keyPath, 'dashboard.title', 'Should call with correct key path');
        assert.strictEqual(targetLanguage, 'de', 'Should call with correct target language');
        
        // Create the translation in the file directly to simulate the actual implementation
        const targetJson = JSON.parse(await fs.readFile(path.join(tempI18nDir, 'de.json'), 'utf8'));
        
        if (!targetJson.dashboard) {
          targetJson.dashboard = {};
        }
        
        targetJson.dashboard.title = "Übersicht";
        
        await fs.writeFile(
          path.join(tempI18nDir, 'de.json'),
          JSON.stringify(targetJson, null, 2)
        );
        
        translationCreated = true;
      };
      
      try {
        // Create a mock document and position
        const mockSourceDocument = {
          uri: vscode.Uri.file(path.join(tempI18nDir, 'en.json')),
          getText: () => JSON.stringify(sourceContent, null, 2),
          lineAt: () => ({
            text: '  "title": "Dashboard"'
          }),
          languageId: 'json',
          fsPath: path.join(tempI18nDir, 'en.json')
        } as any as vscode.TextDocument;
        
        const mockPosition = new vscode.Position(0, 0);
        
        // Mock the key path service to return a specific key path
        sandbox.stub(jsonKeyPathService, 'getKeyPathAtPosition').returns('dashboard.title');
        
        // Call the method we're testing
        await tempLanguageFilesService.navigateToTranslation(mockSourceDocument, mockPosition, 'de');
        
        // Verify the method was called and translation was created
        assert.strictEqual(createMissingTranslationCalled, true, 'Should call createMissingTranslation');
        assert.strictEqual(translationCreated, true, 'Should create the missing translation');
        
      } finally {
        // Restore mocks
        serviceWithPrivate.createMissingTranslation = originalCreateMissingTranslation;
      }
    } finally {
      // Reset all stubs
      sandbox.restore();
      
      // Clean up temporary files
      try {
        await fs.remove(tempDir);
      } catch (error) {
        console.error('Error cleaning up temporary files:', error);
      }
    }
  });
});