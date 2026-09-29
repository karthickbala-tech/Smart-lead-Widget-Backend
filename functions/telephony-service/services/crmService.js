"use strict";

const callLogService = require("./callLogService");
const logger = require("../utils/logger");

/**
 * Service providing CRM call association, caller identification matching,
 * and standard Zoho CRM Call Activity payload generation.
 */
class CrmService {
  /**
   * Associates an active or completed call with a Zoho CRM entity.
   *
   * @param {string} callSid
   * @param {Object} associationData
   * @param {string} associationData.recordType "Leads" | "Contacts" | "Deals"
   * @param {string} associationData.recordId
   * @param {string} [associationData.subject]
   * @param {string} [associationData.notes]
   * @param {string} [associationData.callResult]
   * @param {Object} req Catalyst request object
   * @returns {Promise<Object|null>} Updated call record
   */
  async associateCall(callSid, associationData, req) {
    const existingCall = await callLogService.getCall(callSid, req);

    if (!existingCall) {
      // If the call hasn't been recorded yet, initialize it.
      const createdCall = await callLogService.recordCall(
        {
          callSid,
          crmAssociation: {
            recordType: associationData.recordType,
            recordId: associationData.recordId,
            subject: associationData.subject || null,
            notes: associationData.notes || null,
            callResult: associationData.callResult || null,
            associatedAt: new Date().toISOString()
          }
        },
        req
      );

      logger.info("CRM association created for new call", {
        callSid,
        recordType: associationData.recordType,
        recordId: associationData.recordId
      });

      return createdCall;
    }

    const updated = await callLogService.recordCall(
      {
        callSid,
        crmAssociation: {
          recordType: associationData.recordType,
          recordId: associationData.recordId,
          subject:
            associationData.subject ||
            existingCall.crmAssociation?.subject ||
            null,
          notes:
            associationData.notes ||
            existingCall.crmAssociation?.notes ||
            null,
          callResult:
            associationData.callResult ||
            existingCall.crmAssociation?.callResult ||
            null,
          associatedAt: new Date().toISOString()
        }
      },
      req
    );

    logger.info("Call associated with CRM record", {
      callSid,
      recordType: associationData.recordType,
      recordId: associationData.recordId
    });

    return updated;
  }

  /**
   * Formats a call record into a Zoho CRM Calls module payload.
   *
   * @param {Object} callRecord
   * @returns {Object} Zoho CRM Call entity payload
   */
  buildCrmCallPayload(callRecord) {
    const isOutbound = callRecord.direction === "outbound";
    const remoteNumber = isOutbound
      ? callRecord.to
      : callRecord.from;

    const durationSeconds = Number(callRecord.duration || 0);

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    const formattedDuration =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const crmAssoc = callRecord.crmAssociation || {};

    const recordType = crmAssoc.recordType || "Leads";
    const recordId = crmAssoc.recordId || null;

    const payload = {
      Subject:
        crmAssoc.subject ||
        `${isOutbound ? "Outbound" : "Inbound"} Call - ${remoteNumber}`,

      Call_Type: isOutbound ? "Outbound" : "Inbound",

      Call_Start_Time: callRecord.startTime,

      Call_Duration: formattedDuration,

      Call_Duration_in_seconds: durationSeconds,

      Call_Result:
        crmAssoc.callResult ||
        (callRecord.status === "completed"
          ? "Completed"
          : callRecord.status),

      Description:
        crmAssoc.notes ||
        `Twilio Call SID: ${callRecord.callSid} | Status: ${callRecord.status}`,

      Twilio_Call_SID: callRecord.callSid
    };

    // Associate the call with the corresponding Zoho CRM record.
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
   * Searches for a recent call matching a phone number.
   *
   * @param {string} phoneNumber
   * @param {Object} req Catalyst request object
   * @returns {Promise<Object|null>}
   */
  async lookupCaller(phoneNumber, req) {
    const call = await callLogService.findCallByPhone(
      phoneNumber,
      req
    );

    if (!call) {
      return null;
    }

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
