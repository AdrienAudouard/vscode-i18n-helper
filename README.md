# i18n-studio

A Visual Studio Code extension that helps Angular developers work with i18n translations by displaying the actual translated text next to i18n keys in component files.

## Features

- Automatically loads Angular i18n translation files (defaults to `src/assets/i18n/en.json`)
- Displays translated values next to i18n keys in HTML and TypeScript files
- Supports nested i18n keys with dot notation (e.g., `"general.generate"`)
- Provides code actions to quickly open the translation file at the specific key
- Easily toggle the extension on/off with a command
- Right-click on any key or value in a JSON file to copy its full key path

![i18n-studio in action](images/i18n-studio-demo.png)

## Requirements

- Visual Studio Code 1.99.0 or higher
- Angular project with i18n translation files in JSON format

## Extension Settings

This extension contributes the following settings:

* `i18nHelper.enabled`: Enable/disable the i18n-studio extension
* `i18nHelper.i18nFilePath`: Path to the i18n JSON file relative to the workspace root (defaults to `src/assets/i18n/en.json`)
* `i18nHelper.tsAutocompletionEnabled`: Enable/disable autocompletion in TypeScript files

## Commands

* `i18n Helper: Reload Translations`: Manually reload the translations file
* `i18n Helper: Toggle On/Off`: Enable or disable the extension
* `i18n Helper: Open Translation File`: Open the translation file at a specific key (usually triggered via code actions)
* `Copy JSON Key Path`: Copy the full path to a JSON key (available in the context menu when right-clicking in JSON files)

## How to Use

1. Install the extension
2. Open an Angular project with i18n files
3. If your i18n files are not in the default location (`src/assets/i18n/en.json`), update the path in the settings
4. Open a component file (HTML or TypeScript)
5. The extension will display translation values next to i18n keys in the file
6. Hover over any i18n key and click on the lightbulb icon (or press Ctrl+. / Cmd+.) to see available actions
7. Select "Open translation file for '[key]'" to jump directly to that key in the translation file

### Working with JSON files

When working with JSON files:
1. Right-click on any key or value in a JSON file
2. Select "Copy JSON Key Path" from the context menu
3. The full path to that key (e.g., "general.generate") will be copied to your clipboard

## Example

If your translation file (`en.json`) contains:

```json
{
  "general": {
    "generate": "Generate",
    "cancel": "Cancel"
  }
}
```

When you have a string like `"general.generate"` in your code, you'll see: `"general.generate" → Generate` displayed in your editor.

If you right-click on `"generate"` in the JSON file, you can select "Copy JSON Key Path" to copy `general.generate` to your clipboard.

## Known Issues

- Only supports English translation files at the moment
- Only detects i18n keys in string literals

## Release Notes

### 0.0.1

Initial release of i18n-studio with basic functionality:
- Loading translations from JSON file
- Displaying translations next to i18n keys
- Configurable settings
