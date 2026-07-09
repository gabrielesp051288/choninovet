import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarClock,
  ChevronRight,
  MessageCircle,
  Stethoscope,
  UserRound,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  Muted,
  Screen,
  SectionTitle,
  SessionMenu,
} from './components';
import { useVetAppointments, useVetPets } from './hooks/use-vet-dashboard';
import { useRequireRole } from './lib/auth-routing';
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
  const clinicName = user?.vetProfile?.clinicName ?? 'Veterinario/a';
  const appointments = appointmentsQuery.data ?? [];
  const pendingAppointments = appointments.filter((item) => item.status === 'REQUESTED');
  const upcomingConfirmedAppointments = appointments.filter(
    (item) => item.status === 'CONFIRMED' && isFutureAppointment(item.scheduledAt),
  );
  const todayAppointments = appointments.filter((item) => isToday(item.scheduledAt));

  const actions: VetAction[] = [
    {
      title: 'Agenda y solicitudes',
      description: 'Calendario, aprobaciones y turnos',
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
});
