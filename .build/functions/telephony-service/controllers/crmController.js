"use strict";

const crmService = require("../services/crmService");
const crmValidator = require("../validators/crmValidator");
const response = require("../utils/response");

/**
 * Handles CRM call association from the Zoho CRM widget.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleAssociateCall(parsedReq, res) {
  const body = parsedReq.body || {};

  const validation = crmValidator.validateCrmAssociation(body);
  if (!validation.valid) {
    return response.sendError(res, validation.error, null, 400);
  }

  const callSid = body.callSid || body.CallSid;
  const associationData = {
    recordType: body.recordType || body.module,
    recordId: body.recordId || body.id,
    subject: body.subject,
    notes: body.notes,
    callResult: body.callResult || body.status
  };

  const updatedRecord = crmService.associateCall(callSid, associationData);
  const crmActivityPayload = crmService.buildCrmCallPayload(updatedRecord);

  return response.sendSuccess(res, "Call successfully associated with CRM record", {
    callRecord: updatedRecord,
    crmActivityPayload
  });
}

/**
 * Handles caller identification lookup by phone number for the widget.
 * When an incoming call arrives, the widget queries this to match caller and display real-time call.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleLookupCaller(parsedReq, res) {
  const query = parsedReq.query || {};
  const phone = query.phone || query.phoneNumber || query.number;

  if (!phone) {
    return response.sendError(res, "Phone number parameter ('phone') is required.", null, 400);
  }

  const callerData = crmService.lookupCaller(phone);

  if (!callerData) {
    return response.sendSuccess(res, "No active or recent call found for this phone number", {
      phone,
      found: false
    });
  }

  return response.sendSuccess(res, "Caller information retrieved", {
    phone,
    found: true,
    call: callerData
  });
}

module.exports = {
  handleAssociateCall,
  handleLookupCaller
};
