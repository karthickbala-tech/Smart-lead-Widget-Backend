"use strict";

module.exports = {
  service: {
    name: "AI Telephony Service",
    version: "1.0.0",
    platform: "Zoho Catalyst Advanced I/O",
    runtime: "Node.js 20"
  },
  voice: {
    defaultVoice: "alice",
    defaultLanguage: "en-IN",
    defaultGreeting: "Hello. Your call has reached the AI Telephony service.",
    defaultOutboundGreeting: "Hello, this is a call initiated from your Zoho CRM telephony widget."
  },
  callStates: {
    INITIATED: "initiated",
    RINGING: "ringing",
    ANSWERED: "answered",
    IN_PROGRESS: "in-progress",
    COMPLETED: "completed",
    BUSY: "busy",
    FAILED: "failed",
    NO_ANSWER: "no-answer",
    CANCELED: "canceled"
  },
  crm: {
    supportedModules: ["Leads", "Contacts", "Deals"],
    defaultCallType: "Outbound"
  },
  routing: {
    allowedTypes: [
      "voice",
      "voice-gather",
      "status",
      "outbound",
      "hangup",
      "token",
      "logs",
      "call",
      "crm-associate",
      "crm-lookup",
      "config"
    ]
  },
  trialAccount: {
    isTrial: true,
    restrictionsMessage: "Twilio trial account requires outbound calls to be made to verified phone numbers only."
  }
};
