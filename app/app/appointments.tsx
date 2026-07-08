import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  PawPrint,
  Stethoscope,
} from 'lucide-react-native';
import { Badge, Card, Muted, Screen, SectionTitle } from './components';
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointmentStatus,
} from './hooks/use-appointments';
import { useOwnerPets } from './hooks/use-owner-dashboard';
import { defaultSchedule, useSchedule, type ScheduleSetting } from './hooks/use-schedule';
import { useVets } from './hooks/use-vets';
import { useRequireRole } from './lib/auth-routing';
import { formatDateOnly } from './lib/dates';
import { appointmentStatusLabel } from './lib/labels';
import type { AppointmentStatus } from './lib/types';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

const statusOptions: AppointmentStatus[] = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];
const agendaStatusFilters: Array<AppointmentStatus | 'ALL'> = [
  'ALL',
  'REQUESTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
];
const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AppointmentsScreen() {
  const router = useRouter();
  const { isAllowed } = useRequireRole(['OWNER', 'VET', 'ADMIN']);
  const user = useAuthStore((state) => state.user);
  const appointmentsQuery = useAppointments();
  const petsQuery = useOwnerPets();
  const vetsQuery = useVets();
  const scheduleQuery = useSchedule();
  const createAppointment = useCreateAppointment();
  const updateStatus = useUpdateAppointmentStatus();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [agendaMonth, setAgendaMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedVetId, setSelectedVetId] = useState('');
  const [selectedDate, setSelectedDate] = useState(toIsoDate(today));
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string | null>(null);
  const [didAutoSelectAgendaDate, setDidAutoSelectAgendaDate] = useState(false);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const appointments = appointmentsQuery.data ?? [];
  const appointmentCountsByDate = useMemo(
    () => countAppointmentsByDate(appointments),
    [appointments],
  );
  const schedule = scheduleQuery.data ?? defaultSchedule;
  const selectedSchedule = scheduleForDate(selectedDate, schedule);
  const timeSlots = selectedSchedule?.isEnabled
    ? buildTimeSlotsFromSetting(selectedSchedule)
    : [];
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesStatus = statusFilter === 'ALL' || appointment.status === statusFilter;
    const matchesDate =
      !selectedAgendaDate || toIsoDate(new Date(appointment.scheduledAt)) === selectedAgendaDate;

    return matchesStatus && matchesDate;
  });

  useEffect(() => {
    if (!selectedPetId && petsQuery.data?.[0]) {
      setSelectedPetId(petsQuery.data[0].id);
    }
  }, [petsQuery.data, selectedPetId]);

  useEffect(() => {
    if (!selectedVetId && vetsQuery.data?.[0]) {
      setSelectedVetId(vetsQuery.data[0].id);
    }
  }, [vetsQuery.data, selectedVetId]);

  useEffect(() => {
    if (didAutoSelectAgendaDate || appointments.length === 0) {
      return;
    }

    const initialDate = findInitialAgendaDate(appointments);
    setSelectedAgendaDate(initialDate);
    setAgendaMonth(monthFromIsoDate(initialDate));
    setDidAutoSelectAgendaDate(true);
  }, [appointments, didAutoSelectAgendaDate]);

  async function handleCreateAppointment() {
    setFormError(null);

    if (!selectedPetId || !selectedVetId || !selectedDate || !selectedTime) {
      setFormError('Mascota, veterinario/a, día y horario son obligatorios.');
      return;
    }

    await createAppointment.mutateAsync({
      petId: selectedPetId,
      vetProfileId: selectedVetId,
      scheduledAt: `${selectedDate}T${selectedTime}:00`,
      reason: reason.trim() || undefined,
      associateVetFirst: true,
    });

    setSelectedTime('');
    setReason('');
    setIsRequestFormOpen(false);
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso requerido</SectionTitle>
          <Muted>Inicia sesion para ver turnos.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.screenHeader}>
        <Text style={styles.kicker}>Turnos</Text>
        <Text style={styles.pageTitle}>Agenda de atencion</Text>
        <Muted>
          Revisa tus turnos por fecha o inicia una nueva solicitud cuando necesites atencion.
        </Muted>
      </View>

      {user?.role === 'OWNER' && !isRequestFormOpen ? (
        <Pressable onPress={() => setIsRequestFormOpen(true)} style={styles.requestEntryCard}>
          <View style={styles.requestEntryIcon}>
            <CalendarDays color={colors.primaryDark} size={28} strokeWidth={2.4} />
          </View>
          <View style={styles.requestEntryText}>
            <Text style={styles.requestEntryTitle}>Solicitar turno</Text>
            <Muted>Elegir mascota, veterinario/a, día y horario disponible.</Muted>
          </View>
          <ChevronRight color={colors.muted} size={22} strokeWidth={2.4} />
        </Pressable>
      ) : null}

      {user?.role === 'OWNER' && isRequestFormOpen ? (
        <Card>
          <Pressable onPress={() => setIsRequestFormOpen(false)} style={styles.backToAgendaButton}>
            <ChevronLeft color={colors.text} size={21} strokeWidth={2.4} />
            <Text style={styles.backToAgendaText}>Volver a turnos</Text>
          </Pressable>

          <View style={styles.formHeaderText}>
            <SectionTitle>Solicitar turno</SectionTitle>
            <Muted>El veterinario/a debe aprobar la solicitud antes de quedar confirmada.</Muted>
          </View>

          {petsQuery.isLoading || vetsQuery.isLoading ? (
            <Muted>Cargando datos para solicitud...</Muted>
          ) : null}
          {petsQuery.data?.length === 0 ? (
            <View style={styles.actionEmptyState}>
              <Muted>Primero registra una mascota para solicitar turno.</Muted>
              <Pressable onPress={() => router.push('/pets/new')} style={styles.actionEmptyButton}>
                <Text style={styles.actionEmptyButtonText}>Registrar mascota</Text>
              </Pressable>
            </View>
          ) : null}
          {vetsQuery.data?.length === 0 ? (
            <Muted>
              Todavía no hay veterinarios/as habilitados. Un administrador debe crear uno
              antes de que puedas solicitar turnos.
            </Muted>
          ) : null}
          {scheduleQuery.isLoading ? <Muted>Cargando horarios disponibles...</Muted> : null}

          <PickerSection icon="pet" title="Mascota">
            <View style={styles.selector}>
              {petsQuery.data?.map((pet) => (
                <Pressable
                  key={pet.id}
                  onPress={() => setSelectedPetId(pet.id)}
                  style={[styles.chip, selectedPetId === pet.id && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{pet.name}</Text>
                </Pressable>
              ))}
            </View>
          </PickerSection>

          <PickerSection icon="vet" title="Veterinario/a">
            <View style={styles.selector}>
              {vetsQuery.data?.map((vet) => (
                <Pressable
                  key={vet.id}
                  onPress={() => setSelectedVetId(vet.id)}
                  style={[styles.chip, selectedVetId === vet.id && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{vet.clinicName}</Text>
                </Pressable>
              ))}
            </View>
          </PickerSection>

          <PickerSection icon="calendar" title="Dia">
            <CalendarPicker
              month={calendarMonth}
              selectedDate={selectedDate}
              today={today}
              onChangeMonth={setCalendarMonth}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime('');
              }}
            />
          </PickerSection>

          <PickerSection icon="time" title="Horario">
            {!selectedSchedule?.isEnabled ? (
              <Muted>El veterinario/a no atiende turnos ese día.</Muted>
            ) : null}
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const disabled = isPastSlot(selectedDate, slot, today);

                return (
                  <Pressable
                    key={slot}
                    disabled={disabled}
                    onPress={() => setSelectedTime(slot)}
                    style={[
                      styles.timeSlot,
                      selectedTime === slot && styles.timeSlotActive,
                      disabled && styles.timeSlotDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        selectedTime === slot && styles.timeSlotTextActive,
                        disabled && styles.timeSlotTextDisabled,
                      ]}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </PickerSection>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Solicitud seleccionada</Text>
            <Muted>
              {selectedDate ? formatDateOnly(selectedDate) : 'Sin dia'}{' '}
              {selectedTime ? `a las ${selectedTime}` : '- elegi un horario'}
            </Muted>
            {selectedSchedule ? (
              <Muted>
                Horario configurado: {selectedSchedule.startTime} a {selectedSchedule.endTime}
              </Muted>
            ) : null}
          </View>

          <TextInput
            multiline
            onChangeText={setReason}
            placeholder="Motivo opcional"
            style={[styles.input, styles.textArea]}
            value={reason}
          />

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {createAppointment.error ? (
            <Text style={styles.error}>
              {createAppointment.error instanceof Error
                ? createAppointment.error.message
                : 'No se pudo solicitar el turno.'}
            </Text>
          ) : null}

          <Pressable
            disabled={createAppointment.isPending}
            onPress={handleCreateAppointment}
            style={[styles.button, createAppointment.isPending && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {createAppointment.isPending ? 'Enviando solicitud...' : 'Enviar solicitud de turno'}
            </Text>
          </Pressable>

          <Pressable onPress={() => setIsRequestFormOpen(false)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancelar y volver a turnos</Text>
          </Pressable>
        </Card>
      ) : null}

      {!isRequestFormOpen || user?.role !== 'OWNER' ? (
      <Card>
        <SectionTitle>Agenda</SectionTitle>
        {appointmentsQuery.isLoading ? <Muted>Cargando turnos...</Muted> : null}
        {appointmentsQuery.error ? <Muted>No se pudieron cargar los turnos.</Muted> : null}
        {appointments.length === 0 ? (
          <Muted>{emptyAppointmentsText(user?.role)}</Muted>
        ) : null}

        <AgendaCalendar
          appointmentCountsByDate={appointmentCountsByDate}
          month={agendaMonth}
          selectedDate={selectedAgendaDate}
          onChangeMonth={setAgendaMonth}
          onSelectDate={setSelectedAgendaDate}
        />

        <FilterGroup title="Estado">
          {agendaStatusFilters.map((status) => (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[styles.chip, statusFilter === status && styles.chipActive]}
            >
              <Text style={styles.chipText}>
                {status === 'ALL' ? 'Todos' : appointmentStatusLabel(status)}
              </Text>
            </Pressable>
          ))}
        </FilterGroup>

        <View style={styles.selectedDayBox}>
          <View style={styles.selectedDayText}>
            <Text style={styles.summaryTitle}>
              {selectedAgendaDate
                ? `Turnos del ${formatDateOnly(selectedAgendaDate)}`
                : 'Todos los turnos'}
            </Text>
            <Muted>
              {filteredAppointments.length} resultado
              {filteredAppointments.length === 1 ? '' : 's'} para la vista actual.
            </Muted>
          </View>
          <Pressable onPress={() => setSelectedAgendaDate(null)} style={styles.clearDayButton}>
            <Text style={styles.clearDayButtonText}>Ver todos</Text>
          </Pressable>
        </View>

        {filteredAppointments.length === 0 && appointments.length > 0 ? (
          <Muted>No hay turnos para los filtros seleccionados.</Muted>
        ) : null}

        {filteredAppointments.map((item) => (
          <View key={item.id} style={styles.appointment}>
            <View style={styles.header}>
              <Text style={styles.title}>{item.pet.name}</Text>
              <Badge>{appointmentStatusLabel(item.status)}</Badge>
            </View>
            <Muted>{formatAppointmentDate(item.scheduledAt)}</Muted>
            <Text style={styles.vet}>{item.vet.clinicName}</Text>
            {item.reason ? <Text style={styles.description}>{item.reason}</Text> : null}

            {user?.role === 'VET' || user?.role === 'ADMIN' ? (
              <View style={styles.statusRow}>
                {statusOptions.map((status) => (
                  <Pressable
                    key={status}
                    disabled={updateStatus.isPending || item.status === status}
                    onPress={() =>
                      updateStatus.mutate({
                        appointmentId: item.id,
                        status,
                      })
                    }
                    style={[
                      styles.statusButton,
                      item.status === status && styles.statusButtonActive,
                    ]}
                  >
                    <Text style={styles.statusButtonText}>
                      {appointmentStatusLabel(status)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </Card>
      ) : null}
    </Screen>
  );
}

function FilterGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.selector}>{children}</View>
    </View>
  );
}

function PickerSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: 'pet' | 'vet' | 'calendar' | 'time';
  title: string;
}) {
  return (
    <View style={styles.pickerSection}>
      <View style={styles.pickerTitleRow}>
        <View style={styles.smallIconCircle}>
          <PickerIcon kind={icon} />
        </View>
        <Text style={styles.pickerTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PickerIcon({ kind }: { kind: 'pet' | 'vet' | 'calendar' | 'time' }) {
  const props = { color: colors.primaryDark, size: 20, strokeWidth: 2.4 };

  if (kind === 'pet') {
    return <PawPrint {...props} />;
  }

  if (kind === 'vet') {
    return <Stethoscope {...props} />;
  }

  if (kind === 'time') {
    return <Clock {...props} />;
  }

  return <CalendarDays {...props} />;
}

function CalendarPicker({
  month,
  selectedDate,
  today,
  onChangeMonth,
  onSelectDate,
}: {
  month: Date;
  selectedDate: string;
  today: Date;
  onChangeMonth: (month: Date) => void;
  onSelectDate: (date: string) => void;
}) {
  const days = buildCalendarDays(month);

  function moveMonth(offset: number) {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => moveMonth(-1)} style={styles.monthButton}>
          <ChevronLeft color={colors.text} size={21} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonthTitle(month)}</Text>
        <Pressable onPress={() => moveMonth(1)} style={styles.monthButton}>
          <ChevronRight color={colors.text} size={21} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.weekGrid}>
        {weekDays.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {days.map((day) => {
          const isoDate = day.date ? toIsoDate(day.date) : '';
          const isSelected = isoDate === selectedDate;
          const isDisabled = !day.date || startOfDay(day.date).getTime() < today.getTime();

          return (
            <Pressable
              key={day.key}
              disabled={isDisabled}
              onPress={() => onSelectDate(isoDate)}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellActive,
                isDisabled && styles.dayCellDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextActive,
                  isDisabled && styles.dayTextDisabled,
                ]}
              >
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AgendaCalendar({
  appointmentCountsByDate,
  month,
  selectedDate,
  onChangeMonth,
  onSelectDate,
}: {
  appointmentCountsByDate: Map<string, number>;
  month: Date;
  selectedDate: string | null;
  onChangeMonth: (month: Date) => void;
  onSelectDate: (date: string) => void;
}) {
  const days = buildCalendarDays(month);

  function moveMonth(offset: number) {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  return (
    <View style={styles.agendaCalendar}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => moveMonth(-1)} style={styles.monthButton}>
          <ChevronLeft color={colors.text} size={21} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonthTitle(month)}</Text>
        <Pressable onPress={() => moveMonth(1)} style={styles.monthButton}>
          <ChevronRight color={colors.text} size={21} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.weekGrid}>
        {weekDays.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {days.map((day) => {
          const isoDate = day.date ? toIsoDate(day.date) : '';
          const count = appointmentCountsByDate.get(isoDate) ?? 0;
          const isSelected = isoDate === selectedDate;

          return (
            <Pressable
              key={day.key}
              disabled={!day.date}
              onPress={() => onSelectDate(isoDate)}
              style={[
                styles.agendaDayCell,
                isSelected && styles.dayCellActive,
                !day.date && styles.dayCellDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextActive,
                  !day.date && styles.dayTextDisabled,
                ]}
              >
                {day.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.dayCountBadge, isSelected && styles.dayCountBadgeActive]}>
                  <Text
                    style={[
                      styles.dayCountText,
                      isSelected && styles.dayCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              ) : (
                <View style={styles.dayCountPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const days: Array<{ key: string; label: string; date?: Date }> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push({ key: `empty-start-${index}`, label: '' });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    days.push({ key: toIsoDate(date), label: String(day), date });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `empty-end-${days.length}`, label: '' });
  }

  return days;
}

function countAppointmentsByDate(appointments: Array<{ scheduledAt: string }>) {
  const counts = new Map<string, number>();

  appointments.forEach((appointment) => {
    const date = toIsoDate(new Date(appointment.scheduledAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });

  return counts;
}

function findInitialAgendaDate(appointments: Array<{ scheduledAt: string }>) {
  const now = new Date();
  const sortedDates = appointments
    .map((appointment) => new Date(appointment.scheduledAt))
    .sort((a, b) => a.getTime() - b.getTime());
  const upcomingDate = sortedDates.find((date) => date.getTime() >= startOfDay(now).getTime());

  return toIsoDate(upcomingDate ?? sortedDates[0]);
}

function monthFromIsoDate(value: string) {
  const [year, month] = value.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

function buildTimeSlotsFromSetting(setting: ScheduleSetting) {
  const slots: string[] = [];
  const start = timeToMinutes(setting.startTime);
  const end = timeToMinutes(setting.endTime);

  for (let minutes = start; minutes <= end; minutes += setting.intervalMinutes) {
    slots.push(minutesToTime(minutes));
  }

  return slots;
}

function scheduleForDate(date: string, settings: ScheduleSetting[]) {
  const [year, month, day] = date.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  const scope = dayOfWeek === 0 ? 'SUNDAY' : dayOfWeek === 6 ? 'SATURDAY' : 'WEEKDAY';

  return settings.find((setting) => setting.scope === scope);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isPastSlot(date: string, time: string, today: Date) {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const slotDate = new Date(year, month - 1, day, hours, minutes);

  return slotDate.getTime() <= now.getTime() && date === toIsoDate(today);
}

function formatMonthTitle(value: Date) {
  return value.toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  });
}

function formatAppointmentDate(value: string) {
  const date = new Date(value);
  const dateText = formatDateOnly(toIsoDate(date));
  const timeText = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateText} ${timeText}`;
}

function emptyAppointmentsText(role?: 'OWNER' | 'VET' | 'ADMIN') {
  if (role === 'OWNER') {
    return 'No tenes turnos registrados. Si ya cargaste una mascota y hay veterinarios/as disponibles, completa la solicitud de turno arriba.';
  }

  if (role === 'VET') {
    return 'No hay turnos asignados a este veterinario/a. Las solicitudes aparecerán acá cuando los propietarios pidan turnos.';
  }

  return 'No hay turnos registrados en el sistema.';
}

const styles = StyleSheet.create({
  screenHeader: {
    gap: spacing.xs,
  },
  requestEntryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md,
  },
  requestEntryIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  requestEntryText: {
    flex: 1,
    gap: 3,
  },
  requestEntryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  formHeaderText: {
    gap: 3,
  },
  backToAgendaButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  backToAgendaText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
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
    fontWeight: '900',
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pageTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  pickerSection: {
    gap: spacing.sm,
  },
  pickerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  smallIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterGroup: {
    gap: spacing.xs,
  },
  filterTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  actionEmptyState: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionEmptyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionEmptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
  calendar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  agendaCalendar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  weekGrid: {
    flexDirection: 'row',
  },
  weekDay: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    flexBasis: '14.2857%',
    justifyContent: 'center',
    padding: 2,
  },
  agendaDayCell: {
    alignItems: 'center',
    aspectRatio: 0.9,
    flexBasis: '14.2857%',
    gap: 2,
    justifyContent: 'center',
    padding: 2,
  },
  dayCellActive: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  dayCellDisabled: {
    opacity: 0.38,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  dayTextDisabled: {
    color: colors.muted,
  },
  dayCountBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 18,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 5,
  },
  dayCountBadgeActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  dayCountText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  dayCountTextActive: {
    color: colors.primaryDark,
  },
  dayCountPlaceholder: {
    minHeight: 18,
  },
  selectedDayBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  selectedDayText: {
    flex: 1,
    gap: 2,
  },
  clearDayButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearDayButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeSlot: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 74,
    flexGrow: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  timeSlotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotDisabled: {
    opacity: 0.38,
  },
  timeSlotText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  timeSlotTextActive: {
    color: '#ffffff',
  },
  timeSlotTextDisabled: {
    color: colors.muted,
  },
  summaryBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    padding: spacing.md,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  vet: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  appointment: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusButtonActive: {
    opacity: 0.55,
  },
  statusButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
});
