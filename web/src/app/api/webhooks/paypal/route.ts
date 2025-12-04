import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PayPal webhook handler
export async function POST(req: NextRequest) {
	const paypalClientId = process.env.PAYPAL_CLIENT_ID;
	const paypalSecret = process.env.PAYPAL_SECRET;
	const webhookId = process.env.PAYPAL_WEBHOOK_ID;

	if (!paypalClientId || !paypalSecret) {
		return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
	}

	try {
		const body = await req.json();
		const eventType = body.event_type;

		// Verify webhook signature (optional but recommended)
		if (webhookId) {
			const transmissionId = req.headers.get("paypal-transmission-id");
			const transmissionTime = req.headers.get("paypal-transmission-time");
			const certUrl = req.headers.get("paypal-cert-url");
			const transmissionSig = req.headers.get("paypal-transmission-sig");

			if (transmissionId && transmissionTime && certUrl && transmissionSig) {
				// Get access token
				const authResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"Authorization": `Basic ${Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64")}`,
					},
					body: "grant_type=client_credentials",
				});

				const authData = await authResponse.json();

				// Verify webhook
				const verifyResponse = await fetch("https://api-m.paypal.com/v1/notifications/verify-webhook-signature", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${authData.access_token}`,
					},
					body: JSON.stringify({
						auth_algo: req.headers.get("paypal-auth-algo"),
						cert_url: certUrl,
						transmission_id: transmissionId,
						transmission_sig: transmissionSig,
						transmission_time: transmissionTime,
						webhook_id: webhookId,
						webhook_event: body,
					}),
				});

				const verifyData = await verifyResponse.json();
				if (verifyData.verification_status !== "SUCCESS") {
					console.error("PayPal webhook verification failed");
					return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
				}
			}
		}

		// Handle different event types
		switch (eventType) {
			case "BILLING.SUBSCRIPTION.ACTIVATED": {
				const subscription = body.resource;
				const tenantId = subscription.custom_id;
				const planId = subscription.plan_id;

				if (tenantId) {
					// Determine plan from PayPal plan ID
					let plan: "pro" | "enterprise" = "pro";
					if (planId === process.env.PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID || 
						planId === process.env.PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID) {
						plan = "enterprise";
					}

					const billingCycle = planId?.includes("annual") ? "annual" : "monthly";

					await prisma.tenant.update({
						where: { id: tenantId },
						data: {
							plan,
							paypalSubscriptionId: subscription.id,
							billingCycle: billingCycle as "monthly" | "annual",
							subscriptionStatus: "active",
							currentPeriodStart: subscription.billing_info?.last_payment?.time 
								? new Date(subscription.billing_info.last_payment.time)
								: new Date(),
							currentPeriodEnd: subscription.billing_info?.next_billing_time
								? new Date(subscription.billing_info.next_billing_time)
								: null,
						},
					});
				}
				break;
			}

			case "BILLING.SUBSCRIPTION.CANCELLED": {
				const subscription = body.resource;
				const tenantId = subscription.custom_id;

				if (tenantId) {
					await prisma.tenant.update({
						where: { id: tenantId },
						data: {
							plan: "free",
							subscriptionStatus: "canceled",
							paypalSubscriptionId: null,
							currentPeriodStart: null,
							currentPeriodEnd: null,
						},
					});
				}
				break;
			}

			case "BILLING.SUBSCRIPTION.SUSPENDED": {
				const subscription = body.resource;
				const tenantId = subscription.custom_id;

				if (tenantId) {
					await prisma.tenant.update({
						where: { id: tenantId },
						data: {
							subscriptionStatus: "past_due",
						},
					});
				}
				break;
			}

			case "PAYMENT.SALE.COMPLETED": {
				// Successful payment - subscription continues
				const sale = body.resource;
				const subscriptionId = sale.billing_agreement_id;

				if (subscriptionId) {
					const tenant = await prisma.tenant.findFirst({
						where: { paypalSubscriptionId: subscriptionId },
					});

					if (tenant) {
						await prisma.tenant.update({
							where: { id: tenant.id },
							data: {
								subscriptionStatus: "active",
							},
						});
					}
				}
				break;
			}

			default:
				console.log(`Unhandled PayPal event type: ${eventType}`);
		}

		return NextResponse.json({ received: true });
	} catch (err) {
		console.error("PayPal webhook error:", err);
		return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
	}
}



