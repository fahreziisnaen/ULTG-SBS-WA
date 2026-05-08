import { getAllInstances } from '../services/waManager.js';

/**
 * GET /status
 * Returns status of all instances (backwards-compatible: also returns first instance fields).
 */
export async function getStatusController(req, res) {
  const all = getAllInstances();
  const first = all[0] ?? { status: 'disconnected', phone: null, waName: null };
  return res.json({
    // Legacy fields for backwards compat
    status: first.status,
    phone: first.phone,
    name: first.waName,
    // All instances
    instances: all,
  });
}
