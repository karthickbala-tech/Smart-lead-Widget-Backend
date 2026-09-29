"use strict";

const twilio = require("twilio");
const env = require("../config/env");
const logger = require("../utils/logger");

/**
 * Service for generating Twilio Voice Access Tokens for browser softphones.
 */
class TokenService {
  /**
   * Generates a short-lived Twilio Voice Access Token.
   * @param {string} identity Identifier for the softphone agent/user
   * @param {number} [ttl=3600] Token validity in seconds (default 1 hour)
   * @returns {Object} { token, identity, ttl }
   */
  generateVoiceToken(identity, ttl = 3600) {
    const accountSid = env.getEnv("TWILIO_ACCOUNT_SID");
    const apiKeySid = env.getEnv("TWILIO_API_KEY_SID");
    const apiKeySecret = env.getEnv("TWILIO_API_KEY_SECRET");
    const twimlAppSid = env.getEnv("TWILIO_TWIML_APP_SID");

    if (!accountSid) {
      throw new Error("TWILIO_ACCOUNT_SID is required to generate a voice token.");
    }

    if (!apiKeySid || !apiKeySecret) {
      throw new Error(
        "Browser softphone access token generation requires TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET to be configured."
      );
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create an access token
    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
      ttl
    });

    // Create a Voice grant and enable incoming/outgoing calls
    const voiceGrant = new VoiceGrant({
      incomingAllow: true
    });

    if (twimlAppSid) {
      voiceGrant.outgoingApplicationSid = twimlAppSid;
    }

    token.addGrant(voiceGrant);

    const jwtToken = token.toJwt();

    logger.info("Voice access token generated for identity", { identity, ttl });

    return {
      token: jwtToken,
      identity,
      ttl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    };
  }
}

// Singleton instance
const tokenService = new TokenService();

module.exports = tokenService;
