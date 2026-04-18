import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

/**
 * Helper: test DB connectivity before performing operations.
 * Retries briefly to handle transient failures (e.g. cold-starting serverless DBs).
 */
export async function testConnection(): Promise<boolean> {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      if (attempt === maxAttempts) {
        return false
      }

      // 400ms, then 800ms before final attempt
      await new Promise((resolve) => setTimeout(resolve, attempt * 400))
    }
  }

  return false
}
