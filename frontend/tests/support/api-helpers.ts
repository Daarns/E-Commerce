import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { TestCredentials } from './test-env';
import { TEST_BACKEND_URL } from './test-env';

interface LoginData {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function parseJson(response: APIResponse): Promise<unknown> {
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('application/json')) return undefined;
  return response.json() as Promise<unknown>;
}

export function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return isRecord(value) && typeof value.success === 'boolean';
}

export async function login(
  request: APIRequestContext,
  credentials: TestCredentials
): Promise<LoginData> {
  const response = await request.post('auth/login', { data: credentials });
  if (!response.ok()) {
    throw new Error(`Test login failed with HTTP ${response.status()}`);
  }

  const payload: unknown = await response.json();
  if (!isApiEnvelope(payload) || !isRecord(payload.data)) {
    throw new Error('Test login returned an invalid response envelope');
  }

  const token = payload.data.access_token;
  const user = payload.data.user;
  if (typeof token !== 'string' || !isRecord(user)) {
    throw new Error('Test login response is missing token or user');
  }

  const role = user.role;
  if (
    typeof user.id !== 'string' ||
    typeof user.email !== 'string' ||
    (role !== 'customer' && role !== 'admin')
  ) {
    throw new Error('Test login response contains an invalid user');
  }

  return {
    access_token: token,
    user: { id: user.id, email: user.email, role },
  };
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function extractArray(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

export function extractEnvelopeData(value: unknown): unknown {
  return isApiEnvelope(value) ? value.data : undefined;
}

export function getStringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = value[field];
  return typeof candidate === 'string' ? candidate : undefined;
}

export function getNumberField(value: unknown, field: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = value[field];
  return typeof candidate === 'number' ? candidate : undefined;
}

export function getRecordField(
  value: unknown,
  field: string
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = value[field];
  return isRecord(candidate) ? candidate : undefined;
}

export async function isBackendAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${TEST_BACKEND_URL}/health`, { timeout: 3_000 });
    return response.ok();
  } catch {
    return false;
  }
}
