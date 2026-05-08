import { listAliases, setAlias, deleteAlias } from '../services/groupAlias.service.js';
import { addAuditLog } from '../services/audit.service.js';
import { getSourceIp } from '../utils/request.utils.js';

export async function listGroupAliasesController(req, res) {
  try {
    res.json(await listAliases());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function setGroupAliasController(req, res) {
  const { alias, jid, label } = req.body;
  if (!alias || typeof alias !== 'string' || !alias.trim()) {
    return res.status(400).json({ error: '`alias` is required' });
  }
  if (!jid || typeof jid !== 'string' || !jid.trim()) {
    return res.status(400).json({ error: '`jid` is required' });
  }
  try {
    const result = await setAlias(alias.trim(), jid.trim(), label?.trim() ?? '');
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'alias.set',
      details: { alias: alias.trim(), jid: jid.trim(), label: label?.trim() ?? '' },
      ip: getSourceIp(req),
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteGroupAliasController(req, res) {
  const { alias } = req.params;
  try {
    await deleteAlias(alias);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'alias.delete',
      details: { alias },
      ip: getSourceIp(req),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
