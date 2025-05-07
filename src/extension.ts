import * as fs from 'fs-extra';
import * as path from 'path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Interface representing an i18n translation object
interface I18nTranslations {
  [key: string]: string | I18nTranslations;
}

let translations: I18nTranslations = {};
let translationsLoaded = false;
let decorationType: vscode.TextEditorDecorationType;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('i18n-helper extension is now active!');

	// Create a decorator type for i18n keys
	decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			margin: '0 0 0 1rem',
			color: 'rgba(153, 153, 153, 0.7)'
		}
	});

	// Register a command to manually reload translations
	const reloadCommand = vscode.commands.registerCommand('i18n-helper.reloadTranslations', () => {
		loadTranslations();
		vscode.window.showInformationMessage('i18n translations reloaded');
	});

	// Register a command to toggle i18n-helper
	const toggleCommand = vscode.commands.registerCommand('i18n-helper.toggle', () => {
		const config = vscode.workspace.getConfiguration('i18nHelper');
		const isEnabled = config.get('enabled');
		config.update('enabled', !isEnabled, vscode.ConfigurationTarget.Workspace);
		vscode.window.showInformationMessage(`i18n-helper ${!isEnabled ? 'enabled' : 'disabled'}`);
	});

	// Register completion provider for TypeScript files - without requiring a trigger character
	const tsCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'typescript',
		new I18nCompletionProvider()
	);

	// Register completion provider for HTML files - without requiring a trigger character
	const htmlCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		new I18nCompletionProvider()
	);

	// Register completion providers with dot as an additional trigger character
	// This allows for continued completion of nested keys
	const tsDotCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'typescript',
		new I18nCompletionProvider(),
		'.'
	);

	const htmlDotCompletionProvider = vscode.languages.registerCompletionItemProvider(
		'html',
		new I18nCompletionProvider(),
		'.'
	);

	// Load translations when the extension activates
	loadTranslations();

	// Register event handlers
	const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDecorations(editor);
		}
	});

	const changeDocumentDisposable = vscode.workspace.onDidChangeTextDocument(event => {
		const editor = vscode.window.activeTextEditor;
		if (editor && event.document === editor.document) {
			updateDecorations(editor);
		}
	});

	// Register configuration change handler
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('i18nHelper.i18nFilePath')) {
			loadTranslations();
		}
	});

	// Check if there's an active editor when the extension starts
	if (vscode.window.activeTextEditor) {
		updateDecorations(vscode.window.activeTextEditor);
	}

	// Register all disposables
	context.subscriptions.push(
		reloadCommand,
		toggleCommand,
		tsCompletionProvider,
		htmlCompletionProvider,
		tsDotCompletionProvider,
		htmlDotCompletionProvider,
		activeEditorDisposable,
		changeDocumentDisposable,
		configChangeDisposable,
		decorationType
	);
}

/**
 * Loads translations from the i18n file
 */
async function loadTranslations() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showWarningMessage('No workspace folder is open');
		return;
	}

	const config = vscode.workspace.getConfiguration('i18nHelper');
	const i18nFilePath = config.get('i18nFilePath') as string || 'src/assets/i18n/en.json';
	
	const absolutePath = path.join(workspaceFolders[0].uri.fsPath, i18nFilePath);
	
	try {
		if (await fs.pathExists(absolutePath)) {
			const fileContent = await fs.readFile(absolutePath, 'utf-8');
			translations = JSON.parse(fileContent);
			translationsLoaded = true;
			
			// If there's an active editor, update the decorations
			if (vscode.window.activeTextEditor) {
				updateDecorations(vscode.window.activeTextEditor);
			}
			console.log(`i18n translations loaded from ${absolutePath}`);
		} else {
			vscode.window.showWarningMessage(`i18n file not found at ${absolutePath}`);
			translationsLoaded = false;
		}
	} catch (error) {
		console.error('Error loading i18n translations:', error);
		vscode.window.showErrorMessage(`Error loading i18n file: ${error instanceof Error ? error.message : String(error)}`);
		translationsLoaded = false;
	}
}

/**
 * Gets translation value for a specific key
 * @param key The translation key (e.g. "general.generate")
 * @returns The translation value or undefined if not found
 */
function getTranslationValue(key: string): string | undefined {
	const keyParts = key.split('.');
	let currentObj: any = translations;
	
	for (const part of keyParts) {
		if (currentObj[part] === undefined) {
			return undefined;
		}
		currentObj = currentObj[part];
	}
	
	return typeof currentObj === 'string' ? currentObj : undefined;
}

/**
 * Updates decorations in the active editor
 * @param editor The active text editor
 */
function updateDecorations(editor: vscode.TextEditor) {
	const config = vscode.workspace.getConfiguration('i18nHelper');
	const isEnabled = config.get('enabled');
	
	if (!isEnabled || !translationsLoaded) {
		editor.setDecorations(decorationType, []);
		return;
	}
	
	const document = editor.document;
	if (document.languageId !== 'typescript' && document.languageId !== 'html') {
		return;
	}
	
	const text = document.getText();
	const decorations: vscode.DecorationOptions[] = [];
	
	// Find potential i18n keys in the document
	// This regex pattern looks for strings that could be i18n keys (with dot notation)
	const keyPattern = /(['"])([a-z0-9]+(?:\.[a-z0-9]+)+)\1/gi;
	
	let match;
	while ((match = keyPattern.exec(text))) {
		const key = match[2];
		const translationValue = getTranslationValue(key);
		
		if (translationValue) {
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);
			
			const decoration = {
				range,
				renderOptions: {
					after: {
						contentText: `${translationValue}`
					}
				}
			};
			
			decorations.push(decoration);
		}
	}
	
	editor.setDecorations(decorationType, decorations);
}

/**
 * Provides completion items for i18n keys
 */
class I18nCompletionProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): vscode.ProviderResult<vscode.CompletionItem[]> {
		if (!translationsLoaded) {
			return [];
		}

		const completionItems: vscode.CompletionItem[] = [];
		const addCompletionItems = (obj: I18nTranslations, prefix: string = '') => {
			for (const key in obj) {
				const value = obj[key];
				const fullKey = prefix ? `${prefix}.${key}` : key;
				const item = new vscode.CompletionItem(fullKey, vscode.CompletionItemKind.Text);
				if (typeof value === 'string') {
					item.detail = value;
				}
				completionItems.push(item);

				if (typeof value === 'object') {
					addCompletionItems(value, fullKey);
				}
			}
		};

		addCompletionItems(translations);
		return completionItems;
	}
}

// This method is called when your extension is deactivated
export function deactivate(): void {
	// Clean up resources here if needed
}
