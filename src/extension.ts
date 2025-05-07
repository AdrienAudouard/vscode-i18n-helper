import * as vscode from 'vscode';

import { DecorationProvider } from './providers/decoration-provider';
import { I18nCodeActionProvider } from './providers/code-action-provider';
import { I18nCompletionProvider } from './providers/completion-provider';
import { JsonKeyPathService } from './services/json-key-path-service';
import { LanguageFilesService } from './services/language-files-service';
import { LanguageNavigationProvider } from './providers/language-navigation-provider';
import { LanguageNavigationCodeLensProvider } from './providers/language-navigation-code-lens-provider';
import { TranslationService } from './services/translation-service';
import { registerCommands } from './commands';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('i18n-studio extension is now active!');

	// Create instances of our services
	const translationService = new TranslationService();
	const jsonKeyPathService = new JsonKeyPathService();
	const languageFilesService = new LanguageFilesService(jsonKeyPathService);
	const decorationProvider = new DecorationProvider(translationService);
	const completionProvider = new I18nCompletionProvider(translationService);
	const codeActionProvider = new I18nCodeActionProvider(translationService);
	const languageNavigationProvider = new LanguageNavigationProvider(languageFilesService);
	const languageNavigationCodeLensProvider = new LanguageNavigationCodeLensProvider(
		languageFilesService,
		jsonKeyPathService
	);

	// Register commands
	const commandDisposables = registerCommands(translationService, jsonKeyPathService, languageFilesService);

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

	// Register code action providers for TypeScript, HTML, and JSON files
	const htmlCodeActionProvider = vscode.languages.registerCodeActionsProvider('html', codeActionProvider);
	const tsCodeActionProvider = vscode.languages.registerCodeActionsProvider('typescript', codeActionProvider);
	const jsonLanguageNavigationProvider = vscode.languages.registerCodeActionsProvider(
		{ language: 'json', pattern: '**/*.json' },
		languageNavigationProvider
	);

	// Register CodeLens provider for JSON files
	const jsonLanguageNavigationCodeLensProvider = vscode.languages.registerCodeLensProvider(
		{ language: 'json', pattern: '**/*.json' },
		languageNavigationCodeLensProvider
	);

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

	// Load translations and scan language files when the extension activates
	translationService.loadTranslations();
	languageFilesService.scanLanguageFiles();

	// Register event handlers
	const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			decorationProvider.updateDecorations(editor);
			
			// Update cursor position for CodeLens provider when editor changes
			if (editor.document.languageId === 'json') {
				languageNavigationCodeLensProvider.updateCursorPosition(editor.selection.active);
			} else {
				// If not a JSON file, clear cursor position
				languageNavigationCodeLensProvider.updateCursorPosition(undefined);
			}
		}
	});

	const changeDocumentDisposable = vscode.workspace.onDidChangeTextDocument(event => {
		const editor = vscode.window.activeTextEditor;
		if (editor && event.document === editor.document) {
			decorationProvider.updateDecorations(editor);
		}
	});

	const cursorChangeDisposable = vscode.window.onDidChangeTextEditorSelection(event => {
		// Update cursor position and refresh CodeLenses when cursor moves
		if (event.textEditor.document.languageId === 'json') {
			languageNavigationCodeLensProvider.updateCursorPosition(event.selections[0].active);
		}
	});

	// Register configuration change handler
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('i18nHelper.i18nFilePath')) {
			translationService.loadTranslations();
			languageFilesService.scanLanguageFiles();
			
			// Refresh CodeLenses when configuration changes
			languageNavigationCodeLensProvider.refresh();
		}
		
		// If the TypeScript autocompletion setting changed, update the providers
		if (event.affectsConfiguration('i18nHelper.tsAutocompletionEnabled')) {
			// Dispose of old providers
			tsCompletionDisposables.forEach(disposable => disposable.dispose());
			
			// Register new providers based on current setting
			tsCompletionDisposables = registerTsCompletionProviders();
		}
		
		// If the translation buttons setting changed, refresh CodeLenses
		if (event.affectsConfiguration('i18nHelper.showTranslationButtons')) {
			languageNavigationCodeLensProvider.refresh();
		}
	});

	// Check if there's an active editor when the extension starts
	if (vscode.window.activeTextEditor) {
		decorationProvider.updateDecorations(vscode.window.activeTextEditor);
		
		// Initialize cursor position if active editor is a JSON file
		if (vscode.window.activeTextEditor.document.languageId === 'json') {
			languageNavigationCodeLensProvider.updateCursorPosition(vscode.window.activeTextEditor.selection.active);
		}
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
		jsonLanguageNavigationProvider,
		jsonLanguageNavigationCodeLensProvider,
		activeEditorDisposable,
		changeDocumentDisposable,
		cursorChangeDisposable,
		configChangeDisposable,
		decorationProvider.getDecorationType()
	);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
	// Clean up resources here if needed
}
