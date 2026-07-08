import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  MessageCircle,
  Stethoscope,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Card,
  Muted,
  Screen,
  SectionTitle,
  SessionMenu,
} from './components';
import { useUpdateAppointmentStatus } from './hooks/use-appointments';
import { useVetAppointments, useVetPets } from './hooks/use-vet-dashboard';
import { useRequireRole } from './lib/auth-routing';
import { formatDateOnly } from './lib/dates';
import { appointmentStatusLabel } from './lib/labels';
import type { Appointment } from './lib/types';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

type VetAction = {
  title: string;
  description: string;
  href: string;
  icon: 'agenda' | 'patients' | 'reminders' | 'messages' | 'profile' | 'notifications';
  count?: number;
};

export default function VetScreen() {
  const router = useRouter();
  const { isAllowed } = useRequireRole(['VET']);
  const user = useAuthStore((state) => state.user);
  const petsQuery = useVetPets();
  const appointmentsQuery = useVetAppointments();
  const updateStatus = useUpdateAppointmentStatus();
  const clinicName = user?.vetProfile?.clinicName ?? 'Veterinario/a';
  const appointments = appointmentsQuery.data ?? [];
  const pendingAppointments = appointments.filter((item) => item.status === 'REQUESTED');
  const upcomingConfirmedAppointments = appointments.filter(
    (item) => item.status === 'CONFIRMED' && isFutureAppointment(item.scheduledAt),
  );
  const todayAppointments = appointments.filter((item) => isToday(item.scheduledAt));

  const actions: VetAction[] = [
    {
      title: 'Solicitudes',
      description: 'Aprobar o rechazar turnos',
      href: '/appointments',
      icon: 'agenda',
      count: pendingAppointments.length,
    },
    {
      title: 'Pacientes',
      description: 'Fichas e historial medico',
      href: '/vet-patients',
      icon: 'patients',
      count: petsQuery.data?.length ?? 0,
    },
    {
      title: 'Recordatorios',
      description: 'Controles y vacunas',
      href: '/reminders',
      icon: 'reminders',
    },
    {
      title: 'Alertas',
      description: 'Pendientes y avisos',
      href: '/notifications',
      icon: 'notifications',
    },
    {
      title: 'Mensajes',
      description: 'Consultas de propietarios',
      href: '/messages',
      icon: 'messages',
    },
    {
      title: 'Perfil',
      description: 'Datos profesionales y contacto',
      href: '/profile',
      icon: 'profile',
    },
  ];

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso veterinario/a requerido</SectionTitle>
          <Muted>Inicia sesión como veterinario/a para ver esta pantalla.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Veterinario/a</Text>
          <Text style={styles.title}>{clinicName}</Text>
          <Muted>Gestiona solicitudes, agenda, pacientes y comunicacion.</Muted>
        </View>
        <SessionMenu />
      </View>

      <View style={styles.actionGrid}>
        {actions.map((action) => (
          <Pressable
            key={action.title}
            onPress={() => router.push(action.href)}
            style={styles.actionTile}
          >
            <View style={styles.tileTop}>
              <View style={styles.iconCircle}>
                <VetActionIcon kind={action.icon} />
              </View>
              {typeof action.count === 'number' ? (
                <Text style={styles.tileMetric}>{action.count}</Text>
              ) : (
                <ChevronRight color={colors.muted} size={20} strokeWidth={2.4} />
              )}
            </View>
            <Text style={styles.tileTitle}>{action.title}</Text>
            <Text style={styles.tileDescription}>{action.description}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Pendientes" value={pendingAppointments.length} />
        <MetricCard label="Próximos" value={upcomingConfirmedAppointments.length} />
        <MetricCard label="Hoy" value={todayAppointments.length} />
      </View>

          <Card>
            <View style={styles.cardTitleRow}>
              <View style={styles.smallIconCircle}>
                <CalendarClock color={colors.primaryDark} size={21} strokeWidth={2.4} />
              </View>
              <View style={styles.cardTitleText}>
                <SectionTitle>Solicitudes pendientes</SectionTitle>
                <Muted>Turnos enviados por propietarios para aprobacion.</Muted>
              </View>
            </View>

            {appointmentsQuery.isLoading ? <Muted>Cargando solicitudes...</Muted> : null}
            {appointmentsQuery.error ? <Muted>No se pudieron cargar los turnos.</Muted> : null}
            {!appointmentsQuery.isLoading && pendingAppointments.length === 0 ? (
              <EmptyState text="No hay solicitudes pendientes de aprobacion. Cuando un propietario pida turno, aparecera aca para aprobarlo o rechazarlo." />
            ) : null}

            {pendingAppointments.slice(0, 5).map((appointment) => (
              <AppointmentRequest
                key={appointment.id}
                appointment={appointment}
                isUpdating={updateStatus.isPending}
                onApprove={() =>
                  updateStatus.mutate({
                    appointmentId: appointment.id,
                    status: 'CONFIRMED',
                  })
                }
                onReject={() =>
                  updateStatus.mutate({
                    appointmentId: appointment.id,
                    status: 'CANCELLED',
                  })
                }
              />
            ))}

            {pendingAppointments.length > 5 ? (
              <Pressable onPress={() => router.push('/appointments')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Ver todas las solicitudes</Text>
              </Pressable>
            ) : null}
          </Card>

          <Card>
            <View style={styles.cardTitleRow}>
              <View style={styles.smallIconCircle}>
                <CalendarCheck color={colors.primaryDark} size={21} strokeWidth={2.4} />
              </View>
              <View style={styles.cardTitleText}>
                <SectionTitle>Agenda confirmada</SectionTitle>
                <Muted>Próximos turnos aprobados.</Muted>
              </View>
            </View>

            {upcomingConfirmedAppointments.length === 0 ? (
              <EmptyState
                actionLabel="Abrir agenda"
                onAction={() => router.push('/appointments')}
                text="Todavía no hay turnos próximos confirmados. Revisa la agenda para ver solicitudes, turnos pasados y turnos por fecha."
              />
            ) : null}
            {upcomingConfirmedAppointments.slice(0, 5).map((appointment) => (
              <Pressable
                key={appointment.id}
                onPress={() => router.push(`/pet/${appointment.pet.id}`)}
                style={styles.row}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{appointment.pet.name}</Text>
                  <Muted>{formatAppointmentDate(appointment.scheduledAt)}</Muted>
                </View>
                <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
              </Pressable>
            ))}
          </Card>

    </Screen>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metric}>{value}</Text>
      <Muted>{label}</Muted>
    </View>
  );
}

function AppointmentRequest({
  appointment,
  isUpdating,
  onApprove,
  onReject,
}: {
  appointment: Appointment;
  isUpdating: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.rowHeader}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{appointment.pet.name}</Text>
          <Muted>{formatAppointmentDate(appointment.scheduledAt)}</Muted>
        </View>
        <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
      </View>
      {appointment.reason ? <Text style={styles.description}>{appointment.reason}</Text> : null}
      <View style={styles.inlineActions}>
        <Pressable
          disabled={isUpdating}
          onPress={onApprove}
          style={[styles.actionButton, isUpdating && styles.buttonDisabled]}
        >
          <CheckCircle color="#ffffff" size={18} strokeWidth={2.4} />
          <Text style={styles.actionButtonText}>Aprobar</Text>
        </Pressable>
        <Pressable
          disabled={isUpdating}
          onPress={onReject}
          style={[styles.actionButton, styles.rejectButton, isUpdating && styles.buttonDisabled]}
        >
          <XCircle color="#ffffff" size={18} strokeWidth={2.4} />
          <Text style={styles.actionButtonText}>Rechazar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function VetActionIcon({ kind }: { kind: VetAction['icon'] }) {
  const props = { color: colors.primaryDark, size: 28, strokeWidth: 2.4 };

  if (kind === 'agenda') {
    return <CalendarClock {...props} />;
  }

  if (kind === 'patients') {
    return <Stethoscope {...props} />;
  }

  if (kind === 'reminders') {
    return <Bell {...props} />;
  }

  if (kind === 'notifications') {
    return <Bell {...props} />;
  }

  if (kind === 'profile') {
    return <UserRound {...props} />;
  }

  return <MessageCircle {...props} />;
}

function EmptyState({
  actionLabel,
  onAction,
  text,
}: {
  actionLabel?: string;
  onAction?: () => void;
  text: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Muted>{text}</Muted>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isFutureAppointment(value: string) {
  return new Date(value).getTime() >= new Date().getTime();
}

function formatAppointmentDate(value: string) {
  const date = new Date(value);
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatDateOnly(isoDate)} ${time}`;
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 128,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  tileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  tileMetric: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  tileTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  tileDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  metric: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardTitleText: {
    flex: 1,
    gap: 2,
  },
  requestCard: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  rejectButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
