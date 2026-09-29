"use strict";

const statusService = require("../services/statusService");
const callService = require("../services/callService");
const callLogService = require("../services/callLogService");
const response = require("../utils/response");

/**
 * Handles Twilio call status callbacks (POST) and status queries (GET).
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleStatus(parsedReq, res) {
  const method = parsedReq.method;
  const body = parsedReq.body || {};
  const query = parsedReq.query || {};

  // If GET request, return the status of a specific call or all active calls
  if (method === "GET") {
    const callSid = query.callSid || query.CallSid;

    if (!callSid) {
      // Return all active calls currently in progress
      const activeCalls = callLogService.getActiveCalls();
      return response.sendSuccess(res, "Active calls retrieved", {
        count: activeCalls.length,
        calls: activeCalls
      });
    }

    const refresh = query.refresh === "true";
    const call = await callService.getCallStatus(callSid, refresh);

    if (!call) {
      return response.sendError(res, `Call not found for SID: ${callSid}`, null, 404);
    }

    return response.sendSuccess(res, "Call status retrieved", call);
  }

  // POST: Twilio Status Callback webhook
  const callSid = body.CallSid || query.CallSid || "unknown";
  const callStatus = body.CallStatus || query.CallStatus || "unknown";
  const from = body.From || query.From || "unknown";
  const to = body.To || query.To || "unknown";
  const duration = body.CallDuration || query.CallDuration || "0";

  console.log("================================");
  console.log("        TWILIO CALL STATUS");
  console.log("================================");
  console.log("Call SID:", callSid);
  console.log("From:", from);
  console.log("To:", to);
  console.log("Status:", callStatus);
  console.log("Duration:", duration);
  console.log("================================");

  statusService.processStatusCallback(body);

  // Return standard response matching existing tested format
  return response.sendJson(res, 200, {
    success: true,
    callSid,
    callStatus,
    from,
    to,
    duration
  });
}

module.exports = {
  handleStatus
};
