/**
 * Keep auth helpers small at the beginning.
 * Later you can move token storage to cookies or Next.js server actions.
 */
export const AUTH_TOKEN_KEY = "ai-kb-token";

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}
