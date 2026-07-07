import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  MessageCircle,
  PawPrint,
  PlusCircle,
  UserRound,
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
import { useOwnerAppointments, useOwnerPets } from './hooks/use-owner-dashboard';
import { useRequireRole } from './lib/auth-routing';
import { appointmentStatusLabel, petSexLabel } from './lib/labels';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

type OwnerAction = {
  title: string;
  description: string;
  href: string;
  icon: 'add-pet' | 'appointments' | 'reminders' | 'messages' | 'profile' | 'notifications';
};

const ownerActions: OwnerAction[] = [
  {
    title: 'Agregar mascota',
    description: 'Registrar un nuevo paciente',
    href: '/pets/new',
    icon: 'add-pet',
  },
  {
    title: 'Turnos',
    description: 'Solicitar o revisar agenda',
    href: '/appointments',
    icon: 'appointments',
  },
  {
    title: 'Recordatorios',
    description: 'Vacunas, controles y alertas',
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
    description: 'Conversaciones con veterinarias',
    href: '/messages',
    icon: 'messages',
  },
  {
    title: 'Perfil',
    description: 'Datos personales y contacto',
    href: '/profile',
    icon: 'profile',
  },
];

export default function OwnerScreen() {
  const router = useRouter();
  const { isAllowed } = useRequireRole(['OWNER']);
  const user = useAuthStore((state) => state.user);
  const petsQuery = useOwnerPets();
  const appointmentsQuery = useOwnerAppointments();
  const firstName = user?.ownerProfile?.firstName ?? 'Propietario';
  const pets = petsQuery.data ?? [];
  const nextAppointment = findNextAppointment(appointmentsQuery.data ?? []);

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso propietario requerido</SectionTitle>
          <Muted>Inicia sesion como propietario para ver esta pantalla.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Propietario</Text>
          <Text style={styles.title}>Hola, {firstName}</Text>
          <Muted>Gestiona tus mascotas, turnos y mensajes desde accesos grandes.</Muted>
        </View>
        <SessionMenu />
      </View>

      <View style={styles.actionGrid}>
        {ownerActions.map((action) => (
          <Pressable
            key={action.href}
            onPress={() => router.push(action.href)}
            style={styles.actionTile}
          >
            <View style={styles.tileTop}>
              <View style={styles.iconCircle}>
                <OwnerActionIcon kind={action.icon} />
              </View>
              <ChevronRight color={colors.muted} size={20} strokeWidth={2.4} />
            </View>
            <Text style={styles.tileTitle}>{action.title}</Text>
            <Text style={styles.tileDescription}>{action.description}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <View style={styles.cardTitleRow}>
          <View style={styles.smallIconCircle}>
            <PawPrint color={colors.primaryDark} size={21} strokeWidth={2.4} />
          </View>
          <View style={styles.cardTitleText}>
            <SectionTitle>Mis mascotas</SectionTitle>
            <Muted>{pets.length} registradas</Muted>
          </View>
        </View>

        {petsQuery.isLoading ? <Muted>Cargando mascotas...</Muted> : null}
        {petsQuery.error ? <Muted>No se pudieron cargar las mascotas.</Muted> : null}
        {!petsQuery.isLoading && pets.length === 0 ? (
          <EmptyState
            actionLabel="Agregar mascota"
            onAction={() => router.push('/pets/new')}
            text="Todavia no registraste mascotas. Carga la primera para poder solicitar turnos y guardar historial."
          />
        ) : null}
        {pets.slice(0, 3).map((pet) => (
          <Pressable
            key={pet.id}
            onPress={() => router.push(`/pet/${pet.id}`)}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{pet.name}</Text>
              <Muted>
                {pet.species}
                {pet.breed ? ` - ${pet.breed}` : ''}
              </Muted>
            </View>
            <Badge>{petSexLabel(pet.sex)}</Badge>
          </Pressable>
        ))}
      </Card>

      <Card>
        <View style={styles.cardTitleRow}>
          <View style={styles.smallIconCircle}>
            <CalendarDays color={colors.primaryDark} size={21} strokeWidth={2.4} />
          </View>
          <View style={styles.cardTitleText}>
            <SectionTitle>Próximo turno</SectionTitle>
            <Muted>Agenda y solicitudes</Muted>
          </View>
        </View>

        {appointmentsQuery.isLoading ? <Muted>Cargando turnos...</Muted> : null}
        {appointmentsQuery.error ? <Muted>No se pudieron cargar los turnos.</Muted> : null}
        {!appointmentsQuery.isLoading && !nextAppointment ? (
          <EmptyState
            actionLabel="Solicitar turno"
            onAction={() => router.push('/appointments')}
            text="No tenes turnos próximos. Solicita uno desde la agenda."
          />
        ) : null}
        {nextAppointment ? (
          <View style={styles.appointmentBox}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{nextAppointment.pet.name}</Text>
              <Badge>{appointmentStatusLabel(nextAppointment.status)}</Badge>
            </View>
            <Muted>
              {formatDate(nextAppointment.scheduledAt)} - {nextAppointment.vet.clinicName}
            </Muted>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

function OwnerActionIcon({ kind }: { kind: OwnerAction['icon'] }) {
  const iconProps = {
    color: colors.primaryDark,
    size: 28,
    strokeWidth: 2.4,
  };

  if (kind === 'add-pet') {
    return <PlusCircle {...iconProps} />;
  }

  if (kind === 'appointments') {
    return <CalendarDays {...iconProps} />;
  }

  if (kind === 'reminders') {
    return <Bell {...iconProps} />;
  }

  if (kind === 'notifications') {
    return <Bell {...iconProps} />;
  }

  if (kind === 'profile') {
    return <UserRound {...iconProps} />;
  }

  return <MessageCircle {...iconProps} />;
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function findNextAppointment<T extends { scheduledAt: string }>(appointments: T[]) {
  const now = new Date();

  return appointments
    .filter((appointment) => new Date(appointment.scheduledAt).getTime() >= now.getTime())
    .sort(
      (first, second) =>
        new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime(),
    )[0];
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
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  appointmentBox: {
    gap: spacing.xs,
  },
});
