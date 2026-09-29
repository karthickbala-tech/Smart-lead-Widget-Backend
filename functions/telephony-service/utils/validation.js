"use strict";

/**
 * Generic validation helper for request bodies and parameters.
 */

function validateRequired(obj, fields) {
  const missing = [];
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required field(s): ${missing.join(", ")}`
    };
  }

  return { isValid: true };
}

module.exports = {
  validateRequired
};
