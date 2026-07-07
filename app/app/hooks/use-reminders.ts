import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { Reminder, ReminderType } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

type CreateReminderInput = {
  petId: string;
  type: ReminderType;
  title: string;
  description?: string;
  dueAt: string;
};

export function useReminders() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['reminders'],
    queryFn: () => apiRequest<Reminder[]>('/reminders', { token }),
    enabled: Boolean(token),
  });
}

export function useCreateReminder() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReminderInput) =>
      apiRequest<Reminder>('/reminders', {
        method: 'POST',
        token,
        body: input,
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useCompleteReminder() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reminderId: string) =>
      apiRequest<Reminder>(`/reminders/${reminderId}/complete`, {
        method: 'PATCH',
        token,
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
