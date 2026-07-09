import { CheckCircle2, Database, ServerCog } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Muted, Screen } from './components';
import { APP_NAME, APP_SUBTITLE } from './lib/branding';
import { useApiConfigStore } from './stores/api-config-store';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

const successColor = '#047857';

type ServerConfigViewProps = {
  canGoBack?: boolean;
};

export function ServerConfigView({ canGoBack = false }: ServerConfigViewProps) {
  const router = useRouter();
  const apiUrl = useApiConfigStore((state) => state.apiUrl);
  const fallbackApiUrl = useApiConfigStore((state) => state.fallbackApiUrl);
  const saveApiUrl = useApiConfigStore((state) => state.saveApiUrl);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useApiConfigStore((state) => state.isLoading);
  const error = useApiConfigStore((state) => state.error);
  const [inputValue, setInputValue] = useState(apiUrl ?? fallbackApiUrl);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSave() {
    setSuccessMessage(null);

    try {
      const previousApiUrl = apiUrl;
      await saveApiUrl(inputValue);
      const nextApiUrl = useApiConfigStore.getState().apiUrl;
      const shouldCloseSession = Boolean(
        canGoBack && previousApiUrl && nextApiUrl && previousApiUrl !== nextApiUrl,
      );

      if (shouldCloseSession) {
        logout();
        router.replace('/');
        return;
      }

      setSuccessMessage('Servidor conectado correctamente');

      if (!canGoBack) {
        router.replace('/');
      }
    } catch {
      setSuccessMessage(null);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <ServerCog color={colors.primaryDark} size={34} strokeWidth={2.4} />
        </View>
        <Text style={styles.kicker}>{APP_NAME}</Text>
        <Text style={styles.title}>Configurar servidor</Text>
        <Text style={styles.subtitle}>{APP_SUBTITLE}</Text>
        <Text style={styles.body}>
          Indica la URL de la API del negocio para conectar esta app con su propia base de
          datos.
        </Text>
      </View>

      <Card style={styles.formCard}>
        <View style={styles.formHeader}>
          <Database color={colors.primaryDark} size={24} strokeWidth={2.4} />
          <View style={styles.formHeaderText}>
            <Text style={styles.formTitle}>Servidor API</Text>
            <Muted>Ejemplo: http://192.168.1.50:3000/api</Muted>
          </View>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={setInputValue}
          placeholder="http://localhost:3000/api"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={inputValue}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {successMessage ? (
          <View style={styles.successBox}>
            <CheckCircle2 color={successColor} size={19} strokeWidth={2.4} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={isLoading}
          onPress={handleSave}
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Validando servidor...' : 'Validar y guardar'}
          </Text>
        </Pressable>

        {canGoBack ? (
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </Pressable>
        ) : null}
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Importante</Text>
        <Muted>
          La app no guarda credenciales MySQL. Solo guarda la URL de la API. La conexión con
          MySQL se configura en el servidor donde corre el backend.
        </Muted>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  subtitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  formCard: {
    gap: spacing.md,
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formHeaderText: {
    flex: 1,
    gap: 2,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  successText: {
    color: successColor,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  infoCard: {
    backgroundColor: colors.surfaceAlt,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
});
