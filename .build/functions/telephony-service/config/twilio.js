"use strict";

const twilio = require("twilio");
const env = require("./env");

let twilioClientInstance = null;

/**
 * Returns a configured Twilio client instance.
 * Throws a descriptive configuration error if credentials are missing.
 * @returns {import("twilio").Twilio}
 */
function getTwilioClient() {
  if (twilioClientInstance) {
    return twilioClientInstance;
  }

  const accountSid = env.getEnv("TWILIO_ACCOUNT_SID");
  const authToken = env.getEnv("TWILIO_AUTH_TOKEN");
  const apiKeySid = env.getEnv("TWILIO_API_KEY_SID");
  const apiKeySecret = env.getEnv("TWILIO_API_KEY_SECRET");

  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID is not configured in environment variables.");
  }

  // Support both API Key authentication and Account SID + Auth Token
  if (apiKeySid && apiKeySecret) {
    twilioClientInstance = twilio(apiKeySid, apiKeySecret, { accountSid });
  } else if (authToken) {
    twilioClientInstance = twilio(accountSid, authToken);
  } else {
    throw new Error(
      "Twilio authentication requires either TWILIO_AUTH_TOKEN or (TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET)."
    );
  }

  return twilioClientInstance;
}

/**
 * Returns safe, masked credential information for diagnostic purposes.
 * @returns {Object}
 */
function getSafeTwilioConfig() {
  const accountSid = env.getEnv("TWILIO_ACCOUNT_SID");
  const callerId = env.getEnv("TWILIO_CALLER_ID");
  const apiKeySid = env.getEnv("TWILIO_API_KEY_SID");

  return {
    accountSidConfigured: Boolean(accountSid),
    accountSidMasked: accountSid ? `${accountSid.substring(0, 6)}...${accountSid.slice(-4)}` : null,
    apiKeySidConfigured: Boolean(apiKeySid),
    apiKeySidMasked: apiKeySid ? `${apiKeySid.substring(0, 6)}...${apiKeySid.slice(-4)}` : null,
    callerId: callerId || null,
    callerIdConfigured: Boolean(callerId),
    authTokenConfigured: Boolean(env.getEnv("TWILIO_AUTH_TOKEN")),
    apiKeySecretConfigured: Boolean(env.getEnv("TWILIO_API_KEY_SECRET"))
  };
}

/**
 * Returns the configured Twilio caller ID.
 * @returns {string}
 */
function getCallerId() {
  return env.getEnv("TWILIO_CALLER_ID");
}

module.exports = {
  getTwilioClient,
  getSafeTwilioConfig,
  getCallerId
};
