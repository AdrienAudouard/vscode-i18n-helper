import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { I18nTranslations } from '../models/types';
import { TranslationService } from '../services/translation-service';

/**
 * Translation Service Tests
 * Tests the core functionality of the translation service
 */
suite('Translation Service Tests', () => {
  const testWorkspaceDir = path.join(os.tmpdir(), `i18n-translation-service-test-${Date.now()}`);
  const i18nDirPath = path.join(testWorkspaceDir, 'src', 'assets', 'i18n');
  let translationService: TranslationService;
  
  suiteSetup(async function() {
    this.timeout(30000);
    
    // Create test workspace with i18n files
    await fs.ensureDir(i18nDirPath);
    
    // Create sample i18n file
    await fs.writeFile(
      path.join(i18nDirPath, 'en.json'),
      JSON.stringify({
        general: {
          generate: 'Generate',
          cancel: 'Cancel',
          nested: {
            key: 'Nested Key'
          }
        },
        validation: {
          required: 'This field is required'
        }
      }, null, 2)
    );
    
    // Mock workspace configuration
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = (section?: string) => {
      return {
        get: (key: string) => {
          if (section === 'i18nHelper' && key === 'i18nFilePath') {
            // Return the relative path as it would be specified in settings
            return path.join('src', 'assets', 'i18n', 'en.json');
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
    
    // Create a new translation service
    translationService = new TranslationService();
    
    try {
      // Load translations
      await translationService.loadTranslations();
    } finally {
      // Restore mocks
      vscode.workspace.getConfiguration = originalGetConfiguration;
      
      // Restore original workspaceFolders
      if (originalDescriptor) {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', originalDescriptor);
      }
    }
  });
  
  suiteTeardown(async () => {
    try {
      await fs.remove(testWorkspaceDir);
    } catch (error) {
      console.error(`Error cleaning up: ${error}`);
    }
  });
  
  test('Should load translations correctly', async () => {
    assert.strictEqual(translationService.translationsLoaded, true, 'Translations should be loaded');
    
    const translations = translationService.getAllTranslations();
    assert.ok(translations, 'Translations should exist');
    assert.ok(translations.general, 'General section should exist');
    
    // Fix the type issue by casting to appropriate type
    const general = translations.general as I18nTranslations;
    assert.strictEqual(general.generate, 'Generate', 'Generate key should have correct value');
  });
  
  test('Should get translation value for existing key', () => {
    const value = translationService.getTranslationValue('general.generate');
    assert.strictEqual(value, 'Generate', 'Should get correct translation value');
    
    const nestedValue = translationService.getTranslationValue('general.nested.key');
    assert.strictEqual(nestedValue, 'Nested Key', 'Should get correct nested translation value');
  });
  
  test('Should return undefined for non-existing key', () => {
    const value = translationService.getTranslationValue('nonexistent.key');
    assert.strictEqual(value, undefined, 'Should return undefined for non-existing key');
  });
  
  test('Should add new translation', async function() {
    this.timeout(10000);
    
    // Mock workspace configurations again for this specific test
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = (section?: string) => {
      return {
        get: (key: string) => {
          if (section === 'i18nHelper' && key === 'i18nFilePath') {
            return path.join('src', 'assets', 'i18n', 'en.json');
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
      const newKey = 'test.newKey';
      const newValue = 'New Test Value';
      
      const result = await translationService.addTranslation(newKey, newValue);
      assert.strictEqual(result, true, 'Should successfully add translation');
      
      // Verify the translation was added
      const value = translationService.getTranslationValue(newKey);
      assert.strictEqual(value, newValue, 'Should get new translation value');
      
      // Verify the file was updated
      const filePath = path.join(i18nDirPath, 'en.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const translations = JSON.parse(fileContent);
      
      assert.ok(translations.test, 'New section should be created');
      assert.strictEqual(translations.test.newKey, newValue, 'New key should have correct value');
    } finally {
      // Restore original functions
      vscode.workspace.getConfiguration = originalGetConfiguration;
      
      // Restore original workspaceFolders
      if (originalDescriptor) {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', originalDescriptor);
      }
    }
  });
});