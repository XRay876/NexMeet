import { clearToken, getRole, getToken, isExpired, saveToken } from './auth';
import type { ApiResponse, AuthData } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    clearToken();
    return null;
  }

  const payload = (await response.json()) as ApiResponse<AuthData>;
  if (!payload.success || !payload.data?.accessToken) {
    clearToken();
    return null;
  }

  saveToken(payload.data.accessToken);
  return payload.data.accessToken;
}

export async function apiRequest<T>(path: string, init?: RequestInit, allowRefresh = true): Promise<T> {
  let token = getToken();
  if (token && isExpired(token) && getRole(token) === 'Member') {
    token = await refreshAccessToken();
  }

  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && allowRefresh && getRole(token) === 'Member') {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error('Session expired. Please login again.');
    return apiRequest<T>(path, init, false);
  }

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorBody = (await response.json()) as ApiResponse<unknown>;
      errorMessage = errorBody.errors?.join(', ') || errorBody.message || errorMessage;
    } catch {
      // ignore parse failure
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return (await response.blob()) as T;

  const wrapper = (await response.json()) as ApiResponse<T>;
  if (!wrapper.success) throw new Error(wrapper.errors?.join(', ') || wrapper.message || 'Request failed');
  return wrapper.data;
}

export function apiBaseUrl() {
  return API_BASE;
}
