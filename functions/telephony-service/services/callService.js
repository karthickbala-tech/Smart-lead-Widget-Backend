"use strict";

const twilioService = require("./twilioService");
const callLogService = require("./callLogService");
const twilioConfig = require("../config/twilio");
const appConfig = require("../config/app");
const logger = require("../utils/logger");

/**
 * High-level service managing call sessions and lifecycle.
 */
class CallService {
  /**
   * Initiates an outbound call for Zoho CRM.
   * @param {Object} params
   * @param {string} params.to Destination phone number
   * @param {string} [params.recordType] CRM module ("Leads", "Contacts", "Deals")
   * @param {string} [params.recordId] CRM Record ID
   * @param {string} [params.leadId]
   * @param {string} [params.contactId]
   * @param {string} [params.dealId]
   * @param {string} [params.callbackBaseUrl] Base URL for Catalyst function callbacks
   * @returns {Promise<Object>}
   */
  async initiateOutboundCall(params) {
    const {
      to,
      recordType = "Leads",
      recordId = null,
      leadId = null,
      contactId = null,
      dealId = null,
      callbackBaseUrl = ""
    } = params;

    const callerId = twilioConfig.getCallerId();
    if (!callerId) {
      throw new Error("TWILIO_CALLER_ID is not configured in environment variables.");
    }

    // Build the webhook URL that Twilio calls when the dialed party answers
    // If a base URL is provided (e.g. from request host or Catalyst URL), use it
    let answerUrl = "";
    let statusCallback = "";

    if (callbackBaseUrl) {
      const cleanBase = callbackBaseUrl.replace(/\/+$/, "");
      answerUrl = `${cleanBase}/?type=voice-outbound`;
      statusCallback = `${cleanBase}/?type=status`;
    } else {
      // Fallback relative or default webhook
      answerUrl = "http://localhost:3000/server/telephony-service/?type=voice-outbound";
      statusCallback = "http://localhost:3000/server/telephony-service/?type=status";
    }

    logger.info("Initiating outbound call through Twilio", {
      to,
      callerId,
      recordType,
      recordId
    });

    try {
      const twilioCall = await twilioService.createCall({
  to,
  from: callerId,
  url: answerUrl
});

      // Record in centralized call log
      const callRecord = callLogService.recordCall({
        callSid: twilioCall.callSid,
        direction: "outbound",
        from: callerId,
        to,
        status: twilioCall.status || "initiated",
        crmAssociation: {
          recordType,
          recordId: recordId || leadId || contactId || dealId,
          leadId,
          contactId,
          dealId
        }
      });

      return {
        callSid: twilioCall.callSid,
        status: twilioCall.status || "initiated",
        to,
        from: callerId,
        direction: "outbound",
        crmRecord: {
          recordType,
          recordId: recordId || leadId || contactId || dealId
        },
        trialNote: appConfig.trialAccount.restrictionsMessage
      };
    } catch (error) {
      logger.error("Outbound call initiation error", error, { to });
      throw error;
    }
  }

  /**
   * Retrieves the current status of a call by CallSid.
   * Checks in-memory cache first, then syncs with Twilio API if needed.
   * @param {string} callSid
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<Object|null>}
   */
  async getCallStatus(callSid, forceRefresh = false) {
    let call = callLogService.getCall(callSid);

    if (forceRefresh || !call || (call.status !== "completed" && call.status !== "failed" && call.status !== "canceled")) {
      try {
        const liveCall = await twilioService.fetchCall(callSid);
        call = callLogService.recordCall({
          callSid: liveCall.callSid,
          status: liveCall.status,
          duration: liveCall.duration,
          from: liveCall.from,
          to: liveCall.to,
          direction: liveCall.direction
        });
      } catch (err) {
        // If live fetch fails, return cached record
        logger.warn("Could not fetch live call status from Twilio, using cached record", { callSid });
      }
    }

    return call;
  }

  /**
   * Hangs up a call in progress.
   * @param {string} callSid
   * @returns {Promise<Object>}
   */
  async hangup(callSid) {
    const result = await twilioService.hangupCall(callSid);
    callLogService.recordCall({
      callSid,
      status: "completed"
    });
    return result;
  }
}

// Singleton instance
const callService = new CallService();

module.exports = callService;
