import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = process.env.STRIPE_SECRET_KEY 
	? new Stripe(process.env.STRIPE_SECRET_KEY)
	: null;

// POST create billing portal session
export async function POST() {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	if (!stripe) {
		return NextResponse.json({ 
			error: "Stripe is not configured" 
		}, { status: 500 });
	}

	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: { stripeCustomerId: true },
	});

	if (!tenant?.stripeCustomerId) {
		return NextResponse.json({ 
			error: "No billing account found" 
		}, { status: 400 });
	}

	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";

	try {
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: tenant.stripeCustomerId,
			return_url: `${baseUrl}/admin/billing`,
		});

		return NextResponse.json({ url: portalSession.url });
	} catch (err) {
		console.error("Stripe portal error:", err);
		return NextResponse.json({ 
			error: "Failed to create billing portal session" 
		}, { status: 500 });
	}
}

