import { useRouter } from 'expo-router';
import { CalendarClock, ChevronRight, MessageCircle, TriangleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, Muted, Screen, SectionTitle, SessionMenu } from './components';
import { useAppointments } from './hooks/use-appointments';
import { useConversations } from './hooks/use-conversations';
import { useReminders } from './hooks/use-reminders';
import { formatDateOnly } from './lib/dates';
import { appointmentStatusLabel, reminderTypeLabel } from './lib/labels';
import { useRequireRole } from './lib/auth-routing';
import type { Appointment, Conversation, Reminder } from './lib/types';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

type NotificationItem = {
  id: string;
  actionHref: string;
  description: string;
  icon: 'appointment' | 'reminder' | 'message';
  label: string;
  title: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAllowed } = useRequireRole(['OWNER', 'VET', 'ADMIN']);
  const user = useAuthStore((state) => state.user);
  const appointmentsQuery = useAppointments();
  const remindersQuery = useReminders();
  const conversationsQuery = useConversations();
  const notifications = buildNotifications({
    appointments: appointmentsQuery.data ?? [],
    conversations: conversationsQuery.data ?? [],
    reminders: remindersQuery.data ?? [],
    userId: user?.id,
  });

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso requerido</SectionTitle>
          <Muted>Inicia sesion para ver tus notificaciones.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Notificaciones</Text>
          <Text style={styles.title}>Centro de alertas</Text>
          <Muted>Turnos pendientes, recordatorios proximos y mensajes recientes.</Muted>
        </View>
        <SessionMenu />
      </View>

      <View style={styles.metrics}>
        <Metric label="Turnos" value={notifications.filter((item) => item.icon === 'appointment').length} />
        <Metric label="Recordatorios" value={notifications.filter((item) => item.icon === 'reminder').length} />
        <Metric label="Mensajes" value={notifications.filter((item) => item.icon === 'message').length} />
      </View>

      <Card>
        <SectionTitle>Alertas activas</SectionTitle>
        {appointmentsQuery.isLoading || remindersQuery.isLoading || conversationsQuery.isLoading ? (
          <Muted>Cargando alertas...</Muted>
        ) : null}
        {appointmentsQuery.error || remindersQuery.error || conversationsQuery.error ? (
          <Muted>No se pudieron cargar todas las alertas.</Muted>
        ) : null}
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Muted>No hay notificaciones pendientes.</Muted>
          </View>
        ) : null}
        {notifications.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => router.push(notification.actionHref)}
            style={styles.notificationCard}
          >
            <View style={styles.iconCircle}>
              <NotificationIcon kind={notification.icon} />
            </View>
            <View style={styles.notificationText}>
              <View style={styles.rowHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Badge>{notification.label}</Badge>
              </View>
              <Muted>{notification.description}</Muted>
            </View>
            <ChevronRight color={colors.muted} size={20} strokeWidth={2.4} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

function buildNotifications({
  appointments,
  conversations,
  reminders,
  userId,
}: {
  appointments: Appointment[];
  conversations: Conversation[];
  reminders: Reminder[];
  userId?: string;
}) {
  const appointmentItems: NotificationItem[] = appointments
    .filter((appointment) => appointment.status === 'REQUESTED')
    .slice(0, 10)
    .map((appointment) => ({
      id: `appointment-${appointment.id}`,
      actionHref: '/appointments',
      description: `${appointment.pet.name} - ${formatDateTime(appointment.scheduledAt)} - ${appointment.vet.clinicName}`,
      icon: 'appointment',
      label: appointmentStatusLabel(appointment.status),
      title: 'Turno pendiente de aprobacion',
    }));

  const reminderItems: NotificationItem[] = reminders
    .filter((reminder) => reminder.status === 'PENDING' && isUpcoming(reminder.dueAt))
    .slice(0, 10)
    .map((reminder) => ({
      id: `reminder-${reminder.id}`,
      actionHref: '/reminders',
      description: `${reminder.pet.name} - ${formatDateTime(reminder.dueAt)}`,
      icon: 'reminder',
      label: reminderTypeLabel(reminder.type),
      title: reminder.title,
    }));

  const messageItems: NotificationItem[] = conversations
    .filter((conversation) => {
      const lastMessage = conversation.messages?.[0];

      return lastMessage && lastMessage.sender.id !== userId;
    })
    .slice(0, 10)
    .map((conversation) => ({
      id: `message-${conversation.id}`,
      actionHref: '/messages',
      description: conversation.messages?.[0]?.body ?? 'Mensaje nuevo',
      icon: 'message',
      label: 'Mensaje',
      title: conversation.vet.clinicName,
    }));

  return [...appointmentItems, ...reminderItems, ...messageItems];
}

function isUpcoming(value: string) {
  const now = new Date();
  const dueAt = new Date(value);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);

  return dueAt <= limit;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const time = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatDateOnly(value)} ${time}`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Muted>{label}</Muted>
    </View>
  );
}

function NotificationIcon({ kind }: { kind: NotificationItem['icon'] }) {
  const props = { color: colors.primaryDark, size: 24, strokeWidth: 2.4 };

  if (kind === 'appointment') {
    return <CalendarClock {...props} />;
  }

  if (kind === 'message') {
    return <MessageCircle {...props} />;
  }

  return <TriangleAlert {...props} />;
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
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  emptyState: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  notificationCard: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 72,
    paddingTop: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  notificationTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
});
