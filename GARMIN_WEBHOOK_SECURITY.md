# Garmin Webhook Security Guide

## Overview

With Vercel's Standard Protection disabled to allow Garmin webhooks, we've implemented custom security measures to protect the webhook endpoint from abuse.

## Security Layers Implemented

### 1. Rate Limiting ⏱️

**What it does**: Limits the number of webhook requests from a single IP address.

**Configuration**:
- **Window**: 1 minute (60,000ms)
- **Max requests**: 100 per IP per minute
- **Response**: HTTP 429 (Too Many Requests) with `Retry-After` header

**How it works**:
```javascript
// Tracks requests per IP address in a sliding window
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;
```

**Legitimate Garmin traffic**: Garmin typically sends 1-5 webhooks per user activity, well below the limit.

**Blocked**: DDoS attacks, bot floods, malicious scrapers.

---

### 2. Payload Size Validation 📦

**What it does**: Rejects oversized payloads that could cause memory issues.

**Configuration**:
- **Max size**: 10MB per request
- **Response**: HTTP 413 (Payload Too Large)

**How it works**:
```javascript
const contentLength = parseInt(req.headers['content-length'] || '0');
if (contentLength > 10 * 1024 * 1024) {
  return res.status(413).json({ error: 'Payload too large' });
}
```

**Legitimate Garmin traffic**: Webhook payloads are typically < 1KB (just JSON metadata, not the FIT file).

**Blocked**: Malformed requests, upload attacks.

---

### 3. Content-Type Validation 📝

**What it does**: Ensures webhooks use proper JSON content type.

**Configuration**:
- **Required**: `application/json`
- **Response**: HTTP 415 (Unsupported Media Type)

**How it works**:
```javascript
const contentType = req.headers['content-type'];
if (contentType && !contentType.includes('application/json')) {
  return res.status(415).json({ error: 'Content-Type must be application/json' });
}
```

**Legitimate Garmin traffic**: Always sends `Content-Type: application/json`.

**Blocked**: Random bots, misconfigured clients.

---

### 4. Webhook Signature Verification 🔐

**What it does**: Cryptographically verifies requests actually come from Garmin (if Garmin provides signatures).

**Status**: **OPTIONAL** - Only enabled if `GARMIN_WEBHOOK_SECRET` environment variable is set.

**Configuration**:
```bash
# In Vercel environment variables
GARMIN_WEBHOOK_SECRET=your-secret-from-garmin-portal
```

**How it works**:
```javascript
// Garmin sends HMAC-SHA256 signature in header
const signature = req.headers['x-garmin-signature'];
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

// Constant-time comparison prevents timing attacks
crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
```

**Note**: Garmin Activity API documentation doesn't clearly specify if webhook signatures are supported. Check your Garmin Developer Portal for webhook configuration options.

**If supported**:
1. Garmin Developer Portal will provide a webhook secret
2. Set `GARMIN_WEBHOOK_SECRET` environment variable in Vercel
3. Signature verification will automatically enable

**Legitimate Garmin traffic**: Will have valid signature.

**Blocked**: Spoofed webhooks, replay attacks, man-in-the-middle attacks.

---

### 5. Payload Structure Validation ✅

**What it does**: Validates webhook payload has expected structure and data types.

**Checks**:
- ✅ Payload is a valid object
- ✅ `userId` field is present (required)
- ✅ `activityId` is a string (if present)
- ✅ All expected fields have correct types

**How it works**:
```javascript
if (!webhookData || typeof webhookData !== 'object') {
  return res.status(400).json({ error: 'Invalid payload structure' });
}

if (!webhookData.userId) {
  return res.status(400).json({ error: 'Missing userId' });
}
```

**Legitimate Garmin traffic**: Always includes proper structure.

**Blocked**: Malformed JSON, random POST requests, fuzzing attempts.

---

### 6. Idempotency Protection 🔄

**What it does**: Prevents duplicate processing if Garmin sends the same webhook multiple times.

**How it works**:
```javascript
// Check if we've already received this webhook
const { data: existingEvent } = await supabase
  .from('garmin_webhook_events')
  .select('id')
  .eq('activity_id', webhookData.activityId)
  .eq('garmin_user_id', webhookData.userId)
  .single();

if (existingEvent) {
  return res.status(200).json({ message: 'Already processed' });
}
```

**Legitimate Garmin traffic**: Garmin may retry webhooks if they don't receive a 200 response. This ensures we don't import the same activity twice.

**Blocked**: Duplicate imports, retry storms.

---

### 7. User Integration Validation 🔗

**What it does**: Ensures webhook is for a user who has authorized our app.

**How it works**:
```javascript
// Verify this Garmin user has an active integration
const { data: integration } = await supabase
  .from('bike_computer_integrations')
  .select('*')
  .eq('provider', 'garmin')
  .eq('provider_user_id', webhookData.userId)
  .single();

if (!integration) {
  // Webhook is for unknown user - ignore it
  return;
}
```

**Legitimate Garmin traffic**: Only processes webhooks for users who have connected Garmin to your app.

**Blocked**: Webhooks for unauthorized users, testing webhooks from random Garmin users.

---

### 8. Request Logging & Monitoring 📊

**What it does**: Logs all webhook attempts for security monitoring and debugging.

**Logged data**:
- IP address
- User-Agent
- Timestamp
- Event type
- User ID
- Activity ID
- Processing status

**Example log**:
```
📥 Garmin webhook received: {
  eventType: 'activity',
  userId: '12345',
  activityId: '98765',
  ip: '1.2.3.4',
  userAgent: 'Garmin-Webhook/1.0',
  timestamp: '2025-10-25T...'
}
```

**Security benefit**: Detect patterns of abuse, identify attackers, debug issues.

---

## Security Best Practices

### Environment Variables

Set these in Vercel dashboard under Settings > Environment Variables:

```bash
# Required
GARMIN_CONSUMER_KEY=your-consumer-key
GARMIN_CONSUMER_SECRET=your-consumer-secret
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key

# Optional (for webhook signature verification)
GARMIN_WEBHOOK_SECRET=your-webhook-secret
```

### Monitoring Recommendations

1. **Set up alerts** for:
   - Rate limit violations (many 429 responses)
   - Invalid signatures (many 401 responses)
   - Unusual traffic patterns

2. **Review logs regularly**:
   ```bash
   npx vercel logs --follow
   ```

3. **Check Supabase** for failed webhook processing:
   ```sql
   SELECT *
   FROM garmin_webhook_events
   WHERE process_error IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 20;
   ```

### Additional Hardening (Optional)

#### IP Whitelisting

If Garmin publishes their webhook IP ranges, add to `api/garmin-webhook.js`:

```javascript
const GARMIN_IP_RANGES = [
  '52.0.0.0/8',  // Example - check Garmin docs
  '54.0.0.0/8'
];

function isGarminIP(ip) {
  // Use ip-range-check library
  return ipRangeCheck(ip, GARMIN_IP_RANGES);
}
```

#### User-Agent Validation

```javascript
const userAgent = req.headers['user-agent'];
if (userAgent && !userAgent.includes('Garmin')) {
  console.warn('Suspicious User-Agent:', userAgent);
  // Optionally reject
}
```

#### Request Timeout

```javascript
// Abort processing after 30 seconds
const timeout = setTimeout(() => {
  throw new Error('Request timeout');
}, 30000);

// Clear timeout when done
clearTimeout(timeout);
```

---

## Attack Scenarios & Mitigations

### DDoS Attack
**Attack**: Flood webhook with requests
**Mitigation**: Rate limiting (100 req/min per IP)
**Result**: Attacker gets HTTP 429, legitimate traffic unaffected

### Replay Attack
**Attack**: Re-send captured webhook to cause duplicate imports
**Mitigation**: Idempotency check, signature verification
**Result**: Duplicate ignored, signed replay fails

### Payload Injection
**Attack**: Send malicious JSON to exploit parser
**Mitigation**: Payload validation, type checking, size limits
**Result**: Malformed payload rejected with HTTP 400

### Resource Exhaustion
**Attack**: Send massive payloads to consume memory
**Mitigation**: 10MB size limit
**Result**: Oversized payload rejected with HTTP 413

### Credential Stuffing
**Attack**: Send fake webhooks to probe for user IDs
**Mitigation**: User integration validation
**Result**: Webhooks for non-existent users silently ignored

---

## Production Checklist

Before going live:

- [ ] Set all required environment variables in Vercel
- [ ] Disable Vercel Standard Protection (Settings > General > Deployment Protection)
- [ ] Test webhook endpoint accessibility: `curl https://www.tribos.studio/api/garmin-webhook`
- [ ] Register webhook URL in Garmin Developer Portal
- [ ] Monitor logs for first 24 hours after launch
- [ ] Set up alerting for security events
- [ ] Document your webhook secret securely
- [ ] Review and adjust rate limits based on actual traffic

---

## Support & Troubleshooting

### Rate limit too restrictive?

Adjust in `api/garmin-webhook.js`:
```javascript
const RATE_LIMIT_MAX_REQUESTS = 200; // Increase from 100
```

### Enable signature verification?

1. Check Garmin Developer Portal for webhook secret
2. Set `GARMIN_WEBHOOK_SECRET` in Vercel
3. Deploy and test

### Monitoring suspicious activity?

View rejected requests:
```bash
npx vercel logs | grep "🚫"
```

---

## Conclusion

These security measures provide **defense in depth** - multiple layers of protection that work together to secure your webhook endpoint without relying on Vercel's built-in protection.

**Key takeaway**: Even with deployment protection disabled, your webhook is well-protected against common attacks while still allowing legitimate Garmin traffic.
