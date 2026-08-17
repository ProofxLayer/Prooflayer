import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as typeof globalThis & { __proofLayerPrisma?: PrismaClient };
export const prisma = globalForPrisma.__proofLayerPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__proofLayerPrisma = prisma;
