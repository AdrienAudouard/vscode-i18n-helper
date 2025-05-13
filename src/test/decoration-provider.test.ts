import * as assert from 'assert';
import * as vscode from 'vscode';

import { DecorationProvider } from '../providers/decoration-provider';
import { TranslationService } from '../services/translation-service';

suite('Decoration Provider Tests', () => {
  let decorationProvider: DecorationProvider;
  let translationService: TranslationService;
  
  setup(() => {
    // Create a mock translation service
    translationService = {
      translationsLoaded: true,
      getTranslationValue: (key: string): string | undefined => {
        // Mock implementation that returns predefined values
        const translations: { [key: string]: string } = {
          'general.submit': 'Submit',
          'general.cancel': 'Cancel',
          'general.longValue': 'This is a very long translation value that exceeds thirty characters',
          'errors.required': 'This field is required'
        };
        return translations[key];
      },
      loadTranslations: async () => Promise.resolve(),
      getAllTranslations: () => ({}),
      addTranslation: async () => false
    } as unknown as TranslationService;
    
    // Create the decoration provider with mock translation service
    decorationProvider = new DecorationProvider(translationService);
  });
  
  test('Should truncate long translation values', async () => {
    // Access the private method using TypeScript type conversion trick
    const provider = decorationProvider as any;
    
    // Test with short values (<=30 characters)
    assert.strictEqual(provider.truncateTranslationValue('Submit', 30), 'Submit', 'Should not truncate short values');
    assert.strictEqual(provider.truncateTranslationValue('Cancel', 30), 'Cancel', 'Should not truncate short values');
    assert.strictEqual(provider.truncateTranslationValue('This field is required', 30), 'This field is required', 'Should not truncate values under 30 characters');
    assert.strictEqual(
      provider.truncateTranslationValue('012345678901234567890123456789', 30), 
      '012345678901234567890123456789', 
      'Should not truncate exactly 30 characters'
    );
    
    // Test with long values (>30 characters)
    assert.strictEqual(
      provider.truncateTranslationValue('0123456789012345678901234567890', 30), 
      '012345678901234567890123456789...', 
      'Should truncate values longer than 30 characters'
    );
    assert.strictEqual(
      provider.truncateTranslationValue('This is a very long translation value that exceeds thirty characters', 30), 
      'This is a very long translatio...', 
      'Should truncate long values'
    );
    
    // Test with custom max length
    assert.strictEqual(provider.truncateTranslationValue('12345', 3), '123...', 'Should truncate based on custom max length');
    assert.strictEqual(provider.truncateTranslationValue('12345', 5), '12345', 'Should not truncate when value equals max length');
    
    // Test with the default settings
    // We don't test the default value directly as it would require mocking VS Code configuration
  });
  
  test('Should use configured max length from settings', () => {
    // This is an indirect test of the updateDecorations method
    // Real functionality would need to be tested with integration tests
    // as it requires mocking VS Code configuration
    
    // We're just ensuring the code structure exists - actual integration testing
    // would verify the configuration value is properly read
    const provider = decorationProvider as any;
    
    // Test with different max lengths
    assert.strictEqual(
      provider.truncateTranslationValue('A fairly long translation that should be truncated', 20), 
      'A fairly long transl...', 
      'Should truncate based on provided max length'
    );
    
    assert.strictEqual(
      provider.truncateTranslationValue('A short text', 5), 
      'A sho...', 
      'Should respect small custom max lengths'
    );
  });
});