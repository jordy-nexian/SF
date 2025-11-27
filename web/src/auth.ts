import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
	secret: process.env.NEXTAUTH_SECRET,
	session: { strategy: "jwt" },
	providers: [
		Credentials({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(raw) {
				const emailRaw = (raw as any)?.email;
				const passwordRaw = (raw as any)?.password;
				if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
					return null;
				}
				const email = emailRaw.trim().toLowerCase();
				const user =
					(await prisma.user.findFirst({
						where: { email: { equals: email, mode: "insensitive" } as any },
					})) ||
					(await prisma.user.findFirst({ where: { email: emailRaw } }));
				if (!user?.passwordHash) return null;
				const ok = await compare(passwordRaw, user.passwordHash);
				if (!ok) return null;
				return {
					id: user.id,
					email: user.email,
					tenantId: user.tenantId,
					role: user.role,
				} as any;
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.sub = (user as any).id;
				(token as any).tenantId = (user as any).tenantId;
				(token as any).role = (user as any).role;
			}
			return token;
		},
		async session({ session, token }) {
			(session as any).user = {
				id: token.sub,
				email: session.user?.email,
				tenantId: (token as any).tenantId,
				role: (token as any).role,
			};
			return session;
		},
	},
};

