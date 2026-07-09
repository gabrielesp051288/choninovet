import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { PawPrint, ShieldCheck, Stethoscope } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, SectionTitle, Muted } from './components';
import { InitialAdminView } from './initial-admin-view';
import { apiRequest } from './lib/api';
import { APP_NAME, APP_SUBTITLE } from './lib/branding';
import { ServerConfigView } from './server-config-view';
import { useApiConfigStore } from './stores/api-config-store';
import { colors, spacing } from './theme';

type AccessCard = {
  title: string;
  description: string;
  action: string;
  href: '/login?role=OWNER' | '/login?role=VET' | '/login?role=ADMIN';
  icon: 'owner' | 'vet' | 'admin';
};

type SetupStatus = {
  status: 'ready' | 'setup_required';
  needsDatabase: boolean;
  needsMigrations: boolean;
  needsAdmin: boolean;
};

const accessCards: AccessCard[] = [
  {
    title: 'Propietario',
    description: 'Mascotas, turnos, historial medico, recordatorios y mensajes.',
    action: 'Ingresar como propietario',
    href: '/login?role=OWNER',
    icon: 'owner',
  },
  {
    title: 'Veterinario/a',
    description: 'Pacientes, agenda, registros médicos y seguimiento clínico.',
    action: 'Ingresar como veterinario/a',
    href: '/login?role=VET',
    icon: 'vet',
  },
  {
    title: 'Administrador',
    description: 'Panel operativo, veterinarios/as, propietarios, pacientes y alertas.',
    action: 'Ingresar como admin',
    href: '/login?role=ADMIN',
    icon: 'admin',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const apiUrl = useApiConfigStore((state) => state.apiUrl);
  const isHydrated = useApiConfigStore((state) => state.isHydrated);
  const setupStatusQuery = useQuery({
    queryKey: ['setup-status', apiUrl],
    queryFn: () => apiRequest<SetupStatus>('/setup/status'),
    enabled: Boolean(isHydrated && apiUrl),
    retry: 1,
  });

  if (!isHydrated) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      </Screen>
    );
  }

  if (!apiUrl) {
    return <ServerConfigView />;
  }

  if (setupStatusQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Verificando instalación...</Text>
        </View>
      </Screen>
    );
  }

  if (setupStatusQuery.error) {
    return (
      <Screen>
        <Card>
          <SectionTitle>No se pudo verificar la instalación</SectionTitle>
          <Muted>Revisa que la API configurada esté corriendo y vuelve a intentar.</Muted>
          <Pressable
            onPress={() => setupStatusQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  if (setupStatusQuery.data?.needsDatabase || setupStatusQuery.data?.needsMigrations) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Instalación incompleta</SectionTitle>
          <Muted>
            La API responde, pero la base de datos todavía no está lista. Configura la base
            desde el backend o desde el endpoint de setup y vuelve a intentar.
          </Muted>
          <Pressable
            onPress={() => setupStatusQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Revisar nuevamente</Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  if (setupStatusQuery.data?.needsAdmin) {
    return <InitialAdminView onCreated={() => setupStatusQuery.refetch()} />;
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>{APP_NAME}</Text>
        <Text style={styles.title}>{APP_SUBTITLE}</Text>
        <Text style={styles.body}>
          Elige tu tipo de acceso para iniciar sesion en la experiencia correcta.
        </Text>
      </View>

      <View style={styles.cardGrid}>
        {accessCards.map((card) => (
          <Pressable
            key={card.href}
            onPress={() => router.push(card.href)}
            style={styles.accessCard}
          >
            <View style={styles.iconCircle}>
              <AccessIcon kind={card.icon} />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardText}>{card.description}</Text>
              <Text style={styles.actionText}>{card.action}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function AccessIcon({ kind }: { kind: AccessCard['icon'] }) {
  if (kind === 'owner') {
    return <PawPrint color={colors.primaryDark} size={30} strokeWidth={2.4} />;
  }

  if (kind === 'vet') {
    return <Stethoscope color={colors.primaryDark} size={31} strokeWidth={2.4} />;
  }

  return <ShieldCheck color={colors.primaryDark} size={31} strokeWidth={2.4} />;
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 38,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  cardGrid: {
    gap: spacing.sm,
  },
  accessCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 132,
    padding: spacing.md,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  loadingBox: {
    alignItems: 'center',
    minHeight: 240,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
