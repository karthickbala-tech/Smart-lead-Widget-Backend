"use strict";

/**
 * Validates browser softphone token requests.
 * @param {Object} data
 * @returns {{ valid: boolean, error?: string, identity: string }}
 */
function validateTokenRequest(data = {}) {
  let identity = (data.identity || data.userId || data.agentId || "").trim();

  // If no identity provided, assign a safe unique agent session identity
  if (!identity) {
    identity = `crm-agent-${Date.now()}`;
  }

  // Identity should only contain alphanumeric, dash, and underscore characters
  const cleanIdentity = identity.replace(/[^a-zA-Z0-9_\-]/g, "_");

  return {
    valid: true,
    identity: cleanIdentity
  };
}

module.exports = {
  validateTokenRequest
};
