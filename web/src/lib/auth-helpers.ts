import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type TenantSession = {
	userId: string;
	tenantId: string;
	role: "owner" | "admin" | "viewer";
};

export async function requireTenantSession(): Promise<TenantSession | null> {
	const session = await auth();
	const user = (session as any)?.user;
	if (!user?.id || !user?.tenantId || !user?.role) return null;
	return {
		userId: user.id,
		tenantId: user.tenantId,
		role: user.role,
	};
}

export function forbidden() {
	return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}


