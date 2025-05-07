# i18n-helper

A Visual Studio Code extension that helps Angular developers work with i18n translations by displaying the actual translated text next to i18n keys in component files.

## Features

- Automatically loads Angular i18n translation files (defaults to `src/assets/i18n/en.json`)
- Displays translated values next to i18n keys in HTML and TypeScript files
- Supports nested i18n keys with dot notation (e.g., `"general.generate"`)
- Easily toggle the extension on/off with a command

![i18n-helper in action](images/i18n-helper-demo.png)

## Requirements

- Visual Studio Code 1.99.0 or higher
- Angular project with i18n translation files in JSON format

## Extension Settings

This extension contributes the following settings:

* `i18nHelper.enabled`: Enable/disable the i18n-helper extension
* `i18nHelper.i18nFilePath`: Path to the i18n JSON file relative to the workspace root (defaults to `src/assets/i18n/en.json`)

## Commands

* `i18n Helper: Reload Translations`: Manually reload the translations file
* `i18n Helper: Toggle On/Off`: Enable or disable the extension

## How to Use

1. Install the extension
2. Open an Angular project with i18n files
3. If your i18n files are not in the default location (`src/assets/i18n/en.json`), update the path in the settings
4. Open a component file (HTML or TypeScript)
5. The extension will display translation values next to i18n keys in the file

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

## Known Issues

- Only supports English translation files at the moment
- Only detects i18n keys in string literals

## Release Notes

### 0.0.1

Initial release of i18n-helper with basic functionality:
- Loading translations from JSON file
- Displaying translations next to i18n keys
- Configurable settings
