"use strict";

const twilio = require("twilio");

module.exports = async (req, res) => {
  try {
    /*
     * Catalyst Advanced I/O can provide the request URL
     * without exposing the route in req.path exactly as
     * expected.
     *
     * Therefore we use a query parameter:
     *
     * ?type=voice
     * ?type=status
     */

    const requestUrl = req.url || "/";

    const url = new URL(
      requestUrl,
      "http://localhost"
    );

    const type = url.searchParams.get("type");

    /*
     * ==================================================
     * HEALTH CHECK
     * ==================================================
     */

    if (!type) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKeySid = process.env.TWILIO_API_KEY_SID;
      const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
      const callerId = process.env.TWILIO_CALLER_ID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      return res.end(
        JSON.stringify({
          success: true,
          service: "AI Telephony Service",
          message: "Telephony backend is running",
          twilioConfigured: {
            accountSid: Boolean(accountSid),
            apiKeySid: Boolean(apiKeySid),
            apiKeySecret: Boolean(apiKeySecret),
            callerId: Boolean(callerId),
            authToken: Boolean(authToken)
          }
        })
      );
    }

    /*
     * ==================================================
     * INBOUND VOICE WEBHOOK
     * ==================================================
     */

    if (type === "voice") {
      const callSid = req.body?.CallSid || "unknown";
      const from = req.body?.From || "unknown";
      const to = req.body?.To || "unknown";
      const callStatus = req.body?.CallStatus || "unknown";

      console.log("================================");
      console.log("        INBOUND TWILIO CALL");
      console.log("================================");
      console.log("Call SID:", callSid);
      console.log("From:", from);
      console.log("To:", to);
      console.log("Call Status:", callStatus);
      console.log("================================");

      const twiml = new twilio.twiml.VoiceResponse();

      twiml.say(
        {
          voice: "alice",
          language: "en-IN"
        },
        "Hello. Your call has reached the AI Telephony service."
      );

      res.writeHead(200, {
        "Content-Type": "text/xml"
      });

      return res.end(twiml.toString());
    }

    /*
     * ==================================================
     * TWILIO CALL STATUS WEBHOOK
     * ==================================================
     */

    if (type === "status") {
      const callSid = req.body?.CallSid || "unknown";
      const callStatus = req.body?.CallStatus || "unknown";
      const from = req.body?.From || "unknown";
      const to = req.body?.To || "unknown";
      const duration = req.body?.CallDuration || "0";

      console.log("================================");
      console.log("        TWILIO CALL STATUS");
      console.log("================================");
      console.log("Call SID:", callSid);
      console.log("From:", from);
      console.log("To:", to);
      console.log("Status:", callStatus);
      console.log("Duration:", duration);
      console.log("================================");

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      return res.end(
        JSON.stringify({
          success: true,
          callSid,
          callStatus,
          from,
          to,
          duration
        })
      );
    }

    /*
     * ==================================================
     * UNKNOWN REQUEST TYPE
     * ==================================================
     */

    res.writeHead(400, {
      "Content-Type": "application/json"
    });

    return res.end(
      JSON.stringify({
        success: false,
        message: "Unknown request type",
        allowedTypes: [
          "voice",
          "status"
        ]
      })
    );

  } catch (error) {
    console.error("Telephony service error:", error);

    res.writeHead(500, {
      "Content-Type": "application/json"
    });

    return res.end(
      JSON.stringify({
        success: false,
        message: "Internal Server Error"
      })
    );
  }
};