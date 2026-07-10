import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Badge, Card, Muted, Screen, SectionTitle } from '../components';
import { CalendarDatePicker } from '../date-picker';
import {
  useCreateMedicalRecord,
  useMedicalRecords,
  type MedicalRecordType,
} from '../hooks/use-medical-records';
import { usePet, useUpdatePet, useUploadPetPhoto } from '../hooks/use-pets';
import { buildApiAssetUrl } from '../lib/api';
import { useRequireRole } from '../lib/auth-routing';
import { formatDateOnly, parseDisplayDateToIso, todayDisplayDate } from '../lib/dates';
import { medicalRecordTypeLabel, petSexLabel } from '../lib/labels';
import type { PetSex } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';
import { colors, spacing } from '../theme';

const recordTypes: Array<{ label: string; value: MedicalRecordType }> = [
  { label: 'Consulta', value: 'CONSULTATION' },
  { label: 'Vacuna', value: 'VACCINE' },
  { label: 'Desparas.', value: 'DEWORMING' },
  { label: 'Tratam.', value: 'TREATMENT' },
  { label: 'Obs.', value: 'OBSERVATION' },
];

const sexOptions: Array<{ label: string; value: PetSex }> = [
  { label: 'Macho', value: 'MALE' },
  { label: 'Hembra', value: 'FEMALE' },
  { label: 'Sin dato', value: 'UNKNOWN' },
];

export default function PetDetailScreen() {
  const { isAllowed } = useRequireRole(['OWNER', 'VET', 'ADMIN']);
  const user = useAuthStore((state) => state.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const petQuery = usePet(id);
  const recordsQuery = useMedicalRecords(id);
  const createRecord = useCreateMedicalRecord(id);
  const updatePet = useUpdatePet();
  const uploadPetPhoto = useUploadPetPhoto();
  const pet = petQuery.data;
  const petPhotoUrl = buildApiAssetUrl(pet?.photoUrl);
  const [type, setType] = useState<MedicalRecordType>('CONSULTATION');
  const [recordDate, setRecordDate] = useState(todayDisplayDate());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nextCheckAt, setNextCheckAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecies, setEditSpecies] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editSex, setEditSex] = useState<PetSex>('UNKNOWN');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!pet) {
      return;
    }

    setEditName(pet.name);
    setEditSpecies(pet.species);
    setEditBreed(pet.breed ?? '');
    setEditSex(pet.sex);
    setEditBirthDate(pet.birthDate ? formatDateOnly(pet.birthDate) : '');
    setEditWeightKg(pet.weightKg ? String(pet.weightKg) : '');
    setEditNotes(pet.notes ?? '');
  }, [pet]);

  async function handleCreateRecord() {
    setFormError(null);

    if (!id || !title.trim() || !description.trim() || !recordDate.trim()) {
      setFormError('Fecha, titulo y descripcion son obligatorios.');
      return;
    }

    const parsedRecordDate = parseDisplayDateToIso(recordDate);
    const parsedNextCheckAt = nextCheckAt.trim()
      ? parseDisplayDateToIso(nextCheckAt)
      : undefined;

    if (!parsedRecordDate) {
      setFormError('La fecha debe tener formato DD-MM-AAAA.');
      return;
    }

    if (nextCheckAt.trim() && !parsedNextCheckAt) {
      setFormError('El proximo control debe tener formato DD-MM-AAAA.');
      return;
    }

    await createRecord.mutateAsync({
      petId: id,
      type,
      recordDate: parsedRecordDate,
      title: title.trim(),
      description: description.trim(),
      nextCheckAt: parsedNextCheckAt ?? undefined,
    });

    setTitle('');
    setDescription('');
    setNextCheckAt('');
  }

  async function handleUpdatePet() {
    if (!id) {
      return;
    }

    setEditError(null);
    setEditSuccess(null);

    if (!editName.trim() || !editSpecies.trim()) {
      setEditError('Nombre y especie son obligatorios.');
      return;
    }

    const parsedBirthDate = editBirthDate.trim()
      ? parseDisplayDateToIso(editBirthDate)
      : undefined;
    const parsedWeight = editWeightKg.trim()
      ? Number(editWeightKg.replace(',', '.'))
      : undefined;

    if (editBirthDate.trim() && !parsedBirthDate) {
      setEditError('La fecha de nacimiento debe tener formato DD-MM-AAAA.');
      return;
    }

    if (parsedWeight !== undefined && Number.isNaN(parsedWeight)) {
      setEditError('El peso debe ser un numero valido.');
      return;
    }

    await updatePet.mutateAsync({
      petId: id,
      name: editName.trim(),
      species: editSpecies.trim(),
      breed: editBreed.trim() || undefined,
      sex: editSex,
      birthDate: parsedBirthDate ?? undefined,
      weightKg: parsedWeight,
      notes: editNotes.trim() || undefined,
    });
    setEditSuccess('Mascota actualizada correctamente.');
  }

  async function handlePickPhoto() {
    if (!id) {
      return;
    }

    setEditError(null);
    setEditSuccess(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `pet-${id}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    await uploadPetPhoto.mutateAsync({
      petId: id,
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    });

    setEditSuccess('Foto de mascota actualizada correctamente.');
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso requerido</SectionTitle>
          <Muted>Inicia sesion para ver fichas de mascotas.</Muted>
        </Card>
      </Screen>
    );
  }

  if (petQuery.isLoading) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Ficha de mascota</SectionTitle>
          <Muted>Cargando mascota...</Muted>
        </Card>
      </Screen>
    );
  }

  if (petQuery.error || !pet) {
    return (
      <Screen>
        <Card>
          <SectionTitle>No se pudo cargar la mascota</SectionTitle>
          <Muted>Verifica que tengas acceso a esta ficha.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <View style={styles.petHeader}>
          {petPhotoUrl ? (
            <Image source={{ uri: petPhotoUrl }} style={styles.petPhoto} />
          ) : (
            <View style={styles.petPhotoPlaceholder}>
              <Text style={styles.petPhotoPlaceholderText}>{pet.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.petHeaderText}>
            <Text style={styles.name}>{pet.name}</Text>
            <Muted>
              {pet.species}
              {pet.breed ? ` - ${pet.breed}` : ''}
              {pet.weightKg ? ` - ${pet.weightKg} kg` : ''}
            </Muted>
            <Badge>{petSexLabel(pet.sex)}</Badge>
          </View>
        </View>
        {pet.birthDate ? <Muted>Nacimiento: {formatDateOnly(pet.birthDate)}</Muted> : null}
        {pet.notes ? <Text style={styles.description}>{pet.notes}</Text> : null}

        {user?.role === 'OWNER' || user?.role === 'ADMIN' ? (
          <>
            {uploadPetPhoto.error ? (
              <Text style={styles.error}>
                {uploadPetPhoto.error instanceof Error
                  ? uploadPetPhoto.error.message
                  : 'No se pudo subir la foto.'}
              </Text>
            ) : null}
            <Pressable
              disabled={uploadPetPhoto.isPending}
              onPress={handlePickPhoto}
              style={[styles.secondaryButton, uploadPetPhoto.isPending && styles.buttonDisabled]}
            >
              <Text style={styles.secondaryButtonText}>
                {uploadPetPhoto.isPending ? 'Subiendo foto...' : 'Cambiar foto'}
              </Text>
            </Pressable>
          </>
        ) : null}
      </Card>

      {user?.role === 'OWNER' || user?.role === 'ADMIN' ? (
        <Card>
          <SectionTitle>Editar mascota</SectionTitle>
          <View style={styles.form}>
            <TextInput
              onChangeText={setEditName}
              placeholder="Nombre"
              style={styles.input}
              value={editName}
            />
            <TextInput
              onChangeText={setEditSpecies}
              placeholder="Especie"
              style={styles.input}
              value={editSpecies}
            />
            <TextInput
              onChangeText={setEditBreed}
              placeholder="Raza opcional"
              style={styles.input}
              value={editBreed}
            />
            <View style={styles.segment}>
              {sexOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setEditSex(option.value)}
                  style={[styles.segmentButton, editSex === option.value && styles.segmentActive]}
                >
                  <Text style={styles.segmentText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              keyboardType="numbers-and-punctuation"
              onChangeText={setEditBirthDate}
              placeholder="Nacimiento opcional DD-MM-AAAA"
              style={styles.input}
              value={editBirthDate}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setEditWeightKg}
              placeholder="Peso kg opcional"
              style={styles.input}
              value={editWeightKg}
            />
            <TextInput
              multiline
              onChangeText={setEditNotes}
              placeholder="Notas opcionales"
              style={[styles.input, styles.textArea]}
              value={editNotes}
            />
          </View>

          {editError ? <Text style={styles.error}>{editError}</Text> : null}
          {editSuccess ? <Text style={styles.success}>{editSuccess}</Text> : null}
          {updatePet.error ? (
            <Text style={styles.error}>
              {updatePet.error instanceof Error
                ? updatePet.error.message
                : 'No se pudo actualizar la mascota.'}
            </Text>
          ) : null}

          <Pressable
            disabled={updatePet.isPending}
            onPress={handleUpdatePet}
            style={[styles.button, updatePet.isPending && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {updatePet.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Historial medico</SectionTitle>
        {recordsQuery.isLoading ? <Muted>Cargando historial...</Muted> : null}
        {recordsQuery.error ? <Muted>No se pudo cargar el historial medico.</Muted> : null}
        {recordsQuery.data?.length === 0 ? (
          <Muted>Esta mascota todavia no tiene registros medicos.</Muted>
        ) : null}
        {recordsQuery.data?.map((record) => (
          <View key={record.id} style={styles.record}>
            <Text style={styles.recordTitle}>{record.title}</Text>
            <Muted>
              {medicalRecordTypeLabel(record.type)} - {formatDateOnly(record.recordDate)}
              {record.vet?.clinicName ? ` - ${record.vet.clinicName}` : ''}
            </Muted>
            <Text style={styles.description}>{record.description}</Text>
            {record.nextCheckAt ? (
              <Muted>Proximo control: {formatDateOnly(record.nextCheckAt)}</Muted>
            ) : null}
          </View>
        ))}
      </Card>

      {user?.role === 'VET' ? (
        <Card>
          <SectionTitle>Cargar registro medico</SectionTitle>
          <View style={styles.segment}>
            {recordTypes.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setType(option.value)}
                style={[styles.segmentButton, type === option.value && styles.segmentActive]}
              >
                <Text style={styles.segmentText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <CalendarDatePicker label="Fecha del registro" onChange={setRecordDate} value={recordDate} />
            <TextInput
              onChangeText={setTitle}
              placeholder="Titulo"
              style={styles.input}
              value={title}
            />
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Descripcion"
              style={[styles.input, styles.textArea]}
              value={description}
            />
            <CalendarDatePicker
              label="Proximo control"
              optional
              onChange={setNextCheckAt}
              value={nextCheckAt}
            />
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {createRecord.error ? (
            <Text style={styles.error}>
              {createRecord.error instanceof Error
                ? createRecord.error.message
                : 'No se pudo cargar el registro.'}
            </Text>
          ) : null}

          <Pressable
            disabled={createRecord.isPending}
            onPress={handleCreateRecord}
            style={[styles.button, createRecord.isPending && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {createRecord.isPending ? 'Guardando...' : 'Guardar registro'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <ActionLink href="/appointments">Gestionar turno</ActionLink>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  petHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  petHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  petPhoto: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 96,
    width: 96,
  },
  petPhotoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  petPhotoPlaceholderText: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '900',
  },
  record: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  recordTitle: {
    color: colors.text,
    fontSize: 16,
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
  textArea: {
    minHeight: 92,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  segment: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flexGrow: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
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
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
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
