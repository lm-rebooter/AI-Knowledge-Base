/**
 * This file centralizes frontend-to-backend requests.
 * When the project grows, you can swap `fetch` wrappers for React Query or SWR
 * without changing every page component.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
