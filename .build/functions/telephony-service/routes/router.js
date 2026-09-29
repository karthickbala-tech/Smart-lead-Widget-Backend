"use strict";

const requestUtils = require("../utils/request");
const responseUtils = require("../utils/response");
const cors = require("../middleware/cors");
const errorHandler = require("../middleware/errorHandler");

const healthController = require("../controllers/healthController");
const voiceController = require("../controllers/voiceController");
const statusController = require("../controllers/statusController");
const callController = require("../controllers/callController");
const tokenController = require("../controllers/tokenController");
const callLogController = require("../controllers/callLogController");
const crmController = require("../controllers/crmController");
const appConfig = require("../config/app");

/**
 * Main router for Catalyst Advanced I/O function.
 * Supports both query-parameter based dispatch (?type=...) and clean path dispatch.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
async function handle(req, res) {
  // Handle CORS preflight options
  if (cors.handleCors(req, res)) {
    return;
  }

  let parsedReq;
  try {
    parsedReq = await requestUtils.parseRequest(req);
  } catch (parseError) {
    return errorHandler.handleError(parseError, res, { stage: "parseRequest" });
  }

  const { type, path, method } = parsedReq;

  try {
    /*
     * 1. Health check endpoint (root request with no type specified)
     */
    if (!type && (path === "/" || path === "")) {
      return healthController.getHealth(req, res);
    }

    /*
     * 2. Inbound Voice Webhook
     */
    if (type === "voice") {
      return await voiceController.handleInboundVoice(parsedReq, res);
    }

    if (type === "voice-gather") {
      return await voiceController.handleVoiceGather(parsedReq, res);
    }

    if (type === "voice-outbound") {
      return await voiceController.handleOutboundAnswer(parsedReq, res);
    }

    /*
     * 3. Twilio Call Status Callback & Status Queries
     */
    if (type === "status") {
      return await statusController.handleStatus(parsedReq, res);
    }

    /*
     * 4. Outbound Calling
     */
    if (type === "outbound" || type === "call" || type === "call-outbound") {
      if (method === "POST") {
        return await callController.handleOutboundCall(parsedReq, res);
      }
      // If GET, treat as status query
      return await statusController.handleStatus(parsedReq, res);
    }

    /*
     * 5. Call Termination / Hangup
     */
    if (type === "hangup") {
      return await callController.handleHangup(parsedReq, res);
    }

    /*
     * 6. Browser Softphone Access Token
     */
    if (type === "token" || type === "softphone-token") {
      return await tokenController.handleGenerateToken(parsedReq, res);
    }

    /*
     * 7. Call Logs & History
     */
    if (type === "logs" || type === "history") {
      return await callLogController.handleGetLogs(parsedReq, res);
    }

    /*
     * 8. CRM Call Association
     */
    if (type === "crm-associate" || type === "associate") {
      return await crmController.handleAssociateCall(parsedReq, res);
    }

    /*
     * 9. CRM Caller Lookup (for Inbound Caller ID in Widget)
     */
    if (type === "crm-lookup" || type === "lookup") {
      return await crmController.handleLookupCaller(parsedReq, res);
    }

    /*
     * 10. Safe Configuration Status
     */
    if (type === "config") {
      return healthController.getConfigStatus(req, res);
    }

    /*
     * 11. Unknown Route / Request Type
     */
    return responseUtils.sendJson(res, 400, {
      success: false,
      message: "Unknown request type",
      allowedTypes: appConfig.routing.allowedTypes
    });

  } catch (error) {
    return errorHandler.handleError(error, res, {
      url: parsedReq.rawUrl,
      type,
      method
    });
  }
}

module.exports = {
  handle
};
