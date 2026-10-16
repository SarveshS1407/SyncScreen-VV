/**
 * API configuration and helper functions supporting both unified
 * deployments (relative paths) and decoupled deployments (e.g. Vercel + Render).
 */

export const SERVER_BASE_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/+$/, '') || '';

export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${SERVER_BASE_URL}${cleanEndpoint}`;
}
