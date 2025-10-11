// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
// import { softDeleteExtension } from './middleware/softDelete';

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient
};

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// TODO: Re-enable soft delete extension once fixed
// Temporarily disabled to avoid query issues
