import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { VaccinationRecord } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export type CreateVaccinationInput = {
  petId: string;
  vaccineName: string;
  brand?: string;
  batchNumber?: string;
  appliedAt: string;
  nextDueAt?: string;
  notes?: string;
};

export function useVaccinations(petId?: string, enabled = true) {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['vaccinations', petId],
    queryFn: () => apiRequest<VaccinationRecord[]>(`/vaccinations/pet/${petId}`, { token }),
    enabled: Boolean(token && petId && enabled),
  });
}

export function useCreateVaccination(petId?: string) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVaccinationInput) =>
      apiRequest<VaccinationRecord>('/vaccinations', {
        method: 'POST',
        token,
        body: input,
    }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['vaccinations', petId] });
      queryClient.invalidateQueries({ queryKey: ['medical-records', petId] });
    },
  });
}
