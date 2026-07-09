import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_CONFIG_KEY = 'choninovet.apiUrl';

export async function loadStoredApiUrl() {
  const storedValue =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(API_CONFIG_KEY) ?? null
      : await SecureStore.getItemAsync(API_CONFIG_KEY);

  return storedValue;
}

export async function saveStoredApiUrl(apiUrl: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(API_CONFIG_KEY, apiUrl);
    return;
  }

  await SecureStore.setItemAsync(API_CONFIG_KEY, apiUrl);
}

export async function clearStoredApiUrl() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(API_CONFIG_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(API_CONFIG_KEY);
}
