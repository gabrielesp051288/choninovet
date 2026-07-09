import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Card, Screen } from './components';
import { ServerConfigView } from './server-config-view';
import { useApiConfigStore } from './stores/api-config-store';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

export default function RegisterScreen() {
  const apiUrl = useApiConfigStore((state) => state.apiUrl);
  const isApiConfigHydrated = useApiConfigStore((state) => state.isHydrated);
  const registerOwner = useAuthStore((state) => state.registerOwner);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  if (isApiConfigHydrated && !apiUrl) {
    return <ServerConfigView />;
  }

  async function handleRegister() {
    setSuccess(null);
    try {
      const response = await registerOwner({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });

      setSuccess(response.message);
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
    } catch {
      setSuccess(null);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Crear cuenta de propietario</Text>
        <Text style={styles.description}>
          Tu cuenta quedara pendiente hasta que administracion la apruebe.
        </Text>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Contrasena min. 8 caracteres"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            onChangeText={setFirstName}
            placeholder="Nombre"
            style={styles.input}
            value={firstName}
          />
          <TextInput
            onChangeText={setLastName}
            placeholder="Apellido"
            style={styles.input}
            value={lastName}
          />
          <TextInput
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="Telefono opcional"
            style={styles.input}
            value={phone}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable
          disabled={isLoading}
          onPress={handleRegister}
          style={[styles.button, isLoading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creando...' : 'Crear cuenta'}
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
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
});
