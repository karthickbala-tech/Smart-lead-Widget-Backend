"use strict";

const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Maps Twilio API error codes to human-readable explanations.
 */
const TWILIO_ERROR_MAP = {
  20003: "Twilio Authentication Error: Account SID or credentials are invalid.",
  21211: "Invalid 'To' Phone Number: The destination phone number is not a valid phone number.",
  21212: "Invalid 'From' Phone Number: The caller ID is not a verified Twilio number.",
  21408: "Permission to call this region is restricted in your Twilio Geo Permissions.",
  21606: "The 'From' phone number is not a valid, provisioned Twilio phone number.",
  21608: "Twilio Trial Restriction: The destination number is unverified. Trial accounts can only make calls to verified caller IDs. Please verify the destination number in the Twilio Console (Phone Numbers > Verified Caller IDs).",
  21614: "The 'To' number is not a valid mobile or landline number."
};

/**
 * Centralized error handler for all telephony service requests.
 * @param {Error|any} error
 * @param {import("http").ServerResponse} res
 * @param {Object} [meta={}]
 */
function handleError(error, res, meta = {}) {
  logger.error("Unhandled telephony error", error, meta);

  if (res.headersSent) return;

  // Handle Twilio-specific error structures
  if (error && error.code && TWILIO_ERROR_MAP[error.code]) {
    return response.sendError(
      res,
      TWILIO_ERROR_MAP[error.code],
      {
        code: error.code,
        status: error.status || 400,
        moreInfo: error.moreInfo || "https://www.twilio.com/docs/api/errors"
      },
      error.status || 400
    );
  }

  // Handle generic validation or configuration errors
  if (error && error.message && error.message.includes("is not configured")) {
    return response.sendError(
      res,
      error.message,
      { type: "ConfigurationError" },
      503
    );
  }

  // Safe fallback error
  const safeMessage = error && error.message ? error.message : "Internal Server Error";
  response.sendError(
    res,
    safeMessage,
    null,
    500
  );
}

module.exports = {
  handleError,
  TWILIO_ERROR_MAP
};
