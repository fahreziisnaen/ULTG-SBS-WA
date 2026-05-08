import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  Key,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchUsers,
  createUser,
  changePassword,
  deleteUser,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  fetchGroupAliases,
  setGroupAlias,
  deleteGroupAlias,
  fetchAllowedIps,
  addAllowedIp,
  removeAllowedIp,
  setup2FA,
  verify2FA,
  disable2FA,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Pagination from '../components/Pagination.jsx';

const ALIAS_PAGE_SIZE = 15;

const TABS = [
  { id: 'apikeys', label: 'API Keys', Icon: Key },
  { id: 'users', label: 'Pengguna', Icon: Users },
  { id: 'aliases', label: 'Alias Grup', Icon: Hash },
  { id: 'ips', label: 'IP Diizinkan', Icon: Shield },
];

export default function Settings() {
  const [tab, setTab] = useState('apikeys');

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-500" />
          Pengaturan
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola API key, pengguna, dan kontrol akses</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'apikeys' && <ApiKeysTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'aliases' && <GroupAliasesTab />}
      {tab === 'ips' && <AllowedIpsTab />}
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchApiKeys();
      setKeys(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal memuat kunci');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createApiKey(newName.trim());
      setNewKey(res.data);
      setNewName('');
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal membuat kunci');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id, name) {
    if (!window.confirm(`Cabut kunci "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await revokeApiKey(id);
      showFlash('success', `Kunci "${name}" dicabut`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal mencabut kunci');
    }
  }

  async function copyKey(key) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Kunci "{newKey.name}" dibuat — salin sekarang!
              </p>
              <p className="text-xs text-green-700 mt-0.5 mb-2">
                Ini adalah satu-satunya waktu kunci lengkap akan ditampilkan.
              </p>
              <code className="block bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 break-all">
                {newKey.key}
              </code>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => copyKey(newKey.key)}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 bg-white border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin!' : 'Salin kunci'}
          </button>
        </div>
      )}

      {/* Form buat kunci baru */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Buat API Key Baru</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Nama kunci (mis. Server PRTG)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Membuat…' : 'Buat'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Gunakan kunci sebagai <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;kunci&gt;</code> di sisi klien.
        </p>
      </div>

      {/* Daftar kunci */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Kunci Aktif</h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!loading && keys.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Belum ada API key. Buat satu di atas.
          </div>
        )}

        <ul className="divide-y divide-gray-50">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{k.name}</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{k.keyMasked}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Dibuat {new Date(k.createdAt).toLocaleDateString('id-ID')}
                  {k.lastUsed && (
                    <span className="ml-2">· Terakhir digunakan {new Date(k.lastUsed).toLocaleDateString('id-ID')}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id, k.name)}
                title="Cabut kunci"
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Cabut
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  const [newForm, setNewForm] = useState({ username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const [faModal, setFaModal] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser(newForm.username, newForm.password);
      setNewForm({ username: '', password: '' });
      showFlash('success', `Pengguna "${newForm.username}" dibuat`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal membuat pengguna');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, username) {
    if (!window.confirm(`Hapus pengguna "${username}"?`)) return;
    try {
      await deleteUser(id);
      showFlash('success', `Pengguna "${username}" dihapus`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal menghapus pengguna');
    }
  }

  async function handleChangePw(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await changePassword(pwModal.id, newPw);
      showFlash('success', `Kata sandi diperbarui untuk "${pwModal.username}"`);
      setPwModal(null);
      setNewPw('');
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal memperbarui kata sandi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* Tambah pengguna */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Tambah Pengguna</h2>
        <form onSubmit={handleCreate} className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Nama pengguna"
            value={newForm.username}
            onChange={(e) => setNewForm({ ...newForm, username: e.target.value })}
            className="flex-1 min-w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
            required
          />
          <div className="relative flex-1 min-w-40">
            <input
              type={showNewPw ? 'text' : 'password'}
              placeholder="Kata sandi (min 6 karakter)"
              value={newForm.password}
              onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
              className="w-full px-3 py-2 pr-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Menambahkan…' : 'Tambah Pengguna'}
          </button>
        </form>
      </div>

      {/* Daftar pengguna */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Pengguna Dashboard</h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <ul className="divide-y divide-gray-50">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {u.username}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-wa-teal font-normal">(anda)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {u.role} · Bergabung {new Date(u.createdAt).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPwModal(u); setNewPw(''); setShowPw(false); }}
                  className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                >
                  Ubah Kata Sandi
                </button>
                <button
                  onClick={async () => {
                    if (u.twoFactorEnabled) {
                      if (window.confirm(`Nonaktifkan 2FA untuk ${u.username}?`)) {
                        try {
                          await disable2FA(u.id);
                          showFlash('success', '2FA dinonaktifkan');
                          load();
                        } catch (err) {
                          showFlash('error', err.response?.data?.error ?? 'Gagal menonaktifkan 2FA');
                        }
                      }
                    } else {
                      try {
                        const res = await setup2FA(u.id);
                        setFaModal({ user: u, qrDataURL: res.data.qrDataURL, secret: res.data.secret, token: '' });
                      } catch (err) {
                        showFlash('error', err.response?.data?.error ?? 'Gagal memulai pengaturan 2FA');
                      }
                    }
                  }}
                  className={`text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                    u.twoFactorEnabled ? 'text-wa-teal bg-wa-green/10 hover:bg-wa-green/20' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {u.twoFactorEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  2FA
                </button>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal ubah kata sandi */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Ubah Kata Sandi
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Pengguna: <strong>{pwModal.username}</strong>
            </p>
            <form onSubmit={handleChangePw} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Kata sandi baru (min 6 karakter)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                  minLength={6}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPwModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pengaturan 2FA */}
      {faModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Aktifkan Autentikasi Dua Faktor
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Pindai kode QR ini dengan Google Authenticator atau Authy.
            </p>

            <div className="bg-gray-50 p-4 rounded-xl flex justify-center mb-4">
              <img src={faModal.qrDataURL} alt="Kode QR 2FA" className="w-48 h-48" />
            </div>

            <p className="text-xs text-gray-400 mb-4 font-mono select-all">
              {faModal.secret}
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await verify2FA(faModal.user.id, faModal.token);
                  showFlash('success', '2FA berhasil diaktifkan');
                  setFaModal(null);
                  load();
                } catch (err) {
                  showFlash('error', err.response?.data?.error ?? 'Kode 2FA tidak valid');
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  placeholder="Masukkan kode 6 digit"
                  value={faModal.token}
                  onChange={(e) => setFaModal({ ...faModal, token: e.target.value })}
                  maxLength={6}
                  pattern="\d*"
                  required
                  autoFocus
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFaModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || faModal.token.length !== 6}
                  className="flex-1 px-4 py-2.5 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Memverifikasi…' : 'Verifikasi & Aktifkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group Aliases Tab ─────────────────────────────────────────────────────────

function GroupAliasesTab() {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState({ alias: '', jid: '', label: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchGroupAliases();
      setAliases(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal memuat alias grup');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [aliases]);

  const totalAliasPages = Math.ceil(aliases.length / ALIAS_PAGE_SIZE);
  const pagedAliases = useMemo(
    () => aliases.slice((page - 1) * ALIAS_PAGE_SIZE, page * ALIAS_PAGE_SIZE),
    [aliases, page],
  );

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.alias.trim() || !form.jid.trim()) return;
    setSaving(true);
    try {
      await setGroupAlias(form.alias.trim(), form.jid.trim(), form.label.trim());
      showFlash('success', `Alias "${form.alias.trim()}" berhasil disimpan`);
      setForm({ alias: '', jid: '', label: '' });
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal menyimpan alias');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alias) {
    if (!window.confirm(`Hapus alias "${alias}"?`)) return;
    try {
      await deleteGroupAlias(alias);
      showFlash('success', `Alias "${alias}" dihapus`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal menghapus alias');
    }
  }

  async function copyAlias(text) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-blue-700">
        <p className="text-sm">
          Alias menyediakan nama pendek untuk ID grup. Lihat <a href="/docs" className="font-semibold underline">Dokumentasi</a> untuk contoh penggunaan.
        </p>
      </div>

      {/* Form tambah/perbarui alias */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Tambah / Perbarui Alias</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-gray-500 mb-1">Nama Alias <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="mis. alert-proteksi"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                pattern="[a-zA-Z0-9_\-]+"
                title="Hanya huruf, angka, garis bawah, dan tanda hubung"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition font-mono"
                required
              />
            </div>
            <div className="flex-[2] min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Group JID <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="120363xxxxxxxxxx@g.us"
                value={form.jid}
                onChange={(e) => setForm({ ...form, jid: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition font-mono"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Label (opsional)</label>
              <input
                type="text"
                placeholder="Deskripsi grup"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !form.alias.trim() || !form.jid.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Menyimpan…' : 'Simpan Alias'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Jika alias sudah ada, akan diperbarui. Salin Group JID dari halaman{' '}
            <a href="/groups" className="text-wa-teal underline">Grup</a>.
          </p>
        </form>
      </div>

      {/* Daftar alias */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Daftar Alias
            {aliases.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({aliases.length})</span>
            )}
          </h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!loading && aliases.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Belum ada alias. Tambahkan satu di atas.
          </div>
        )}

        {pagedAliases.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {pagedAliases.map((a) => (
              <li key={a.alias} className="flex items-center gap-4 px-5 py-3.5 group">
                <div className="w-8 h-8 bg-wa-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-wa-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold text-gray-800">{a.alias}</code>
                    {a.label && (
                      <span className="text-xs text-gray-400 truncate">— {a.label}</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-400 truncate mt-0.5">{a.jid}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyAlias(a.alias)}
                    title="Salin alias"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {copied === a.alias
                      ? <Check className="w-3.5 h-3.5 text-green-500" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setForm({ alias: a.alias, jid: a.jid, label: a.label || '' })}
                    title="Ubah alias"
                    className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    Ubah
                  </button>
                  <button
                    onClick={() => handleDelete(a.alias)}
                    title="Hapus alias"
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalAliasPages}
        total={aliases.length}
        pageSize={ALIAS_PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}

// ── Allowed IPs Tab ───────────────────────────────────────────────────────────

function AllowedIpsTab() {
  const [ips, setIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState({ ip: '', label: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAllowedIps();
      setIps(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal memuat daftar IP');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.ip.trim()) return;
    setSaving(true);
    try {
      await addAllowedIp(form.ip.trim(), form.label.trim());
      showFlash('success', `IP "${form.ip.trim()}" berhasil ditambahkan`);
      setForm({ ip: '', label: '' });
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal menambahkan IP');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(ip) {
    if (!window.confirm(`Hapus IP "${ip}" dari whitelist?`)) return;
    try {
      await removeAllowedIp(ip);
      showFlash('success', `IP "${ip}" dihapus`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Gagal menghapus IP');
    }
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-blue-700">
        <p className="text-sm">
          Permintaan dari IP yang diizinkan tidak memerlukan autentikasi API key. Lihat <a href="/docs" className="font-semibold underline">Dokumentasi</a> untuk detail integrasi.
        </p>
      </div>

      {/* Form tambah */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Tambah IP ke Whitelist</h2>
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-44">
            <input
              type="text"
              placeholder="Alamat IP, CIDR, atau wildcard"
              value={form.ip}
              onChange={(e) => setForm({ ...form, ip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              required
            />
          </div>
          <div className="flex-1 min-w-36">
            <input
              type="text"
              placeholder="Label (mis. Server PRTG)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.ip.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Menambahkan…' : 'Tambah'}
          </button>
        </form>
      </div>

      {/* Daftar IP */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            IP Diizinkan
            {ips.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({ips.length})</span>
            )}
          </h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!loading && ips.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Belum ada IP di whitelist. Semua permintaan memerlukan API key.
          </div>
        )}

        {ips.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {ips.map((entry) => (
              <li key={entry.ip} className="flex items-center gap-4 px-5 py-3.5 group">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono font-semibold text-gray-800">{entry.ip}</code>
                  {entry.label && (
                    <span className="ml-2 text-xs text-gray-400">— {entry.label}</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ditambahkan {new Date(entry.createdAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(entry.ip)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Peringatan */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Perhatian:</strong> IP yang diizinkan dapat mengirim pesan tanpa autentikasi.
          Hanya tambahkan IP server internal yang dipercaya (seperti PRTG, SolarWinds, Zabbix).
        </p>
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Flash({ flash }) {
  const isSuccess = flash.type === 'success';
  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${isSuccess
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
        }`}
    >
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      {flash.text}
    </div>
  );
}
