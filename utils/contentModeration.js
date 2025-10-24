const filter = require('leo-profanity');
const logger = require('../config/logger');

// Add custom South African inappropriate words/slang
const customWords = [
  // Add any region-specific inappropriate words here
  // Example: 'poes', 'doos', 'naai', etc.
];
filter.add(customWords);

/**
 * Check if content contains profanity or inappropriate language
 * @param {string} text - Text to check
 * @returns {Object} - { isProfane: boolean, cleanText: string, flaggedWords: array }
 */
function checkProfanity(text) {
  if (!text || typeof text !== 'string') {
    return { isProfane: false, cleanText: '', flaggedWords: [] };
  }

  try {
    const isProfane = filter.check(text);
    const cleanText = filter.clean(text);

    // Find which words were flagged
    const words = text.toLowerCase().split(/\s+/);
    const flaggedWords = words.filter(word => filter.check(word));

    return {
      isProfane,
      cleanText,
      flaggedWords
    };
  } catch (error) {
    logger.error('Profanity check error', { error: error.message });
    return { isProfane: false, cleanText: text, flaggedWords: [] };
  }
}

/**
 * Moderate content with different actions based on severity
 * @param {string} text - Text to moderate
 * @param {string} type - Content type ('review', 'message', 'bio', etc.)
 * @returns {Object} - { allowed: boolean, cleanText: string, action: string, reason: string }
 */
function moderateContent(text, type = 'general') {
  const profanityCheck = checkProfanity(text);

  if (!profanityCheck.isProfane) {
    return {
      allowed: true,
      cleanText: text,
      action: 'approved',
      reason: null,
      flaggedWords: []
    };
  }

  // For different content types, apply different rules
  switch (type) {
    case 'review':
      // Reviews: Auto-censor but allow posting (let admin review flagged content)
      return {
        allowed: true,
        cleanText: profanityCheck.cleanText,
        action: 'censored',
        reason: 'Inappropriate language was automatically censored',
        flaggedWords: profanityCheck.flaggedWords,
        requiresReview: true
      };

    case 'message':
      // Messages: Block messages with profanity
      return {
        allowed: false,
        cleanText: profanityCheck.cleanText,
        action: 'blocked',
        reason: 'Message contains inappropriate language and cannot be sent',
        flaggedWords: profanityCheck.flaggedWords
      };

    case 'bio':
    case 'profile':
      // Profile content: Auto-censor but allow (admin can review later)
      return {
        allowed: true,
        cleanText: profanityCheck.cleanText,
        action: 'censored',
        reason: 'Profile content was automatically censored',
        flaggedWords: profanityCheck.flaggedWords,
        requiresReview: true
      };

    default:
      // Default: Block content with profanity
      return {
        allowed: false,
        cleanText: profanityCheck.cleanText,
        action: 'blocked',
        reason: 'Content contains inappropriate language',
        flaggedWords: profanityCheck.flaggedWords
      };
  }
}

/**
 * Check for spam patterns (URLs, emails, phone numbers in inappropriate contexts)
 * @param {string} text - Text to check
 * @returns {Object} - { isSpam: boolean, reason: string, matches: array }
 */
function checkSpam(text) {
  if (!text || typeof text !== 'string') {
    return { isSpam: false, reason: null, matches: [] };
  }

  const patterns = {
    urls: /https?:\/\/[^\s]+/gi,
    emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phones: /(?:\+27|0)[0-9]{9,10}/g,
    whatsapp: /whatsapp|wa\.me/gi,
    telegram: /telegram|t\.me/gi
  };

  const matches = [];
  let reason = null;

  // Check for URLs
  const urlMatches = text.match(patterns.urls);
  if (urlMatches && urlMatches.length > 0) {
    matches.push(...urlMatches);
    reason = 'Contains external URLs';
  }

  // Check for email addresses
  const emailMatches = text.match(patterns.emails);
  if (emailMatches && emailMatches.length > 0) {
    matches.push(...emailMatches);
    reason = reason ? `${reason} and email addresses` : 'Contains email addresses';
  }

  // Check for phone numbers
  const phoneMatches = text.match(patterns.phones);
  if (phoneMatches && phoneMatches.length > 0) {
    matches.push(...phoneMatches);
    reason = reason ? `${reason} and phone numbers` : 'Contains phone numbers';
  }

  // Check for messaging apps
  const whatsappMatches = text.match(patterns.whatsapp);
  const telegramMatches = text.match(patterns.telegram);
  if (whatsappMatches || telegramMatches) {
    matches.push(...(whatsappMatches || []), ...(telegramMatches || []));
    reason = reason ? `${reason} and messaging app references` : 'Contains messaging app references';
  }

  return {
    isSpam: matches.length > 0,
    reason,
    matches
  };
}

module.exports = {
  checkProfanity,
  moderateContent,
  checkSpam
};
