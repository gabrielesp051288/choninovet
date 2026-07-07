import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Card, Muted, Screen, SectionTitle } from './components';
import {
  useConversationMessages,
  useConversations,
  useCreateConversation,
  useSendMessage,
} from './hooks/use-conversations';
import { useOwnerPets } from './hooks/use-owner-dashboard';
import { useVets } from './hooks/use-vets';
import { useRequireRole } from './lib/auth-routing';
import type { Conversation } from './lib/types';
import { useAuthStore } from './stores/auth-store';
import { colors, spacing } from './theme';

export default function MessagesScreen() {
  const { isAllowed } = useRequireRole(['OWNER', 'VET', 'ADMIN']);
  const user = useAuthStore((state) => state.user);
  const conversationsQuery = useConversations();
  const petsQuery = useOwnerPets();
  const vetsQuery = useVets();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [selectedVetId, setSelectedVetId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const messagesQuery = useConversationMessages(selectedConversationId);
  const conversations = useMemo(
    () => sortConversations(conversationsQuery.data ?? []),
    [conversationsQuery.data],
  );

  useEffect(() => {
    if (!selectedConversationId && conversations[0]) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedVetId && vetsQuery.data?.[0]) {
      setSelectedVetId(vetsQuery.data[0].id);
    }
  }, [selectedVetId, vetsQuery.data]);

  async function handleCreateConversation() {
    setFormError(null);

    if (!selectedVetId) {
      setFormError('Selecciona una veterinaria.');
      return;
    }

    const conversation = await createConversation.mutateAsync({
      vetProfileId: selectedVetId,
      petId: selectedPetId || undefined,
      associateVetFirst: Boolean(selectedPetId),
    });

    setSelectedConversationId(conversation.id);
  }

  async function handleSendMessage() {
    setFormError(null);

    if (!selectedConversationId || !messageBody.trim()) {
      setFormError('Selecciona una conversacion y escribe un mensaje.');
      return;
    }

    await sendMessage.mutateAsync({
      conversationId: selectedConversationId,
      body: messageBody.trim(),
    });

    setMessageBody('');
  }

  if (!isAllowed) {
    return (
      <Screen>
        <Card>
          <SectionTitle>Acceso requerido</SectionTitle>
          <Muted>Inicia sesion para ver mensajes.</Muted>
        </Card>
      </Screen>
    );
  }

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  return (
    <Screen>
      <SectionTitle>Mensajes</SectionTitle>

      {user?.role === 'OWNER' ? (
        <Card>
          <SectionTitle>Nueva conversacion</SectionTitle>
          {vetsQuery.isLoading ? <Muted>Cargando veterinarias...</Muted> : null}
          {vetsQuery.data?.length === 0 ? (
            <Muted>
              Todavia no hay veterinarias habilitadas. Cuando administracion cree una,
              podras iniciar una conversacion desde aca.
            </Muted>
          ) : null}

          <View style={styles.selector}>
            {vetsQuery.data?.map((vet) => (
              <Pressable
                key={vet.id}
                onPress={() => setSelectedVetId(vet.id)}
                style={[styles.chip, selectedVetId === vet.id && styles.chipActive]}
              >
                <Text style={styles.chipText}>{vet.clinicName}</Text>
              </Pressable>
            ))}
          </View>

          <Muted>Mascota opcional</Muted>
          <View style={styles.selector}>
            <Pressable
              onPress={() => setSelectedPetId('')}
              style={[styles.chip, selectedPetId === '' && styles.chipActive]}
            >
              <Text style={styles.chipText}>Sin mascota</Text>
            </Pressable>
            {petsQuery.data?.map((pet) => (
              <Pressable
                key={pet.id}
                onPress={() => setSelectedPetId(pet.id)}
                style={[styles.chip, selectedPetId === pet.id && styles.chipActive]}
              >
                <Text style={styles.chipText}>{pet.name}</Text>
              </Pressable>
            ))}
          </View>

          {createConversation.error ? (
            <Text style={styles.error}>
              {createConversation.error instanceof Error
                ? createConversation.error.message
                : 'No se pudo crear la conversacion.'}
            </Text>
          ) : null}

          <Pressable
            disabled={createConversation.isPending}
            onPress={handleCreateConversation}
            style={[
              styles.button,
              createConversation.isPending && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {createConversation.isPending ? 'Creando...' : 'Crear conversacion'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Conversaciones</SectionTitle>
        {conversationsQuery.isLoading ? <Muted>Cargando conversaciones...</Muted> : null}
        {conversationsQuery.error ? (
          <Muted>No se pudieron cargar las conversaciones.</Muted>
        ) : null}
        {conversations.length === 0 ? (
          <Muted>{conversationEmptyText(user?.role)}</Muted>
        ) : null}

        <View style={styles.selector}>
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages?.[0];
            const hasUnread = Boolean(lastMessage && lastMessage.sender.id !== user?.id);

            return (
            <Pressable
              key={conversation.id}
              onPress={() => setSelectedConversationId(conversation.id)}
              style={[
                styles.conversationChip,
                selectedConversationId === conversation.id && styles.chipActive,
              ]}
            >
              <View style={styles.conversationHeader}>
                <Text style={styles.chipText}>{conversation.vet.clinicName}</Text>
                {hasUnread ? <Badge>Nuevo</Badge> : null}
              </View>
              {conversation.pet ? <Muted>{conversation.pet.name}</Muted> : null}
              {lastMessage ? (
                <>
                  <Text style={styles.preview} numberOfLines={2}>
                    {lastMessage.body}
                  </Text>
                  <Muted>{formatDate(conversation.updatedAt)}</Muted>
                </>
              ) : null}
            </Pressable>
          );
          })}
        </View>
      </Card>

      <Card>
        <View style={styles.header}>
          <SectionTitle>Detalle</SectionTitle>
          {selectedConversation?.pet ? <Badge>{selectedConversation.pet.name}</Badge> : null}
        </View>

        {!selectedConversationId ? <Muted>Selecciona una conversacion.</Muted> : null}
        {messagesQuery.isLoading ? <Muted>Cargando mensajes...</Muted> : null}
        {messagesQuery.error ? <Muted>No se pudieron cargar los mensajes.</Muted> : null}
        {messagesQuery.data?.length === 0 ? (
          <Muted>Todavia no hay mensajes en esta conversacion.</Muted>
        ) : null}

        {messagesQuery.data?.map((message) => (
          <View key={message.id} style={styles.message}>
            <View style={styles.header}>
              <Text style={styles.from}>{roleLabel(message.sender.role)}</Text>
              <Muted>{formatDate(message.createdAt)}</Muted>
            </View>
            <Text style={styles.text}>{message.body}</Text>
          </View>
        ))}

        <View style={styles.form}>
          <TextInput
            multiline
            onChangeText={setMessageBody}
            placeholder="Escribir mensaje"
            style={[styles.input, styles.textArea]}
            value={messageBody}
          />
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {sendMessage.error ? (
          <Text style={styles.error}>
            {sendMessage.error instanceof Error
              ? sendMessage.error.message
              : 'No se pudo enviar el mensaje.'}
          </Text>
        ) : null}

        <Pressable
          disabled={sendMessage.isPending}
          onPress={handleSendMessage}
          style={[styles.button, sendMessage.isPending && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {sendMessage.isPending ? 'Enviando...' : 'Enviar mensaje'}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function roleLabel(role: 'OWNER' | 'VET' | 'ADMIN') {
  if (role === 'OWNER') {
    return 'Propietario';
  }

  if (role === 'VET') {
    return 'Veterinaria';
  }

  return 'Administrador';
}

function conversationEmptyText(role?: 'OWNER' | 'VET' | 'ADMIN') {
  if (role === 'OWNER') {
    return 'Todavia no tenes conversaciones. Usa Nueva conversacion para escribirle a una veterinaria habilitada.';
  }

  if (role === 'VET') {
    return 'Todavia no hay conversaciones de propietarios. Apareceran aca cuando te escriban.';
  }

  return 'Todavia no hay conversaciones registradas en el sistema.';
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  from: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  text: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  preview: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  message: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  conversationChip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minWidth: 180,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  conversationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  chipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  textArea: {
    minHeight: 82,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
