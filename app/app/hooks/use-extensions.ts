import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { AppExtension } from '../lib/extensions';
import { useAuthStore } from '../stores/auth-store';

export function useActiveExtensions() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['active-extensions'],
    queryFn: () => apiRequest<AppExtension[]>('/extensions/active', { token }),
    enabled: Boolean(token),
  });
}
