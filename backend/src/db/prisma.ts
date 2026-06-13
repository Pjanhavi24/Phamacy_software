import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances in development (hot reload)
  var __prismaClient: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  });
};

export const prisma: PrismaClient =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (global.__prismaClient ?? (global.__prismaClient = createPrismaClient()));

// Graceful disconnect
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('[Prisma] Disconnected.');
};

// Health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Prisma] Database health check failed:', error);
    return false;
  }
};

process.on('beforeExit', async () => {
  await disconnectPrisma();
});

export default prisma;
