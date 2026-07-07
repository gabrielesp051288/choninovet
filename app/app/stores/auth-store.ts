import { create } from 'zustand';
import { apiRequest, setUnauthorizedHandler } from '../lib/api';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  type StoredSession,
} from '../lib/session-storage';

export type UserRole = 'OWNER' | 'VET' | 'ADMIN';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  ownerProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
  vetProfile?: {
    id: string;
    clinicName: string;
    managerName?: string | null;
    phone?: string | null;
    address?: string | null;
    description?: string | null;
  } | null;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type RegisterOwnerResponse = {
  message: string;
  user: AuthUser;
};

type RegisterOwnerInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  clinicName?: string;
  managerName?: string;
  address?: string;
  description?: string;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrateSession: () => Promise<void>;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  registerOwner: (input: RegisterOwnerInput) => Promise<RegisterOwnerResponse>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  logout: () => void;
  expireSession: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isHydrated: false,
  isLoading: false,
  error: null,
  async hydrateSession() {
    const storedSession = await loadStoredSession();

    if (isStoredAuthSession(storedSession)) {
      set({
        accessToken: storedSession.accessToken,
        user: storedSession.user,
        isHydrated: true,
      });
      return;
    }

    set({ isHydrated: true });
  },
  setError(error) {
    set({ error });
  },
  async login(email, password) {
    set({ isLoading: true, error: null });

    try {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      await saveStoredSession({
        accessToken: response.accessToken,
        user: response.user,
      });

      set({
        accessToken: response.accessToken,
        user: response.user,
        isLoading: false,
      });

      return response.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  async registerOwner(input) {
    set({ isLoading: true, error: null });

    try {
      const response = await apiRequest<RegisterOwnerResponse>('/auth/register', {
        method: 'POST',
        body: input,
      });

      set({ isLoading: false });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  async updateProfile(input) {
    set({ isLoading: true, error: null });

    try {
      const { accessToken } = get();
      const user = await apiRequest<AuthUser>('/auth/me', {
        method: 'PATCH',
        token: accessToken,
        body: input,
      });

      if (accessToken) {
        await saveStoredSession({ accessToken, user });
      }

      set({ user, isLoading: false });

      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el perfil';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  logout() {
    void clearStoredSession();
    set({ accessToken: null, user: null, error: null });
  },
  expireSession() {
    void clearStoredSession();
    set({
      accessToken: null,
      user: null,
      error: 'Tu sesion vencio. Inicia sesion nuevamente.',
    });
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().expireSession();
});

function isStoredAuthSession(session: StoredSession | null): session is StoredSession & { user: AuthUser } {
  return Boolean(
    session &&
      typeof session.accessToken === 'string' &&
      session.accessToken &&
      typeof session.user === 'object' &&
      session.user &&
      'id' in session.user &&
      'email' in session.user &&
      'role' in session.user,
  );
}
