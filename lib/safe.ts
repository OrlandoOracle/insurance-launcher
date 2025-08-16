/**
 * Safe wrapper utilities for async operations
 */

/**
 * Safely execute a promise and return fallback on error
 */
export async function safe<T>(
  promise: Promise<T>,
  fallback: T,
  tag = 'SAFE'
): Promise<T> {
  try {
    return await promise
  } catch (error) {
    console.error(`[${tag}]`, error)
    return fallback
  }
}

/**
 * Check if error is a Prisma table missing error
 */
export function isTableMissing(error: unknown): boolean {
  const msg = String((error as any)?.message ?? '')
  const code = (error as any)?.code
  return code === 'P2021' || /does not exist/i.test(msg)
}

/**
 * Safe wrapper specifically for database operations
 */
export async function safeDb<T>(
  operation: () => Promise<T>,
  fallback: T,
  context = 'DB'
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isTableMissing(error)) {
      console.warn(`[${context}] Table missing, returning fallback`)
    } else {
      console.error(`[${context}]`, error)
    }
    return fallback
  }
}

/**
 * Batch safe operations
 */
export async function safeBatch<T extends Record<string, Promise<any>>>(
  operations: T,
  fallbacks: { [K in keyof T]: Awaited<T[K]> }
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const results = {} as { [K in keyof T]: Awaited<T[K]> }
  
  await Promise.all(
    Object.entries(operations).map(async ([key, promise]) => {
      try {
        results[key as keyof T] = await promise
      } catch (error) {
        console.error(`[SafeBatch:${key}]`, error)
        results[key as keyof T] = fallbacks[key as keyof T]
      }
    })
  )
  
  return results
}