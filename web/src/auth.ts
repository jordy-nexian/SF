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
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.tenantId = user.tenantId;
				token.role = user.role;
			}
			return token;
		},
		async session({ session, token }) {
			session.user = {
				id: token.id,
				email: token.email ?? "",
				tenantId: token.tenantId,
				role: token.role,
			};
			return session;
		},
	},
};

