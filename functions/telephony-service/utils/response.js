"use strict";

/**
 * Standard CORS headers to allow Zoho CRM widget and external clients to communicate with Catalyst.
 */
const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Zoho-User",
  "Access-Control-Max-Age": "86400"
};

/**
 * Sends a JSON response with status code and CORS headers.
 * @param {import("http").ServerResponse} res
 * @param {number} statusCode
 * @param {Object} data
 */
function sendJson(res, statusCode, data) {
  if (res.headersSent) return;

  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    ...DEFAULT_CORS_HEADERS
  });
  res.end(payload);
}

/**
 * Sends a standardized success JSON response.
 * @param {import("http").ServerResponse} res
 * @param {string} message
 * @param {any} [data=null]
 * @param {number} [statusCode=200]
 */
function sendSuccess(res, message, data = null, statusCode = 200) {
  const responsePayload = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null && data !== undefined) {
    responsePayload.data = data;
  }

  sendJson(res, statusCode, responsePayload);
}

/**
 * Sends a standardized error JSON response.
 * @param {import("http").ServerResponse} res
 * @param {string} message
 * @param {any} [errorDetails=null]
 * @param {number} [statusCode=500]
 */
function sendError(res, message, errorDetails = null, statusCode = 500) {
  const responsePayload = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorDetails) {
    responsePayload.error = typeof errorDetails === "string" ? { message: errorDetails } : errorDetails;
  }

  sendJson(res, statusCode, responsePayload);
}

/**
 * Sends TwiML XML response.
 * @param {import("http").ServerResponse} res
 * @param {string} twimlString
 * @param {number} [statusCode=200]
 */
function sendTwiML(res, twimlString, statusCode = 200) {
  if (res.headersSent) return;

  res.writeHead(statusCode, {
    "Content-Type": "text/xml",
    "Content-Length": Buffer.byteLength(twimlString),
    ...DEFAULT_CORS_HEADERS
  });
  res.end(twimlString);
}

/**
 * Handles HTTP OPTIONS preflight request.
 * @param {import("http").ServerResponse} res
 */
function handleOptions(res) {
  if (res.headersSent) return;

  res.writeHead(204, DEFAULT_CORS_HEADERS);
  res.end();
}

module.exports = {
  DEFAULT_CORS_HEADERS,
  sendJson,
  sendSuccess,
  sendError,
  sendTwiML,
  handleOptions
};
