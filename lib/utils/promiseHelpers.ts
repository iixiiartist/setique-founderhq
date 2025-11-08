/**
 * Promise helper utilities for better async operation handling
 */

/**
 * Wraps a promise with a timeout, automatically cleaning up the timer
 * to prevent memory leaks.
 * 
 * @param promise - The promise to wrap with a timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutError - Optional custom error message for timeout
 * @returns Promise that rejects if timeout is reached before promise resolves
 * 
 * @example
 * ```ts
 * const data = await withTimeout(
 *   fetchUserData(userId),
 *   5000,
 *   'Failed to fetch user data'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutError));
        }, timeoutMs);
      })
    ]);
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}
