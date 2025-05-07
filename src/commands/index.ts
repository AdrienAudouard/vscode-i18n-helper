import * as vscode from 'vscode';

import { TranslationService } from '../services/translation-service';

/**
 * Registers all extension commands
 * @param translationService The translation service to use
 * @returns Array of disposables for the registered commands
 */
export function registerCommands(translationService: TranslationService): vscode.Disposable[] {
  // Register a command to manually reload translations
  const reloadCommand = vscode.commands.registerCommand('i18n-helper.reloadTranslations', async () => {
    await translationService.loadTranslations();
    vscode.window.showInformationMessage('i18n translations reloaded');
  });

  // Register a command to toggle i18n-helper
  const toggleCommand = vscode.commands.registerCommand('i18n-helper.toggle', () => {
    const config = vscode.workspace.getConfiguration('i18nHelper');
    const isEnabled = config.get('enabled');
    config.update('enabled', !isEnabled, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`i18n-helper ${!isEnabled ? 'enabled' : 'disabled'}`);
  });

  return [reloadCommand, toggleCommand];
}