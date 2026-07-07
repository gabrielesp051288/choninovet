import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Card, Muted, Screen, SectionTitle } from './components';
import { apiRequest } from './lib/api';
import { colors, spacing } from './theme';

type RequestResetResponse = {
  message: string;
  devResetToken?: string;
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      setToken(response.devResetToken ?? '');
      setSuccess(
        response.devResetToken
          ? 'Token generado para desarrollo.'
          : response.message,
      );
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
      await apiRequest('/auth/password-reset/confirm', {
        method: 'POST',
        body: {
          token: token.trim(),
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
          En este MVP se genera un token de recuperacion para desarrollo local.
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
              {isRequesting ? 'Generando...' : 'Generar token'}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <SectionTitle>Cambiar contrasena</SectionTitle>
        <View style={styles.form}>
          <TextInput
            multiline
            onChangeText={setToken}
            placeholder="Token"
            style={[styles.input, styles.tokenInput]}
            value={token}
          />
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
  tokenInput: {
    minHeight: 92,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
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
