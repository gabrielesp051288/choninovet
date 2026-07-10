import { useRouter } from 'expo-router';
import { ChevronLeft, PawPrint } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, Muted, Screen, SectionTitle } from './components';
import { useVetPets } from './hooks/use-vet-dashboard';
import { buildApiAssetUrl } from './lib/api';
import { useRequireRole } from './lib/auth-routing';
import { petSexLabel } from './lib/labels';
import type { Pet } from './lib/types';
import { colors, spacing } from './theme';

export default function VetPatientsScreen() {
  const router = useRouter();
  const { isAllowed } = useRequireRole(['VET']);
  const petsQuery = useVetPets();
  const pets = petsQuery.data ?? [];

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso veterinario/a requerido</SectionTitle>
          <Muted>Inicia sesión como veterinario/a para ver pacientes.</Muted>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.replace('/vet')} style={styles.backButton}>
        <ChevronLeft color={colors.text} size={21} strokeWidth={2.4} />
        <Text style={styles.backButtonText}>Volver al panel</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.kicker}>Pacientes</Text>
        <Text style={styles.title}>Pacientes asociados</Text>
        <Muted>Fichas de mascotas vinculadas al veterinario/a.</Muted>
      </View>

      <Card>
        <View style={styles.cardTitleRow}>
          <View style={styles.smallIconCircle}>
            <PawPrint color={colors.primaryDark} size={21} strokeWidth={2.4} />
          </View>
          <View style={styles.cardTitleText}>
            <SectionTitle>Listado de pacientes</SectionTitle>
            <Muted>{pets.length} mascotas asociadas.</Muted>
          </View>
        </View>

        {petsQuery.isLoading ? <Muted>Cargando pacientes...</Muted> : null}
        {petsQuery.error ? <Muted>No se pudieron cargar los pacientes.</Muted> : null}
        {!petsQuery.isLoading && pets.length === 0 ? (
          <EmptyState text="Todavía no hay pacientes asociados. Los pacientes aparecen cuando un propietario solicita un turno o vincula una mascota con este veterinario/a." />
        ) : null}

        {pets.map((pet) => (
          <Pressable key={pet.id} onPress={() => router.push(`/pet/${pet.id}`)} style={styles.row}>
            <PetThumb name={pet.name} photoUrl={pet.photoUrl} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{pet.name}</Text>
              <Muted>
                {formatOwner(pet.owner)} - {pet.species}
                {pet.breed ? ` - ${pet.breed}` : ''}
              </Muted>
            </View>
            <Badge>{petSexLabel(pet.sex)}</Badge>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Muted>{text}</Muted>
    </View>
  );
}

function formatOwner(owner?: Pet['owner']) {
  return owner ? `${owner.firstName} ${owner.lastName}` : 'Sin propietario';
}

function PetThumb({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const imageUrl = buildApiAssetUrl(photoUrl);

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={styles.petThumb} />;
  }

  return (
    <View style={styles.petThumbPlaceholder}>
      <Text style={styles.petThumbPlaceholderText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  header: {
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
  petThumb: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    width: 48,
  },
  petThumbPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  petThumbPlaceholderText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
  },
  rowTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyState: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
