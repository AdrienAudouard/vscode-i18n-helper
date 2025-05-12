import * as assert from 'assert';
import * as vscode from 'vscode';

import { JsonKeyPathService } from '../services/json-key-path-service';

suite('JSON Key Path Service Tests', () => {
  let jsonKeyPathService: JsonKeyPathService;
  
  setup(() => {
    jsonKeyPathService = new JsonKeyPathService();
  });
  
  test('Should extract simple key path at position', async () => {
    // Create an untitled JSON document with content for testing
    const doc = await vscode.workspace.openTextDocument({
      language: 'json',
      content: `{
  "general": {
    "submit": "Submit",
    "cancel": "Cancel"
  }
}`
    });
    
    // Position the cursor at the "submit" key
    const position = new vscode.Position(2, 10); // Line 2, character 10 (middle of "submit")
    
    const keyPath = jsonKeyPathService.getKeyPathAtPosition(doc, position);
    assert.strictEqual(keyPath, 'general.submit', 'Should extract correct key path');
  });
  
  test('Should extract nested key path at position', async () => {
    // Create an untitled JSON document with nested content
    const doc = await vscode.workspace.openTextDocument({
      language: 'json',
      content: `{
  "general": {
    "actions": {
      "submit": "Submit",
      "cancel": "Cancel"
    }
  }
}`
    });
    
    // Position the cursor at the "submit" key in nested structure
    const position = new vscode.Position(3, 14); // Line 3, character 14 (middle of "submit")
    
    const keyPath = jsonKeyPathService.getKeyPathAtPosition(doc, position);
    assert.strictEqual(keyPath, 'general.actions.submit', 'Should extract correct nested key path');
  });
  
  test('Should handle quotes correctly', async () => {
    // Create an untitled JSON document with escaped quotes
    const doc = await vscode.workspace.openTextDocument({
      language: 'json',
      content: `{
  "general": {
    "actions": {
      "submit": "Submit",
      "cancel": "Cancel with \\"quotes\\""
    }
  }
}`
    });
    
    // Position the cursor at the "cancel" key with escaped quotes in value
    const position = new vscode.Position(4, 14); // Line 4, character 14 (middle of "cancel")
    
    const keyPath = jsonKeyPathService.getKeyPathAtPosition(doc, position);
    assert.strictEqual(keyPath, 'general.actions.cancel', 'Should handle quotes correctly');
  });
  
  test('Should return undefined for invalid positions', async () => {
    // Create an untitled JSON document
    const doc = await vscode.workspace.openTextDocument({
      language: 'json',
      content: `{
  "general": {
    "submit": "Submit",
    "cancel": "Cancel"
  }
}`
    });
    
    // Position on a non-key line (opening brace)
    const position = new vscode.Position(0, 0);
    
    const keyPath = jsonKeyPathService.getKeyPathAtPosition(doc, position);
    assert.strictEqual(keyPath, undefined, 'Should return undefined for non-key position');
    
    // Position on a value, not a key
    const valuePosition = new vscode.Position(2, 20); // On "Submit"
    const valueKeyPath = jsonKeyPathService.getKeyPathAtPosition(doc, valuePosition);
    assert.strictEqual(valueKeyPath, undefined, 'Should return undefined for value position');
  });
});