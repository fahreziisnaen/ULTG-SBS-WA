import db from './db.js';

const stmtInsert = db.prepare(`
  INSERT INTO audit_logs (timestamp, actor, actor_id, action, details, ip)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function addAuditLog({ actor = null, actorId = null, action, details = null, ip = null }) {
  try {
    stmtInsert.run(
      new Date().toISOString(),
      actor,
      actorId,
      action,
      details ? JSON.stringify(details) : null,
      ip,
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

export function getAuditLogs({ limit = 100, cursor = null, from = null, to = null, action = null, actor = null } = {}) {
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push('timestamp >= ?');
    params.push(new Date(from).toISOString());
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);
    conditions.push('timestamp <= ?');
    params.push(toDate.toISOString());
  }
  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  if (actor) {
    conditions.push('actor LIKE ?');
    params.push(`%${actor}%`);
  }
  if (cursor) {
    conditions.push('id < ?');
    params.push(parseInt(cursor, 10));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const capped = Math.min(limit, 500);

  const rows = db.prepare(`
    SELECT id as rowId, timestamp, actor, actor_id as actorId, action, details, ip
    FROM audit_logs ${where}
    ORDER BY id DESC
    LIMIT ?
  `).all(...params, capped + 1);

  const hasMore = rows.length > capped;
  if (hasMore) rows.pop();
  const nextCursor = hasMore ? String(rows[rows.length - 1].rowId) : null;

  const logs = rows.map(({ rowId, details, ...rest }) => ({
    ...rest,
    details: tryParse(details),
  }));

  return { logs, hasMore, nextCursor };
}

function tryParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}
