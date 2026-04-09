/**
 * Safe HTTP fetch — every network call in the providers goes
 * through this wrapper so a failing API can never crash the
 * pipeline. Errors, non-2xx responses, timeouts, and JSON parse
 * failures all resolve to `null` — callers fall back to the mock
 * layer on a null return.
 */

export interface SafeFetchOptions extends RequestInit {
  /** Per-request timeout, in milliseconds. Default: 10 000 ms. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 10_000;

/**
 * Abort-signal-aware fetch that catches every error surface.
 * Returns the raw `Response` on success, `null` otherwise.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<Response | null> {
  const { timeoutMs = DEFAULT_TIMEOUT, signal, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Chain the caller's signal into our controller if provided.
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      return null;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convenience — fetch JSON and return the parsed body, or null on
 * any failure (network, non-2xx, JSON parse, timeout).
 */
export async function safeFetchJson<T = unknown>(
  url: string,
  options: SafeFetchOptions = {},
): Promise<T | null> {
  const response = await safeFetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
