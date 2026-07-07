import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { Appointment, Pet } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export function useOwnerPets() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['owner-pets'],
    queryFn: () => apiRequest<Pet[]>('/pets', { token }),
    enabled: Boolean(token),
  });
}

export function useOwnerAppointments() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['owner-appointments'],
    queryFn: () => apiRequest<Appointment[]>('/appointments', { token }),
    enabled: Boolean(token),
  });
}
