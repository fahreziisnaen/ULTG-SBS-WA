import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, RefreshCw, CheckCircle2, Smartphone } from 'lucide-react';
import { fetchQR } from '../services/api.js';

const REFRESH_INTERVAL_MS = 30_000;

export default function QRPage({ status }) {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadQR = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchQR();
      setQr(res.data.qr);
      setLastRefresh(new Date());
    } catch (err) {
      if (err.response?.status === 404) {
        setQr(null);
      } else {
        setError('Gagal mengambil kode QR. Apakah backend sudah berjalan?');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status.status !== 'connected') loadQR();
  }, [status.status, loadQR]);

  useEffect(() => {
    if (status.status === 'connected') return;
    const timer = setInterval(loadQR, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status.status, loadQR]);

  // ── Sudah terhubung ───────────────────────────────────────────────────────────
  if (status.status === 'connected') {
    return (
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Kode QR</h1>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sudah Terhubung</h2>
          <p className="text-sm text-gray-500">
            WhatsApp aktif sebagai{' '}
            <span className="font-semibold text-gray-700">{status.name}</span>
            {status.phone && (
              <>
                {' '}
                <span className="font-mono text-gray-500">(+{status.phone})</span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Untuk menghubungkan akun lain, gunakan <em>Reset Sesi</em> di Dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── Tampilan QR ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kode QR</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-gray-500" />
            Pindai untuk Menghubungkan
          </h2>
          <button
            onClick={loadQR}
            disabled={loading}
            title="Perbarui QR"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Perbarui
          </button>
        </div>

        {/* Isi */}
        <div className="p-6">
          {error && (
            <div className="text-center py-6 text-red-500 text-sm">{error}</div>
          )}

          {!error && !qr && !loading && (
            <div className="text-center py-8 text-gray-400">
              <QrCode className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Menunggu kode QR…</p>
              <p className="text-xs mt-1">Backend mungkin masih berjalan.</p>
            </div>
          )}

          {!error && !qr && loading && (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Memuat…
            </div>
          )}

          {qr && (
            <div className="text-center">
              <div className="inline-block p-3 bg-white rounded-xl border-2 border-gray-200 shadow-inner">
                <img
                  src={qr}
                  alt="Kode QR WhatsApp"
                  className="w-56 h-56 object-contain"
                />
              </div>

              {lastRefresh && (
                <p className="text-xs text-gray-400 mt-3">
                  Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Petunjuk */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> Cara memindai
          </p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Buka WhatsApp di ponsel Anda</li>
            <li>Tap <strong>Perangkat Tertaut</strong></li>
            <li>Tap <strong>Hubungkan Perangkat</strong></li>
            <li>Arahkan kamera ke kode QR ini</li>
          </ol>
          <p className="text-[10px] text-gray-400 mt-2">Diperbarui otomatis setiap 30 detik</p>
        </div>
      </div>
    </div>
  );
}
