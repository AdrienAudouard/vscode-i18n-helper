import * as vscode from 'vscode';

import { DecorationProvider } from './providers/decoration-provider';
import { I18nCodeActionProvider } from './providers/code-action-provider';
import { I18nCompletionProvider } from './providers/completion-provider';
import { JsonKeyPathService } from './services/json-key-path-service';
import { TranslationService } from './services/translation-service';
import { registerCommands } from './commands';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('i18n-helper extension is now active!');

	// Create instances of our services
	const translationService = new TranslationService();
	const jsonKeyPathService = new JsonKeyPathService();
	const decorationProvider = new DecorationProvider(translationService);
	const completionProvider = new I18nCompletionProvider(translationService);
	const codeActionProvider = new I18nCodeActionProvider(translationService);

	// Register commands
	const commandDisposables = registerCommands(translationService, jsonKeyPathService);

	// Store disposables for TypeScript completion providers
	let tsCompletionDisposables: vscode.Disposable[] = [];
	
	// Register completion provider for HTML files - without requiring a trigger character
	const htmlCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		completionProvider
	);

	// Register HTML completion providers with dot as trigger character
	const htmlDotCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		completionProvider,
		'.'
	);

	// Register code action provider for TypeScript and HTML files

	const htmlCodeActionProvider = vscode.languages.registerCodeActionsProvider('html', codeActionProvider);
	const tsCodeActionProvider = vscode.languages.registerCodeActionsProvider('typescript', codeActionProvider);

	// Create arrays of trigger characters (a-z, A-Z, 0-9)
	const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)); // a-z
	const upperLetters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
	const numbers = Array.from({ length: 10 }, (_, i) => String(i)); // 0-9
	const triggerChars = [...letters, ...upperLetters, ...numbers, '\''];
	
	// Register HTML completion providers with letters and numbers as trigger characters
	const htmlLetterCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		completionProvider,
		...triggerChars
	);

	// Function to register TypeScript completion providers
	function registerTsCompletionProviders(): vscode.Disposable[] {
		const disposables: vscode.Disposable[] = [];

		// Register TypeScript completion providers only if enabled in settings
		const config = vscode.workspace.getConfiguration('i18nHelper');
		const isTsAutocompletionEnabled = config.get<boolean>('tsAutocompletionEnabled', true);
		
		if (isTsAutocompletionEnabled) {
			// Register completion providers for TypeScript files - without requiring a trigger character
			disposables.push(
				vscode.languages.registerCompletionItemProvider(
					'typescript',
					completionProvider
				)
			);

			// Register TypeScript completion providers with dot as trigger character
			disposables.push(
				vscode.languages.registerCompletionItemProvider(
					'typescript',
					completionProvider,
					'.'
				)
			);

			// Register TypeScript completion providers with letters and numbers as trigger characters
			disposables.push(
				vscode.languages.registerCompletionItemProvider(
					'typescript',
					completionProvider,
					...triggerChars
				)
			);
		}
		
		return disposables;
	}

	// Initial registration of TypeScript completion providers
	tsCompletionDisposables = registerTsCompletionProviders();

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
		
		// If the TypeScript autocompletion setting changed, update the providers
		if (event.affectsConfiguration('i18nHelper.tsAutocompletionEnabled')) {
			// Dispose of old providers
			tsCompletionDisposables.forEach(disposable => disposable.dispose());
			
			// Register new providers based on current setting
			tsCompletionDisposables = registerTsCompletionProviders();
		}
	});

	// Check if there's an active editor when the extension starts
	if (vscode.window.activeTextEditor) {
		decorationProvider.updateDecorations(vscode.window.activeTextEditor);
	}

	// Register all disposables
	context.subscriptions.push(
		...commandDisposables,
		...tsCompletionDisposables,
		htmlCompletionProvider,
		htmlDotCompletionProvider,
		htmlLetterCompletionProvider,
		htmlCodeActionProvider,
		tsCodeActionProvider,
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
