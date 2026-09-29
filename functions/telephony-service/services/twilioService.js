"use strict";

const twilioConfig = require("../config/twilio");
const env = require("../config/env");
const logger = require("../utils/logger");

/**
 * Service wrapper for Twilio Voice API operations.
 */
class TwilioService {
  /**
   * Returns the Twilio client.
   * @returns {import("twilio").Twilio}
   */
  getClient() {
    return twilioConfig.getTwilioClient();
  }

  /**
   * Tests and verifies Twilio account authentication by querying account status.
   * @returns {Promise<{ active: boolean, friendlyName: string, status: string }>}
   */
  async verifyCredentials() {
    const client = this.getClient();
    const accountSid = env.getEnv("TWILIO_ACCOUNT_SID");

    try {
      const account = await client.api.v2010.accounts(accountSid).fetch();
      return {
        active: account.status === "active",
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      };
    } catch (error) {
      logger.error("Twilio verification failed", error);
      throw error;
    }
  }

  /**
   * Initiates an outbound voice call via Twilio.
   * @param {Object} params
   * @param {string} params.to Destination phone number (E.164)
   * @param {string} [params.from] Caller ID (defaults to configured TWILIO_CALLER_ID)
   * @param {string} params.url Webhook URL that Twilio fetches for TwiML instructions when answered
   * @param {string} [params.statusCallback] Webhook URL for status updates
   * @param {Array<string>} [params.statusCallbackEvent] Events to receive callbacks for
   * @returns {Promise<Object>} Created call details
   */
  async createCall({ to, from, url, statusCallback, statusCallbackEvent }) {
    const client = this.getClient();
    const callerId = from || twilioConfig.getCallerId();

    if (!callerId) {
      throw new Error("TWILIO_CALLER_ID is not configured and no 'from' number was provided.");
    }

    const callPayload = {
      to,
      from: callerId,
      url
    };

    if (statusCallback) {
      callPayload.statusCallback = statusCallback;
      callPayload.statusCallbackEvent = statusCallbackEvent || [
        "initiated",
        "ringing",
        "answered",
        "completed"
      ];
      callPayload.statusCallbackMethod = "POST";
    }

    logger.info("Initiating Twilio call", { to, from: callerId });

    try {
      const call = await client.calls.create(callPayload);
      return {
        callSid: call.sid,
        status: call.status,
        to: call.to,
        from: call.from,
        direction: call.direction,
        dateCreated: call.dateCreated
      };
    } catch (error) {
      logger.error("Failed to create Twilio call", error, { to });
      throw error;
    }
  }

  /**
   * Fetches real-time status of a call from Twilio.
   * @param {string} callSid
   * @returns {Promise<Object>}
   */
  async fetchCall(callSid) {
    const client = this.getClient();
    try {
      const call = await client.calls(callSid).fetch();
      return {
        callSid: call.sid,
        status: call.status,
        duration: call.duration,
        from: call.from,
        to: call.to,
        direction: call.direction,
        startTime: call.startTime,
        endTime: call.endTime
      };
    } catch (error) {
      logger.error("Failed to fetch Twilio call", error, { callSid });
      throw error;
    }
  }

  /**
   * Terminates / hangs up an in-progress call.
   * @param {string} callSid
   * @returns {Promise<Object>}
   */
  async hangupCall(callSid) {
    const client = this.getClient();
    try {
      const call = await client.calls(callSid).update({ status: "completed" });
      return {
        callSid: call.sid,
        status: call.status
      };
    } catch (error) {
      logger.error("Failed to hang up Twilio call", error, { callSid });
      throw error;
    }
  }
}

// Singleton instance
const twilioService = new TwilioService();

module.exports = twilioService;
