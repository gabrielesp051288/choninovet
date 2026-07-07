import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { MedicalRecord } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export type MedicalRecordType =
  | 'CONSULTATION'
  | 'VACCINE'
  | 'DEWORMING'
  | 'TREATMENT'
  | 'OBSERVATION';

export type CreateMedicalRecordInput = {
  petId: string;
  type: MedicalRecordType;
  recordDate: string;
  title: string;
  description: string;
  nextCheckAt?: string;
};

export function useMedicalRecords(petId?: string) {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['medical-records', petId],
    queryFn: () =>
      apiRequest<MedicalRecord[]>(`/medical-records/pet/${petId}`, { token }),
    enabled: Boolean(token && petId),
  });
}

export function useCreateMedicalRecord(petId?: string) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMedicalRecordInput) =>
      apiRequest<MedicalRecord>('/medical-records', {
        method: 'POST',
        token,
        body: input,
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['medical-records', petId] });
      queryClient.invalidateQueries({ queryKey: ['pet', petId] });
    },
  });
}
