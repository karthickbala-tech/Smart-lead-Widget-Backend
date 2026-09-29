"use strict";

const callLogService = require("./callLogService");
const logger = require("../utils/logger");

/**
 * Service for handling Twilio call status callbacks and state changes.
 */
class StatusService {
  /**
   * Processes a Twilio status callback webhook.
   * @param {Object} statusData Body from Twilio status webhook
   * @returns {Object} Updated call record
   */
  processStatusCallback(statusData = {}) {
    const callSid = statusData.CallSid || statusData.callSid || "unknown";
    const callStatus = statusData.CallStatus || statusData.callStatus || "unknown";
    const from = statusData.From || statusData.from || "unknown";
    const to = statusData.To || statusData.to || "unknown";
    const duration = statusData.CallDuration || statusData.duration || "0";
    const direction = statusData.Direction || statusData.direction || "";

    logger.info("Twilio status callback received", {
      callSid,
      status: callStatus,
      duration,
      from,
      to
    });

    const record = callLogService.recordCall({
      callSid,
      status: callStatus,
      from,
      to,
      duration,
      direction: direction.includes("inbound") ? "inbound" : (direction.includes("outbound") ? "outbound" : undefined),
      details: {
        sequenceNumber: statusData.SequenceNumber,
        timestamp: statusData.Timestamp
      }
    });

    return record;
  }
}

// Singleton instance
const statusService = new StatusService();

module.exports = statusService;
