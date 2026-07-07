import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import type { Conversation, Message } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

type CreateConversationInput = {
  vetProfileId: string;
  petId?: string;
  associateVetFirst?: boolean;
};

type SendMessageInput = {
  conversationId: string;
  body: string;
};

export function useConversations() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<Conversation[]>('/conversations', { token }),
    enabled: Boolean(token),
  });
}

export function useConversationMessages(conversationId?: string) {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () =>
      apiRequest<Message[]>(`/conversations/${conversationId}/messages`, { token }),
    enabled: Boolean(token && conversationId),
  });
}

export function useCreateConversation() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConversationInput) => {
      if (input.associateVetFirst && input.petId) {
        await apiRequest(`/pets/${input.petId}/vets/${input.vetProfileId}`, {
          method: 'POST',
          token,
        });
      }

      return apiRequest<Conversation>('/conversations', {
        method: 'POST',
        token,
        body: {
          vetProfileId: input.vetProfileId,
          petId: input.petId,
        },
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSendMessage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      apiRequest<Message>(`/conversations/${input.conversationId}/messages`, {
        method: 'POST',
        token,
        body: { body: input.body },
      }),
    onSuccess(_message, input) {
      queryClient.invalidateQueries({
        queryKey: ['conversation-messages', input.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
