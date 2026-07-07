import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Muted, Screen, SectionTitle } from '../components';
import { useCreatePet } from '../hooks/use-pets';
import { useRequireRole } from '../lib/auth-routing';
import { parseDisplayDateToIso } from '../lib/dates';
import { colors, spacing } from '../theme';

type PetSex = 'MALE' | 'FEMALE' | 'UNKNOWN';

const sexOptions: Array<{ label: string; value: PetSex }> = [
  { label: 'Macho', value: 'MALE' },
  { label: 'Hembra', value: 'FEMALE' },
  { label: 'Sin dato', value: 'UNKNOWN' },
];

export default function NewPetScreen() {
  const router = useRouter();
  const { isAllowed } = useRequireRole(['OWNER']);
  const createPet = useCreatePet();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<PetSex>('UNKNOWN');
  const [birthDate, setBirthDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);

    if (!name.trim() || !species.trim()) {
      setFormError('Nombre y especie son obligatorios.');
      return;
    }

    const parsedWeight = weightKg.trim() ? Number(weightKg.replace(',', '.')) : undefined;

    if (parsedWeight !== undefined && Number.isNaN(parsedWeight)) {
      setFormError('El peso debe ser un numero valido.');
      return;
    }

    const parsedBirthDate = birthDate.trim()
      ? parseDisplayDateToIso(birthDate)
      : undefined;

    if (birthDate.trim() && !parsedBirthDate) {
      setFormError('La fecha de nacimiento debe tener formato DD-MM-AAAA.');
      return;
    }

    await createPet.mutateAsync({
      name: name.trim(),
      species: species.trim(),
      breed: breed.trim() || undefined,
      sex,
      birthDate: parsedBirthDate ?? undefined,
      weightKg: parsedWeight,
      notes: notes.trim() || undefined,
    });

    router.replace('/owner');
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso propietario requerido</SectionTitle>
          <Muted>Inicia sesion como propietario para registrar mascotas.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <SectionTitle>Nueva mascota</SectionTitle>
        <Muted>Registra la ficha basica para empezar a gestionar salud y turnos.</Muted>

        <View style={styles.form}>
          <TextInput
            onChangeText={setName}
            placeholder="Nombre"
            style={styles.input}
            value={name}
          />
          <TextInput
            onChangeText={setSpecies}
            placeholder="Especie"
            style={styles.input}
            value={species}
          />
          <TextInput
            onChangeText={setBreed}
            placeholder="Raza opcional"
            style={styles.input}
            value={breed}
          />

          <View style={styles.segment}>
            {sexOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSex(option.value)}
                style={[styles.segmentButton, sex === option.value && styles.segmentActive]}
              >
                <Text style={styles.segmentText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            keyboardType="numbers-and-punctuation"
            onChangeText={setBirthDate}
            placeholder="Fecha nacimiento opcional DD-MM-AAAA"
            style={styles.input}
            value={birthDate}
          />
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setWeightKg}
            placeholder="Peso kg opcional"
            style={styles.input}
            value={weightKg}
          />
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Notas opcionales"
            style={[styles.input, styles.textArea]}
            value={notes}
          />
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {createPet.error ? (
          <Text style={styles.error}>
            {createPet.error instanceof Error
              ? createPet.error.message
              : 'No se pudo crear la mascota.'}
          </Text>
        ) : null}

        <Pressable
          disabled={createPet.isPending}
          onPress={handleSubmit}
          style={[styles.button, createPet.isPending && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {createPet.isPending ? 'Guardando...' : 'Guardar mascota'}
          </Text>
        </Pressable>
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
  textArea: {
    minHeight: 92,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  segment: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
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
