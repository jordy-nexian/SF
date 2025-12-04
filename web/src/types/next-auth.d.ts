import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			email: string;
			tenantId: string;
			role: "owner" | "admin" | "viewer";
		} & DefaultSession["user"];
	}

	interface User extends DefaultUser {
		id: string;
		email: string;
		tenantId: string;
		role: "owner" | "admin" | "viewer";
	}
}

declare module "next-auth/jwt" {
	interface JWT extends DefaultJWT {
		id: string;
		tenantId: string;
		role: "owner" | "admin" | "viewer";
	}
}





