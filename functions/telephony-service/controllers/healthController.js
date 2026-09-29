"use strict";

const env = require("../config/env");
const twilioConfig = require("../config/twilio");
const appConfig = require("../config/app");
const response = require("../utils/response");

/**
 * Handles health check request.
 * Matches exact tested response format for backward compatibility.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
function getHealth(req, res) {
  const envStatus = env.getEnvStatus();

  return response.sendJson(res, 200, {
    success: true,
    service: appConfig.service.name,
    message: "Telephony backend is running",
    twilioConfigured: {
      accountSid: envStatus.accountSid,
      apiKeySid: envStatus.apiKeySid,
      apiKeySecret: envStatus.apiKeySecret,
      callerId: envStatus.callerId,
      authToken: envStatus.authToken
    }
  });
}

/**
 * Handles safe diagnostic configuration status.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
function getConfigStatus(req, res) {
  const safeConfig = twilioConfig.getSafeTwilioConfig();

  return response.sendSuccess(res, "Telephony configuration status", {
    service: appConfig.service,
    twilio: safeConfig,
    trialNotice: appConfig.trialAccount.restrictionsMessage
  });
}

module.exports = {
  getHealth,
  getConfigStatus
};
