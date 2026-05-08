# Alert Flow — SolarWinds → WhatsApp Group

```mermaid
sequenceDiagram
    autonumber

    actor SW as SolarWinds
    participant EX as Express Server
    participant AU as Auth Middleware
    participant MC as Message Controller
    participant WA as Baileys WhatsApp
    participant GRP as WhatsApp Group

    SW->>EX: POST /send-message + x-api-key + body

    EX->>AU: Cek x-api-key
    alt Key salah atau tidak ada
        AU-->>SW: 401 Unauthorized
    end

    AU->>MC: Validasi body
    alt message atau id kosong
        MC-->>SW: 400 Bad Request
    end

    MC->>MC: normalizeId — group id tetap

    MC->>WA: sendMessage(jid, message)
    WA->>GRP: Device Down Alert

    WA-->>MC: OK
    MC-->>SW: 202 Accepted
```

---

## Contoh Request SolarWinds

```http
POST http://<gateway-host>:3000/send-message
Content-Type: application/json
Authorization: Bearer your_api_key_here

{
  "message": "🚨 *Device Down Alert*\n\n*Device :* Core-Switch-01\n*IP Address :* 10.10.10.1\n*Status :* DOWN\n\n*Location :* Jakarta DC\n*Down Time :* 2026-04-10 09:15:23 AM",
  "id": "120363423274966961@g.us"
}
```

Response:
```json
{
  "success": true,
  "jobId": "direct-1234567890",
  "message": "Message queued successfully",
  "destination": "120363423274966961@g.us",
  "type": "group"
}
```
