/**
 * This file centralizes frontend-to-backend requests.
 * When the project grows, you can swap `fetch` wrappers for React Query or SWR
 * without changing every page component.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new ApiRequestError(`API request failed: ${response.status} ${response.statusText}`, response.status);
  }

  return (await response.json()) as T;
}
