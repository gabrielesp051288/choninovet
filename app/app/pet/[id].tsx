import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  ClipboardPlus,
  Eye,
  FileDown,
  FileText,
  Paperclip,
  Pencil,
  Pill,
  PlusCircle,
  Printer,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Badge, Card, Muted, Screen, SectionTitle } from '../components';
import { CalendarDatePicker } from '../date-picker';
import {
  useCreateMedicalRecord,
  useMedicalRecords,
  useUpdateMedicalRecord,
  type MedicalRecordType,
} from '../hooks/use-medical-records';
import { usePet, useUpdatePet, useUploadPetPhoto } from '../hooks/use-pets';
import { buildApiAssetUrl } from '../lib/api';
import { useRequireRole } from '../lib/auth-routing';
import { formatDateOnly, parseDisplayDateToIso, todayDisplayDate } from '../lib/dates';
import { medicalRecordTypeLabel, petSexLabel } from '../lib/labels';
import type { MedicalRecord, PetSex } from '../lib/types';
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
  const updateRecord = useUpdateMedicalRecord(id);
  const updatePet = useUpdatePet();
  const uploadPetPhoto = useUploadPetPhoto();
  const pet = petQuery.data;
  const petPhotoUrl = buildApiAssetUrl(pet?.photoUrl);
  const [type, setType] = useState<MedicalRecordType>('CONSULTATION');
  const [recordDate, setRecordDate] = useState(todayDisplayDate());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [consultationReason, setConsultationReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [medication, setMedication] = useState('');
  const [recordWeightKg, setRecordWeightKg] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [ownerVisibleNotes, setOwnerVisibleNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [nextCheckAt, setNextCheckAt] = useState('');
  const [recordFilter, setRecordFilter] = useState<MedicalRecordType | 'ALL'>('ALL');
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
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
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const filteredRecords = useMemo(
    () => records.filter((record) => recordFilter === 'ALL' || record.type === recordFilter),
    [recordFilter, records],
  );
  const nextCheckRecord = useMemo(
    () =>
      records
        .filter((record) => record.nextCheckAt && new Date(record.nextCheckAt) >= new Date())
        .sort(
          (first, second) =>
            new Date(first.nextCheckAt ?? '').getTime() -
            new Date(second.nextCheckAt ?? '').getTime(),
        )[0],
    [records],
  );
  const latestRecord = records[0];
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

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

  async function handleSaveRecord() {
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

    const parsedRecordWeight = recordWeightKg.trim()
      ? Number(recordWeightKg.replace(',', '.'))
      : undefined;
    const parsedTemperature = temperatureC.trim()
      ? Number(temperatureC.replace(',', '.'))
      : undefined;

    if (
      parsedRecordWeight !== undefined &&
      (Number.isNaN(parsedRecordWeight) || parsedRecordWeight < 0)
    ) {
      setFormError('El peso registrado debe ser un numero valido.');
      return;
    }

    if (
      parsedTemperature !== undefined &&
      (Number.isNaN(parsedTemperature) || parsedTemperature < 0)
    ) {
      setFormError('La temperatura debe ser un numero valido.');
      return;
    }

    if (editingRecordId) {
      await updateRecord.mutateAsync({
        recordId: editingRecordId,
        type,
        recordDate: parsedRecordDate,
        title: title.trim(),
        description: description.trim(),
        consultationReason: textOrNull(consultationReason),
        diagnosis: textOrNull(diagnosis),
        treatment: textOrNull(treatment),
        medication: textOrNull(medication),
        weightKg: parsedRecordWeight ?? null,
        temperatureC: parsedTemperature ?? null,
        ownerVisibleNotes: textOrNull(ownerVisibleNotes),
        privateNotes: textOrNull(privateNotes),
        nextCheckAt: parsedNextCheckAt ?? null,
      });
    } else {
      await createRecord.mutateAsync({
        petId: id,
        type,
        recordDate: parsedRecordDate,
        title: title.trim(),
        description: description.trim(),
        consultationReason: textOrUndefined(consultationReason),
        diagnosis: textOrUndefined(diagnosis),
        treatment: textOrUndefined(treatment),
        medication: textOrUndefined(medication),
        weightKg: parsedRecordWeight,
        temperatureC: parsedTemperature,
        ownerVisibleNotes: textOrUndefined(ownerVisibleNotes),
        privateNotes: textOrUndefined(privateNotes),
        nextCheckAt: parsedNextCheckAt ?? undefined,
      });
    }

    resetRecordForm();
  }

  function resetRecordForm() {
    setType('CONSULTATION');
    setRecordDate(todayDisplayDate());
    setTitle('');
    setDescription('');
    setConsultationReason('');
    setDiagnosis('');
    setTreatment('');
    setMedication('');
    setRecordWeightKg('');
    setTemperatureC('');
    setOwnerVisibleNotes('');
    setPrivateNotes('');
    setNextCheckAt('');
    setEditingRecordId(null);
    setFormError(null);
    setIsRecordFormOpen(false);
  }

  function openCreateRecordForm() {
    resetRecordForm();
    setIsRecordFormOpen(true);
  }

  function openEditRecordForm(record: MedicalRecord) {
    setType(record.type);
    setRecordDate(formatDateOnly(record.recordDate));
    setTitle(record.title);
    setDescription(record.description);
    setConsultationReason(record.consultationReason ?? '');
    setDiagnosis(record.diagnosis ?? '');
    setTreatment(record.treatment ?? '');
    setMedication(record.medication ?? '');
    setRecordWeightKg(record.weightKg ? String(record.weightKg) : '');
    setTemperatureC(record.temperatureC ? String(record.temperatureC) : '');
    setOwnerVisibleNotes(record.ownerVisibleNotes ?? '');
    setPrivateNotes(record.privateNotes ?? '');
    setNextCheckAt(record.nextCheckAt ? formatDateOnly(record.nextCheckAt) : '');
    setEditingRecordId(record.id);
    setFormError(null);
    setIsRecordFormOpen(true);
  }

  function openRecordDetail(record: MedicalRecord) {
    setSelectedRecordId(record.id);
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
      file: asset.file,
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
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <SectionTitle>Historial medico</SectionTitle>
            <Muted>Linea clinica de consultas, vacunas, tratamientos y controles.</Muted>
          </View>
          {user?.role === 'VET' ? (
            <Pressable
              onPress={() => (isRecordFormOpen ? resetRecordForm() : openCreateRecordForm())}
              style={styles.iconButton}
            >
              <PlusCircle color={colors.primaryDark} size={22} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.summaryGrid}>
          <RecordSummaryCard
            label="Registros"
            value={String(records.length)}
            helper={records.length === 1 ? 'evento clinico' : 'eventos clinicos'}
            tone="primary"
          />
          <RecordSummaryCard
            label="Ultimo registro"
            value={latestRecord ? formatDateOnly(latestRecord.recordDate) : 'Sin datos'}
            helper={latestRecord ? medicalRecordTypeLabel(latestRecord.type) : 'sin historial'}
            tone="neutral"
          />
          <RecordSummaryCard
            label="Proximo control"
            value={nextCheckRecord?.nextCheckAt ? formatDateOnly(nextCheckRecord.nextCheckAt) : 'Sin fecha'}
            helper={nextCheckRecord?.title ?? 'sin control cargado'}
            tone="warning"
          />
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setRecordFilter('ALL')}
            style={[styles.filterButton, recordFilter === 'ALL' && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, recordFilter === 'ALL' && styles.filterTextActive]}>
              Todos
            </Text>
          </Pressable>
          {recordTypes.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setRecordFilter(option.value)}
              style={[styles.filterButton, recordFilter === option.value && styles.filterButtonActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  recordFilter === option.value && styles.filterTextActive,
                ]}
              >
                {medicalRecordTypeLabel(option.value)}
              </Text>
            </Pressable>
          ))}
        </View>

        {recordsQuery.isLoading ? <Muted>Cargando historial...</Muted> : null}
        {recordsQuery.error ? <Muted>No se pudo cargar el historial medico.</Muted> : null}
        {!recordsQuery.isLoading && records.length === 0 ? (
          <Muted>Esta mascota todavia no tiene registros medicos.</Muted>
        ) : null}
        {!recordsQuery.isLoading && records.length > 0 && filteredRecords.length === 0 ? (
          <Muted>No hay registros para este filtro.</Muted>
        ) : null}
        <View style={styles.timeline}>
          {filteredRecords.map((record) => (
            <RecordTimelineItem
              key={record.id}
              canEdit={user?.role === 'VET'}
              isSelected={selectedRecordId === record.id}
              onEdit={openEditRecordForm}
              onView={openRecordDetail}
              record={record}
            />
          ))}
        </View>
      </Card>

      {selectedRecord ? (
        <MedicalRecordDetailCard
          onClose={() => setSelectedRecordId(null)}
          onEdit={user?.role === 'VET' ? openEditRecordForm : undefined}
          petName={pet.name}
          record={selectedRecord}
          ownerName={pet.owner ? `${pet.owner.firstName} ${pet.owner.lastName}` : 'Sin propietario'}
        />
      ) : null}

      {user?.role === 'VET' && !isRecordFormOpen ? (
        <Pressable onPress={openCreateRecordForm} style={styles.createRecordCard}>
          <View style={styles.createRecordIcon}>
            <ClipboardPlus color={colors.primaryDark} size={24} strokeWidth={2.5} />
          </View>
          <View style={styles.createRecordText}>
            <Text style={styles.createRecordTitle}>Nuevo registro medico</Text>
            <Muted>Cargar consulta, tratamiento, vacuna u observacion.</Muted>
          </View>
        </Pressable>
      ) : null}

      {user?.role === 'VET' && isRecordFormOpen ? (
        <Card>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderText}>
              <SectionTitle>
                {editingRecordId ? 'Editar registro medico' : 'Cargar registro medico'}
              </SectionTitle>
              <Muted>
                {editingRecordId
                  ? 'Actualiza el evento clinico guardado en la ficha.'
                  : 'Completa el evento clinico y guardalo en la ficha.'}
              </Muted>
            </View>
            <Pressable onPress={resetRecordForm} style={styles.cancelPill}>
              <Text style={styles.cancelPillText}>Cancelar</Text>
            </Pressable>
          </View>
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
              placeholder="Descripcion general"
              style={[styles.input, styles.textArea]}
              value={description}
            />
            <TextInput
              multiline
              onChangeText={setConsultationReason}
              placeholder="Motivo de consulta opcional"
              style={[styles.input, styles.textAreaSmall]}
              value={consultationReason}
            />
            <TextInput
              multiline
              onChangeText={setDiagnosis}
              placeholder="Diagnostico opcional"
              style={[styles.input, styles.textAreaSmall]}
              value={diagnosis}
            />
            <TextInput
              multiline
              onChangeText={setTreatment}
              placeholder="Tratamiento indicado opcional"
              style={[styles.input, styles.textAreaSmall]}
              value={treatment}
            />
            <TextInput
              multiline
              onChangeText={setMedication}
              placeholder="Medicacion opcional"
              style={[styles.input, styles.textAreaSmall]}
              value={medication}
            />
            <View style={styles.twoColumnFields}>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setRecordWeightKg}
                placeholder="Peso kg opcional"
                style={[styles.input, styles.compactInput]}
                value={recordWeightKg}
              />
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setTemperatureC}
                placeholder="Temperatura C opcional"
                style={[styles.input, styles.compactInput]}
                value={temperatureC}
              />
            </View>
            <TextInput
              multiline
              onChangeText={setOwnerVisibleNotes}
              placeholder="Indicaciones visibles para propietario opcionales"
              style={[styles.input, styles.textAreaSmall]}
              value={ownerVisibleNotes}
            />
            <TextInput
              multiline
              onChangeText={setPrivateNotes}
              placeholder="Notas privadas del veterinario/a opcionales"
              style={[styles.input, styles.textAreaSmall]}
              value={privateNotes}
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
          {updateRecord.error ? (
            <Text style={styles.error}>
              {updateRecord.error instanceof Error
                ? updateRecord.error.message
                : 'No se pudo actualizar el registro.'}
            </Text>
          ) : null}

          <Pressable
            disabled={createRecord.isPending || updateRecord.isPending}
            onPress={handleSaveRecord}
            style={[
              styles.button,
              (createRecord.isPending || updateRecord.isPending) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {createRecord.isPending || updateRecord.isPending
                ? 'Guardando...'
                : editingRecordId
                  ? 'Guardar cambios'
                  : 'Guardar registro'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <ActionLink href="/appointments">Gestionar turno</ActionLink>
    </Screen>
  );
}

function RecordSummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: 'primary' | 'neutral' | 'warning';
}) {
  return (
    <View style={[styles.summaryCard, summaryToneStyle(tone)]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryHelper} numberOfLines={2}>
        {helper}
      </Text>
    </View>
  );
}

function RecordTimelineItem({
  canEdit,
  isSelected,
  onEdit,
  onView,
  record,
}: {
  canEdit: boolean;
  isSelected: boolean;
  onEdit: (record: MedicalRecord) => void;
  onView: (record: MedicalRecord) => void;
  record: MedicalRecord;
}) {
  const tone = recordToneForType(record.type);

  return (
    <View style={[styles.timelineItem, isSelected && styles.timelineItemSelected]}>
      <View style={[styles.recordIconCircle, { backgroundColor: tone.background }]}>
        <RecordTypeIcon color={tone.color} type={record.type} />
      </View>
      <View style={styles.recordBody}>
        <View style={styles.recordTopRow}>
          <Text style={styles.recordTitle}>{record.title}</Text>
          <Badge>{medicalRecordTypeLabel(record.type)}</Badge>
        </View>
        <Muted>
          {formatDateOnly(record.recordDate)}
          {record.vet?.clinicName ? ` - ${record.vet.clinicName}` : ''}
        </Muted>
        <Text style={styles.description}>{record.description}</Text>
        {record.nextCheckAt ? (
          <View style={styles.nextCheckBox}>
            <CalendarDays color={colors.warning} size={17} strokeWidth={2.4} />
            <Text style={styles.nextCheckText}>
              Proximo control: {formatDateOnly(record.nextCheckAt)}
            </Text>
          </View>
        ) : null}
        <View style={styles.recordActionRow}>
          <Pressable onPress={() => onView(record)} style={styles.recordActionButton}>
            <Eye color={colors.primaryDark} size={16} strokeWidth={2.4} />
            <Text style={styles.recordActionText}>Ver detalle</Text>
          </Pressable>
          {canEdit ? (
            <Pressable onPress={() => onEdit(record)} style={styles.recordActionButton}>
              <Pencil color={colors.primaryDark} size={16} strokeWidth={2.4} />
              <Text style={styles.recordActionText}>Editar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MedicalRecordDetailCard({
  onClose,
  onEdit,
  ownerName,
  petName,
  record,
}: {
  onClose: () => void;
  onEdit?: (record: MedicalRecord) => void;
  ownerName: string;
  petName: string;
  record: MedicalRecord;
}) {
  const tone = recordToneForType(record.type);

  return (
    <Card>
      <View style={styles.detailHeader}>
        <View style={[styles.detailIconCircle, { backgroundColor: tone.background }]}>
          <RecordTypeIcon color={tone.color} type={record.type} />
        </View>
        <View style={styles.detailHeaderText}>
          <Text style={styles.detailKicker}>{medicalRecordTypeLabel(record.type)}</Text>
          <Text style={styles.detailTitle}>{record.title}</Text>
          <Muted>{formatDateOnly(record.recordDate)}</Muted>
        </View>
        <Pressable onPress={onClose} style={styles.cancelPill}>
          <Text style={styles.cancelPillText}>Cerrar</Text>
        </Pressable>
      </View>

      <View style={styles.detailGrid}>
        <DetailField label="Paciente" value={petName} />
        <DetailField label="Propietario" value={ownerName} />
        <DetailField label="Veterinario/a" value={record.vet?.clinicName ?? 'Sin dato'} />
        <DetailField
          label="Peso registrado"
          value={record.weightKg ? `${record.weightKg} kg` : 'Sin dato'}
        />
        <DetailField
          label="Temperatura"
          value={record.temperatureC ? `${record.temperatureC} C` : 'Sin dato'}
        />
        <DetailField
          label="Proximo control"
          value={record.nextCheckAt ? formatDateOnly(record.nextCheckAt) : 'Sin fecha'}
        />
      </View>

      <DetailTextBlock label="Descripcion general" value={record.description} />
      <DetailTextBlock label="Motivo de consulta" value={record.consultationReason} />
      <DetailTextBlock label="Diagnostico" value={record.diagnosis} />
      <DetailTextBlock label="Tratamiento indicado" value={record.treatment} />
      <DetailTextBlock label="Medicacion" value={record.medication} />
      <DetailTextBlock
        label="Indicaciones para propietario"
        value={record.ownerVisibleNotes}
      />
      <DetailTextBlock label="Notas privadas veterinario/a" value={record.privateNotes} />

      <View style={styles.detailActions}>
        {onEdit ? (
          <Pressable onPress={() => onEdit(record)} style={styles.detailActionButton}>
            <Pencil color={colors.primaryDark} size={17} strokeWidth={2.4} />
            <Text style={styles.detailActionText}>Editar</Text>
          </Pressable>
        ) : null}
        <Pressable disabled style={[styles.detailActionButton, styles.disabledAction]}>
          <Printer color={colors.muted} size={17} strokeWidth={2.4} />
          <Text style={[styles.detailActionText, styles.disabledActionText]}>Imprimir</Text>
        </Pressable>
        <Pressable disabled style={[styles.detailActionButton, styles.disabledAction]}>
          <FileDown color={colors.muted} size={17} strokeWidth={2.4} />
          <Text style={[styles.detailActionText, styles.disabledActionText]}>PDF</Text>
        </Pressable>
        <Pressable disabled style={[styles.detailActionButton, styles.disabledAction]}>
          <Paperclip color={colors.muted} size={17} strokeWidth={2.4} />
          <Text style={[styles.detailActionText, styles.disabledActionText]}>Adjuntos</Text>
        </Pressable>
        <Pressable disabled style={[styles.detailActionButton, styles.disabledAction]}>
          <FileText color={colors.muted} size={17} strokeWidth={2.4} />
          <Text style={[styles.detailActionText, styles.disabledActionText]}>Receta</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function DetailTextBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <View style={styles.detailDescriptionBox}>
      <Text style={styles.detailSectionLabel}>{label}</Text>
      <Text style={styles.detailDescription}>{value}</Text>
    </View>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailFieldLabel}>{label}</Text>
      <Text style={styles.detailFieldValue}>{value}</Text>
    </View>
  );
}

function summaryToneStyle(tone: 'primary' | 'neutral' | 'warning') {
  if (tone === 'primary') {
    return styles.primarySummary;
  }

  if (tone === 'warning') {
    return styles.warningSummary;
  }

  return styles.neutralSummary;
}

function RecordTypeIcon({ color, type }: { color: string; type: MedicalRecordType }) {
  if (type === 'VACCINE') {
    return <ShieldCheck color={color} size={21} strokeWidth={2.4} />;
  }

  if (type === 'DEWORMING' || type === 'TREATMENT') {
    return <Pill color={color} size={21} strokeWidth={2.4} />;
  }

  if (type === 'OBSERVATION') {
    return <FileText color={color} size={21} strokeWidth={2.4} />;
  }

  return <Stethoscope color={color} size={21} strokeWidth={2.4} />;
}

function recordToneForType(type: MedicalRecordType) {
  if (type === 'VACCINE') {
    return { background: '#e8f7ef', color: colors.primaryDark };
  }

  if (type === 'DEWORMING') {
    return { background: '#fff4df', color: colors.warning };
  }

  if (type === 'TREATMENT') {
    return { background: '#eef4ff', color: '#2850a7' };
  }

  if (type === 'OBSERVATION') {
    return { background: '#f1f5f9', color: colors.muted };
  }

  return { background: colors.surfaceAlt, color: colors.primaryDark };
}

function textOrUndefined(value: string) {
  return value.trim() || undefined;
}

function textOrNull(value: string) {
  return value.trim() || null;
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
  sectionHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 160,
    flexGrow: 1,
    gap: 3,
    minHeight: 92,
    padding: spacing.sm,
  },
  primarySummary: {
    backgroundColor: '#e8f7ef',
  },
  neutralSummary: {
    backgroundColor: colors.surfaceAlt,
  },
  warningSummary: {
    backgroundColor: '#fff4df',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryHelper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  timeline: {
    gap: spacing.sm,
  },
  timelineItem: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  timelineItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  recordIconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  recordBody: {
    flex: 1,
    gap: spacing.xs,
  },
  recordTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  recordTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  nextCheckBox: {
    alignItems: 'center',
    backgroundColor: '#fff8e8',
    borderColor: '#f1d49a',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  nextCheckText: {
    color: colors.warning,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  recordActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  recordActionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  recordActionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailIconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  detailHeaderText: {
    flex: 1,
    gap: 2,
  },
  detailKicker: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailField: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 180,
    flexGrow: 1,
    gap: 3,
    padding: spacing.sm,
  },
  detailFieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailFieldValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  detailDescriptionBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  detailSectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailDescription: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  detailActionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledAction: {
    opacity: 0.55,
  },
  disabledActionText: {
    color: colors.muted,
  },
  createRecordCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.md,
  },
  createRecordIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  createRecordText: {
    flex: 1,
    gap: 2,
  },
  createRecordTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  cancelPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  cancelPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
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
  textAreaSmall: {
    minHeight: 72,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  twoColumnFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compactInput: {
    flexBasis: 180,
    flexGrow: 1,
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
