// Platform Admin Authentication
// Only designated emails can access the platform admin console

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// Platform admins are defined by environment variable
// PLATFORM_ADMIN_EMAILS=admin@yourcompany.com,cto@yourcompany.com
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS || "")
	.split(",")
	.map((e) => e.trim().toLowerCase())
	.filter(Boolean);

export interface PlatformSession {
	email: string;
	isPlatformAdmin: true;
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
	const session = await getServerSession(authOptions);
	
	if (!session?.user?.email) {
		return null;
	}

	const email = session.user.email.toLowerCase();
	
	if (!PLATFORM_ADMIN_EMAILS.includes(email)) {
		return null;
	}

	return {
		email,
		isPlatformAdmin: true,
	};
}

export async function requirePlatformAdmin(): Promise<PlatformSession | null> {
	const session = await getPlatformSession();
	return session;
}

export function isPlatformAdminEmail(email: string): boolean {
	return PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
}





