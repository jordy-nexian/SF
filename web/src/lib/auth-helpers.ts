import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { NextResponse } from "next/server";

export type TenantSession = {
	userId: string;
	tenantId: string;
	role: "owner" | "admin" | "viewer";
};

export async function requireTenantSession(): Promise<TenantSession | null> {
	const session = await getServerSession(authOptions);
	const user = session?.user;
	if (!user?.id || !user?.tenantId || !user?.role) return null;
	return {
		userId: user.id,
		tenantId: user.tenantId,
		role: user.role,
	};
}

export async function getSession() {
	return await getServerSession(authOptions);
}

export async function getCurrentUser() {
	const session = await getSession();
	return session?.user ?? null;
}

export function forbidden() {
	return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}


