import { StyleSheet, Text, View } from 'react-native';
import { ActionLink, Card, Muted, Screen } from './components';
import { colors, spacing } from './theme';

export default function VetAppScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Veterinarios/as</Text>
        <Text style={styles.title}>Panel de trabajo para profesionales veterinarios/as</Text>
        <Text style={styles.body}>
          Gestiona pacientes, turnos, historial medico, recordatorios y mensajes
          desde una experiencia separada para profesionales veterinarios/as.
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Acceso profesional</Text>
        <Muted>
          Las cuentas de veterinario/a son habilitadas por administración. No se
          crean desde el registro publico.
        </Muted>
        <ActionLink href="/login?role=VET">Iniciar sesión veterinario/a</ActionLink>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Necesito alta</Text>
        <Muted>
          En el MVP el alta se gestiona internamente desde el rol administrador.
        </Muted>
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
