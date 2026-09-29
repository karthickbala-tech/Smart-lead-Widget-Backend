"use strict";

const callLogService = require("./callLogService");
const logger = require("../utils/logger");

class StatusService {
  async processStatusCallback(statusData = {}, req) {
    const callSid =
      statusData.CallSid ||
      statusData.callSid ||
      "unknown";

    const callStatus =
      statusData.CallStatus ||
      statusData.callStatus ||
      "unknown";

    const from =
      statusData.From ||
      statusData.from ||
      "unknown";

    const to =
      statusData.To ||
      statusData.to ||
      "unknown";

    const duration =
      statusData.CallDuration ||
      statusData.duration ||
      "0";

    const direction =
      statusData.Direction ||
      statusData.direction ||
      "";

    logger.info("Twilio status callback received", {
      callSid,
      status: callStatus,
      duration,
      direction
    });

    return await callLogService.recordCall(
      {
        callSid,
        status: callStatus,
        from,
        to,
        duration,
        direction: direction.includes("inbound")
          ? "inbound"
          : direction.includes("outbound")
            ? "outbound"
            : undefined,
        details: {
          sequenceNumber: statusData.SequenceNumber,
          timestamp: statusData.Timestamp
        }
      },
      req
    );
  }
}

module.exports = new StatusService();