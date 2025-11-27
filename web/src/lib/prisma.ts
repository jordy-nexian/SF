import { PrismaClient } from '@prisma/client';
import dns from 'node:dns';

// Ensure a single PrismaClient instance across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prefer IPv4 to avoid environments that only return AAAA records
try {
	dns.setDefaultResultOrder('ipv4first');
} catch {
	// noop for older Node versions
}

export const prisma: PrismaClient =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: [
			{ emit: 'event', level: 'error' },
			{ emit: 'event', level: 'warn' },
		],
	});

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}

export default prisma;


