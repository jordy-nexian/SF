import NextAuth from "next-auth";
import { authOptions } from "@/auth";

export const runtime = "nodejs";

export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);


