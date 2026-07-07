import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { Appointment, AppointmentStatus } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

type CreateAppointmentInput = {
  petId: string;
  vetProfileId: string;
  scheduledAt: string;
  reason?: string;
  associateVetFirst?: boolean;
};

type UpdateAppointmentStatusInput = {
  appointmentId: string;
  status: AppointmentStatus;
};

export function useAppointments() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiRequest<Appointment[]>('/appointments', { token }),
    enabled: Boolean(token),
  });
}

export function useCreateAppointment() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      if (input.associateVetFirst) {
        await apiRequest(`/pets/${input.petId}/vets/${input.vetProfileId}`, {
          method: 'POST',
          token,
        });
      }

      return apiRequest<Appointment>('/appointments', {
        method: 'POST',
        token,
        body: {
          petId: input.petId,
          vetProfileId: input.vetProfileId,
          scheduledAt: input.scheduledAt,
          reason: input.reason,
        },
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['owner-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['vet-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pets'] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAppointmentStatusInput) =>
      apiRequest<Appointment>(`/appointments/${input.appointmentId}/status`, {
        method: 'PATCH',
        token,
        body: { status: input.status },
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['owner-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['vet-appointments'] });
    },
  });
}
