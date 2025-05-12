import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Test utility functions for i18n-studio extension tests
 */
export class TestUtils {
  /**
   * Creates a temporary workspace with i18n files for testing
   * @param testWorkspaceDir Directory to create test workspace in
   * @returns Path to the created workspace
   */
  static async createTestWorkspace(testWorkspaceDir: string): Promise<string> {
    // Create test workspace directory if it doesn't exist
    await fs.ensureDir(testWorkspaceDir);
    
    // Create src/assets/i18n directory
    const i18nDirPath = path.join(testWorkspaceDir, 'src', 'assets', 'i18n');
    await fs.ensureDir(i18nDirPath);
    
    // Create sample i18n files
    await fs.writeFile(
      path.join(i18nDirPath, 'en.json'),
      JSON.stringify({
        general: {
          generate: 'Generate',
          cancel: 'Cancel',
          submit: 'Submit'
        },
        errors: {
          required: 'This field is required',
          invalidEmail: 'Please enter a valid email address'
        }
      }, null, 2)
    );
    
    await fs.writeFile(
      path.join(i18nDirPath, 'fr.json'),
      JSON.stringify({
        general: {
          generate: 'Générer',
          cancel: 'Annuler',
          submit: 'Soumettre'
        },
        errors: {
          required: 'Ce champ est requis',
          invalidEmail: 'Veuillez entrer une adresse email valide'
        }
      }, null, 2)
    );
    
    // Create sample TypeScript file
    const sampleTsPath = path.join(testWorkspaceDir, 'src', 'sample.ts');
    await fs.ensureDir(path.dirname(sampleTsPath));
    await fs.writeFile(
      sampleTsPath,
      `import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sample',
  templateUrl: './sample.component.html'
})
export class SampleComponent {
  constructor(private translateService: TranslateService) {}
  
  getSubmitLabel(): string {
    return this.translateService.instant('general.submit');
  }
  
  getCancelLabel(): string {
    return this.translateService.instant('general.cancel');
  }
}
`
    );
    
    // Create sample HTML file
    const sampleHtmlPath = path.join(testWorkspaceDir, 'src', 'sample.component.html');
    await fs.writeFile(
      sampleHtmlPath,
      `<div>
  <h1>{{ 'general.generate' | translate }}</h1>
  <p>{{ 'errors.required' | translate }}</p>
  <button>{{ 'general.submit' | translate }}</button>
  <button>{{ 'general.cancel' | translate }}</button>
</div>
`
    );
    
    return testWorkspaceDir;
  }
  
  /**
   * Cleans up the test workspace
   * @param testWorkspaceDir Directory of the test workspace to clean up
   */
  static async cleanupTestWorkspace(testWorkspaceDir: string): Promise<void> {
    try {
      await fs.remove(testWorkspaceDir);
    } catch (error) {
      console.error(`Error cleaning up test workspace: ${error}`);
    }
  }
  
  /**
   * Waits for a specified condition to be met
   * @param condition The condition function to wait for
   * @param timeout Timeout in milliseconds
   * @param interval Check interval in milliseconds
   * @returns Promise that resolves when condition is met
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout = 10000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await Promise.resolve(condition());
      if (result) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Timed out waiting for condition after ${timeout}ms`);
  }
  
  /**
   * Activates the extension and waits for it to be ready
   */
  static async activateExtension(): Promise<vscode.Extension<any>> {
    const extension = vscode.extensions.getExtension('AdrienAudouard.i18n-studio');
    
    if (!extension) {
      throw new Error('Extension not found');
    }
    
    if (!extension.isActive) {
      await extension.activate();
    }
    
    return extension;
  }
}