import { listAllowedIps, addAllowedIp, removeAllowedIp } from '../services/allowedIp.service.js';
import { addAuditLog } from '../services/audit.service.js';
import { getSourceIp } from '../utils/request.utils.js';

export async function listAllowedIpsController(req, res) {
  try {
    res.json(await listAllowedIps());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addAllowedIpController(req, res) {
  const { ip, label } = req.body;
  if (!ip || typeof ip !== 'string' || !ip.trim()) {
    return res.status(400).json({ error: '`ip` is required' });
  }
  try {
    const entry = await addAllowedIp(ip.trim(), label?.trim() ?? '');
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'ip.add',
      details: { ip: ip.trim(), label: label?.trim() ?? '' },
      ip: getSourceIp(req),
    });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function removeAllowedIpController(req, res) {
  const { ip } = req.params;
  try {
    await removeAllowedIp(decodeURIComponent(ip));
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'ip.remove',
      details: { ip: decodeURIComponent(ip) },
      ip: getSourceIp(req),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
