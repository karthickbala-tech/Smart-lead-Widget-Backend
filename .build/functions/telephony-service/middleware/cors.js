"use strict";

const response = require("../utils/response");

/**
 * Handles CORS headers and OPTIONS preflight requests.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @returns {boolean} true if request was handled (OPTIONS), false to continue
 */
function handleCors(req, res) {
  if (req.method === "OPTIONS") {
    response.handleOptions(res);
    return true;
  }
  return false;
}

module.exports = {
  handleCors
};
