"use strict";

/**
 * Phone number validation and formatting utility.
 */

// E.164 pattern: + followed by 7 to 15 digits
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Checks whether a phone number matches standard E.164 format.
 * @param {string} phone
 * @returns {boolean}
 */
function isValidE164(phone) {
  if (!phone || typeof phone !== "string") {
    return false;
  }
  const trimmed = phone.trim();
  return E164_REGEX.test(trimmed);
}

/**
 * Validates a destination phone number.
 * Returns validation result with descriptive error if invalid.
 * @param {string} phone
 * @returns {{ valid: boolean, error?: string, normalized?: string }}
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return {
      valid: false,
      error: "Phone number is required."
    };
  }

  const trimmed = phone.trim();

  // If already valid E.164:
  if (isValidE164(trimmed)) {
    return {
      valid: true,
      normalized: trimmed
    };
  }

  // Check if it's missing the leading +
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return {
      valid: false,
      error: `Phone number '${phone}' is not in E.164 format. Expected format: +<country_code><number> (e.g. +1234567890 or +919876543210).`
    };
  }

  return {
    valid: false,
    error: `Invalid phone number format: '${phone}'. Must be a valid E.164 number.`
  };
}

/**
 * Safely masks a phone number for logs.
 * @param {string} phone
 * @returns {string}
 */
function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return "unknown";
  const clean = phone.trim();
  if (clean.length <= 5) return clean;
  return `${clean.substring(0, 3)}****${clean.slice(-2)}`;
}

module.exports = {
  isValidE164,
  validatePhoneNumber,
  maskPhoneNumber
};
