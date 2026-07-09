import { useRouter } from 'expo-router';
import { LogOut, Menu, ServerCog } from 'lucide-react-native';
import { PropsWithChildren, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Badge({ children }: PropsWithChildren) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function ActionLink({
  href,
  children,
  secondary,
}: PropsWithChildren<{ href: string; secondary?: boolean }>) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(href)}
      style={[styles.button, secondary && styles.buttonSecondary]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>
        {children}
      </Text>
    </Pressable>
  );
}

type SessionMenuProps = {
  onSystemConfig?: () => void;
};

export function SessionMenu({ onSystemConfig }: SessionMenuProps = {}) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [isOpen, setIsOpen] = useState(false);

  function handleLogout() {
    setIsOpen(false);
    logout();
    router.replace('/');
  }

  function handleServerConfig() {
    setIsOpen(false);
    router.push('/server-config');
  }

  function handleSystemConfig() {
    setIsOpen(false);
    onSystemConfig?.();
  }

  return (
    <View style={styles.menuContainer}>
      <Pressable
        accessibilityLabel="Abrir menu de sesion"
        onPress={() => setIsOpen((current) => !current)}
        style={styles.menuButton}
      >
        <Menu color={colors.text} size={24} strokeWidth={2.4} />
      </Pressable>

      {isOpen ? (
        <View style={styles.menuPanel}>
          {onSystemConfig ? (
            <Pressable onPress={handleSystemConfig} style={styles.menuItem}>
              <ServerCog color={colors.text} size={18} strokeWidth={2.4} />
              <Text style={styles.menuText}>Sistema</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleServerConfig} style={styles.menuItem}>
            <ServerCog color={colors.text} size={18} strokeWidth={2.4} />
            <Text style={styles.menuText}>Servidor</Text>
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.menuItem}>
            <LogOut color={colors.danger} size={18} strokeWidth={2.4} />
            <Text style={styles.logoutText}>Cerrar sesion</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 880,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonSecondaryText: {
    color: colors.text,
  },
  menuContainer: {
    alignItems: 'flex-end',
    elevation: 20,
    position: 'relative',
    zIndex: 10000,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    gap: 4,
    width: 48,
  },
  menuPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 20,
    minWidth: 168,
    padding: spacing.xs,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    top: 54,
    zIndex: 10001,
  },
  menuItem: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  menuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
