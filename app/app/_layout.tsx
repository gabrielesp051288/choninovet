import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useApiConfigStore } from './stores/api-config-store';
import { useAuthStore } from './stores/auth-store';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const hydrateApiConfig = useApiConfigStore((state) => state.hydrateApiConfig);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);

  useEffect(() => {
    void hydrateApiConfig();
    void hydrateSession();
  }, [hydrateApiConfig, hydrateSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { color: '#10201b', fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f4f7f6' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="owner-app" options={{ headerShown: false }} />
        <Stack.Screen name="vet-app" options={{ headerShown: false }} />
        <Stack.Screen name="server-config" options={{ title: 'Servidor' }} />
        <Stack.Screen name="login" options={{ title: 'Acceso' }} />
        <Stack.Screen name="register" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Recuperar contrasena' }} />
        <Stack.Screen name="owner" options={{ title: 'Propietario' }} />
        <Stack.Screen name="vet" options={{ title: 'Veterinario/a' }} />
        <Stack.Screen name="vet-patients" options={{ title: 'Pacientes' }} />
        <Stack.Screen name="admin" options={{ title: 'Administrador' }} />
        <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
        <Stack.Screen name="pet/[id]" options={{ title: 'Ficha de mascota' }} />
        <Stack.Screen name="pets/new" options={{ title: 'Nueva mascota' }} />
        <Stack.Screen name="appointments" options={{ title: 'Turnos' }} />
        <Stack.Screen name="reminders" options={{ title: 'Recordatorios' }} />
        <Stack.Screen name="messages" options={{ title: 'Mensajes' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notificaciones' }} />
      </Stack>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
