"use strict";

const statusService = require("../services/statusService");
const callService = require("../services/callService");
const callLogService = require("../services/callLogService");
const response = require("../utils/response");

async function handleStatus(parsedReq, res, req) {
  const method = parsedReq.method;
  const body = parsedReq.body || {};
  const query = parsedReq.query || {};

  if (method === "GET") {
    const callSid = query.callSid || query.CallSid;

    if (!callSid) {
      const activeCalls = await callLogService.getActiveCalls(req);

      return response.sendSuccess(res, "Active calls retrieved", {
        count: activeCalls.length,
        calls: activeCalls
      });
    }

    const refresh = query.refresh === "true";
    const call = await callService.getCallStatus(callSid, refresh);

    if (!call) {
      return response.sendError(
        res,
        `Call not found for SID: ${callSid}`,
        null,
        404
      );
    }

    return response.sendSuccess(
      res,
      "Call status retrieved",
      call
    );
  }

  const callSid = body.CallSid || query.CallSid || "unknown";
  const callStatus =
    body.CallStatus || query.CallStatus || "unknown";
  const from = body.From || query.From || "unknown";
  const to = body.To || query.To || "unknown";
  const duration =
    body.CallDuration || query.CallDuration || "0";

  const record = await statusService.processStatusCallback(
    body,
    req
  );

  return response.sendJson(res, 200, {
    success: true,
    callSid,
    callStatus,
    from,
    to,
    duration,
    record
  });
}

module.exports = {
  handleStatus
};