# i18n-studio

A Visual Studio Code extension that helps Angular developers work with i18n translations by displaying the actual translated text next to i18n keys in component files.

## Features

- Automatically loads Angular i18n translation files (defaults to `src/assets/i18n/en.json`)
- Displays translated values next to i18n keys in HTML and TypeScript files
  - Translations longer than 30 characters are automatically truncated with "..." suffix for better readability
  - The truncation length is configurable via settings
![](https://github.com/AdrienAudouard/vscode-i18n-helper/blob/main/images/html-translated-label.png?raw=true)
![](https://github.com/AdrienAudouard/vscode-i18n-helper/blob/main/images/ts-translated-label.png?raw=true)
- Supports nested i18n keys with dot notation (e.g., `"general.generate"`)
- Provides code actions to quickly open the translation file at the specific key
![](https://github.com/AdrienAudouard/vscode-i18n-helper/blob/main/images/go-to-action.gif?raw=true)
- Shows inline buttons above JSON keys to navigate between translations in different languages
- Easily toggle the extension on/off with a command
- Right-click on any key or value in a JSON file to copy its full key path
![](https://github.com/AdrienAudouard/vscode-i18n-helper/blob/main/images/copy-key-path.gif?raw=true)
- Easily add any text to the i18n translation file
- Navigate between different language files with a single click in JSON files
- Automatically create missing translations when navigating between language files

## Extension Settings

This extension contributes the following settings:

* `i18nHelper.enabled`: Enable/disable the i18n-studio extension
* `i18nHelper.i18nFilePath`: Path to the i18n JSON file relative to the workspace root (defaults to `src/assets/i18n/en.json`)
* `i18nHelper.tsAutocompletionEnabled`: Enable/disable autocompletion in TypeScript files
* `i18nHelper.showTranslationButtons`: Show inline buttons above JSON keys to navigate between different language files
* `i18nHelper.maxTranslationLength`: Maximum length of translation text displayed in-line before truncating with '...' (defaults to 30)

## Commands

* `i18n Helper: Reload Translations`: Manually reload the translations file
* `i18n Helper: Toggle On/Off`: Enable or disable the extension
* `i18n Helper: Open Translation File`: Open the translation file at a specific key (usually triggered via code actions)
* `Copy JSON Key Path`: Copy the full path to a JSON key (available in the context menu when right-clicking in JSON files)
* `Navigate to Translation in Other Language File`: Navigate to the same key in a different language file (triggered via code actions or inline buttons)

## How to Use

1. Install the extension
2. Open an Angular project with i18n files
3. If your i18n files are not in the default location (`src/assets/i18n/en.json`), update the path in the settings
4. Open a component file (HTML or TypeScript)
5. The extension will display translation values next to i18n keys in the file
6. Hover over any i18n key and click on the lightbulb icon (or press Ctrl+. / Cmd+.) to see available actions
7. Select "Open translation file for '[key]'" to jump directly to that key in the translation file

### Working with JSON Translation Files

When working with JSON translation files:

1. Right-click on any key or value in a JSON file
2. Select "Copy JSON Key Path" from the context menu
3. The full path to that key (e.g., "general.generate") will be copied to your clipboard

### Navigating Between Language Files

When working with multiple language files (e.g., en.json, fr.json, es.json), you have two options:

#### Option 1: Using Code Actions (Lightbulb Menu)
1. Open any translation file (e.g., en.json)
2. Place your cursor on a translation key
3. Click on the lightbulb icon (or press Ctrl+. / Cmd+.) that appears
4. Choose "View in XX translation file" where XX is the language code (FR, ES, etc.)
5. The extension will open the corresponding language file and navigate to the same key

#### Option 2: Using Inline Translation Buttons
1. Open any translation file (e.g., en.json)
2. When your cursor is on a JSON key line, language buttons like "FR", "DE", "ES" will appear above the line
3. Click on any language button to navigate directly to that key in the corresponding language file
4. If the translation key doesn't exist in the target language file, you'll be prompted to create it
5. You can toggle this feature on/off in settings with the `i18nHelper.showTranslationButtons` option

This makes it easy to compare and edit translations across different languages without manually searching for the same key in each file.

### Creating Missing Translations

When navigating between language files, if a translation key exists in one language but not in another:

1. The extension will detect the missing key and prompt you to create it
2. If you choose "Yes", a dialog will appear asking for the translation value
3. The dialog will pre-fill with the value from the source language as a starting point
4. Once you enter a translation, the key and value will be created in the target language file
5. The editor will then navigate to the newly created translation

This feature ensures that your translation files stay in sync across different languages and helps you quickly add missing translations as you work.

## Example

If your translation files contain:

**en.json**:
```json
{
  "general": {
    "generate": "Generate",
    "cancel": "Cancel"
  }
}
```

**fr.json**:
```json
{
  "general": {
    "generate": "Générer",
    "cancel": "Annuler"
  }
}
```

When you have a string like `"general.generate"` in your code, you'll see: `"general.generate" → Generate` displayed in your editor.

If you're editing en.json and your cursor is on the "generate" key, you'll see a "FR" button above the line that you can click to navigate directly to the same key in fr.json.