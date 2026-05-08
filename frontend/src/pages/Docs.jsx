import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Copy, ChevronDown, ChevronUp, Hash, Shield } from 'lucide-react';

export default function Docs({ instances = [] }) {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-gray-500" />
          Dokumentasi
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Pelajari cara mengintegrasikan dan mengirim pesan melalui API</p>
      </div>

      <div className="space-y-6">
        <ApiDocs instances={instances} />

        {/* Konsep Dasar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Konsep Dasar</h2>
          </div>
          <div className="p-5 space-y-6">

            {/* Alias Grup */}
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Apa itu Alias Grup?</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Alias memungkinkan klien mengirim pesan ke grup WhatsApp menggunakan nama pendek
                  (mis. <code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">alert-proteksi</code>) tanpa
                  perlu mengetahui Group ID yang panjang (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">120363...@g.us</code>).
                  Gunakan nama alias sebagai nilai field <code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">id</code> saat POST ke{' '}
                  <code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">/send-message</code>.
                </p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-xs text-emerald-700">
                  <p>
                    Alih-alih menggunakan Group JID yang panjang, Anda dapat membuat <strong>alias pendek</strong> untuk setiap grup.
                    Server akan otomatis menerjemahkan alias ke Group JID yang sesuai.
                    Kelola alias di <Link to="/settings" className="underline font-medium">Pengaturan → Alias Grup</Link> atau
                    langsung dari halaman <Link to="/groups" className="underline font-medium">Grup</Link> (tombol Atur Alias).
                  </p>
                </div>
              </div>
            </div>

            {/* Whitelist IP */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Whitelist IP — Akses Tanpa API Key</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Permintaan dari IP yang diizinkan secara otomatis diterima <strong>tanpa API key</strong>.
                  Ideal untuk sistem seperti <strong>PRTG</strong> yang tidak bisa mengirim header kustom.
                  Format yang didukung: IP tunggal (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">192.168.1.100</code>),
                  CIDR (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">10.0.0.0/24</code>),
                  atau wildcard (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">172.16.*.*</code>).
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                  <p>
                    <strong>Perhatian:</strong> IP yang diizinkan dapat mengirim pesan tanpa autentikasi.
                    Hanya tambahkan IP server internal yang dipercaya (seperti PRTG, SolarWinds, Zabbix).
                    Kelola IP di <Link to="/settings" className="underline font-medium">Pengaturan → IP Diizinkan</Link>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ApiDocs({ instances = [] }) {
  const [format, setFormat] = useState('json');
  const [expanded, setExpanded] = useState(true);
  const exampleInstance = instances.find((i) => i.status === 'connected')?.id ?? 'wa1';

  // ── Contoh: kirim ke nomor pribadi ──
  const jsonExample = `{
  "id": "628123456789",
  "message": "Halo Dunia!",
  "from": "${exampleInstance}"
}`;

  const formExample = `id=628123456789&message=Halo%20Dunia!&from=${exampleInstance}`;

  // ── Contoh: kirim ke grup via alias ──
  const jsonAliasExample = `{
  "id": "alert-proteksi",
  "message": "Server mati!",
  "from": "${exampleInstance}"
}`;

  const formAliasExample = `id=alert-proteksi&message=Server%20mati!&from=${exampleInstance}`;

  const curlJson = `curl -X POST https://yourdomain.com/send-message \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: API_KEY_ANDA" \\
  -d '${jsonExample}'`;

  const curlForm = `curl -X POST https://yourdomain.com/send-message \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "x-api-key: API_KEY_ANDA" \\
  --data-urlencode "id=628123456789" \\
  --data-urlencode "message=Halo Dunia!" \\
  --data-urlencode "from=${exampleInstance}"`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Referensi API</span>
          <span className="text-[10px] font-mono bg-wa-green/10 text-wa-teal px-2 py-0.5 rounded-full">
            POST /send-message
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Info autentikasi */}
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-800 mb-2">Autentikasi</p>
            <p className="text-xs text-amber-700 mb-3">
              Gunakan salah satu metode berikut (dicek secara berurutan):
            </p>
            <div className="space-y-2.5">
              {/* Metode 1 - Whitelist IP */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">1</span>
                  <span className="text-xs font-semibold text-amber-900">Whitelist IP</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">tidak perlu API key</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Jika IP pengirim ada di whitelist, permintaan diterima tanpa API key.
                  Ideal untuk <strong>PRTG</strong>, Zabbix, atau sistem yang tidak bisa mengatur header kustom.
                </p>
              </div>
              {/* Metode 2-3 - Header */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">2–3</span>
                  <span className="text-xs font-semibold text-amber-900">Header HTTP</span>
                </div>
                <div className="space-y-1">
                  <CodeLine label="Bearer" code="Authorization: Bearer API_KEY_ANDA" />
                  <CodeLine label="API Key" code="x-api-key: API_KEY_ANDA" />
                </div>
              </div>
              {/* Metode 4 - Field body */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">4</span>
                  <span className="text-xs font-semibold text-amber-900">Field Body</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">form-urlencoded</span>
                </div>
                <p className="text-[11px] text-amber-700 mb-1">
                  Sertakan field <code className="bg-amber-100 px-1 rounded font-mono">apikey</code> di body permintaan:
                </p>
                <CodeLine label="Body" code="apikey=API_KEY_ANDA&id=628...&message=Halo" />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-3">
              Kelola API key di <Link to="/settings" className="underline font-medium">Pengaturan → API Keys</Link>.
              Kelola whitelist IP di <Link to="/settings" className="underline font-medium">Pengaturan → IP Diizinkan</Link>.
            </p>
          </div>

          {/* Field */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-3">Field Body</p>
            <div className="space-y-2">
              <FieldRow name="id" type="string" required desc='Nomor WhatsApp (mis. "628123456789"), Group JID (mis. "120363...@g.us"), atau Alias Grup (mis. "alert-proteksi").' />
              <FieldRow name="message" type="string" required desc="Isi pesan yang akan dikirim." />
              <FieldRow name="from" type="string" required={false} desc='ID instance untuk mengirim. Jika tidak diisi, instance yang terhubung pertama akan digunakan.' />
              <FieldRow name="apikey" type="string" required={false} desc='API key (alternatif jika header tidak bisa diatur). Tidak diperlukan jika IP sudah di whitelist.' />
            </div>
          </div>

          {/* Tab format */}
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700">Contoh Permintaan</p>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setFormat('json')}
                  className={`px-3 py-1.5 transition-colors ${
                    format === 'json'
                      ? 'bg-wa-teal text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setFormat('form')}
                  className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                    format === 'form'
                      ? 'bg-wa-teal text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Form URL Encoded
                </button>
              </div>
            </div>

            {/* Penjelasan format */}
            {format === 'json' ? (
              <div className="mb-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Atur header <code className="bg-blue-100 px-1 rounded font-mono">Content-Type: application/json</code> dan kirim body sebagai objek JSON.
              </div>
            ) : (
              <div className="mb-3 text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                Atur header <code className="bg-purple-100 px-1 rounded font-mono">Content-Type: application/x-www-form-urlencoded</code> dan kirim body sebagai pasangan key=value yang di-encode URL (sama seperti form HTML biasa).
              </div>
            )}

            {/* Contoh body mentah — nomor pribadi */}
            <p className="text-[11px] text-gray-400 font-medium mb-1">Body Mentah — Kirim ke Nomor</p>
            <CodeBlock code={format === 'json' ? jsonExample : formExample} />

            {/* Contoh body mentah — alias grup */}
            <p className="text-[11px] text-emerald-500 font-medium mt-3 mb-1">Body Mentah — Kirim ke Grup (via Alias)</p>
            <CodeBlock code={format === 'json' ? jsonAliasExample : formAliasExample} />

            {/* cURL */}
            <p className="text-[11px] text-gray-400 font-medium mt-3 mb-1">cURL</p>
            <CodeBlock code={format === 'json' ? curlJson : curlForm} />
          </div>

          {/* Respons */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">Contoh Respons</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-green-600 font-medium mb-1">202 Accepted</p>
                <CodeBlock code={`{\n  "success": true,\n  "jobId": "42",\n  "message": "Pesan diproses",\n  "destination": "6281234@s.whatsapp.net",\n  "type": "personal",\n  "sentFrom": "${exampleInstance}"\n}`} />
              </div>
              <div>
                <p className="text-[11px] text-red-500 font-medium mb-1">4xx Error</p>
                <CodeBlock code={`{\n  "error": "\`id\` wajib diisi dan harus\\nbukan string kosong"\n}`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg px-3 py-2.5 text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
        title="Salin"
      >
        {copied
          ? <Check className="w-3 h-3 text-green-400" />
          : <Copy className="w-3 h-3 text-gray-300" />}
      </button>
    </div>
  );
}

function CodeLine({ label, code }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-amber-600 font-medium w-20 shrink-0">{label}</span>
      <code className="text-[11px] font-mono bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900">
        {code}
      </code>
    </div>
  );
}

function FieldRow({ name, type, required, desc }) {
  return (
    <div className="flex gap-3 text-xs">
      <div className="shrink-0 w-20">
        <code className="font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
          {name}
        </code>
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-gray-400 shrink-0">{type}</span>
        {required
          ? <span className="text-red-500 text-[10px] font-semibold shrink-0">wajib</span>
          : <span className="text-gray-400 text-[10px] shrink-0">opsional</span>}
        <span className="text-gray-500 leading-relaxed">{desc}</span>
      </div>
    </div>
  );
}
