const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default function WebhookVerificationDocs() {
	return (
		<div className="mx-auto max-w-4xl">
			<h1 className="mb-2 text-2xl font-bold text-white">Webhook Signature Verification</h1>
			<p className="mb-8 text-lg" style={{ color: '#94a3b8' }}>
				All webhook payloads are signed with HMAC-SHA256 using your tenant&apos;s shared secret.
				This guide shows how to verify signatures in your n8n workflows or custom integrations.
			</p>

			{/* Signature Headers */}
			<div className="rounded-xl p-5 mb-6" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">Signature Headers</h2>
				<p className="mb-3" style={{ color: '#94a3b8' }}>Each request includes these headers:</p>
				<div className="rounded-lg p-4 font-mono text-sm" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
					<div><span style={{ color: '#818cf8' }}>X-Form-Signature</span>: <span style={{ color: '#94a3b8' }}>&lt;hex-encoded HMAC signature&gt;</span></div>
					<div><span style={{ color: '#818cf8' }}>X-Form-Signature-Alg</span>: <span style={{ color: '#94a3b8' }}>sha256</span></div>
					<div><span style={{ color: '#818cf8' }}>X-Form-Signature-Ts</span>: <span style={{ color: '#94a3b8' }}>&lt;unix timestamp in seconds&gt;</span></div>
				</div>
			</div>

			{/* How Signatures are Generated */}
			<div className="rounded-xl p-5 mb-6" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">How Signatures are Generated</h2>
				<p className="mb-3" style={{ color: '#94a3b8' }}>The signature is computed as:</p>
				<pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: '#0f172a', color: '#10b981' }}>
{`signature = HMAC-SHA256(
  key: your_shared_secret,
  data: "{timestamp}.{raw_json_body}"
)`}
				</pre>
			</div>

			{/* Node.js Example */}
			<div className="rounded-xl p-5 mb-6" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">Node.js / n8n Code Node</h2>
				<pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: '#0f172a', color: '#10b981' }}>
{`const crypto = require('crypto');

function verifySignature(rawBody, signature, timestamp, secret) {
  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return { valid: false, error: 'Timestamp too old' };
  }

  // Compute expected signature
  const data = \`\${timestamp}.\${rawBody}\`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  // Constant-time comparison
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );

  return { valid, error: valid ? null : 'Invalid signature' };
}

// Usage in n8n Code node:
const rawBody = JSON.stringify($input.all()[0].json);
const signature = $input.all()[0].headers['x-form-signature'];
const timestamp = $input.all()[0].headers['x-form-signature-ts'];
const secret = 'YOUR_SHARED_SECRET';

const result = verifySignature(rawBody, signature, timestamp, secret);
if (!result.valid) {
  throw new Error(result.error);
}

return $input.all();`}
				</pre>
			</div>

			{/* Python Example */}
			<div className="rounded-xl p-5 mb-6" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">Python</h2>
				<pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: '#0f172a', color: '#10b981' }}>
{`import hmac
import hashlib
import time

def verify_signature(raw_body: str, signature: str, timestamp: str, secret: str) -> bool:
    # Check timestamp is within 5 minutes
    now = int(time.time())
    if abs(now - int(timestamp)) > 300:
        return False

    # Compute expected signature
    data = f"{timestamp}.{raw_body}"
    expected = hmac.new(
        secret.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(signature, expected)`}
				</pre>
			</div>

			{/* Payload Structure */}
			<div className="rounded-xl p-5 mb-6" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">Payload Structure</h2>
				<pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: '#0f172a', color: '#10b981' }}>
{`{
  "tenantId": "ten_abc123",
  "formId": "form_xyz789",
  "formVersion": 1,
  "submissionId": "sub_unique_id",
  "submittedAt": "2024-01-15T10:30:00.000Z",
  "answers": {
    "email": "user@example.com",
    "message": "Hello world"
  },
  "client": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "meta": {
    "userAgent": "Mozilla/5.0...",
    "language": "en-US",
    "stepReached": 3
  }
}`}
				</pre>
			</div>

			{/* Security Best Practices */}
			<div className="rounded-xl p-5 mb-6" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">Security Best Practices</h2>
				<ul className="space-y-3" style={{ color: '#cbd5e1' }}>
					{[
						{ title: "Always verify signatures", desc: "before processing submissions" },
						{ title: "Check timestamps", desc: "to prevent replay attacks (5 minute window recommended)" },
						{ title: "Use HTTPS", desc: "for your webhook endpoints" },
						{ title: "Store secrets securely", desc: "using environment variables or secret managers" },
						{ title: "Rotate secrets periodically", desc: "and update your webhook handlers" },
					].map((item, i) => (
						<li key={i} className="flex items-start gap-3">
							<span style={{ color: '#10b981' }}>✓</span>
							<span><strong>{item.title}</strong> {item.desc}</span>
						</li>
					))}
				</ul>
			</div>

			{/* Testing */}
			<div className="rounded-xl p-5" style={cardStyle}>
				<h2 className="text-xl font-semibold text-white mb-4">Testing Webhooks</h2>
				<p style={{ color: '#94a3b8' }}>
					Use the &quot;Test Webhook&quot; button on the form detail page to send a test payload.
					Test payloads include <code className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#818cf8' }}>&quot;_test&quot;: true</code> in the answers object.
				</p>
			</div>
		</div>
	);
}
