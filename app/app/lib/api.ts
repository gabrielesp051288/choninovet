import { useApiConfigStore } from '../stores/api-config-store';

let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
): Promise<T> {
  const apiUrl = useApiConfigStore.getState().getApiUrl();
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message)
        : `La solicitud fallo con estado ${response.status}`;

    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function apiUploadRequest<T>(
  path: string,
  formData: FormData,
  { token }: Pick<RequestOptions, 'token'> = {},
): Promise<T> {
  const apiUrl = useApiConfigStore.getState().getApiUrl();
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message)
        : `La solicitud fallo con estado ${response.status}`;

    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export function buildApiAssetUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiUrl = useApiConfigStore.getState().getApiUrl();
  const apiBaseUrl = apiUrl.replace(/\/api\/?$/, '');

  return `${apiBaseUrl}${path}`;
}
