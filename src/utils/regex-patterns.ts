/**
 * Regular expression pattern for matching i18n translation keys
 * Matches strings like "namespace.key" or "section.subsection.key_with_underscore"
 */
export const I18N_KEY_PATTERN = /(['"])([a-z0-9_]+(?:\.[a-z0-9_]+)+)\1/gi;