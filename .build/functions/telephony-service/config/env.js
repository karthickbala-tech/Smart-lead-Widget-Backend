"use strict";

/**
 * Environment configuration loader and validator.
 * Safely loads environment variables without leaking secrets.
 */

try {
  // Attempt to load .env in development environments if dotenv is available
  const dotenv = require("dotenv");
  dotenv.config();
} catch (e) {
  // Dotenv is optional in deployed Catalyst environments
}

/**
 * Safely retrieves an environment variable.
 * @param {string} key
 * @param {string} [defaultValue=""]
 * @returns {string}
 */
function getEnv(key, defaultValue = "") {
  return process.env[key] || defaultValue;
}

/**
 * Returns configuration readiness flags without exposing secret values.
 * @returns {Object}
 */
function getEnvStatus() {
  const accountSid = Boolean(process.env.TWILIO_ACCOUNT_SID);
  const apiKeySid = Boolean(process.env.TWILIO_API_KEY_SID);
  const apiKeySecret = Boolean(process.env.TWILIO_API_KEY_SECRET);
  const callerId = Boolean(process.env.TWILIO_CALLER_ID);
  const authToken = Boolean(process.env.TWILIO_AUTH_TOKEN);

  return {
    accountSid,
    apiKeySid,
    apiKeySecret,
    callerId,
    authToken
  };
}

/**
 * Checks whether Twilio credentials are minimally configured.
 * @returns {boolean}
 */
function isTwilioConfigured() {
  const status = getEnvStatus();
  const hasAccountSid = status.accountSid;
  const hasAuth = status.authToken || (status.apiKeySid && status.apiKeySecret);
  const hasCallerId = status.callerId;
  return Boolean(hasAccountSid && hasAuth && hasCallerId);
}

module.exports = {
  getEnv,
  getEnvStatus,
  isTwilioConfigured
};
