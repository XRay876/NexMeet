import { jwtDecode } from 'jwt-decode';
import type { JwtClaims, Role } from '../types';

const TOKEN_KEY = 'nexmeet_access_token';
const ROLE_KEY = 'nexmeet_role';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, getRole(token));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getClaims(token?: string | null): JwtClaims | null {
  if (!token) return null;
  try {
    return jwtDecode<JwtClaims>(token);
  } catch {
    return null;
  }
}

export function getRole(token?: string | null): Role {
  const claims = getClaims(token ?? getToken());
  return (
    claims?.role ??
    claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
    'Unknown'
  );
}

export function getDisplayName(token?: string | null) {
  const claims = getClaims(token ?? getToken());
  return (
    claims?.name ??
    claims?.unique_name ??
    claims?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
    'Unknown'
  );
}

export function isExpired(token?: string | null) {
  const claims = getClaims(token ?? getToken());
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now() + 5000;
}
