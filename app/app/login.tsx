import { useLocalSearchParams, useRouter } from 'expo-router';
import { PawPrint, ShieldCheck, Stethoscope } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Card, Screen } from './components';
import { routeForRole } from './lib/auth-routing';
import { useAuthStore, type UserRole } from './stores/auth-store';
import { colors, spacing } from './theme';

type RoleIconKind = 'owner' | 'vet' | 'admin';

const roles: Array<{
  label: string;
  description: string;
  icon: RoleIconKind;
  value: UserRole;
}> = [
  {
    label: 'Propietario',
    description: 'Mascotas, turnos, historial y mensajes',
    icon: 'owner',
    value: 'OWNER',
  },
  {
    label: 'Veterinaria',
    description: 'Pacientes, agenda, recordatorios y salud',
    icon: 'vet',
    value: 'VET',
  },
  {
    label: 'Admin',
    description: 'Panel operativo y alta de veterinarias',
    icon: 'admin',
    value: 'ADMIN',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: UserRole }>();
  const requestedRole =
    params.role && roles.some((role) => role.value === params.role)
      ? params.role
      : null;
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const setError = useAuthStore((state) => state.setError);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [manualRole, setManualRole] = useState<UserRole>('OWNER');
  const selectedRole = requestedRole ?? manualRole;
  const selectedRoleConfig =
    roles.find((role) => role.value === selectedRole) ?? roles[0];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    try {
      const user = await login(email.trim(), password);

      if (user.role !== selectedRole) {
        logout();
        setError(`Esta cuenta no pertenece al rol ${selectedRole}`);
        return;
      }

      router.replace(routeForRole(user.role));
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Card>
        <View style={styles.loginHeader}>
          <View style={styles.roleIconCircle}>
            <RoleIcon kind={selectedRoleConfig.icon} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Acceso {selectedRoleConfig.label}</Text>
            <Text style={styles.description}>
              Ingresa con una cuenta de {selectedRoleConfig.label.toLowerCase()}.
            </Text>
          </View>
        </View>

        {!requestedRole ? (
          <View style={styles.roleGrid}>
            {roles.map((role) => (
              <Pressable
                key={role.value}
                onPress={() => {
                  setManualRole(role.value);
                  setError(null);
                }}
                style={[
                  styles.roleCard,
                  selectedRole === role.value && styles.roleCardActive,
                ]}
              >
                <View style={styles.roleIconCircle}>
                  <RoleIcon kind={role.icon} />
                </View>
                <View style={styles.roleText}>
                  <Text style={styles.roleTitle}>{role.label}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

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
            placeholder="Contraseña"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={isLoading}
          onPress={handleLogin}
          style={[styles.button, isLoading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </Pressable>
        {selectedRole === 'OWNER' ? (
          <ActionLink href="/register" secondary>
            Crear cuenta de propietario
          </ActionLink>
        ) : selectedRole === 'VET' ? (
          <Text style={styles.note}>
            Las cuentas de veterinaria son creadas desde administracion.
          </Text>
        ) : (
          <Text style={styles.note}>
            Las cuentas administrador no se crean desde la app publica.
          </Text>
        )}
        <ActionLink href="/forgot-password" secondary>
          Olvide mi contrasena
        </ActionLink>
        {requestedRole ? (
          <ActionLink href="/" secondary>
            Volver a elegir acceso
          </ActionLink>
        ) : null}
      </Card>
    </Screen>
  );
}

function RoleIcon({ kind }: { kind: RoleIconKind }) {
  if (kind === 'owner') {
    return <PawPrint color={colors.primaryDark} size={28} strokeWidth={2.4} />;
  }

  if (kind === 'vet') {
    return <Stethoscope color={colors.primaryDark} size={29} strokeWidth={2.4} />;
  }

  return <ShieldCheck color={colors.primaryDark} size={29} strokeWidth={2.4} />;
}

const styles = StyleSheet.create({
  loginHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
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
  roleGrid: {
    gap: spacing.sm,
  },
  roleCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 86,
    padding: spacing.md,
  },
  roleCardActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  roleIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  roleText: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  roleTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  roleDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
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
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
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
