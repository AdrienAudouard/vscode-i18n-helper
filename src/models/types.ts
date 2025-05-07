/**
 * Interface representing an i18n translation object
 * Can be a string value or a nested object with more translations
 */
export interface I18nTranslations {
  [key: string]: string | I18nTranslations;
}

/**
 * Extension configuration interface
 */
export interface I18nHelperConfig {
  enabled: boolean;
  i18nFilePath: string;
}