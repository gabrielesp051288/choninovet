import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';

export type ScheduleScope = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY';

export type ScheduleSetting = {
  scope: ScheduleScope;
  isEnabled: boolean;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
};

export const scheduleScopeLabels: Record<ScheduleScope, string> = {
  WEEKDAY: 'Lunes a viernes',
  SATURDAY: 'Sabado',
  SUNDAY: 'Domingo',
};

export const defaultSchedule: ScheduleSetting[] = [
  {
    scope: 'WEEKDAY',
    isEnabled: true,
    startTime: '08:00',
    endTime: '20:00',
    intervalMinutes: 30,
  },
  {
    scope: 'SATURDAY',
    isEnabled: true,
    startTime: '09:00',
    endTime: '13:00',
    intervalMinutes: 30,
  },
  {
    scope: 'SUNDAY',
    isEnabled: false,
    startTime: '09:00',
    endTime: '13:00',
    intervalMinutes: 30,
  },
];

export function useSchedule() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['schedule'],
    queryFn: () => apiRequest<ScheduleSetting[]>('/schedule', { token }),
    enabled: Boolean(token),
  });
}

export function useUpdateSchedule() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: ScheduleSetting[]) =>
      apiRequest<ScheduleSetting[]>('/schedule', {
        method: 'PATCH',
        token,
        body: { settings },
      }),
    onSuccess(settings) {
      queryClient.setQueryData(['schedule'], settings);
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}
