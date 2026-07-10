import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiUploadRequest } from '../lib/api';
import type { Pet, PetSex } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export type CreatePetInput = {
  name: string;
  species: string;
  breed?: string;
  sex?: PetSex;
  birthDate?: string;
  weightKg?: number;
  notes?: string;
};

export type UpdatePetInput = Partial<CreatePetInput> & {
  petId: string;
};

export type UploadPetPhotoInput = {
  petId: string;
  uri: string;
  name: string;
  type: string;
};

export function usePet(petId?: string) {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['pet', petId],
    queryFn: () => apiRequest<Pet>(`/pets/${petId}`, { token }),
    enabled: Boolean(token && petId),
  });
}

export function useCreatePet() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePetInput) =>
      apiRequest<Pet>('/pets', {
        method: 'POST',
        token,
        body: input,
      }),
    onSuccess(pet) {
      queryClient.invalidateQueries({ queryKey: ['owner-pets'] });
      queryClient.setQueryData(['pet', pet.id], pet);
    },
  });
}

export function useUpdatePet() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petId, ...input }: UpdatePetInput) =>
      apiRequest<Pet>(`/pets/${petId}`, {
        method: 'PATCH',
        token,
        body: input,
      }),
    onSuccess(pet) {
      queryClient.invalidateQueries({ queryKey: ['owner-pets'] });
      queryClient.invalidateQueries({ queryKey: ['vet-pets'] });
      queryClient.setQueryData(['pet', pet.id], pet);
    },
  });
}

export function useUploadPetPhoto() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petId, uri, name, type }: UploadPetPhotoInput) => {
      const formData = new FormData();
      formData.append('photo', { uri, name, type } as unknown as Blob);

      return apiUploadRequest<Pet>(`/pets/${petId}/photo`, formData, { token });
    },
    onSuccess(pet) {
      queryClient.invalidateQueries({ queryKey: ['owner-pets'] });
      queryClient.invalidateQueries({ queryKey: ['vet-pets'] });
      queryClient.setQueryData(['pet', pet.id], pet);
    },
  });
}
