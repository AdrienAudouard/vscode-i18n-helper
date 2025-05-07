import * as vscode from 'vscode';

import { DecorationProvider } from './providers/decoration-provider';
import { I18nCompletionProvider } from './providers/completion-provider';
import { TranslationService } from './services/translation-service';
import { registerCommands } from './commands';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('i18n-helper extension is now active!');

	// Create instances of our services
	const translationService = new TranslationService();
	const decorationProvider = new DecorationProvider(translationService);
	const completionProvider = new I18nCompletionProvider(translationService);

	// Register commands
	const commandDisposables = registerCommands(translationService);

	// Register completion providers for TypeScript files - without requiring a trigger character
	const tsCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'typescript',
		completionProvider
	);

	// Register completion provider for HTML files - without requiring a trigger character
	const htmlCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		completionProvider
	);

	// Register completion providers with dot as an additional trigger character
	// This allows for continued completion of nested keys
	const tsDotCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'typescript',
		completionProvider,
		'.'
	);

	const htmlDotCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		completionProvider,
		'.'
	);

	// Load translations when the extension activates
	translationService.loadTranslations();

	// Register event handlers
	const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			decorationProvider.updateDecorations(editor);
		}
	});

	const changeDocumentDisposable = vscode.workspace.onDidChangeTextDocument(event => {
		const editor = vscode.window.activeTextEditor;
		if (editor && event.document === editor.document) {
			decorationProvider.updateDecorations(editor);
		}
	});

	// Register configuration change handler
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('i18nHelper.i18nFilePath')) {
			translationService.loadTranslations();
		}
	});

	// Check if there's an active editor when the extension starts
	if (vscode.window.activeTextEditor) {
		decorationProvider.updateDecorations(vscode.window.activeTextEditor);
	}

	// Register all disposables
	context.subscriptions.push(
		...commandDisposables,
		tsCompletionProvider,
		htmlCompletionProvider,
		tsDotCompletionProvider,
		htmlDotCompletionProvider,
		activeEditorDisposable,
		changeDocumentDisposable,
		configChangeDisposable,
		decorationProvider.getDecorationType()
	);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
	// Clean up resources here if needed
}
