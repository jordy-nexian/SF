import { NextResponse } from "next/server";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET available plans
export async function GET() {
	const plans = Object.values(PLANS).map(plan => ({
		id: plan.id,
		name: plan.name,
		description: plan.description,
		popular: plan.popular,
		pricing: plan.pricing,
		features: plan.features,
	}));

	return NextResponse.json({ plans });
}





