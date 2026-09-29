"use strict";

const callLogService = require("../services/callLogService");
const response = require("../utils/response");

async function handleGetLogs(parsedReq, res, req) {
  const query = parsedReq.query || {};

  if (query.callSid) {
    const call = await callLogService.getCall(
      query.callSid,
      req
    );

    if (!call) {
      return response.sendError(
        res,
        `Call log not found for SID: ${query.callSid}`,
        null,
        404
      );
    }

    return response.sendSuccess(
      res,
      "Call log retrieved",
      call
    );
  }

  const filter = {
    limit: query.limit || 50,
    direction: query.direction,
    status: query.status,
    recordId: query.recordId
  };

  const logs = await callLogService.listCalls(
    filter,
    req
  );

  const activeCalls =
    await callLogService.getActiveCalls(req);

  return response.sendSuccess(
    res,
    "Call logs retrieved",
    {
      total: logs.length,
      activeCount: activeCalls.length,
      calls: logs
    }
  );
}

module.exports = {
  handleGetLogs
};