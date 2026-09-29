"use strict";

const router = require("./routes/router");

/**
 * Zoho Catalyst Advanced I/O Function Entry Point
 * Function Name: telephony-service
 * Runtime: Node.js 20
 *
 * Bootstraps the Advanced I/O function and delegates all request routing,
 * validation, Twilio telephony interactions, and CRM associations to the
 * modular architecture.
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
module.exports = async (req, res) => {
  return router.handle(req, res);
};
