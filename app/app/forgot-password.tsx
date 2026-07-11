import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Card, Muted, Screen, SectionTitle } from './components';
import { apiRequest } from './lib/api';
import { ServerConfigView } from './server-config-view';
import { useApiConfigStore } from './stores/api-config-store';
import { colors, spacing } from './theme';

type RequestResetResponse = {
  message: string;
};

export default function ForgotPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const apiUrl = useApiConfigStore((state) => state.apiUrl);
  const isApiConfigHydrated = useApiConfigStore((state) => state.isHydrated);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const resetToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (isApiConfigHydrated && !apiUrl) {
    return <ServerConfigView />;
  }

  async function handleRequestReset() {
    setError(null);
    setSuccess(null);
    setIsRequesting(true);

    try {
      const response = await apiRequest<RequestResetResponse>(
        '/auth/password-reset/request',
        {
          method: 'POST',
          body: { email: email.trim() },
        },
      );

      setSuccess(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo solicitar recuperacion.',
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleConfirmReset() {
    setError(null);
    setSuccess(null);
    setIsConfirming(true);

    try {
      if (!resetToken) {
        setError('El enlace de recuperacion no tiene token o esta incompleto.');
        return;
      }

      await apiRequest('/auth/password-reset/confirm', {
        method: 'POST',
        body: {
          token: resetToken,
          newPassword,
        },
      });

      setSuccess('Contrasena actualizada. Ya podes iniciar sesion.');
      setNewPassword('');
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'No se pudo cambiar la contrasena.',
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Screen>
      <Card>
        <SectionTitle>Recuperar contrasena</SectionTitle>
        <Muted>
          Ingresa tu email y te enviaremos un enlace para crear una nueva contrasena.
        </Muted>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            value={email}
          />
          <Pressable
            disabled={isRequesting}
            onPress={handleRequestReset}
            style={[styles.button, isRequesting && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isRequesting ? 'Enviando...' : 'Enviar enlace'}
            </Text>
          </Pressable>
        </View>
      </Card>

      {resetToken ? (
      <Card>
        <SectionTitle>Cambiar contrasena</SectionTitle>
        <View style={styles.form}>
          <TextInput
            onChangeText={setNewPassword}
            placeholder="Nueva contrasena min. 8 caracteres"
            secureTextEntry
            style={styles.input}
            value={newPassword}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable
          disabled={isConfirming}
          onPress={handleConfirmReset}
          style={[styles.button, isConfirming && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {isConfirming ? 'Actualizando...' : 'Actualizar contrasena'}
          </Text>
        </Pressable>

        <ActionLink href="/" secondary>
          Volver al inicio
        </ActionLink>
      </Card>
      ) : (
        <Card>
          <SectionTitle>Revisa tu email</SectionTitle>
          <Muted>
            Cuando abras el enlace de recuperacion desde el email, aca vas a poder
            crear una nueva contrasena.
          </Muted>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <ActionLink href="/" secondary>
            Volver al inicio
          </ActionLink>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  success: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
});
