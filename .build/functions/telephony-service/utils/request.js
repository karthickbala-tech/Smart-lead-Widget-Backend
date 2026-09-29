"use strict";

const querystring = require("querystring");

/**
 * Reads and parses the incoming HTTP request body if not already present.
 * Supports application/json and application/x-www-form-urlencoded (Twilio webhooks).
 * @param {import("http").IncomingMessage} req
 * @returns {Promise<Object>}
 */
async function parseBody(req) {
  // If method doesn't carry a body, return empty object immediately
  const method = (req.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return {};
  }

  // If Catalyst or middleware has already parsed req.body, use it
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // If req.body is a string, attempt parse
  if (typeof req.body === "string" && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return querystring.parse(req.body);
    }
  }

  // Otherwise, read incoming stream
  return new Promise((resolve) => {
    let rawData = "";

    req.on("data", (chunk) => {
      rawData += chunk;
      // Safeguard against payload flooding (max 1MB)
      if (rawData.length > 1e6) {
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!rawData.trim()) {
        return resolve({});
      }

      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("application/json")) {
        try {
          return resolve(JSON.parse(rawData));
        } catch {
          return resolve({ raw: rawData });
        }
      }

      if (contentType.includes("application/x-www-form-urlencoded")) {
        try {
          return resolve(querystring.parse(rawData));
        } catch {
          return resolve({ raw: rawData });
        }
      }

      // Default try JSON first, then querystring
      try {
        return resolve(JSON.parse(rawData));
      } catch {
        return resolve(querystring.parse(rawData));
      }
    });

    req.on("error", () => {
      resolve({});
    });
  });
}

/**
 * Parses URL, query parameters, action/type, and body from Catalyst request.
 * @param {import("http").IncomingMessage} req
 * @returns {Promise<{ url: URL, path: string, type: string, action: string, query: Object, body: Object, method: string }>}
 */
async function parseRequest(req) {
  const method = (req.method || "GET").toUpperCase();
  const requestUrl = req.url || "/";
  const urlObj = new URL(requestUrl, "http://localhost");

  // Catalyst functions might have prefix /server/telephony-service/
  let normalizedPath = urlObj.pathname;
  if (normalizedPath.startsWith("/server/telephony-service")) {
    normalizedPath = normalizedPath.replace("/server/telephony-service", "") || "/";
  }

  // Extract all query params as a plain key-value object
  const query = {};
  for (const [key, value] of urlObj.searchParams.entries()) {
    query[key] = value;
  }

  // Determine request type/action from query (?type=... or ?action=...) or path
  let type = urlObj.searchParams.get("type") || urlObj.searchParams.get("action") || "";

  // If type wasn't in query params, inspect path
  if (!type && normalizedPath !== "/" && normalizedPath !== "") {
    const cleanPath = normalizedPath.replace(/^\/+|\/+$/g, "");
    const segments = cleanPath.split("/");
    type = segments[0]; // e.g. "voice", "status", "outbound", "token", "logs"
    if (segments.length > 1) {
      query.subAction = segments[1];
    }
  }

  const body = await parseBody(req);

  return {
    url: urlObj,
    rawUrl: requestUrl,
    path: normalizedPath,
    type,
    action: type,
    query,
    body: body || {},
    method
  };
}

module.exports = {
  parseBody,
  parseRequest
};
