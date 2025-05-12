import * as vscode from 'vscode';

/**
 * Service for handling JSON key path extraction
 */
export class JsonKeyPathService {
  /**
   * Extracts the full key path from a JSON file at a given position
   * 
   * @param document The JSON document
   * @param position The position within the document
   * @returns The full key path as a dot-separated string (e.g., "general.generate")
   */
  public getKeyPathAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    try {
      // Parse the JSON document
      const text = document.getText();
      const jsonObj = JSON.parse(text);
      
      // Get the line and check if the position is on a key or value
      const line = document.lineAt(position.line).text;
      
      // Check if line contains a key-value pair (has a colon)
      if (!line.includes(':')) {
        return undefined;
      }
      
      // Get the colon position
      const colonPos = line.indexOf(':');
      
      // Check if cursor is positioned on the key (before the colon)
      // If the cursor is after the colon, it's likely on a value, not a key
      if (position.character > colonPos) {
        return undefined;
      }
      
      // Extract the key from the line (everything before the colon)
      let key = line.substring(0, colonPos).trim();
      
      // Remove the quotes from the key
      if ((key.startsWith('"') && key.endsWith('"')) || 
          (key.startsWith("'") && key.endsWith("'"))) {
        key = key.substring(1, key.length - 1);
      }
      
      // Find parent keys by traversing up the document
      const parentKeys: string[] = [];
      let lineNumber = position.line - 1;
      let indentLevel = this.getIndentLevel(line);
      
      while (lineNumber >= 0) {
        const currentLine = document.lineAt(lineNumber).text;
        const currentIndent = this.getIndentLevel(currentLine);
        
        if (currentIndent < indentLevel && currentLine.includes(':')) {
          // This is a parent key
          let parentKey = currentLine.substring(0, currentLine.indexOf(':')).trim();
          
          // Remove quotes
          if ((parentKey.startsWith('"') && parentKey.endsWith('"')) || 
              (parentKey.startsWith("'") && parentKey.endsWith("'"))) {
            parentKey = parentKey.substring(1, parentKey.length - 1);
          }
          
          parentKeys.unshift(parentKey);
          indentLevel = currentIndent;
        }
        
        lineNumber--;
      }
      
      // Combine all keys to form the full path
      if (parentKeys.length > 0) {
        return [...parentKeys, key].join('.');
      } else {
        return key;
      }
    } catch (error) {
      console.error('Error extracting JSON key path:', error);
      return undefined;
    }
  }
  
  /**
   * Gets the indent level (number of spaces) at the start of a line
   * @param line The line of text
   * @returns The indent level
   */
  private getIndentLevel(line: string): number {
    let spaces = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ') {
        spaces++;
      } else if (line[i] === '\t') {
        spaces += 4; // Count a tab as 4 spaces
      } else {
        break;
      }
    }
    return spaces;
  }
}