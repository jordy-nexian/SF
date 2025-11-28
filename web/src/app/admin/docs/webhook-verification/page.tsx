export default function WebhookVerificationDocs() {
	return (
		<div className="mx-auto max-w-4xl">
			<h1 className="mb-6 text-2xl font-semibold">Webhook Signature Verification</h1>

			<div className="prose prose-gray max-w-none">
				<p className="text-lg text-gray-600">
					All webhook payloads are signed with HMAC-SHA256 using your tenant's shared secret.
					This guide shows how to verify signatures in your n8n workflows or custom integrations.
				</p>

				<h2 className="mt-8 text-xl font-semibold">Signature Headers</h2>
				<p>Each request includes these headers:</p>
				<div className="rounded bg-gray-50 p-4 font-mono text-sm">
					<div><span className="text-blue-600">X-Form-Signature</span>: &lt;hex-encoded HMAC signature&gt;</div>
					<div><span className="text-blue-600">X-Form-Signature-Alg</span>: sha256</div>
					<div><span className="text-blue-600">X-Form-Signature-Ts</span>: &lt;unix timestamp in seconds&gt;</div>
				</div>

				<h2 className="mt-8 text-xl font-semibold">How Signatures are Generated</h2>
				<p>The signature is computed as:</p>
				<pre className="rounded bg-gray-900 p-4 text-sm text-green-400">
{`signature = HMAC-SHA256(
  key: your_shared_secret,
  data: "{timestamp}.{raw_json_body}"
)`}
				</pre>

				<h2 className="mt-8 text-xl font-semibold">Verification Examples</h2>

				<h3 className="mt-6 text-lg font-medium">Node.js / n8n Code Node</h3>
				<pre className="rounded bg-gray-900 p-4 text-sm text-green-400 overflow-x-auto">
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

				<h3 className="mt-6 text-lg font-medium">Python</h3>
				<pre className="rounded bg-gray-900 p-4 text-sm text-green-400 overflow-x-auto">
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
    return hmac.compare_digest(signature, expected)

# Usage:
# raw_body = request.get_data(as_text=True)
# signature = request.headers.get('X-Form-Signature')
# timestamp = request.headers.get('X-Form-Signature-Ts')
# if not verify_signature(raw_body, signature, timestamp, SECRET):
#     return {'error': 'Invalid signature'}, 401`}
				</pre>

				<h3 className="mt-6 text-lg font-medium">n8n Webhook Node (No Code)</h3>
				<p>If you can't use a Code node, you can use n8n's built-in webhook authentication:</p>
				<ol className="list-decimal pl-6 space-y-2">
					<li>In your Webhook node, set <strong>Authentication</strong> to "Header Auth"</li>
					<li>Add a header name like <code>X-Auth-Token</code></li>
					<li>Set the expected value to a static token</li>
					<li>Configure your form to include this header (via form settings)</li>
				</ol>
				<p className="text-sm text-gray-500 mt-2">
					Note: This is less secure than HMAC verification but simpler to set up.
				</p>

				<h2 className="mt-8 text-xl font-semibold">Payload Structure</h2>
				<pre className="rounded bg-gray-900 p-4 text-sm text-green-400 overflow-x-auto">
{`{
  "tenantId": "ten_abc123",
  "formId": "form_xyz789",
  "formVersion": 1,
  "submissionId": "sub_unique_id",
  "submittedAt": "2024-01-15T10:30:00.000Z",
  "answers": {
    "email": "user@example.com",
    "message": "Hello world",
    // ... other form fields
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

				<h2 className="mt-8 text-xl font-semibold">Security Best Practices</h2>
				<ul className="list-disc pl-6 space-y-2">
					<li><strong>Always verify signatures</strong> before processing submissions</li>
					<li><strong>Check timestamps</strong> to prevent replay attacks (5 minute window recommended)</li>
					<li><strong>Use HTTPS</strong> for your webhook endpoints</li>
					<li><strong>Store secrets securely</strong> using environment variables or secret managers</li>
					<li><strong>Rotate secrets periodically</strong> and update your webhook handlers</li>
				</ul>

				<h2 className="mt-8 text-xl font-semibold">Testing Webhooks</h2>
				<p>
					Use the "Test Webhook" button on the form detail page to send a test payload.
					Test payloads include <code>"_test": true</code> in the answers object.
				</p>
			</div>
		</div>
	);
}

