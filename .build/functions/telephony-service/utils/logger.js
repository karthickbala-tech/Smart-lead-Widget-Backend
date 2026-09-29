"use strict";

/**
 * Structured logger utility.
 * Sanitizes any sensitive Twilio credentials, passwords, or tokens.
 */

const SENSITIVE_KEYS = [
  "TWILIO_AUTH_TOKEN",
  "TWILIO_API_KEY_SECRET",
  "authToken",
  "apiKeySecret",
  "secret",
  "password",
  "token"
];

function sanitize(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()));
    if (isSensitive && typeof value === "string") {
      clean[key] = value.length > 8 ? `${value.substring(0, 4)}***${value.slice(-2)}` : "***REDACTED***";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const safeMeta = sanitize(meta);
  const metaStr = Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  info(message, meta = {}) {
    console.log(formatMessage("info", message, meta));
  },
  warn(message, meta = {}) {
    console.warn(formatMessage("warn", message, meta));
  },
  error(message, error = null, meta = {}) {
    const safeError = error instanceof Error
      ? { message: error.message, code: error.code }
      : error;
    console.error(formatMessage("error", message, { ...meta, error: safeError }));
  },
  debug(message, meta = {}) {
    if (process.env.DEBUG === "true" || process.env.NODE_ENV === "development") {
      console.log(formatMessage("debug", message, meta));
    }
  }
};

module.exports = logger;
