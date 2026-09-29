"use strict";

const catalyst = require("zcatalyst-sdk-node");
const logger = require("../utils/logger");

const TABLE_NAME = "Telephony_Calls";
const MAX_LOGS = 100;

function getCatalystApp(req) {
  if (!req) {
    throw new Error("Catalyst request object is required for Data Store access.");
  }

  return catalyst.initialize(req);
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function unwrapZcqlRow(row) {
  if (!row) {
    return null;
  }

  if (row.ROWID) {
    return row;
  }

  if (
    row[TABLE_NAME] &&
    typeof row[TABLE_NAME] === "object"
  ) {
    return row[TABLE_NAME];
  }

  return row;
}

function mapRowToCall(row) {
  row = unwrapZcqlRow(row);

  if (!row) {
    return null;
  }

  return {
    rowId: row.ROWID || null,
    callSid: row.call_sid || null,
    direction: row.direction || "unknown",
    from: row.from_number || "unknown",
    to: row.to_number || "unknown",
    status: row.status || "initiated",
    duration: Number(row.duration || 0),
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    updatedAt: row.updated_at || null,
    statusHistory: parseJson(row.status_history, []),
    crmAssociation: parseJson(row.crm_association, null),
    error: parseJson(row.error, null)
  };
}

function buildRowData(call) {
  return {
    call_sid: call.callSid,
    direction: call.direction || "unknown",
    from_number: call.from || "unknown",
    to_number: call.to || "unknown",
    status: call.status || "initiated",
    duration: Number(call.duration || 0),
    start_time: call.startTime || new Date().toISOString(),
    end_time: call.endTime || null,
    updated_at: call.updatedAt || new Date().toISOString(),
    status_history: JSON.stringify(call.statusHistory || []),
    crm_association: call.crmAssociation
      ? JSON.stringify(call.crmAssociation)
      : null,
    error: call.error
      ? JSON.stringify(call.error)
      : null
  };
}

function normalizeDirection(data) {
  const direction =
    data.direction ||
    data.Direction ||
    "";

  const normalized = String(direction).toLowerCase();

  if (normalized.includes("inbound")) {
    return "inbound";
  }

  if (normalized.includes("outbound")) {
    return "outbound";
  }

  return null;
}

class CallLogService {
  async recordCall(data, req) {
    const callSid = data.callSid || data.CallSid;

    if (!callSid || callSid === "unknown") {
      logger.warn(
        "Attempted to record call without valid CallSid",
        data
      );

      return null;
    }

    const app = getCatalystApp(req);
    const table = app.datastore().table(TABLE_NAME);

    const now = new Date().toISOString();

    const existing = await this.findByCallSid(callSid, req);

    /*
     * CREATE NEW CALL
     */
    if (!existing) {
      const direction =
        normalizeDirection(data) || "unknown";

      const status =
        data.status ||
        data.CallStatus ||
        "initiated";

      const newCall = {
        callSid,

        direction,

        from:
          data.from ||
          data.From ||
          "unknown",

        to:
          data.to ||
          data.To ||
          "unknown",

        status,

        duration: Number(
          data.duration ||
          data.CallDuration ||
          0
        ),

        startTime:
          data.startTime ||
          now,

        endTime: null,

        updatedAt: now,

        statusHistory: [
          {
            status,
            timestamp: now,
            details:
              data.details ||
              null
          }
        ],

        crmAssociation:
          data.crmAssociation ||
          (data.recordId
            ? {
                recordType:
                  data.recordType ||
                  "Leads",

                recordId:
                  data.recordId,

                contactId:
                  data.contactId,

                leadId:
                  data.leadId,

                dealId:
                  data.dealId
              }
            : null),

        error: null
      };

      const insertedRow =
        await table.insertRow(
          buildRowData(newCall)
        );

      const insertedCall =
        mapRowToCall(insertedRow);

      logger.info(
        "Call record created in Catalyst Data Store",
        {
          callSid,
          rowId: insertedCall
            ? insertedCall.rowId
            : null
        }
      );

      return insertedCall;
    }

    /*
     * UPDATE EXISTING CALL
     */
    const updated = {
      ...existing,
      updatedAt: now
    };

    /*
     * Update direction
     */
    const newDirection =
      normalizeDirection(data);

    if (
      newDirection &&
      newDirection !== existing.direction
    ) {
      updated.direction = newDirection;
    }

    /*
     * Update status
     */
    if (
      data.status ||
      data.CallStatus
    ) {
      const newStatus =
        data.status ||
        data.CallStatus;

      if (newStatus !== existing.status) {
        updated.status = newStatus;

        updated.statusHistory = [
          ...(existing.statusHistory || []),
          {
            status: newStatus,
            timestamp: now,
            details:
              data.details ||
              null
          }
        ];
      }
    }

    /*
     * Update duration
     */
    if (
      data.duration !== undefined ||
      data.CallDuration !== undefined
    ) {
      updated.duration = Number(
        data.duration !== undefined
          ? data.duration
          : data.CallDuration
      );
    }

    /*
     * Update caller number
     */
    if (
      data.from ||
      data.From
    ) {
      updated.from =
        data.from ||
        data.From;
    }

    /*
     * Update destination number
     */
    if (
      data.to ||
      data.To
    ) {
      updated.to =
        data.to ||
        data.To;
    }

    /*
     * Update CRM association
     */
    if (data.crmAssociation) {
      updated.crmAssociation = {
        ...(existing.crmAssociation || {}),
        ...data.crmAssociation
      };
    }

    /*
     * Set end time when call finishes
     */
    if (
      [
        "completed",
        "failed",
        "canceled"
      ].includes(updated.status) &&
      !updated.endTime
    ) {
      updated.endTime = now;
    }

    /*
     * Make sure ROWID exists before update.
     */
    if (!existing.rowId) {
      throw new Error(
        `Cannot update call ${callSid}: ROWID was not found.`
      );
    }

    const updatedRow =
      await table.updateRow({
        ROWID: existing.rowId,
        ...buildRowData(updated)
      });

    const updatedCall =
      mapRowToCall(updatedRow);

    logger.info(
      "Call record updated in Catalyst Data Store",
      {
        callSid,
        rowId: updatedCall
          ? updatedCall.rowId
          : existing.rowId
      }
    );

    return updatedCall;
  }

  async findByCallSid(callSid, req) {
    if (
      !callSid ||
      callSid === "unknown"
    ) {
      return null;
    }

    const app = getCatalystApp(req);

    const query = `
      SELECT *
      FROM ${TABLE_NAME}
      WHERE call_sid = '${String(callSid).replace(/'/g, "''")}'
      LIMIT 1
    `;

    const rows =
      await app
        .zcql()
        .executeZCQLQuery(query);

    if (
      !rows ||
      rows.length === 0
    ) {
      return null;
    }

    return mapRowToCall(rows[0]);
  }

  async getCall(callSid, req) {
    return this.findByCallSid(
      callSid,
      req
    );
  }

  async findCallByPhone(phoneNumber, req) {
    if (!phoneNumber) {
      return null;
    }

    const cleanNumber =
      String(phoneNumber).replace(/\D/g, "");

    if (!cleanNumber) {
      return null;
    }

    const app = getCatalystApp(req);

    const query = `
      SELECT *
      FROM ${TABLE_NAME}
      WHERE from_number LIKE '%${cleanNumber}%'
         OR to_number LIKE '%${cleanNumber}%'
      ORDER BY CREATEDTIME DESC
      LIMIT 1
    `;

    const rows =
      await app
        .zcql()
        .executeZCQLQuery(query);

    if (
      !rows ||
      rows.length === 0
    ) {
      return null;
    }

    return mapRowToCall(rows[0]);
  }

  async getActiveCalls(req) {
    const app = getCatalystApp(req);

    const query = `
      SELECT *
      FROM ${TABLE_NAME}
      WHERE status IN (
        'initiated',
        'ringing',
        'in-progress',
        'answered'
      )
      ORDER BY MODIFIEDTIME DESC
      LIMIT ${MAX_LOGS}
    `;

    const rows =
      await app
        .zcql()
        .executeZCQLQuery(query);

    return (rows || [])
      .map(mapRowToCall)
      .filter(Boolean);
  }

  async listCalls(filter = {}, req) {
    const limit =
      Math.min(
        parseInt(
          filter.limit || 50,
          10
        ),
        MAX_LOGS
      );

    const conditions = [];

    if (filter.direction) {
      conditions.push(
        `direction = '${String(
          filter.direction
        ).replace(/'/g, "''")}'`
      );
    }

    if (filter.status) {
      conditions.push(
        `status = '${String(
          filter.status
        ).replace(/'/g, "''")}'`
      );
    }

    if (filter.recordId) {
      conditions.push(
        `crm_association LIKE '%${String(
          filter.recordId
        ).replace(/'/g, "''")}%'`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const app = getCatalystApp(req);

    const query = `
      SELECT *
      FROM ${TABLE_NAME}
      ${whereClause}
      ORDER BY CREATEDTIME DESC
      LIMIT ${limit}
    `;

    const rows =
      await app
        .zcql()
        .executeZCQLQuery(query);

    return (rows || [])
      .map(mapRowToCall)
      .filter(Boolean);
  }
}

module.exports = new CallLogService();
