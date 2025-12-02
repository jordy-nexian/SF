import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { PLANS, type PlanId, type BillingCycle } from "@/lib/plans";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Initialize Stripe if API key is available
const stripe = process.env.STRIPE_SECRET_KEY 
	? new Stripe(process.env.STRIPE_SECRET_KEY)
	: null;

// POST create checkout session
export async function POST(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const body = await req.json().catch(() => ({}));
	const { planId, billingCycle, provider } = body as {
		planId: PlanId;
		billingCycle: BillingCycle;
		provider: "stripe" | "paypal";
	};

	// Validate plan
	const plan = PLANS[planId];
	if (!plan || planId === "free") {
		return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
	}

	// Get tenant info
	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			id: true,
			name: true,
			stripeCustomerId: true,
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	// Get user email
	const user = await prisma.user.findUnique({
		where: { id: session.userId },
		select: { email: true },
	});

	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";

	if (provider === "stripe") {
		if (!stripe) {
			return NextResponse.json({ 
				error: "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable." 
			}, { status: 500 });
		}

		try {
			// Get or create Stripe customer
			let customerId = tenant.stripeCustomerId;
			
			if (!customerId) {
				const customer = await stripe.customers.create({
					email: user?.email,
					name: tenant.name,
					metadata: {
						tenantId: tenant.id,
					},
				});
				customerId = customer.id;
				
				// Save customer ID
				await prisma.tenant.update({
					where: { id: tenant.id },
					data: { stripeCustomerId: customerId },
				});
			}

			// Get the appropriate price ID
			const priceId = billingCycle === "annual" 
				? plan.stripeAnnualPriceId 
				: plan.stripeMonthlyPriceId;

			if (!priceId) {
				return NextResponse.json({ 
					error: `Stripe price not configured for ${plan.name} (${billingCycle}). Please set the appropriate environment variable.` 
				}, { status: 500 });
			}

			// Create checkout session
			const checkoutSession = await stripe.checkout.sessions.create({
				customer: customerId,
				mode: "subscription",
				payment_method_types: ["card"],
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				success_url: `${baseUrl}/admin/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${baseUrl}/admin/billing?canceled=true`,
				metadata: {
					tenantId: tenant.id,
					planId,
					billingCycle,
				},
				subscription_data: {
					metadata: {
						tenantId: tenant.id,
						planId,
						billingCycle,
					},
				},
			});

			return NextResponse.json({ url: checkoutSession.url });
		} catch (err) {
			console.error("Stripe checkout error:", err);
			return NextResponse.json({ 
				error: err instanceof Error ? err.message : "Failed to create checkout session" 
			}, { status: 500 });
		}
	}

	if (provider === "paypal") {
		// PayPal integration
		const paypalClientId = process.env.PAYPAL_CLIENT_ID;
		const paypalSecret = process.env.PAYPAL_SECRET;

		if (!paypalClientId || !paypalSecret) {
			return NextResponse.json({ 
				error: "PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_SECRET environment variables." 
			}, { status: 500 });
		}

		const paypalPlanId = billingCycle === "annual" 
			? plan.paypalAnnualPlanId 
			: plan.paypalMonthlyPlanId;

		if (!paypalPlanId) {
			return NextResponse.json({ 
				error: `PayPal plan not configured for ${plan.name} (${billingCycle}). Please set the appropriate environment variable.` 
			}, { status: 500 });
		}

		try {
			// Get PayPal access token
			const authResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic ${Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64")}`,
				},
				body: "grant_type=client_credentials",
			});

			const authData = await authResponse.json();
			if (!authData.access_token) {
				throw new Error("Failed to get PayPal access token");
			}

			// Create subscription
			const subscriptionResponse = await fetch("https://api-m.paypal.com/v1/billing/subscriptions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${authData.access_token}`,
				},
				body: JSON.stringify({
					plan_id: paypalPlanId,
					custom_id: tenant.id,
					application_context: {
						brand_name: "Stateless Forms",
						locale: "en-US",
						shipping_preference: "NO_SHIPPING",
						user_action: "SUBSCRIBE_NOW",
						return_url: `${baseUrl}/admin/billing?success=true&provider=paypal`,
						cancel_url: `${baseUrl}/admin/billing?canceled=true`,
					},
				}),
			});

			const subscriptionData = await subscriptionResponse.json();
			
			if (subscriptionData.links) {
				const approveLink = subscriptionData.links.find((l: { rel: string }) => l.rel === "approve");
				if (approveLink) {
					return NextResponse.json({ url: approveLink.href });
				}
			}

			throw new Error("Failed to create PayPal subscription");
		} catch (err) {
			console.error("PayPal checkout error:", err);
			return NextResponse.json({ 
				error: err instanceof Error ? err.message : "Failed to create PayPal subscription" 
			}, { status: 500 });
		}
	}

	return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
}

