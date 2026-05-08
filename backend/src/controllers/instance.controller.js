import {
  getAllInstances,
  getStatus,
  getQR,
  addInstance,
  removeInstance,
  resetInstance,
  getGroups,
} from '../services/waManager.js';
import { addAuditLog } from '../services/audit.service.js';
import { getSourceIp } from '../utils/request.utils.js';

/** GET /instances */
export async function listInstancesController(req, res) {
  return res.json(getAllInstances());
}

/** GET /instances/:id/status */
export async function getInstanceStatusController(req, res) {
  const status = getStatus(req.params.id);
  if (!status) return res.status(404).json({ error: 'Instance not found' });
  return res.json(status);
}

/** GET /instances/:id/qr */
export async function getInstanceQRController(req, res) {
  const inst = getStatus(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instance not found' });
  const qr = getQR(req.params.id);
  if (!qr) return res.status(404).json({ error: 'No QR available. Already connected or not yet generated.' });
  return res.json({ qr });
}

/** POST /instances  body: { id, name } */
export async function addInstanceController(req, res) {
  try {
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
    const instanceId = id.trim().toLowerCase();
    await addInstance(instanceId, name.trim());
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'instance.add',
      details: { instanceId, instanceName: name.trim() },
      ip: getSourceIp(req),
    });
    return res.status(201).json({ success: true, id: instanceId, name });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/** DELETE /instances/:id */
export async function removeInstanceController(req, res) {
  try {
    await removeInstance(req.params.id);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'instance.remove',
      details: { instanceId: req.params.id },
      ip: getSourceIp(req),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/** POST /instances/:id/reset */
export async function resetInstanceController(req, res) {
  try {
    await resetInstance(req.params.id);
    addAuditLog({
      actor: req.user?.username, actorId: req.user?.id,
      action: 'instance.reset',
      details: { instanceId: req.params.id },
      ip: getSourceIp(req),
    });
    return res.json({ success: true, message: 'Instance reset. Scan new QR to reconnect.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/** GET /instances/:id/groups */
export async function getInstanceGroupsController(req, res) {
  try {
    const groups = await getGroups(req.params.id);
    return res.json(groups);
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }
}
