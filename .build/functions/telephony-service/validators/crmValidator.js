"use strict";

/**
 * Validates CRM call association payload from Zoho CRM widget.
 * @param {Object} body
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCrmAssociation(body) {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      error: "Request body must be a valid JSON object."
    };
  }

  const callSid = body.callSid || body.CallSid;
  if (!callSid || typeof callSid !== "string") {
    return {
      valid: false,
      error: "Call SID ('callSid') is required to associate a call with a CRM record."
    };
  }

  const recordType = body.recordType || body.module;
  if (!recordType) {
    return {
      valid: false,
      error: "CRM record type ('recordType') is required (e.g. 'Leads' or 'Contacts')."
    };
  }

  const recordId = body.recordId || body.id;
  if (!recordId) {
    return {
      valid: false,
      error: "CRM record ID ('recordId') is required."
    };
  }

  return { valid: true };
}

module.exports = {
  validateCrmAssociation
};
