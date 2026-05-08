import db from './db.js';

export function listAllowedIps() {
  return db.prepare('SELECT ip, label, created_at FROM allowed_ips ORDER BY created_at').all()
    .map((e) => ({ ...e, createdAt: e.created_at }));
}

export function isIpAllowed(ip) {
  const entries = db.prepare('SELECT ip FROM allowed_ips').all();
  if (entries.length === 0) return false;

  const normalizedIp = ip.replace(/^::ffff:/, '');

  for (const { ip: pattern } of entries) {
    const p = pattern.replace(/^::ffff:/, '');
    if (normalizedIp === p) return true;
    if (p.includes('*')) {
      const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
      if (regex.test(normalizedIp)) return true;
    }
    if (p.includes('/') && matchCIDR(normalizedIp, p)) return true;
  }
  return false;
}

function matchCIDR(ip, cidr) {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;
    const ipNum = ipToInt(ip);
    const rangeNum = ipToInt(range);
    if (ipNum === null || rangeNum === null) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  } catch { return false; }
}

function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

export function addAllowedIp(ip, label = '') {
  if (!ip || !ip.trim()) throw new Error('IP address is required');
  const normalized = ip.trim();
  const existing = db.prepare('SELECT ip FROM allowed_ips WHERE ip = ?').get(normalized);
  if (existing) throw new Error(`IP "${normalized}" is already in the whitelist`);
  const entry = { ip: normalized, label: label?.trim() || '', created_at: new Date().toISOString() };
  db.prepare('INSERT INTO allowed_ips (ip, label, created_at) VALUES (?, ?, ?)').run(entry.ip, entry.label, entry.created_at);
  return { ...entry, createdAt: entry.created_at };
}

export function removeAllowedIp(ip) {
  const result = db.prepare('DELETE FROM allowed_ips WHERE ip = ?').run(ip.trim());
  if (result.changes === 0) throw new Error(`IP "${ip}" not found in whitelist`);
}
