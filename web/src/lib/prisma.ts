import { PrismaClient } from '@/generated/prisma';

// Ensure a single PrismaClient instance across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

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


