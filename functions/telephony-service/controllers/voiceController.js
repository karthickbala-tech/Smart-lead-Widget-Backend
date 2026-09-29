"use strict";

const voiceService = require("../services/voiceService");
const callLogService = require("../services/callLogService");
const response = require("../utils/response");
const logger = require("../utils/logger");

async function handleInboundVoice(parsedReq, res, req) {
  const body = parsedReq.body || {};
  const query = parsedReq.query || {};

  logger.info("Inbound Twilio request received", {
    method: parsedReq.method,
    path: parsedReq.path,
    type: parsedReq.type,
    query,
    bodyKeys: Object.keys(body)
  });

  const callSid =
    body.CallSid ||
    query.CallSid ||
    "unknown";

  const from =
    body.From ||
    query.From ||
    "unknown";

  const to =
    body.To ||
    query.To ||
    "unknown";

  const callStatus =
    body.CallStatus ||
    query.CallStatus ||
    "ringing";

  const direction =
    body.Direction ||
    query.Direction ||
    "inbound";

  logger.info("Inbound Twilio call", {
    callSid,
    direction,
    from,
    to,
    status: callStatus
  });

  await callLogService.recordCall(
    {
      callSid,
      direction,
      from,
      to,
      status: callStatus
    },
    req
  );

  const twimlString =
    voiceService.generateInboundTwiML();

  return response.sendTwiML(
    res,
    twimlString
  );
}

async function handleVoiceGather(parsedReq, res) {
  const body = parsedReq.body || {};

  const twimlString =
    voiceService.generateGatherResponse(body);

  return response.sendTwiML(
    res,
    twimlString
  );
}

async function handleOutboundAnswer(parsedReq, res, req) {
  const body = parsedReq.body || {};
  const query = parsedReq.query || {};

  const callSid =
    body.CallSid ||
    query.CallSid ||
    "unknown";

  const from =
    body.From ||
    query.From ||
    "unknown";

  const to =
    body.To ||
    query.To ||
    "unknown";

  const callStatus =
    body.CallStatus ||
    query.CallStatus ||
    "in-progress";

  const direction =
    body.Direction ||
    query.Direction ||
    "outbound";

  logger.info("Outbound call answered by recipient", {
    callSid,
    direction,
    from,
    to,
    status: callStatus
  });

  await callLogService.recordCall(
    {
      callSid,
      direction,
      from,
      to,
      status: callStatus
    },
    req
  );

  const twimlString =
    voiceService.generateOutboundAnswerTwiML();

  return response.sendTwiML(
    res,
    twimlString
  );
}

module.exports = {
  handleInboundVoice,
  handleVoiceGather,
  handleOutboundAnswer
};
