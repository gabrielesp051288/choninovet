import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Card, Muted, Screen, SectionTitle } from './components';
import { CalendarDatePicker } from './date-picker';
import { useReminders, useCreateReminder, useCompleteReminder } from './hooks/use-reminders';
import { useVetPets } from './hooks/use-vet-dashboard';
import { useRequireRole } from './lib/auth-routing';
import { formatDateOnly, parseDisplayDateToIso, todayDisplayDate } from './lib/dates';
import { reminderStatusLabel, reminderTypeLabel } from './lib/labels';
import type { ReminderType } from './lib/types';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

const reminderTypes: Array<{ label: string; value: ReminderType }> = [
  { label: 'Vacuna', value: 'VACCINE' },
  { label: 'Control', value: 'CHECKUP' },
  { label: 'Turno', value: 'APPOINTMENT' },
  { label: 'Tratam.', value: 'TREATMENT' },
  { label: 'Otro', value: 'OTHER' },
];
const reminderTimeSlots = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

export default function RemindersScreen() {
  const { isAllowed } = useRequireRole(['OWNER', 'VET', 'ADMIN']);
  const user = useAuthStore((state) => state.user);
  const remindersQuery = useReminders();
  const vetPetsQuery = useVetPets();
  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const [selectedPetId, setSelectedPetId] = useState('');
  const [type, setType] = useState<ReminderType>('CHECKUP');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(todayDisplayDate());
  const [dueTime, setDueTime] = useState('10:00');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPetId && vetPetsQuery.data?.[0]) {
      setSelectedPetId(vetPetsQuery.data[0].id);
    }
  }, [selectedPetId, vetPetsQuery.data]);

  async function handleCreateReminder() {
    setFormError(null);

    if (!selectedPetId || !title.trim() || !dueDate.trim() || !dueTime) {
      setFormError('Mascota, titulo y vencimiento son obligatorios.');
      return;
    }

    const parsedDueDate = parseDisplayDateToIso(dueDate);

    if (!parsedDueDate) {
      setFormError('El vencimiento debe tener formato DD-MM-AAAA.');
      return;
    }

    await createReminder.mutateAsync({
      petId: selectedPetId,
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: `${parsedDueDate}T${dueTime}:00`,
    });

    setTitle('');
    setDescription('');
    setDueDate(todayDisplayDate());
    setDueTime('10:00');
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso requerido</SectionTitle>
          <Muted>Inicia sesion para ver recordatorios.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle>Recordatorios</SectionTitle>

      {user?.role === 'VET' ? (
        <Card>
          <SectionTitle>Crear recordatorio</SectionTitle>
          {vetPetsQuery.isLoading ? <Muted>Cargando pacientes...</Muted> : null}
          {vetPetsQuery.data?.length === 0 ? (
            <Muted>No hay mascotas asociadas para crear recordatorios.</Muted>
          ) : null}

          <View style={styles.selector}>
            {vetPetsQuery.data?.map((pet) => (
              <Pressable
                key={pet.id}
                onPress={() => setSelectedPetId(pet.id)}
                style={[styles.chip, selectedPetId === pet.id && styles.chipActive]}
              >
                <Text style={styles.chipText}>{pet.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.selector}>
            {reminderTypes.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setType(option.value)}
                style={[styles.chip, type === option.value && styles.chipActive]}
              >
                <Text style={styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <TextInput
              onChangeText={setTitle}
              placeholder="Titulo"
              style={styles.input}
              value={title}
            />
            <CalendarDatePicker label="Vencimiento" onChange={setDueDate} value={dueDate} />
            <View style={styles.selector}>
              {reminderTimeSlots.map((slot) => (
                <Pressable
                  key={slot}
                  onPress={() => setDueTime(slot)}
                  style={[styles.chip, dueTime === slot && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{slot}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Descripcion opcional"
              style={[styles.input, styles.textArea]}
              value={description}
            />
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {createReminder.error ? (
            <Text style={styles.error}>
              {createReminder.error instanceof Error
                ? createReminder.error.message
                : 'No se pudo crear el recordatorio.'}
            </Text>
          ) : null}

          <Pressable
            disabled={createReminder.isPending}
            onPress={handleCreateReminder}
            style={[styles.button, createReminder.isPending && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {createReminder.isPending ? 'Guardando...' : 'Guardar recordatorio'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Listado</SectionTitle>
        {remindersQuery.isLoading ? <Muted>Cargando recordatorios...</Muted> : null}
        {remindersQuery.error ? (
          <Muted>No se pudieron cargar los recordatorios.</Muted>
        ) : null}
        {remindersQuery.data?.length === 0 ? (
          <Muted>No hay recordatorios registrados.</Muted>
        ) : null}

        {remindersQuery.data?.map((reminder) => (
          <View key={reminder.id} style={styles.row}>
            <View style={styles.header}>
              <Text style={styles.title}>{reminder.title}</Text>
              <Badge>{reminderStatusLabel(reminder.status)}</Badge>
            </View>
            <Muted>
              {reminder.pet.name} - {reminderTypeLabel(reminder.type)} - {formatDate(reminder.dueAt)}
            </Muted>
            {reminder.description ? (
              <Text style={styles.description}>{reminder.description}</Text>
            ) : null}
            {reminder.status === 'PENDING' ? (
              <Pressable
                disabled={completeReminder.isPending}
                onPress={() => completeReminder.mutate(reminder.id)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Marcar completado</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  const time = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatDateOnly(value)} ${time}`;
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  title: {
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
    minHeight: 82,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  chipText: {
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
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
