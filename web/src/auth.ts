import type { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
	secret: process.env.NEXTAUTH_SECRET,
	session: { strategy: "jwt" },
	pages: {
		signIn: "/signin",
	},
	providers: [
		Credentials({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials): Promise<User | null> {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const emailRaw = credentials.email;
				const email = emailRaw.trim().toLowerCase();

				const user = await prisma.user.findFirst({
					where: {
						OR: [{ email: emailRaw }, { email }],
					},
				});

				if (!user?.passwordHash) return null;

				const isValid = await compare(credentials.password, user.passwordHash);
				if (!isValid) return null;

				return {
					id: user.id,
					email: user.email,
					tenantId: user.tenantId,
					role: user.role as "owner" | "admin" | "viewer",
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, trigger, session: sessionData }) {
			if (user) {
				token.id = user.id;
				token.tenantId = user.tenantId;
				token.role = user.role;
			}
			
			// Handle impersonation update from client
			if (trigger === "update" && sessionData) {
				if (sessionData.impersonate) {
					const { userId, tenantId, role, email, impersonatingFrom, originalAdmin } = sessionData.impersonate as any;
					// Store original admin info for restoration
					if (originalAdmin) {
						(token as any).originalAdminId = originalAdmin.userId;
						(token as any).originalAdminEmail = originalAdmin.email;
						(token as any).originalAdminTenantId = originalAdmin.tenantId;
						(token as any).originalAdminRole = originalAdmin.role;
					}
					// Set impersonated user
					token.id = userId;
					token.tenantId = tenantId;
					token.role = role;
					token.email = email;
					(token as any).impersonatingFrom = impersonatingFrom;
					(token as any).isImpersonating = true;
				} else if (sessionData.impersonate === null) {
					// Restore original admin session
					if (token.originalAdminId) {
						token.id = token.originalAdminId as string;
						token.email = token.originalAdminEmail as string;
						token.tenantId = token.originalAdminTenantId as string;
						token.role = token.originalAdminRole as "owner" | "admin" | "viewer";
						// Clear impersonation fields
						delete (token as any).impersonatingFrom;
						delete (token as any).isImpersonating;
						delete (token as any).originalAdminId;
						delete (token as any).originalAdminEmail;
						delete (token as any).originalAdminTenantId;
						delete (token as any).originalAdminRole;
					}
				}
			}
			
			return token;
		},
		async session({ session, token }) {
			session.user = {
				id: token.id as string,
				email: (token.email as string) ?? "",
				tenantId: token.tenantId as string,
				role: token.role as "owner" | "admin" | "viewer",
			};
			
			// Add impersonation info to session
			if (token.isImpersonating && token.impersonatingFrom) {
				(session as any).impersonating = {
					from: token.impersonatingFrom,
					isImpersonating: true,
				};
			}
			
			return session;
		},
	},
};

