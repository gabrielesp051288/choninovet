import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'choninovet.session';

export type StoredSession = {
  accessToken: string;
  user: unknown;
};

export async function loadStoredSession() {
  const rawSession =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SESSION_KEY) ?? null
      : await SecureStore.getItemAsync(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as StoredSession;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function saveStoredSession(session: StoredSession) {
  const rawSession = JSON.stringify(session);

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(SESSION_KEY, rawSession);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, rawSession);
}

export async function clearStoredSession() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}
