// Text formatting utilities for flashcard content
// Provides markdown-like text formatting functions

/**
 * Converts markdown-like formatting to HTML tags
 *
 * Supported formats:
 * - Bold: **text** or __text__ → <strong>text</strong>
 * - Italic: *text* or _text_ → <em>text</em>
 *
 * This function is used primarily for flashcard descriptions
 * to provide basic text styling without full markdown parsing.
 *
 * @param text - The text string to format
 * @returns Formatted text with HTML tags
 *
 * @example
 * formatText("**Bold** and *italic* text")
 * // Returns: "<strong>Bold</strong> and <em>italic</em> text"
 *
 * @example
 * formatText("I __love__ learning _Chinese_!")
 * // Returns: "I <strong>love</strong> learning <em>Chinese</em>!"
 */
export const formatText = (text: string): string => {
  // Input validation
  if (!text || typeof text !== 'string') {
    console.warn('formatText: Invalid input provided', { text });
    return '';
  }

  return (
    text
      // Bold: **text** or __text__ -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_ -> <em>text</em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
  );
};

/**
 * Strips HTML tags and markdown formatting from text
 * Useful for getting plain text versions of formatted content
 *
 * @param text - The formatted text to strip
 * @returns Plain text without any formatting
 *
 * @example
 * stripFormatting("**Bold** and *italic* text")
 * // Returns: "Bold and italic text"
 */
export const stripFormatting = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
  );
};

/**
 * Validates that text formatting is properly closed
 * Checks for unclosed markdown syntax that could cause issues
 *
 * @param text - The text to validate
 * @returns Object with validation result and any issues found
 */
export const validateFormatting = (
  text: string
): {
  isValid: boolean;
  issues: string[];
} => {
  if (!text || typeof text !== 'string') {
    return { isValid: true, issues: [] };
  }

  const issues: string[] = [];

  // Check for unclosed bold formatting
  const boldStars = (text.match(/\*\*/g) || []).length;
  const boldUnderscores = (text.match(/__/g) || []).length;

  if (boldStars % 2 !== 0) {
    issues.push('Unclosed ** bold formatting');
  }
  if (boldUnderscores % 2 !== 0) {
    issues.push('Unclosed __ bold formatting');
  }

  // Check for unclosed italic formatting (excluding already matched bold)
  const textWithoutBold = text
    .replace(/\*\*.*?\*\*/g, '')
    .replace(/__.*?__/g, '');
  const italicStars = (textWithoutBold.match(/\*/g) || []).length;
  const italicUnderscores = (textWithoutBold.match(/_/g) || []).length;

  if (italicStars % 2 !== 0) {
    issues.push('Unclosed * italic formatting');
  }
  if (italicUnderscores % 2 !== 0) {
    issues.push('Unclosed _ italic formatting');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

// Export commonly used formatting functions as default export
export default {
  formatText,
  stripFormatting,
  validateFormatting,
};
