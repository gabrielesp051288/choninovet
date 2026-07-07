import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { Appointment, Pet } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export function useVetPets() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['vet-pets'],
    queryFn: () => apiRequest<Pet[]>('/pets', { token }),
    enabled: Boolean(token),
  });
}

export function useVetAppointments() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['vet-appointments'],
    queryFn: () => apiRequest<Appointment[]>('/appointments', { token }),
    enabled: Boolean(token),
  });
}
