import { create } from 'zustand';
import {
  clearStoredApiUrl,
  loadStoredApiUrl,
  saveStoredApiUrl,
} from '../lib/api-config-storage';

const FALLBACK_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

type HealthResponse = {
  status?: string;
  service?: string;
};

type ApiConfigState = {
  apiUrl: string | null;
  fallbackApiUrl: string;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrateApiConfig: () => Promise<void>;
  saveApiUrl: (rawUrl: string) => Promise<void>;
  clearApiUrl: () => Promise<void>;
  getApiUrl: () => string;
};

export const useApiConfigStore = create<ApiConfigState>((set, get) => ({
  apiUrl: null,
  fallbackApiUrl: FALLBACK_API_URL,
  isHydrated: false,
  isLoading: false,
  error: null,
  async hydrateApiConfig() {
    const storedApiUrl = await loadStoredApiUrl();

    set({
      apiUrl: storedApiUrl ? normalizeApiUrl(storedApiUrl) : null,
      isHydrated: true,
      error: null,
    });
  },
  async saveApiUrl(rawUrl) {
    const apiUrl = normalizeApiUrl(rawUrl);

    set({ isLoading: true, error: null });

    try {
      await validateApiUrl(apiUrl);
      await saveStoredApiUrl(apiUrl);
      set({ apiUrl, isLoading: false, error: null });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo validar el servidor configurado';

      set({ isLoading: false, error: message });
      throw error;
    }
  },
  async clearApiUrl() {
    await clearStoredApiUrl();
    set({ apiUrl: null, error: null });
  },
  getApiUrl() {
    const configuredUrl = get().apiUrl;

    if (!configuredUrl) {
      throw new Error('Configura el servidor de choninovet antes de continuar');
    }

    return configuredUrl;
  },
}));

export function normalizeApiUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim().replace(/\/+$/, '');

  if (!trimmedUrl) {
    throw new Error('Ingresa la URL del servidor');
  }

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error('La URL debe comenzar con http:// o https://');
  }

  return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
}

async function validateApiUrl(apiUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${apiUrl}/health`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`El servidor respondio con estado ${response.status}`);
    }

    const payload = (await response.json()) as HealthResponse;

    if (payload.status !== 'ok') {
      throw new Error('El servidor respondio, pero no parece ser una API valida');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('El servidor no respondio a tiempo');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('No se pudo conectar con el servidor');
  } finally {
    clearTimeout(timeout);
  }
}
