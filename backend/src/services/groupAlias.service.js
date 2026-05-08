import db from './db.js';

export function listAliases() {
  return db.prepare('SELECT alias, jid, label, created_at FROM group_aliases ORDER BY alias').all()
    .map((a) => ({ ...a, createdAt: a.created_at }));
}

export function resolveAlias(alias) {
  const row = db.prepare('SELECT jid FROM group_aliases WHERE alias = ?').get(alias.toLowerCase());
  return row?.jid ?? null;
}

export function setAlias(alias, jid, label = '') {
  if (!/^[a-z0-9_-]+$/i.test(alias)) {
    throw new Error('Alias may only contain letters, numbers, underscores, and hyphens');
  }
  if (!jid.endsWith('@g.us')) {
    throw new Error('JID must be a group JID ending with @g.us');
  }

  const key = alias.toLowerCase();
  const existing = db.prepare('SELECT alias FROM group_aliases WHERE alias = ?').get(key);

  if (existing) {
    db.prepare('UPDATE group_aliases SET jid = ?, label = ? WHERE alias = ?').run(jid, label || '', key);
  } else {
    db.prepare('INSERT INTO group_aliases (alias, jid, label, created_at) VALUES (?, ?, ?, ?)')
      .run(key, jid, label || '', new Date().toISOString());
  }

  return db.prepare('SELECT * FROM group_aliases WHERE alias = ?').get(key);
}

export function deleteAlias(alias) {
  const result = db.prepare('DELETE FROM group_aliases WHERE alias = ?').run(alias.toLowerCase());
  if (result.changes === 0) throw new Error(`Alias "${alias}" not found`);
}
