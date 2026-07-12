import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiBlobRequest, apiRequest, apiUploadRequest } from '../lib/api';
import type { MedicalAttachment, MedicalAttachmentType } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export type UploadMedicalAttachmentInput = {
  petId: string;
  medicalRecordId?: string;
  type: MedicalAttachmentType;
  uri: string;
  name: string;
  mimeType: string;
  file?: File;
};

export function useMedicalAttachments(petId?: string) {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['medical-attachments', petId],
    queryFn: () =>
      apiRequest<MedicalAttachment[]>(`/medical-attachments/pet/${petId}`, { token }),
    enabled: Boolean(token && petId),
  });
}

export function useUploadMedicalAttachment(petId?: string) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadMedicalAttachmentInput) => {
      const formData = new FormData();
      formData.append('type', input.type);

      if (input.medicalRecordId) {
        formData.append('medicalRecordId', input.medicalRecordId);
      }

      if (input.file) {
        formData.append('file', input.file, input.name);
      } else {
        formData.append(
          'file',
          { uri: input.uri, name: input.name, type: input.mimeType } as unknown as Blob,
        );
      }

      return apiUploadRequest<MedicalAttachment>(
        `/medical-attachments/pet/${input.petId}`,
        formData,
        { token },
      );
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['medical-attachments', petId] });
    },
  });
}

export function useDownloadMedicalAttachment() {
  const token = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: async (attachment: MedicalAttachment) => {
      const blob = await apiBlobRequest(`/medical-attachments/${attachment.id}/download`, {
        token,
      });

      if (typeof window === 'undefined') {
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    },
  });
}
