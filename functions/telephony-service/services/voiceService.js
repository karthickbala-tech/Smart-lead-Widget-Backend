"use strict";

const twilio = require("twilio");
const appConfig = require("../config/app");
const logger = require("../utils/logger");

/**
 * Service for generating TwiML voice responses.
 */
class VoiceService {
  /**
   * Generates standard TwiML for an inbound incoming call.
   * Matches the tested behavior and supports interactive speech gathering.
   * @param {Object} [options={}]
   * @param {string} [options.actionUrl] URL for speech gather action
   * @param {string} [options.message] Custom greeting message
   * @returns {string} XML string
   */
  generateInboundTwiML(options = {}) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const voice = options.voice || appConfig.voice.defaultVoice;
    const language = options.language || appConfig.voice.defaultLanguage;
    const greeting = options.message || appConfig.voice.defaultGreeting;

    // Speak initial greeting
    twiml.say(
      {
        voice,
        language
      },
      greeting
    );

    // If an action URL is provided for interactive voice / speech input
    if (options.actionUrl) {
      const gather = twiml.gather({
        input: "speech dtmf",
        timeout: 5,
        numDigits: 1,
        action: options.actionUrl,
        method: "POST"
      });
      gather.say(
        {
          voice,
          language
        },
        "Please speak your request or press 1 to connect with an agent."
      );
    } else {
      // Pause briefly then provide assistance message
      twiml.pause({ length: 1 });
      twiml.say(
        {
          voice,
          language
        },
        "Thank you for contacting us. Have a great day!"
      );
      twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Generates TwiML for when an outbound call is answered by the destination.
   * @param {Object} [options={}]
   * @returns {string}
   */
  generateOutboundAnswerTwiML(options = {}) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const voice = options.voice || appConfig.voice.defaultVoice;
    const language = options.language || appConfig.voice.defaultLanguage;
    const greeting = options.message || appConfig.voice.defaultOutboundGreeting;

    twiml.say(
      {
        voice,
        language
      },
      greeting
    );

    // Keep call connected or forward to conference/agent if configured
    if (options.agentClient) {
      const dial = twiml.dial();
      dial.client(options.agentClient);
    } else {
      twiml.pause({ length: 1 });
      twiml.say(
        {
          voice,
          language
        },
        "Your call is now connected."
      );
    }

    return twiml.toString();
  }

  /**
   * Generates response after speech or DTMF has been gathered.
   * @param {Object} gatherData
   * @param {string} [gatherData.SpeechResult]
   * @param {string} [gatherData.Digits]
   * @returns {string}
   */
  generateGatherResponse(gatherData = {}) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const voice = appConfig.voice.defaultVoice;
    const language = appConfig.voice.defaultLanguage;

    const speech = gatherData.SpeechResult || "";
    const digits = gatherData.Digits || "";

    logger.info("Processing gathered input", { digits, hasSpeech: Boolean(speech) });

    if (digits === "1" || speech.toLowerCase().includes("agent")) {
      twiml.say(
        { voice, language },
        "Connecting you to the next available agent. Please stay on the line."
      );
    } else if (speech) {
      twiml.say(
        { voice, language },
        `You said: ${speech}. Your message has been logged for our support team.`
      );
    } else {
      twiml.say(
        { voice, language },
        "Thank you for reaching out. Goodbye."
      );
    }

    twiml.hangup();
    return twiml.toString();
  }
}

// Singleton instance
const voiceService = new VoiceService();

module.exports = voiceService;
