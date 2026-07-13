import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import {
  CalendarCheck,
  CalendarDays,
  ClipboardPlus,
  Eye,
  FileDown,
  FileText,
  ListChecks,
  Paperclip,
  Pencil,
  Pill,
  PlusCircle,
  Printer,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionLink, Badge, Card, Muted, Screen, SectionTitle } from '../components';
import { CalendarDatePicker, CompactDateSelector } from '../date-picker';
import {
  useDownloadMedicalAttachment,
  useMedicalAttachments,
  useUploadMedicalAttachment,
} from '../hooks/use-medical-attachments';
import {
  useCreateMedicalRecord,
  useMedicalRecords,
  useUpdateMedicalRecord,
  type MedicalRecordType,
} from '../hooks/use-medical-records';
import { useActiveExtensions } from '../hooks/use-extensions';
import { useAppointments } from '../hooks/use-appointments';
import { usePet, useUpdatePet, useUploadPetPhoto } from '../hooks/use-pets';
import { useCreateVaccination, useVaccinations } from '../hooks/use-vaccinations';
import { buildApiAssetUrl } from '../lib/api';
import { useRequireRole } from '../lib/auth-routing';
import { formatDateOnly, parseDisplayDateToIso, todayDisplayDate } from '../lib/dates';
import {
  hasActiveOwnerPetDetailSection,
  hasActiveVetPetDetailSection,
} from '../lib/extensions';
import { appointmentStatusLabel, medicalRecordTypeLabel, petSexLabel } from '../lib/labels';
import type {
  MedicalAttachment,
  MedicalAttachmentType,
  MedicalRecord,
  PetSex,
  VaccinationRecord,
} from '../lib/types';
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

const attachmentTypes: Array<{ label: string; value: MedicalAttachmentType }> = [
  { label: 'Imagen', value: 'IMAGE' },
  { label: 'PDF', value: 'PDF' },
  { label: 'Analisis', value: 'LAB_RESULT' },
  { label: 'Radiografia', value: 'RADIOGRAPHY' },
  { label: 'Estudio', value: 'STUDY' },
  { label: 'Otro', value: 'OTHER' },
];

export default function PetDetailScreen() {
  const { isAllowed } = useRequireRole(['OWNER', 'VET', 'ADMIN']);
  const user = useAuthStore((state) => state.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const petQuery = usePet(id);
  const recordsQuery = useMedicalRecords(id);
  const extensionsQuery = useActiveExtensions();
  const appointmentsQuery = useAppointments();
  const attachmentsQuery = useMedicalAttachments(id);
  const activeExtensions = extensionsQuery.data ?? [];
  const hasVaccinationExtension = activeExtensions.some((extension) =>
    user?.role === 'OWNER'
      ? hasActiveOwnerPetDetailSection(extension)
      : hasActiveVetPetDetailSection(extension) || hasActiveOwnerPetDetailSection(extension),
  );
  const vaccinationsQuery = useVaccinations(id, hasVaccinationExtension);
  const createRecord = useCreateMedicalRecord(id);
  const createVaccination = useCreateVaccination(id);
  const updateRecord = useUpdateMedicalRecord(id);
  const uploadAttachment = useUploadMedicalAttachment(id);
  const downloadAttachment = useDownloadMedicalAttachment();
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
  const [attachmentType, setAttachmentType] = useState<MedicalAttachmentType>('STUDY');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [nextCheckAt, setNextCheckAt] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [recordFilter, setRecordFilter] = useState<MedicalRecordType | 'ALL'>('ALL');
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isSelectingRecords, setIsSelectingRecords] = useState(false);
  const [selectedRecordIdsForPrint, setSelectedRecordIdsForPrint] = useState<string[]>([]);
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
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineBrand, setVaccineBrand] = useState('');
  const [vaccineBatchNumber, setVaccineBatchNumber] = useState('');
  const [vaccineAppliedAt, setVaccineAppliedAt] = useState(todayDisplayDate());
  const [vaccineNextDueAt, setVaccineNextDueAt] = useState('');
  const [vaccineNotes, setVaccineNotes] = useState('');
  const [vaccinationError, setVaccinationError] = useState<string | null>(null);
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
  const selectedRecordsForPrint = useMemo(
    () => records.filter((record) => selectedRecordIdsForPrint.includes(record.id)),
    [records, selectedRecordIdsForPrint],
  );
  const completedAppointmentsForPet = useMemo(() => {
    const linkedRecordIds = new Set(
      records
        .filter((record) => record.id !== editingRecordId)
        .map((record) => record.appointmentId)
        .filter(Boolean),
    );

    return (appointmentsQuery.data ?? [])
      .filter(
        (appointment) =>
          appointment.pet.id === id &&
          appointment.status === 'COMPLETED' &&
          !linkedRecordIds.has(appointment.id),
      )
      .sort(
        (first, second) =>
          new Date(second.scheduledAt).getTime() - new Date(first.scheduledAt).getTime(),
      );
  }, [appointmentsQuery.data, editingRecordId, id, records]);

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
        appointmentId: selectedAppointmentId || null,
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
        appointmentId: selectedAppointmentId || undefined,
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
    setSelectedAppointmentId('');
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
    setSelectedAppointmentId(record.appointmentId ?? '');
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

  function toggleRecordPrintSelection(recordId: string) {
    setSelectedRecordIdsForPrint((current) =>
      current.includes(recordId)
        ? current.filter((idToKeep) => idToKeep !== recordId)
        : [...current, recordId],
    );
  }

  function togglePrintSelectionMode() {
    setIsSelectingRecords((current) => {
      if (current) {
        setSelectedRecordIdsForPrint([]);
      }

      return !current;
    });
  }

  function printCompleteHistory() {
    openPrintableMedicalRecordCollection({
      mode: 'complete',
      output: 'print',
      ownerName: pet?.owner ? `${pet.owner.firstName} ${pet.owner.lastName}` : 'Sin propietario',
      petName: pet?.name ?? 'Paciente',
      records,
    });
  }

  function pdfCompleteHistory() {
    downloadMedicalRecordCollectionPdf({
      mode: 'complete',
      ownerName: pet?.owner ? `${pet.owner.firstName} ${pet.owner.lastName}` : 'Sin propietario',
      petName: pet?.name ?? 'Paciente',
      records,
    });
  }

  function printSelectedHistory() {
    openPrintableMedicalRecordCollection({
      mode: 'selected',
      output: 'print',
      ownerName: pet?.owner ? `${pet.owner.firstName} ${pet.owner.lastName}` : 'Sin propietario',
      petName: pet?.name ?? 'Paciente',
      records: selectedRecordsForPrint,
    });
  }

  function pdfSelectedHistory() {
    downloadMedicalRecordCollectionPdf({
      mode: 'selected',
      ownerName: pet?.owner ? `${pet.owner.firstName} ${pet.owner.lastName}` : 'Sin propietario',
      petName: pet?.name ?? 'Paciente',
      records: selectedRecordsForPrint,
    });
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

  async function handleCreateVaccination() {
    if (!id) {
      return;
    }

    setVaccinationError(null);

    if (!vaccineName.trim() || !vaccineAppliedAt.trim()) {
      setVaccinationError('Vacuna y fecha de aplicacion son obligatorias.');
      return;
    }

    const parsedAppliedAt = parseDisplayDateToIso(vaccineAppliedAt);
    const parsedNextDueAt = vaccineNextDueAt.trim()
      ? parseDisplayDateToIso(vaccineNextDueAt)
      : undefined;

    if (!parsedAppliedAt) {
      setVaccinationError('La fecha de aplicacion debe tener formato DD-MM-AAAA.');
      return;
    }

    if (vaccineNextDueAt.trim() && !parsedNextDueAt) {
      setVaccinationError('La proxima dosis debe tener formato DD-MM-AAAA.');
      return;
    }

    await createVaccination.mutateAsync({
      petId: id,
      vaccineName: vaccineName.trim(),
      brand: textOrUndefined(vaccineBrand),
      batchNumber: textOrUndefined(vaccineBatchNumber),
      appliedAt: parsedAppliedAt,
      nextDueAt: parsedNextDueAt ?? undefined,
      notes: textOrUndefined(vaccineNotes),
    });

    setVaccineName('');
    setVaccineBrand('');
    setVaccineBatchNumber('');
    setVaccineAppliedAt(todayDisplayDate());
    setVaccineNextDueAt('');
    setVaccineNotes('');
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

  async function handlePickAttachment() {
    if (!id) {
      return;
    }

    setAttachmentError(null);

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'application/octet-stream';
    const name = asset.name ?? `adjunto-${Date.now()}`;

    try {
      await uploadAttachment.mutateAsync({
        petId: id,
        medicalRecordId: selectedRecord?.id,
        type: attachmentType,
        uri: asset.uri,
        name,
        mimeType,
        file: asset.file,
      });
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : 'No se pudo subir el adjunto.',
      );
    }
  }

  async function handleDownloadAttachment(attachment: MedicalAttachment) {
    setAttachmentError(null);

    try {
      await downloadAttachment.mutateAsync(attachment);
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : 'No se pudo descargar el adjunto.',
      );
    }
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

        {records.length > 0 ? (
          <View style={styles.printToolbar}>
            <Pressable onPress={printCompleteHistory} style={styles.printToolbarButton}>
              <Printer color={colors.primaryDark} size={17} strokeWidth={2.4} />
              <Text style={styles.printToolbarText}>Imprimir todo</Text>
            </Pressable>
            <Pressable onPress={pdfCompleteHistory} style={styles.printToolbarButton}>
              <FileDown color={colors.primaryDark} size={17} strokeWidth={2.4} />
              <Text style={styles.printToolbarText}>Reporte PDF</Text>
            </Pressable>
            <Pressable onPress={togglePrintSelectionMode} style={styles.printToolbarButton}>
              <ListChecks color={colors.primaryDark} size={17} strokeWidth={2.4} />
              <Text style={styles.printToolbarText}>
                {isSelectingRecords ? 'Cancelar seleccion' : 'Seleccionar'}
              </Text>
            </Pressable>
            {isSelectingRecords ? (
              <>
                <Pressable
                  disabled={selectedRecordsForPrint.length === 0}
                  onPress={printSelectedHistory}
                  style={[
                    styles.printToolbarButton,
                    selectedRecordsForPrint.length === 0 && styles.disabledAction,
                  ]}
                >
                  <Printer
                    color={selectedRecordsForPrint.length === 0 ? colors.muted : colors.primaryDark}
                    size={17}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.printToolbarText,
                      selectedRecordsForPrint.length === 0 && styles.disabledActionText,
                    ]}
                  >
                    Imprimir seleccion ({selectedRecordsForPrint.length})
                  </Text>
                </Pressable>
                <Pressable
                  disabled={selectedRecordsForPrint.length === 0}
                  onPress={pdfSelectedHistory}
                  style={[
                    styles.printToolbarButton,
                    selectedRecordsForPrint.length === 0 && styles.disabledAction,
                  ]}
                >
                  <FileDown
                    color={selectedRecordsForPrint.length === 0 ? colors.muted : colors.primaryDark}
                    size={17}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.printToolbarText,
                      selectedRecordsForPrint.length === 0 && styles.disabledActionText,
                    ]}
                  >
                  Reporte PDF seleccion ({selectedRecordsForPrint.length})
                </Text>
              </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

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
              isPrintSelected={selectedRecordIdsForPrint.includes(record.id)}
              isSelecting={isSelectingRecords}
              isSelected={selectedRecordId === record.id}
              onEdit={openEditRecordForm}
              onTogglePrintSelection={toggleRecordPrintSelection}
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

      {hasVaccinationExtension ? (
        <VaccinationCard
          appliedAt={vaccineAppliedAt}
          batchNumber={vaccineBatchNumber}
          brand={vaccineBrand}
          canCreate={user?.role === 'VET'}
          error={
            vaccinationError ??
            (createVaccination.error instanceof Error ? createVaccination.error.message : null)
          }
          isCreating={createVaccination.isPending}
          isLoading={vaccinationsQuery.isLoading}
          name={vaccineName}
          nextDueAt={vaccineNextDueAt}
          notes={vaccineNotes}
          onAppliedAtChange={setVaccineAppliedAt}
          onBatchNumberChange={setVaccineBatchNumber}
          onBrandChange={setVaccineBrand}
          onCreate={handleCreateVaccination}
          onNameChange={setVaccineName}
          onNextDueAtChange={setVaccineNextDueAt}
          onNotesChange={setVaccineNotes}
          records={vaccinationsQuery.data ?? []}
        />
      ) : null}

      <MedicalAttachmentsCard
        attachments={attachmentsQuery.data ?? []}
        attachmentType={attachmentType}
        canUpload={user?.role === 'VET' || user?.role === 'ADMIN'}
        downloadError={downloadAttachment.error}
        isDownloading={downloadAttachment.isPending}
        isLoading={attachmentsQuery.isLoading}
        isUploading={uploadAttachment.isPending}
        onDownload={handleDownloadAttachment}
        onPickAttachment={handlePickAttachment}
        onTypeChange={setAttachmentType}
        selectedRecord={selectedRecord}
        uploadError={attachmentError ?? (uploadAttachment.error instanceof Error ? uploadAttachment.error.message : null)}
      />

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
            <CompactDateSelector label="Fecha del registro" onChange={setRecordDate} value={recordDate} />
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
            <View style={styles.linkedAppointmentBox}>
              <View style={styles.linkedAppointmentHeader}>
                <CalendarCheck color={colors.primaryDark} size={19} strokeWidth={2.4} />
                <View style={styles.linkedAppointmentHeaderText}>
                  <Text style={styles.linkedAppointmentTitle}>Turno completado asociado</Text>
                  <Muted>Opcional. Vincula este registro con un turno ya atendido.</Muted>
                </View>
              </View>
              {appointmentsQuery.isLoading ? <Muted>Cargando turnos completados...</Muted> : null}
              {!appointmentsQuery.isLoading && completedAppointmentsForPet.length === 0 ? (
                <Muted>No hay turnos completados disponibles para vincular.</Muted>
              ) : null}
              {completedAppointmentsForPet.length > 0 ? (
                <View style={styles.appointmentOptionList}>
                  <Pressable
                    onPress={() => setSelectedAppointmentId('')}
                    style={[
                      styles.appointmentOption,
                      !selectedAppointmentId && styles.appointmentOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.appointmentOptionTitle,
                        !selectedAppointmentId && styles.appointmentOptionTitleActive,
                      ]}
                    >
                      Sin vincular
                    </Text>
                    <Text
                      style={[
                        styles.appointmentOptionMeta,
                        !selectedAppointmentId && styles.appointmentOptionMetaActive,
                      ]}
                    >
                      Registro independiente del calendario
                    </Text>
                  </Pressable>
                  {completedAppointmentsForPet.map((appointment) => (
                    <Pressable
                      key={appointment.id}
                      onPress={() => setSelectedAppointmentId(appointment.id)}
                      style={[
                        styles.appointmentOption,
                        selectedAppointmentId === appointment.id && styles.appointmentOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.appointmentOptionTitle,
                          selectedAppointmentId === appointment.id &&
                            styles.appointmentOptionTitleActive,
                        ]}
                      >
                        {formatDateTime(appointment.scheduledAt)}
                      </Text>
                      <Text
                        style={[
                          styles.appointmentOptionMeta,
                          selectedAppointmentId === appointment.id &&
                            styles.appointmentOptionMetaActive,
                        ]}
                      >
                        {appointment.reason?.trim() || 'Turno sin motivo cargado'} -{' '}
                        {appointmentStatusLabel(appointment.status)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
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
  isPrintSelected,
  isSelecting,
  isSelected,
  onEdit,
  onTogglePrintSelection,
  onView,
  record,
}: {
  canEdit: boolean;
  isPrintSelected: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  onEdit: (record: MedicalRecord) => void;
  onTogglePrintSelection: (recordId: string) => void;
  onView: (record: MedicalRecord) => void;
  record: MedicalRecord;
}) {
  const tone = recordToneForType(record.type);

  return (
    <View
      style={[
        styles.timelineItem,
        isSelected && styles.timelineItemSelected,
        isPrintSelected && styles.timelineItemPrintSelected,
      ]}
    >
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
          {isSelecting ? (
            <Pressable
              onPress={() => onTogglePrintSelection(record.id)}
              style={[
                styles.recordActionButton,
                isPrintSelected && styles.recordActionButtonActive,
              ]}
            >
              <ListChecks
                color={isPrintSelected ? '#ffffff' : colors.primaryDark}
                size={16}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.recordActionText,
                  isPrintSelected && styles.recordActionTextActive,
                ]}
              >
                {isPrintSelected ? 'Seleccionado' : 'Seleccionar'}
              </Text>
            </Pressable>
          ) : null}
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
  const canPrint = Platform.OS === 'web';
  const canGeneratePrescription = Boolean(
    record.medication?.trim() || record.treatment?.trim() || record.ownerVisibleNotes?.trim(),
  );

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
          label="Turno asociado"
          value={
            record.appointment
              ? `${formatDateTime(record.appointment.scheduledAt)} - ${appointmentStatusLabel(
                  record.appointment.status,
                )}`
              : 'Sin vincular'
          }
        />
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
        <Pressable
          disabled={!canPrint}
          onPress={() =>
            openPrintableMedicalRecord({
              mode: 'print',
              ownerName,
              petName,
              record,
            })
          }
          style={[styles.detailActionButton, !canPrint && styles.disabledAction]}
        >
          <Printer color={canPrint ? colors.primaryDark : colors.muted} size={17} strokeWidth={2.4} />
          <Text style={[styles.detailActionText, !canPrint && styles.disabledActionText]}>
            Imprimir
          </Text>
        </Pressable>
        <Pressable
          disabled={!canPrint}
          onPress={() =>
            downloadMedicalRecordPdf({
              ownerName,
              petName,
              record,
            })
          }
          style={[styles.detailActionButton, !canPrint && styles.disabledAction]}
        >
          <FileDown color={canPrint ? colors.primaryDark : colors.muted} size={17} strokeWidth={2.4} />
          <Text style={[styles.detailActionText, !canPrint && styles.disabledActionText]}>
            PDF
          </Text>
        </Pressable>
        <Pressable style={styles.detailActionButton}>
          <Paperclip color={colors.primaryDark} size={17} strokeWidth={2.4} />
          <Text style={styles.detailActionText}>Adjuntos</Text>
        </Pressable>
        <Pressable
          disabled={!canPrint || !canGeneratePrescription}
          onPress={() =>
            downloadPrescriptionPdf({
              ownerName,
              petName,
              record,
            })
          }
          style={[
            styles.detailActionButton,
            (!canPrint || !canGeneratePrescription) && styles.disabledAction,
          ]}
        >
          <FileText
            color={canPrint && canGeneratePrescription ? colors.primaryDark : colors.muted}
            size={17}
            strokeWidth={2.4}
          />
          <Text
            style={[
              styles.detailActionText,
              (!canPrint || !canGeneratePrescription) && styles.disabledActionText,
            ]}
          >
            Receta
          </Text>
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

function VaccinationCard({
  appliedAt,
  batchNumber,
  brand,
  canCreate,
  error,
  isCreating,
  isLoading,
  name,
  nextDueAt,
  notes,
  onAppliedAtChange,
  onBatchNumberChange,
  onBrandChange,
  onCreate,
  onNameChange,
  onNextDueAtChange,
  onNotesChange,
  records,
}: {
  appliedAt: string;
  batchNumber: string;
  brand: string;
  canCreate: boolean;
  error?: string | null;
  isCreating: boolean;
  isLoading: boolean;
  name: string;
  nextDueAt: string;
  notes: string;
  onAppliedAtChange: (value: string) => void;
  onBatchNumberChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onCreate: () => void;
  onNameChange: (value: string) => void;
  onNextDueAtChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  records: VaccinationRecord[];
}) {
  return (
    <Card>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <SectionTitle>Carnet de vacunacion</SectionTitle>
          <Muted>Extension activa: vacunas aplicadas y proximas dosis.</Muted>
        </View>
        <ShieldCheck color={colors.primaryDark} size={24} strokeWidth={2.4} />
      </View>

      {canCreate ? (
        <View style={styles.form}>
          <TextInput
            onChangeText={onNameChange}
            placeholder="Nombre de la vacuna"
            style={styles.input}
            value={name}
          />
          <View style={styles.twoColumnFields}>
            <TextInput
              onChangeText={onBrandChange}
              placeholder="Marca opcional"
              style={[styles.input, styles.compactInput]}
              value={brand}
            />
            <TextInput
              onChangeText={onBatchNumberChange}
              placeholder="Lote opcional"
              style={[styles.input, styles.compactInput]}
              value={batchNumber}
            />
          </View>
          <CompactDateSelector
            label="Fecha de aplicacion"
            onChange={onAppliedAtChange}
            value={appliedAt}
          />
          <CalendarDatePicker
            label="Proxima dosis"
            optional
            onChange={onNextDueAtChange}
            value={nextDueAt}
          />
          <TextInput
            multiline
            onChangeText={onNotesChange}
            placeholder="Observaciones opcionales"
            style={[styles.input, styles.textAreaSmall]}
            value={notes}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={isCreating}
            onPress={onCreate}
            style={[styles.button, isCreating && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isCreating ? 'Guardando...' : 'Guardar vacuna'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? <Muted>Cargando carnet...</Muted> : null}
      {!isLoading && records.length === 0 ? (
        <Muted>No hay vacunas cargadas para esta mascota.</Muted>
      ) : null}

      <View style={styles.vaccineList}>
        {records.map((record) => (
          <View key={record.id} style={styles.vaccineRow}>
            <View style={styles.vaccineIcon}>
              <ShieldCheck color={colors.primaryDark} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.vaccineInfo}>
              <Text style={styles.vaccineTitle}>{record.vaccineName}</Text>
              <Muted>
                Aplicada: {formatDateOnly(record.appliedAt)}
                {record.nextDueAt ? ` - Proxima: ${formatDateOnly(record.nextDueAt)}` : ''}
              </Muted>
              {record.brand || record.batchNumber ? (
                <Muted>
                  {record.brand ? `Marca: ${record.brand}` : ''}
                  {record.brand && record.batchNumber ? ' - ' : ''}
                  {record.batchNumber ? `Lote: ${record.batchNumber}` : ''}
                </Muted>
              ) : null}
              {record.notes ? <Text style={styles.description}>{record.notes}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function MedicalAttachmentsCard({
  attachments,
  attachmentType,
  canUpload,
  downloadError,
  isDownloading,
  isLoading,
  isUploading,
  onDownload,
  onPickAttachment,
  onTypeChange,
  selectedRecord,
  uploadError,
}: {
  attachments: MedicalAttachment[];
  attachmentType: MedicalAttachmentType;
  canUpload: boolean;
  downloadError: unknown;
  isDownloading: boolean;
  isLoading: boolean;
  isUploading: boolean;
  onDownload: (attachment: MedicalAttachment) => void;
  onPickAttachment: () => void;
  onTypeChange: (type: MedicalAttachmentType) => void;
  selectedRecord: MedicalRecord | null;
  uploadError?: string | null;
}) {
  const visibleAttachments = selectedRecord
    ? attachments.filter((attachment) => attachment.medicalRecordId === selectedRecord.id)
    : attachments;

  return (
    <Card>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <SectionTitle>Adjuntos clinicos</SectionTitle>
          <Muted>
            {selectedRecord
              ? `Adjuntos asociados a: ${selectedRecord.title}`
              : 'Archivos asociados a la ficha clinica del paciente.'}
          </Muted>
        </View>
        <Paperclip color={colors.primaryDark} size={24} strokeWidth={2.4} />
      </View>

      {canUpload ? (
        <>
          <View style={styles.attachmentTypeGrid}>
            {attachmentTypes.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onTypeChange(option.value)}
                style={[
                  styles.attachmentTypeButton,
                  attachmentType === option.value && styles.attachmentTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.attachmentTypeText,
                    attachmentType === option.value && styles.attachmentTypeTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={isUploading}
            onPress={onPickAttachment}
            style={[styles.secondaryButton, isUploading && styles.buttonDisabled]}
          >
            <Text style={styles.secondaryButtonText}>
              {isUploading ? 'Subiendo adjunto...' : 'Subir adjunto'}
            </Text>
          </Pressable>
        </>
      ) : null}

      {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}
      {downloadError instanceof Error ? <Text style={styles.error}>{downloadError.message}</Text> : null}
      {isLoading ? <Muted>Cargando adjuntos...</Muted> : null}
      {!isLoading && visibleAttachments.length === 0 ? (
        <Muted>No hay adjuntos clinicos para esta vista.</Muted>
      ) : null}

      <View style={styles.attachmentsList}>
        {visibleAttachments.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentRow}>
            <View style={styles.attachmentIcon}>
              <Paperclip color={colors.primaryDark} size={18} strokeWidth={2.4} />
            </View>
            <View style={styles.attachmentInfo}>
              <Text style={styles.attachmentName}>{attachment.originalName}</Text>
              <Muted>
                {medicalAttachmentTypeLabel(attachment.type)} - {formatFileSize(attachment.sizeBytes)}
                {attachment.medicalRecord?.title ? ` - ${attachment.medicalRecord.title}` : ''}
              </Muted>
            </View>
            <Pressable
              disabled={isDownloading}
              onPress={() => onDownload(attachment)}
              style={[styles.attachmentDownloadButton, isDownloading && styles.buttonDisabled]}
            >
              <FileDown color={colors.primaryDark} size={18} strokeWidth={2.4} />
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
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

async function downloadMedicalRecordPdf({
  ownerName,
  petName,
  record,
}: {
  ownerName: string;
  petName: string;
  record: MedicalRecord;
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const pdf = await createMedicalRecordPdf({
    title: 'Informe clinico',
    ownerName,
    petName,
    records: [record],
  });

  downloadPdfBytes(pdf, `informe-${safeFileName(petName)}-${formatDateOnly(record.recordDate)}.pdf`);
}

async function downloadPrescriptionPdf({
  ownerName,
  petName,
  record,
}: {
  ownerName: string;
  petName: string;
  record: MedicalRecord;
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const pdf = createPrescriptionPdf({ ownerName, petName, record });

  downloadPdfBytes(pdf, `receta-${safeFileName(petName)}-${formatDateOnly(record.recordDate)}.pdf`);
}

async function downloadMedicalRecordCollectionPdf({
  mode,
  ownerName,
  petName,
  records,
}: {
  mode: 'complete' | 'selected';
  ownerName: string;
  petName: string;
  records: MedicalRecord[];
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || records.length === 0) {
    return;
  }

  const pdf = await createMedicalRecordPdf({
    title: mode === 'complete' ? 'Historial clinico completo' : 'Historial clinico seleccionado',
    ownerName,
    petName,
    records,
  });

  downloadPdfBytes(pdf, `historial-${safeFileName(petName)}-${mode}.pdf`);
}

function createMedicalRecordPdf({
  ownerName,
  petName,
  records,
  title,
}: {
  ownerName: string;
  petName: string;
  records: MedicalRecord[];
  title: string;
}) {
  const renderer = createSimplePdfRenderer();

  renderer.text('choninovet', 10, true);
  renderer.text(title, 18, true);
  renderer.text(
    `${records.length === 1 ? '1 registro medico' : `${records.length} registros medicos`} - Emitido el ${todayDisplayDate()}`,
    10,
  );
  renderer.rule();
  renderer.text(`Paciente: ${petName}`, 11, true);
  renderer.text(`Propietario: ${ownerName}`, 11, true);
  renderer.space(8);

  records.forEach((record, index) => {
    renderer.ensureSpace(120);
    renderer.text(
      `Registro ${index + 1} - ${medicalRecordTypeLabel(record.type)} - ${formatDateOnly(record.recordDate)}`,
      10,
      true,
    );
    renderer.text(record.title, 13, true);
    renderer.text(`Veterinario/a: ${record.vet?.clinicName ?? 'Sin dato'}`, 10);
    if (record.appointment) {
      renderer.text(`Turno asociado: ${appointmentSummary(record.appointment)}`, 10);
    }
    renderer.text(
      `Proximo control: ${record.nextCheckAt ? formatDateOnly(record.nextCheckAt) : 'Sin fecha'} | Peso: ${
        record.weightKg ? `${record.weightKg} kg` : 'Sin dato'
      } | Temperatura: ${record.temperatureC ? `${record.temperatureC} C` : 'Sin dato'}`,
      10,
    );
    renderer.clinicalBlock('Descripcion general', record.description);
    renderer.clinicalBlock('Motivo de consulta', record.consultationReason);
    renderer.clinicalBlock('Diagnostico', record.diagnosis);
    renderer.clinicalBlock('Tratamiento indicado', record.treatment);
    renderer.clinicalBlock('Medicacion', record.medication);
    renderer.clinicalBlock('Indicaciones para propietario', record.ownerVisibleNotes);
    renderer.clinicalBlock('Notas privadas veterinario/a', record.privateNotes);
    renderer.rule();
  });

  return renderer.bytes();
}

function createPrescriptionPdf({
  ownerName,
  petName,
  record,
}: {
  ownerName: string;
  petName: string;
  record: MedicalRecord;
}) {
  const renderer = createSimplePdfRenderer();

  renderer.text('choninovet', 10, true);
  renderer.text('Receta e indicaciones', 18, true);
  renderer.text(`Emitido el ${todayDisplayDate()}`, 10);
  renderer.rule();
  renderer.text(`Paciente: ${petName}`, 11, true);
  renderer.text(`Propietario: ${ownerName}`, 11, true);
  renderer.text(`Veterinario/a: ${record.vet?.clinicName ?? 'Sin dato'}`, 11, true);
  renderer.text(`Registro: ${record.title} - ${formatDateOnly(record.recordDate)}`, 10);

  if (record.appointment) {
    renderer.text(`Turno asociado: ${appointmentSummary(record.appointment)}`, 10);
  }

  renderer.space(10);
  renderer.clinicalBlock('Medicacion', record.medication);
  renderer.clinicalBlock('Tratamiento indicado', record.treatment);
  renderer.clinicalBlock('Indicaciones para propietario', record.ownerVisibleNotes);

  if (!record.medication?.trim() && !record.treatment?.trim() && !record.ownerVisibleNotes?.trim()) {
    renderer.text('Sin medicacion ni indicaciones cargadas.', 10);
  }

  renderer.rule();
  renderer.text('Firma y sello profesional:', 10, true);
  renderer.space(32);
  renderer.rule();

  return renderer.bytes();
}

type SimplePdfRenderer = {
  bytes: () => Uint8Array;
  clinicalBlock: (label: string, value?: string | null) => void;
  ensureSpace: (neededHeight: number) => void;
  rule: () => void;
  space: (amount: number) => void;
  text: (value: string, size?: number, bold?: boolean) => void;
};

function createSimplePdfRenderer(): SimplePdfRenderer {
  const width = 595.28;
  const height = 841.89;
  const margin = 42;
  const pages: string[][] = [[]];
  let y = 790;

  function currentPage() {
    return pages[pages.length - 1];
  }

  function addPage() {
    pages.push([]);
    y = 790;
  }

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < margin) {
      addPage();
    }
  }

  function space(amount: number) {
    y -= amount;
  }

  function text(value: string, size = 10, bold = false) {
    const lines = wrapPdfText(safePdfTextAscii(value), size, 88);

    lines.forEach((line) => {
      ensureSpace(size + 5);
      currentPage().push(
        `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${margin} ${y.toFixed(2)} Td (${escapePdfString(line)}) Tj ET`,
      );
      y -= size + 4;
    });
  }

  function clinicalBlock(label: string, value?: string | null) {
    if (!value?.trim()) {
      return;
    }

    text(`${label}:`, 9, true);
    text(value.trim(), 10);
    space(3);
  }

  function rule() {
    ensureSpace(12);
    currentPage().push(`${margin} ${y.toFixed(2)} m ${(width - margin).toFixed(2)} ${y.toFixed(2)} l S`);
    y -= 12;
  }

  function bytes() {
    const objects: string[] = [];
    const addObject = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
    const pagesId = addObject('');
    const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const pageIds: number[] = [];

    pages.forEach((commands) => {
      const stream = commands.join('\n');
      const contentId = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      );
      pageIds.push(pageId);
    });

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] /Count ${pageIds.length} >>`;

    const chunks = ['%PDF-1.4\n'];
    const offsets: number[] = [0];
    let offset = byteLength(chunks[0]);

    objects.forEach((object, index) => {
      offsets.push(offset);
      const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
      chunks.push(chunk);
      offset += byteLength(chunk);
    });

    const xrefOffset = offset;
    const xref = [
      `xref\n0 ${objects.length + 1}`,
      '0000000000 65535 f ',
      ...offsets.slice(1).map((item) => `${String(item).padStart(10, '0')} 00000 n `),
    ].join('\n');
    const trailer = `\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new TextEncoder().encode(`${chunks.join('')}${xref}${trailer}`);
  }

  return {
    bytes,
    clinicalBlock,
    ensureSpace,
    rule,
    space,
    text,
  };
}

function wrapPdfText(value: string, size: number, maxCharsAtTenPt: number) {
  const maxChars = Math.max(34, Math.floor((maxCharsAtTenPt * 10) / size));

  return value
    .split('\n')
    .flatMap((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let currentLine = '';

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;

        if (candidate.length <= maxChars) {
          currentLine = candidate;
          return;
        }

        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines.length > 0 ? lines : [''];
    });
}

function downloadPdfBytes(bytes: Uint8Array, fileName: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const pdfBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(pdfBuffer).set(bytes);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function safePdfTextAscii(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\u0009\u000a\u000d\u0020-\u007e]/g, '');
}

function escapePdfString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function safePdfText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, '');
}

function openPrintableMedicalRecord({
  mode,
  ownerName,
  petName,
  record,
}: {
  mode: 'print' | 'pdf';
  ownerName: string;
  petName: string;
  record: MedicalRecord;
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  openPrintableHtml(
    buildMedicalRecordPrintHtml({
      mode,
      ownerName,
      petName,
      record,
    }),
  );
}

function openPrintableMedicalRecordCollection({
  mode,
  output,
  ownerName,
  petName,
  records,
}: {
  mode: 'complete' | 'selected';
  output: 'print' | 'pdf';
  ownerName: string;
  petName: string;
  records: MedicalRecord[];
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || records.length === 0) {
    return;
  }

  openPrintableHtml(
    buildMedicalRecordCollectionPrintHtml({
      mode,
      output,
      ownerName,
      petName,
      records,
    }),
  );
}

function openPrintableHtml(html: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const printableWindow = window.open(url, '_blank');

  if (!printableWindow) {
    window.URL.revokeObjectURL(url);
    return;
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 30000);
}

function buildMedicalRecordPrintHtml({
  mode,
  ownerName,
  petName,
  record,
}: {
  mode: 'print' | 'pdf';
  ownerName: string;
  petName: string;
  record: MedicalRecord;
}) {
  const printableTitle =
    mode === 'pdf' ? 'Informe clinico - guardar como PDF' : 'Informe clinico imprimible';
  const sections = [
    ['Descripcion general', record.description],
    ['Motivo de consulta', record.consultationReason],
    ['Diagnostico', record.diagnosis],
    ['Tratamiento indicado', record.treatment],
    ['Medicacion', record.medication],
    ['Indicaciones para propietario', record.ownerVisibleNotes],
    ['Notas privadas veterinario/a', record.privateNotes],
  ]
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(
      ([label, value]) => `
        <section class="block">
          <h2>${escapeHtml(String(label))}</h2>
          <p>${formatPrintableText(String(value))}</p>
        </section>
      `,
    )
    .join('');

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(printableTitle)} - ${escapeHtml(petName)}</title>
    <style>
      :root {
        color: #10201b;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        background: #ffffff;
        margin: 0;
        padding: 32px;
      }
      main {
        margin: 0 auto;
        max-width: 820px;
      }
      header {
        border-bottom: 2px solid #087f5b;
        margin-bottom: 22px;
        padding-bottom: 18px;
      }
      .brand {
        color: #06684a;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0;
        margin: 0 0 6px;
        text-transform: uppercase;
      }
      h1 {
        font-size: 28px;
        line-height: 1.18;
        margin: 0 0 8px;
      }
      .subtitle {
        color: #5c6f68;
        font-size: 14px;
        margin: 0;
      }
      .grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-bottom: 18px;
      }
      .field {
        background: #eef4f1;
        border: 1px solid #d8e2df;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .label {
        color: #5c6f68;
        display: block;
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .value {
        font-size: 14px;
        font-weight: 700;
      }
      .block {
        border: 1px solid #d8e2df;
        border-radius: 8px;
        margin: 0 0 12px;
        padding: 14px;
      }
      h2 {
        color: #06684a;
        font-size: 13px;
        margin: 0 0 8px;
        text-transform: uppercase;
      }
      p {
        font-size: 15px;
        line-height: 1.5;
        margin: 0;
        white-space: pre-wrap;
      }
      footer {
        border-top: 1px solid #d8e2df;
        color: #5c6f68;
        font-size: 12px;
        margin-top: 24px;
        padding-top: 12px;
      }
      @media print {
        body {
          padding: 0;
        }
        main {
          max-width: none;
        }
      }
      @media (max-width: 640px) {
        body {
          padding: 18px;
        }
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="brand">choninovet</p>
        <h1>${escapeHtml(record.title)}</h1>
        <p class="subtitle">${escapeHtml(printableTitle)}</p>
      </header>

      <section class="grid">
        ${printableField('Tipo', medicalRecordTypeLabel(record.type))}
        ${printableField('Fecha', formatDateOnly(record.recordDate))}
        ${printableField('Paciente', petName)}
        ${printableField('Propietario', ownerName)}
        ${printableField('Veterinario/a', record.vet?.clinicName ?? 'Sin dato')}
        ${printableField('Turno asociado', record.appointment ? appointmentSummary(record.appointment) : 'Sin vincular')}
        ${printableField('Proximo control', record.nextCheckAt ? formatDateOnly(record.nextCheckAt) : 'Sin fecha')}
        ${printableField('Peso registrado', record.weightKg ? `${record.weightKg} kg` : 'Sin dato')}
        ${printableField('Temperatura', record.temperatureC ? `${record.temperatureC} C` : 'Sin dato')}
      </section>

      ${sections}

      <footer>
        Generado desde choninovet el ${escapeHtml(todayDisplayDate())}.
      </footer>
    </main>
    ${printableAutoPrintScript()}
  </body>
</html>`;
}

function buildMedicalRecordCollectionPrintHtml({
  mode,
  output,
  ownerName,
  petName,
  records,
}: {
  mode: 'complete' | 'selected';
  output: 'print' | 'pdf';
  ownerName: string;
  petName: string;
  records: MedicalRecord[];
}) {
  const baseTitle =
    mode === 'complete'
      ? 'Historial clinico completo'
      : 'Historial clinico seleccionado';
  const printableTitle =
    output === 'pdf' ? `${baseTitle} - guardar como PDF` : baseTitle;
  const recordsHtml = records
    .map(
      (record, index) => `
        <article class="clinical-entry">
          <div class="record-heading">
            <div>
              <span class="record-number">Registro ${index + 1}</span>
              <h2>${escapeHtml(record.title)}</h2>
            </div>
            <div class="record-meta">
              <span>${escapeHtml(medicalRecordTypeLabel(record.type))}</span>
              <span>${escapeHtml(formatDateOnly(record.recordDate))}</span>
            </div>
          </div>
          <section class="record-facts">
            ${printableInlineFact('Veterinario/a', record.vet?.clinicName ?? 'Sin dato')}
            ${printableInlineFact('Turno asociado', record.appointment ? appointmentSummary(record.appointment) : 'Sin vincular')}
            ${printableInlineFact('Proximo control', record.nextCheckAt ? formatDateOnly(record.nextCheckAt) : 'Sin fecha')}
            ${printableInlineFact('Peso', record.weightKg ? `${record.weightKg} kg` : 'Sin dato')}
            ${printableInlineFact('Temperatura', record.temperatureC ? `${record.temperatureC} C` : 'Sin dato')}
          </section>
          ${printableRecordSections(record, 'compact')}
        </article>
      `,
    )
    .join('');

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(printableTitle)} - ${escapeHtml(petName)}</title>
    ${printableDocumentStyles('compact')}
    <style>
      .patient-summary {
        border: 1px solid #b9c9c4;
        border-collapse: collapse;
        margin: 0 0 16px;
        width: 100%;
      }
      .patient-summary td {
        border: 1px solid #b9c9c4;
        font-size: 12px;
        padding: 6px 8px;
        vertical-align: top;
        width: 33.33%;
      }
      .patient-summary strong {
        color: #466058;
        display: block;
        font-size: 9px;
        margin-bottom: 2px;
        text-transform: uppercase;
      }
      .clinical-entry {
        border-top: 1px solid #9eb4ad;
        margin: 0;
        padding: 10px 0 8px;
      }
      .clinical-entry:first-of-type {
        border-top: 2px solid #087f5b;
      }
      .record-heading {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .record-number {
        color: #06684a;
        display: block;
        font-size: 9px;
        font-weight: 800;
        margin-bottom: 2px;
        text-transform: uppercase;
      }
      .record-meta {
        color: #466058;
        display: flex;
        flex-direction: column;
        font-size: 11px;
        font-weight: 700;
        gap: 2px;
        text-align: right;
        white-space: nowrap;
      }
      .record-facts {
        color: #3c4f49;
        display: flex;
        flex-wrap: wrap;
        font-size: 11px;
        gap: 4px 12px;
        margin: 0 0 5px;
      }
      .inline-fact strong {
        color: #5c6f68;
        font-weight: 800;
      }
      .compact-line {
        font-size: 12px;
        line-height: 1.35;
        margin: 3px 0;
      }
      .compact-line strong {
        color: #06684a;
        font-size: 10px;
        text-transform: uppercase;
      }
      @media print {
        .clinical-entry {
          break-inside: auto;
          page-break-inside: auto;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="brand">choninovet</p>
        <h1>${escapeHtml(printableTitle)}</h1>
        <p class="subtitle">${escapeHtml(records.length === 1 ? '1 registro medico' : `${records.length} registros medicos`)}</p>
      </header>

      <table class="patient-summary">
        <tr>
          <td><strong>Paciente</strong>${escapeHtml(petName)}</td>
          <td><strong>Propietario</strong>${escapeHtml(ownerName)}</td>
          <td><strong>Fecha de emision</strong>${escapeHtml(todayDisplayDate())}</td>
        </tr>
      </table>

      ${recordsHtml}

      <footer>
        Generado desde choninovet el ${escapeHtml(todayDisplayDate())}.
      </footer>
    </main>
    ${printableAutoPrintScript()}
  </body>
</html>`;
}

function printableField(label: string, value: string) {
  return `
    <div class="field">
      <span class="label">${escapeHtml(label)}</span>
      <span class="value">${escapeHtml(value)}</span>
    </div>
  `;
}

function printableInlineFact(label: string, value: string) {
  return `
    <span class="inline-fact"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>
  `;
}

function printableRecordSections(record: MedicalRecord, variant: 'block' | 'compact' = 'block') {
  const sections = [
    ['Descripcion general', record.description],
    ['Motivo de consulta', record.consultationReason],
    ['Diagnostico', record.diagnosis],
    ['Tratamiento indicado', record.treatment],
    ['Medicacion', record.medication],
    ['Indicaciones para propietario', record.ownerVisibleNotes],
    ['Notas privadas veterinario/a', record.privateNotes],
  ]
    .filter(([, value]) => typeof value === 'string' && value.trim());

  if (variant === 'compact') {
    return sections
      .map(
        ([label, value]) => `
          <p class="compact-line"><strong>${escapeHtml(String(label))}:</strong> ${formatPrintableText(String(value))}</p>
        `,
      )
      .join('');
  }

  return sections
    .map(
      ([label, value]) => `
        <section class="block">
          <h3>${escapeHtml(String(label))}</h3>
          <p>${formatPrintableText(String(value))}</p>
        </section>
      `,
    )
    .join('');
}

function printableDocumentStyles(variant: 'normal' | 'compact' = 'normal') {
  const isCompact = variant === 'compact';

  return `
    <style>
      :root {
        color: #10201b;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        background: #ffffff;
        margin: 0;
        padding: ${isCompact ? '18px 24px' : '32px'};
      }
      main {
        margin: 0 auto;
        max-width: ${isCompact ? '920px' : '820px'};
      }
      header {
        border-bottom: 2px solid #087f5b;
        margin-bottom: ${isCompact ? '12px' : '22px'};
        padding-bottom: ${isCompact ? '10px' : '18px'};
      }
      .brand {
        color: #06684a;
        font-size: ${isCompact ? '11px' : '13px'};
        font-weight: 800;
        letter-spacing: 0;
        margin: 0 0 6px;
        text-transform: uppercase;
      }
      h1 {
        font-size: ${isCompact ? '22px' : '28px'};
        line-height: 1.18;
        margin: 0 0 ${isCompact ? '4px' : '8px'};
      }
      h2 {
        color: #10201b;
        font-size: ${isCompact ? '15px' : '21px'};
        line-height: 1.25;
        margin: 0 0 ${isCompact ? '4px' : '12px'};
      }
      h3 {
        color: #06684a;
        font-size: 13px;
        margin: 0 0 8px;
        text-transform: uppercase;
      }
      .subtitle {
        color: #5c6f68;
        font-size: ${isCompact ? '12px' : '14px'};
        margin: 0;
      }
      .grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-bottom: 18px;
      }
      .field {
        background: #eef4f1;
        border: 1px solid #d8e2df;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .label {
        color: #5c6f68;
        display: block;
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .value {
        font-size: 14px;
        font-weight: 700;
      }
      .block {
        border: 1px solid #d8e2df;
        border-radius: 8px;
        margin: 0 0 12px;
        padding: 14px;
      }
      p {
        font-size: ${isCompact ? '12px' : '15px'};
        line-height: ${isCompact ? '1.35' : '1.5'};
        margin: 0;
        white-space: pre-wrap;
      }
      footer {
        border-top: 1px solid #d8e2df;
        color: #5c6f68;
        font-size: 11px;
        margin-top: ${isCompact ? '12px' : '24px'};
        padding-top: ${isCompact ? '8px' : '12px'};
      }
      @media print {
        @page {
          margin: ${isCompact ? '12mm' : '16mm'};
        }
        body {
          padding: 0;
        }
        main {
          max-width: none;
        }
      }
      @media (max-width: 640px) {
        body {
          padding: 18px;
        }
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
}

function printableAutoPrintScript() {
  return `
    <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          window.focus();
          window.print();
        }, 350);
      });
    </script>
  `;
}

function formatPrintableText(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function medicalAttachmentTypeLabel(type: MedicalAttachmentType) {
  const labels: Record<MedicalAttachmentType, string> = {
    IMAGE: 'Imagen',
    PDF: 'PDF',
    LAB_RESULT: 'Analisis',
    RADIOGRAPHY: 'Radiografia',
    STUDY: 'Estudio',
    OTHER: 'Otro',
  };

  return labels[type] ?? type;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const time = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatDateOnly(value)} ${time}`;
}

function appointmentSummary(appointment: NonNullable<MedicalRecord['appointment']>) {
  const reason = appointment.reason?.trim() ? ` - ${appointment.reason.trim()}` : '';

  return `${formatDateTime(appointment.scheduledAt)} - ${appointmentStatusLabel(
    appointment.status,
  )}${reason}`;
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
  printToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  printToolbarButton: {
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
  printToolbarText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
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
  timelineItemPrintSelected: {
    backgroundColor: '#e8f7ef',
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
  recordActionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  recordActionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  recordActionTextActive: {
    color: '#ffffff',
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
  attachmentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  attachmentTypeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  attachmentTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  attachmentTypeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  attachmentTypeTextActive: {
    color: '#ffffff',
  },
  attachmentsList: {
    gap: spacing.sm,
  },
  attachmentRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  attachmentIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  attachmentInfo: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  attachmentDownloadButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  vaccineList: {
    gap: spacing.sm,
  },
  vaccineRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  vaccineIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  vaccineInfo: {
    flex: 1,
    gap: 3,
  },
  vaccineTitle: {
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
  linkedAppointmentBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  linkedAppointmentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkedAppointmentHeaderText: {
    flex: 1,
    gap: 2,
  },
  linkedAppointmentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  appointmentOptionList: {
    gap: spacing.xs,
  },
  appointmentOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  appointmentOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appointmentOptionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  appointmentOptionTitleActive: {
    color: '#ffffff',
  },
  appointmentOptionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  appointmentOptionMetaActive: {
    color: '#eafff7',
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
