"use strict";

const callService = require("../services/callService");
const callValidator = require("../validators/callValidator");
const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Handles outbound call requests from Zoho CRM widget.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleOutboundCall(parsedReq, res) {
  const body = parsedReq.body || {};

  // Validate request body
  const validation = callValidator.validateOutboundCall(body);
  if (!validation.valid) {
    return response.sendError(res, validation.error, null, 400);
  }

  // Derive callback base URL from request host if available
  const protocol = parsedReq.url.protocol || "http:";
  const host = parsedReq.url.host || "localhost:3000";
  const callbackBaseUrl = `${protocol}//${host}/server/telephony-service`;

  try {
    const result = await callService.initiateOutboundCall({
      to: validation.normalizedTo,
      recordType: body.recordType || "Leads",
      recordId: body.recordId || body.id,
      leadId: body.leadId,
      contactId: body.contactId,
      dealId: body.dealId,
      callbackBaseUrl
    });

    return response.sendSuccess(res, "Outbound call initiated successfully via Twilio", result, 201);
  } catch (error) {
    logger.error("Failed to initiate outbound call", error);

    // Differentiate Twilio trial restriction (error code 21608)
    if (error && error.code === 21608) {
      return response.sendError(
        res,
        `Twilio Trial Restriction: The number ${validation.normalizedTo} is not verified. On Twilio Trial accounts, outbound calls can only be placed to verified numbers. Please verify this number in Twilio Console under 'Verified Caller IDs'.`,
        {
          code: 21608,
          trialAccount: true,
          documentation: "https://www.twilio.com/docs/errors/21608"
        },
        403
      );
    }

    if (error && error.code === 21211) {
      return response.sendError(
        res,
        `Invalid phone number format: ${validation.normalizedTo}. Number must be valid E.164.`,
        { code: 21211 },
        400
      );
    }

    return response.sendError(
      res,
      error.message || "Failed to initiate outbound call via Twilio",
      { code: error.code || "TWILIO_CALL_ERROR" },
      error.status || 500
    );
  }
}

/**
 * Handles hangup request for an active call.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleHangup(parsedReq, res) {
  const body = parsedReq.body || {};
  const query = parsedReq.query || {};
  const callSid = body.callSid || query.callSid;

  if (!callSid) {
    return response.sendError(res, "CallSid is required to hang up a call.", null, 400);
  }

  try {
    const result = await callService.hangup(callSid);
    return response.sendSuccess(res, "Call terminated successfully", result);
  } catch (error) {
    logger.error("Failed to hang up call", error);
    return response.sendError(res, error.message || "Failed to terminate call", null, error.status || 500);
  }
}

module.exports = {
  handleOutboundCall,
  handleHangup
};
