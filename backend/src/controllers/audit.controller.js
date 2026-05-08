import { getAuditLogs } from '../services/audit.service.js';

/** GET /admin/audit-logs?limit=100&cursor=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD&action=<action>&actor=<name> */
export function getAuditLogsController(req, res) {
  try {
    const limit  = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const cursor = req.query.cursor || null;
    const from   = req.query.from   || null;
    const to     = req.query.to     || null;
    const action = req.query.action || null;
    const actor  = req.query.actor  ? req.query.actor.trim() : null;
    return res.json(getAuditLogs({ limit, cursor, from, to, action, actor }));
  } catch (err) {
    console.error('[auditLogs]', err);
    return res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
}
