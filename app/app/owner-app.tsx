import { StyleSheet, Text, View } from 'react-native';
import { ActionLink, Card, Screen } from './components';
import { colors, spacing } from './theme';

export default function OwnerAppScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Propietarios</Text>
        <Text style={styles.title}>La salud de tus mascotas en un solo lugar</Text>
        <Text style={styles.body}>
          Crea tus mascotas, solicita turnos, consulta historial y recibe
          recordatorios de tu veterinaria.
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Ya tengo cuenta</Text>
        <ActionLink href="/login?role=OWNER">Iniciar sesion propietario</ActionLink>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Soy nuevo</Text>
        <ActionLink href="/register" secondary>
          Crear cuenta de propietario
        </ActionLink>
      </Card>
    </Screen>
  );
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
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
