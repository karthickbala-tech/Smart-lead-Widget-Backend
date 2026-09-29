"use strict";

const voiceService = require("../services/voiceService");
const callLogService = require("../services/callLogService");
const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Handles incoming Twilio Voice webhook.
 * Returns valid TwiML to Twilio.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleInboundVoice(parsedReq, res) {
  const body = parsedReq.body || {};
  const query = parsedReq.query || {};

  const callSid = body.CallSid || query.CallSid || "unknown";
  const from = body.From || query.From || "unknown";
  const to = body.To || query.To || "unknown";
  const callStatus = body.CallStatus || query.CallStatus || "ringing";

  console.log("================================");
  console.log("        INBOUND TWILIO CALL");
  console.log("================================");
  console.log("Call SID:", callSid);
  console.log("From:", from);
  console.log("To:", to);
  console.log("Call Status:", callStatus);
  console.log("================================");

  // Record the incoming call so the Zoho CRM widget can see it immediately
  callLogService.recordCall({
    callSid,
    direction: "inbound",
    from,
    to,
    status: callStatus === "unknown" ? "ringing" : callStatus
  });

  // Generate TwiML matching existing behavior
  const twimlString = voiceService.generateInboundTwiML();

  return response.sendTwiML(res, twimlString);
}

/**
 * Handles speech / DTMF gathered from an incoming call.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleVoiceGather(parsedReq, res) {
  const body = parsedReq.body || {};
  const twimlString = voiceService.generateGatherResponse(body);
  return response.sendTwiML(res, twimlString);
}

/**
 * Handles TwiML webhook for when an outbound call connects.
 * @param {Object} parsedReq
 * @param {import("http").ServerResponse} res
 */
async function handleOutboundAnswer(parsedReq, res) {
  const body = parsedReq.body || {};
  const callSid = body.CallSid || "unknown";

  logger.info("Outbound call answered by recipient", { callSid });

  callLogService.recordCall({
    callSid,
    status: "in-progress"
  });

  const twimlString = voiceService.generateOutboundAnswerTwiML();
  return response.sendTwiML(res, twimlString);
}

module.exports = {
  handleInboundVoice,
  handleVoiceGather,
  handleOutboundAnswer
};
