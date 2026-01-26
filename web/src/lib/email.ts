/**
 * Email sending utilities using Resend
 * 
 * Resend is a modern email API designed for developers.
 * https://resend.com/docs
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export interface SendEmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
	const apiKey = process.env.RESEND_API_KEY;
	const fromEmail = process.env.EMAIL_FROM || 'noreply@statelessforms.io';

	// If not configured, log and return success in dev
	if (!apiKey) {
		if (process.env.NODE_ENV === 'production') {
			console.error('[Email] RESEND_API_KEY not configured in production!');
			return { success: false, error: 'Email service not configured' };
		}

		// In development, just log the email
		console.log('[Email] Would send email (RESEND_API_KEY not set):');
		console.log('  To:', options.to);
		console.log('  Subject:', options.subject);
		console.log('  HTML:', options.html.substring(0, 200) + '...');
		return { success: true, messageId: 'dev-mock-id' };
	}

	try {
		const response = await fetch(RESEND_API_URL, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: fromEmail,
				to: options.to,
				subject: options.subject,
				html: options.html,
				text: options.text,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('[Email] Resend API error:', data);
			return {
				success: false,
				error: data.message || 'Failed to send email'
			};
		}

		return { success: true, messageId: data.id };
	} catch (error) {
		console.error('[Email] Send error:', error instanceof Error ? error.message : 'unknown');
		return { success: false, error: 'Failed to send email' };
	}
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
	email: string,
	resetUrl: string
): Promise<SendEmailResult> {
	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Stateless Forms</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
    
    <p>You requested a password reset for your account. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to right, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 600;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
    </p>
    
    <p style="color: #64748b; font-size: 14px;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} Stateless Forms. Privacy-first forms with real-time n8n relay.
    </p>
  </div>
</body>
</html>
`;

	const text = `
Reset Your Password

You requested a password reset for your Stateless Forms account.

Click here to reset your password:
${resetUrl}

This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.

© ${new Date().getFullYear()} Stateless Forms
`;

	return sendEmail({
		to: email,
		subject: 'Reset Your Password - Stateless Forms',
		html,
		text,
	});
}

/**
 * Send a form reminder email to an end customer
 */
export async function sendFormReminderEmail(
	email: string,
	customerName: string | null,
	formName: string,
	portalUrl: string,
	dueDate: Date | null,
	tenantName?: string
): Promise<SendEmailResult> {
	const displayName = tenantName || 'Stateless Forms';
	const greeting = customerName ? `Hi ${customerName}` : 'Hi there';
	const dueDateText = dueDate
		? `This form is due on <strong>${dueDate.toLocaleDateString()}</strong>.`
		: 'Please complete this form at your earliest convenience.';

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reminder: ${formName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${displayName}</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">Reminder: Complete Your Form</h2>
    
    <p>${greeting},</p>
    
    <p>You have an incomplete form waiting for you: <strong>${formName}</strong></p>
    
    <p>${dueDateText}</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(to right, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 600;">
        Complete Form
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      Click the button above to sign in and complete your form.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} ${displayName}. Secure forms portal.
    </p>
  </div>
</body>
</html>
`;

	const text = `
Reminder: Complete Your Form

${greeting},

You have an incomplete form waiting for you: ${formName}

${dueDate ? `This form is due on ${dueDate.toLocaleDateString()}.` : 'Please complete this form at your earliest convenience.'}

Click here to complete your form:
${portalUrl}

© ${new Date().getFullYear()} ${displayName}
`;

	return sendEmail({
		to: email,
		subject: `Reminder: ${formName} - ${displayName}`,
		html,
		text,
	});
}
