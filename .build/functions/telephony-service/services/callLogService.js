"use strict";

const logger = require("../utils/logger");

/**
 * In-memory repository for call records and status events.
 * Keeps track of recent calls, status transitions, and CRM associations.
 */
class CallLogService {
  constructor(maxLogs = 200) {
    this.maxLogs = maxLogs;
    this.calls = new Map(); // callSid -> CallRecord
    this.callOrder = []; // array of callSids in insertion order
  }

  /**
   * Registers a new call or updates existing call metadata.
   * @param {Object} data
   * @returns {Object}
   */
  recordCall(data) {
    const callSid = data.callSid || data.CallSid;
    if (!callSid) {
      logger.warn("Attempted to record call without CallSid", data);
      return null;
    }

    const now = new Date().toISOString();
    let existing = this.calls.get(callSid);

    if (!existing) {
      // Maintain maximum log size
      if (this.callOrder.length >= this.maxLogs) {
        const oldestSid = this.callOrder.shift();
        this.calls.delete(oldestSid);
      }

      existing = {
        callSid,
        direction: data.direction || (data.Direction ? (data.Direction.includes("inbound") ? "inbound" : "outbound") : "unknown"),
        from: data.from || data.From || "unknown",
        to: data.to || data.To || "unknown",
        status: data.status || data.CallStatus || "initiated",
        duration: parseInt(data.duration || data.CallDuration || 0, 10),
        startTime: data.startTime || now,
        endTime: null,
        updatedAt: now,
        statusHistory: [
          {
            status: data.status || data.CallStatus || "initiated",
            timestamp: now,
            details: data.details || null
          }
        ],
        crmAssociation: data.crmAssociation || (data.recordId ? {
          recordType: data.recordType || "Leads",
          recordId: data.recordId,
          contactId: data.contactId,
          leadId: data.leadId,
          dealId: data.dealId
        } : null),
        error: null
      };

      this.calls.set(callSid, existing);
      this.callOrder.push(callSid);
    } else {
      // Update existing record
      if (data.status || data.CallStatus) {
        const newStatus = data.status || data.CallStatus;
        if (newStatus !== existing.status) {
          existing.status = newStatus;
          existing.statusHistory.push({
            status: newStatus,
            timestamp: now,
            details: data.details || null
          });
        }
      }

      if (data.duration || data.CallDuration) {
        existing.duration = parseInt(data.duration || data.CallDuration, 10);
      }

      if (data.from || data.From) existing.from = data.from || data.From;
      if (data.to || data.To) existing.to = data.to || data.To;
      if (data.crmAssociation) existing.crmAssociation = { ...existing.crmAssociation, ...data.crmAssociation };

      if (existing.status === "completed" || existing.status === "failed" || existing.status === "canceled") {
        existing.endTime = existing.endTime || now;
      }

      existing.updatedAt = now;
    }

    return existing;
  }

  /**
   * Retrieves a call by its Call SID.
   * @param {string} callSid
   * @returns {Object|null}
   */
  getCall(callSid) {
    return this.calls.get(callSid) || null;
  }

  /**
   * Retrieves the latest active or recent call matching a phone number.
   * Useful for incoming call detection in the CRM widget.
   * @param {string} phoneNumber
   * @returns {Object|null}
   */
  findCallByPhone(phoneNumber) {
    if (!phoneNumber) return null;
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    for (let i = this.callOrder.length - 1; i >= 0; i--) {
      const sid = this.callOrder[i];
      const call = this.calls.get(sid);
      if (call) {
        const fromDigits = call.from.replace(/\D/g, "");
        const toDigits = call.to.replace(/\D/g, "");
        if (fromDigits.includes(cleanNumber) || toDigits.includes(cleanNumber)) {
          return call;
        }
      }
    }
    return null;
  }

  /**
   * Lists all active calls (calls currently ringing, initiated, or in progress).
   * @returns {Array<Object>}
   */
  getActiveCalls() {
    const activeStatuses = ["initiated", "ringing", "in-progress", "answered"];
    return Array.from(this.calls.values())
      .filter((c) => activeStatuses.includes(c.status))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Lists recent call logs.
   * @param {Object} [filter={}]
   * @returns {Array<Object>}
   */
  listCalls(filter = {}) {
    const limit = Math.min(parseInt(filter.limit || 50, 10), 100);
    let list = Array.from(this.calls.values());

    if (filter.direction) {
      list = list.filter((c) => c.direction === filter.direction);
    }

    if (filter.status) {
      list = list.filter((c) => c.status === filter.status);
    }

    if (filter.recordId) {
      list = list.filter((c) => c.crmAssociation && c.crmAssociation.recordId === filter.recordId);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return list.slice(0, limit);
  }
}

// Singleton instance
const callLogService = new CallLogService();

module.exports = callLogService;
