import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = process.env.STRIPE_SECRET_KEY 
	? new Stripe(process.env.STRIPE_SECRET_KEY)
	: null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
	if (!stripe || !webhookSecret) {
		return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
	}

	const body = await req.text();
	const signature = req.headers.get("stripe-signature");

	if (!signature) {
		return NextResponse.json({ error: "No signature" }, { status: 400 });
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (err) {
		console.error("Webhook signature verification failed:", err);
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const tenantId = session.metadata?.tenantId;
				const planId = session.metadata?.planId;
				const billingCycle = session.metadata?.billingCycle;

				if (tenantId && planId) {
					await prisma.tenant.update({
						where: { id: tenantId },
						data: {
							plan: planId as "free" | "pro" | "enterprise",
							stripeSubscriptionId: session.subscription as string,
							billingCycle: billingCycle as "monthly" | "annual",
							subscriptionStatus: "active",
						},
					});
				}
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				const tenantId = subscription.metadata?.tenantId;

				if (tenantId) {
					// Access subscription properties safely
					const subAny = subscription as unknown as Record<string, unknown>;
					const periodStart = subAny.current_period_start as number | undefined;
					const periodEnd = subAny.current_period_end as number | undefined;
					
					await prisma.tenant.update({
						where: { id: tenantId },
						data: {
							subscriptionStatus: subscription.status === "active" ? "active" 
								: subscription.status === "past_due" ? "past_due"
								: subscription.status === "canceled" ? "canceled"
								: subscription.status === "trialing" ? "trialing"
								: "none",
							currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
							currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
							cancelAtPeriodEnd: subscription.cancel_at_period_end,
						},
					});
				}
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				const tenantId = subscription.metadata?.tenantId;

				if (tenantId) {
					await prisma.tenant.update({
						where: { id: tenantId },
						data: {
							plan: "free",
							subscriptionStatus: "canceled",
							stripeSubscriptionId: null,
							currentPeriodStart: null,
							currentPeriodEnd: null,
							cancelAtPeriodEnd: false,
						},
					});
				}
				break;
			}

			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;
				const invoiceAny = invoice as unknown as Record<string, unknown>;
				const subscriptionId = invoiceAny.subscription as string | undefined;

				if (subscriptionId) {
					const subscription = await stripe.subscriptions.retrieve(subscriptionId);
					const tenantId = subscription.metadata?.tenantId;

					if (tenantId) {
						await prisma.tenant.update({
							where: { id: tenantId },
							data: {
								subscriptionStatus: "past_due",
							},
						});
					}
				}
				break;
			}

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (err) {
		console.error("Webhook handler error:", err);
		return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
	}
}

