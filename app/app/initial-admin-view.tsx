import { CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Muted, Screen } from './components';
import { apiRequest } from './lib/api';
import { APP_NAME, APP_SUBTITLE } from './lib/branding';
import { colors, spacing } from './theme';

const successColor = '#047857';

type InitialAdminViewProps = {
  onCreated: () => void;
};

export function InitialAdminView({ onCreated }: InitialAdminViewProps) {
  const router = useRouter();
  const [email, setEmail] = useState('admin@choninovet.local');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreateAdmin() {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Ingresa el email administrador.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSaving(true);

    try {
      await apiRequest('/setup/admin', {
        method: 'POST',
        body: {
          email: email.trim(),
          password,
        },
      });

      setPassword('');
      setConfirmPassword('');
      setSuccess('Administrador inicial creado correctamente.');
      onCreated();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo crear el administrador inicial.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <ShieldCheck color={colors.primaryDark} size={34} strokeWidth={2.4} />
        </View>
        <Text style={styles.kicker}>{APP_NAME}</Text>
        <Text style={styles.title}>Crear administrador inicial</Text>
        <Text style={styles.subtitle}>{APP_SUBTITLE}</Text>
        <Text style={styles.body}>
          Esta instalación todavía no tiene una cuenta administradora. Crea la primera
          cuenta para poder operar el sistema.
        </Text>
      </View>

      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Cuenta administradora</Text>
        <Muted>Este paso se hace una sola vez al iniciar una instalación nueva.</Muted>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email administrador"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Contraseña min. 8 caracteres"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            onChangeText={setConfirmPassword}
            placeholder="Repetir contraseña"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {success ? (
          <View style={styles.successBox}>
            <CheckCircle2 color={successColor} size={19} strokeWidth={2.4} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={isSaving}
          onPress={handleCreateAdmin}
          style={[styles.primaryButton, isSaving && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {isSaving ? 'Creando administrador...' : 'Crear administrador'}
          </Text>
        </Pressable>

        {success ? (
          <Pressable
            onPress={() => router.replace('/login?role=ADMIN')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Ingresar como administrador</Text>
          </Pressable>
        ) : null}
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
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
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
});
