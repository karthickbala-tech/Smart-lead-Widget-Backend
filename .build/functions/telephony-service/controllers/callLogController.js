  "use strict";

  const callLogService = require("../services/callLogService");
  const response = require("../utils/response");

  /**
   * Handles listing call logs and querying single call details.
   * @param {Object} parsedReq
   * @param {import("http").ServerResponse} res
   */
  async function handleGetLogs(parsedReq, res) {
    const query = parsedReq.query || {};

    // If a specific callSid is queried:
    if (query.callSid) {
      const call = callLogService.getCall(query.callSid);
      if (!call) {
        return response.sendError(res, `Call log not found for SID: ${query.callSid}`, null, 404);
      }
      return response.sendSuccess(res, "Call log retrieved", call);
    }

    // Filter list
    const filter = {
      limit: query.limit || 50,
      direction: query.direction,
      status: query.status,
      recordId: query.recordId
    };

    const logs = callLogService.listCalls(filter);
    const activeCalls = callLogService.getActiveCalls();

    return response.sendSuccess(res, "Call logs retrieved", {
      total: logs.length,
      activeCount: activeCalls.length,
      calls: logs
    });
  }

  module.exports = {
    handleGetLogs
  };
