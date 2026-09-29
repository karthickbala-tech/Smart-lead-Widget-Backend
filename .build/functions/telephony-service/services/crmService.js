"use strict";

const callLogService = require("./callLogService");
const logger = require("../utils/logger");

/**
 * Service providing CRM call association, caller identification matching,
 * and standard Zoho CRM Call Activity payload generation.
 */
class CrmService {
  /**
   * Associates an active or completed call with a Zoho CRM entity (Lead, Contact, Deal).
   * @param {string} callSid
   * @param {Object} associationData
   * @param {string} associationData.recordType "Leads" | "Contacts" | "Deals"
   * @param {string} associationData.recordId
   * @param {string} [associationData.subject]
   * @param {string} [associationData.notes]
   * @param {string} [associationData.callResult]
   * @returns {Object} Updated call record
   */
  associateCall(callSid, associationData) {
    const existingCall = callLogService.getCall(callSid);

    if (!existingCall) {
      // If the call hasn't been recorded yet (e.g. race condition), initialize it
      return callLogService.recordCall({
        callSid,
        crmAssociation: {
          recordType: associationData.recordType,
          recordId: associationData.recordId,
          subject: associationData.subject || null,
          notes: associationData.notes || null,
          callResult: associationData.callResult || null,
          associatedAt: new Date().toISOString()
        }
      });
    }

    const updated = callLogService.recordCall({
      callSid,
      crmAssociation: {
        recordType: associationData.recordType,
        recordId: associationData.recordId,
        subject: associationData.subject || existingCall.crmAssociation?.subject || null,
        notes: associationData.notes || existingCall.crmAssociation?.notes || null,
        callResult: associationData.callResult || existingCall.crmAssociation?.callResult || null,
        associatedAt: new Date().toISOString()
      }
    });

    logger.info("Call associated with CRM record", {
      callSid,
      recordType: associationData.recordType,
      recordId: associationData.recordId
    });

    return updated;
  }

  /**
   * Formats call record into the standard Zoho CRM "Calls" module payload structure.
   * This structure is directly consumable by the Zoho CRM JavaScript SDK:
   * ZOHO.CRM.API.insertRecord({ Entity: "Calls", APIData: payload })
   * @param {Object} callRecord
   * @returns {Object} Zoho CRM Call entity payload
   */
  buildCrmCallPayload(callRecord) {
    const isOutbound = callRecord.direction === "outbound";
    const remoteNumber = isOutbound ? callRecord.to : callRecord.from;
    const durationSeconds = callRecord.duration || 0;

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const formattedDuration = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const crmAssoc = callRecord.crmAssociation || {};
    const recordType = crmAssoc.recordType || "Leads";
    const recordId = crmAssoc.recordId || null;

    const payload = {
      Subject: crmAssoc.subject || `${isOutbound ? "Outbound" : "Inbound"} Call - ${remoteNumber}`,
      Call_Type: isOutbound ? "Outbound" : "Inbound",
      Call_Start_Time: callRecord.startTime,
      Call_Duration: formattedDuration,
      Call_Duration_in_seconds: durationSeconds,
      Call_Result: crmAssoc.callResult || (callRecord.status === "completed" ? "Completed" : callRecord.status),
      Description: crmAssoc.notes || `Twilio Call SID: ${callRecord.callSid} | Status: ${callRecord.status}`,
      Twilio_Call_SID: callRecord.callSid
    };

    // Associate with parent record in Zoho CRM
    if (recordId) {
      if (recordType === "Leads") {
        payload.What_Id = recordId;
        payload.$se_module = "Leads";
      } else if (recordType === "Contacts") {
        payload.Who_Id = recordId;
        payload.$se_module = "Contacts";
      } else if (recordType === "Deals") {
        payload.What_Id = recordId;
        payload.$se_module = "Deals";
      }
    }

    return payload;
  }

  /**
   * Searches for active or recent calls matching a phone number.
   * Used by the Zoho CRM widget when a record is viewed or an inbound call arrives.
   * @param {string} phoneNumber
   * @returns {Object|null}
   */
  lookupCaller(phoneNumber) {
    const call = callLogService.findCallByPhone(phoneNumber);
    if (!call) return null;

    return {
      callSid: call.callSid,
      direction: call.direction,
      status: call.status,
      from: call.from,
      to: call.to,
      duration: call.duration,
      startTime: call.startTime,
      crmAssociation: call.crmAssociation || null,
      crmPayload: this.buildCrmCallPayload(call)
    };
  }
}

// Singleton instance
const crmService = new CrmService();

module.exports = crmService;
