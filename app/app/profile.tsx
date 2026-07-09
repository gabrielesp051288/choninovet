import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Building2, UserRound } from 'lucide-react-native';
import { Card, Muted, Screen, SectionTitle, SessionMenu } from './components';
import { useRequireRole } from './lib/auth-routing';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

export default function ProfileScreen() {
  const { isAllowed } = useRequireRole(['OWNER', 'VET']);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (user?.ownerProfile) {
      setFirstName(user.ownerProfile.firstName);
      setLastName(user.ownerProfile.lastName);
      setPhone(user.ownerProfile.phone ?? '');
    }

    if (user?.vetProfile) {
      setClinicName(user.vetProfile.clinicName);
      setManagerName(user.vetProfile.managerName ?? '');
      setPhone(user.vetProfile.phone ?? '');
      setAddress(user.vetProfile.address ?? '');
      setDescription(user.vetProfile.description ?? '');
    }
  }, [user]);

  async function handleSave() {
    setStatus(null);
    setIsError(false);

    if (user?.role === 'OWNER' && (!firstName.trim() || !lastName.trim())) {
      setStatus('Nombre y apellido son obligatorios.');
      setIsError(true);
      return;
    }

    if (user?.role === 'VET' && !clinicName.trim()) {
      setStatus('El nombre profesional o de la clínica es obligatorio.');
      setIsError(true);
      return;
    }

    try {
      if (user?.role === 'OWNER') {
        await updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        });
      }

      if (user?.role === 'VET') {
        await updateProfile({
          clinicName: clinicName.trim(),
          managerName: managerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          description: description.trim(),
        });
      }

      setStatus('Perfil actualizado correctamente.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
      setIsError(true);
    }
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso requerido</SectionTitle>
          <Muted>Inicia sesión como propietario o veterinario/a para editar tu perfil.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Perfil</Text>
          <Text style={styles.title}>
            {user?.role === 'VET' ? 'Datos profesionales' : 'Datos personales'}
          </Text>
          <Muted>Actualiza la informacion visible dentro del sistema.</Muted>
        </View>
        <SessionMenu />
      </View>

      <Card>
        <View style={styles.cardTitleRow}>
          <View style={styles.iconCircle}>
            {user?.role === 'VET' ? (
              <Building2 color={colors.primaryDark} size={24} strokeWidth={2.4} />
            ) : (
              <UserRound color={colors.primaryDark} size={24} strokeWidth={2.4} />
            )}
          </View>
          <View style={styles.cardTitleText}>
            <SectionTitle>{user?.role === 'VET' ? 'Veterinario/a' : 'Propietario'}</SectionTitle>
            <Muted>{user?.email}</Muted>
          </View>
        </View>

        {user?.role === 'OWNER' ? (
          <View style={styles.form}>
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
              placeholder="Telefono"
              style={styles.input}
              value={phone}
            />
          </View>
        ) : null}

        {user?.role === 'VET' ? (
          <View style={styles.form}>
            <TextInput
              onChangeText={setClinicName}
              placeholder="Nombre profesional o clínica"
              style={styles.input}
              value={clinicName}
            />
            <TextInput
              onChangeText={setManagerName}
              placeholder="Responsable"
              style={styles.input}
              value={managerName}
            />
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="Telefono"
              style={styles.input}
              value={phone}
            />
            <TextInput
              onChangeText={setAddress}
              placeholder="Direccion"
              style={styles.input}
              value={address}
            />
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Descripción profesional o de la clínica"
              style={[styles.input, styles.textArea]}
              value={description}
            />
          </View>
        ) : null}

        {status ? (
          <Text style={[styles.status, isError && styles.statusError]}>{status}</Text>
        ) : null}

        <Pressable
          disabled={isLoading}
          onPress={handleSave}
          style={[styles.button, isLoading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{isLoading ? 'Guardando...' : 'Guardar perfil'}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    elevation: 20,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1000,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardTitleText: {
    flex: 1,
    gap: 2,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
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
  textArea: {
    minHeight: 96,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  status: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  statusError: {
    color: colors.danger,
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
