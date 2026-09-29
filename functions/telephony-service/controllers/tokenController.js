"use strict";

const tokenService = require("../services/tokenService");
const tokenValidator = require("../validators/tokenValidator");
const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Handles Twilio Voice Access Token generation for browser softphones.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleGenerateToken(parsedReq, res) {
  const data = parsedReq.method === "POST" ? parsedReq.body : parsedReq.query;
  const validation = tokenValidator.validateTokenRequest(data);

  const ttl = parseInt(data.ttl || 3600, 10);

  try {
    const tokenData = tokenService.generateVoiceToken(validation.identity, ttl);

    return response.sendSuccess(
      res,
      "Twilio Voice Access Token generated successfully",
      tokenData
    );
  } catch (error) {
    logger.error("Token generation error", error);
    return response.sendError(
      res,
      error.message || "Failed to generate softphone access token",
      { code: "TOKEN_GENERATION_FAILED" },
      error.message && error.message.includes("is required") ? 400 : 500
    );
  }
}

module.exports = {
  handleGenerateToken
};
