"use strict";

const phoneUtils = require("../utils/phone");

/**
 * Validates request payload for initiating an outbound call.
 * @param {Object} body
 * @returns {{ valid: boolean, error?: string, normalizedTo?: string }}
 */
function validateOutboundCall(body) {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      error: "Request body must be a valid JSON object."
    };
  }

  const to = body.to || body.phoneNumber || body.phone;
  if (!to) {
    return {
      valid: false,
      error: "Destination phone number ('to') is required."
    };
  }

  const phoneCheck = phoneUtils.validatePhoneNumber(String(to));
  if (!phoneCheck.valid) {
    return {
      valid: false,
      error: phoneCheck.error
    };
  }

  // Validate recordType if provided
  if (body.recordType) {
    const validModules = ["Leads", "Contacts", "Deals", "Accounts"];
    if (!validModules.includes(body.recordType)) {
      return {
        valid: false,
        error: `Invalid recordType '${body.recordType}'. Must be one of: ${validModules.join(", ")}`
      };
    }
  }

  return {
    valid: true,
    normalizedTo: phoneCheck.normalized
  };
}

module.exports = {
  validateOutboundCall
};
