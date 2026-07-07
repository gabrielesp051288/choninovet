import { useNavigationContainerRef, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore, type UserRole } from '../stores/auth-store';

export function routeForRole(role: UserRole) {
  if (role === 'VET') {
    return '/vet';
  }

  if (role === 'ADMIN') {
    return '/admin';
  }

  return '/owner';
}

export function useRequireRole(allowedRoles: UserRole[]) {
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const isAllowed = user ? allowedRoles.includes(user.role) : false;

  useEffect(() => {
    if (navigationRef.isReady()) {
      setIsNavigationReady(true);
      return;
    }

    const interval = setInterval(() => {
      if (navigationRef.isReady()) {
        setIsNavigationReady(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [navigationRef]);

  useEffect(() => {
    if (!isHydrated || !isNavigationReady || !navigationRef.isReady()) {
      return;
    }

    if (!user) {
      router.replace('/');
      return;
    }

    if (!isAllowed) {
      router.replace(routeForRole(user.role));
    }
  }, [isAllowed, isHydrated, isNavigationReady, navigationRef, router, user]);

  return {
    user,
    isAllowed,
    isHydrated,
    isNavigationReady,
  };
}
