import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(user: RequestUser) {
    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);

      return this.prisma.conversation.findMany({
        where: { ownerId: ownerProfile.id },
        include: { pet: true, vet: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (user.role === UserRole.VET) {
      const vetProfile = await this.getVetProfile(user.sub);

      return this.prisma.conversation.findMany({
        where: { vetProfileId: vetProfile.id },
        include: { pet: true, vet: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.prisma.conversation.findMany({
      include: { pet: true, vet: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createConversation(user: RequestUser, dto: CreateConversationDto) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can start conversations');
    }

    const ownerProfile = await this.getOwnerProfile(user.sub);

    if (dto.petId) {
      await this.assertOwnerPetAssociation(ownerProfile.id, dto.petId, dto.vetProfileId);
    }

    return this.prisma.conversation.create({
      data: {
        ownerId: ownerProfile.id,
        vetProfileId: dto.vetProfileId,
        petId: dto.petId,
      },
      include: { pet: true, vet: true },
    });
  }

  async listMessages(user: RequestUser, conversationId: string) {
    await this.assertConversationAccess(user, conversationId);

    return this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(user: RequestUser, conversationId: string, dto: SendMessageDto) {
    await this.assertConversationAccess(user, conversationId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: user.sub,
        body: dto.body,
      },
      include: { sender: { select: { id: true, email: true, role: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  private async assertConversationAccess(user: RequestUser, conversationId: string) {
    if (user.role === UserRole.ADMIN) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      return conversation;
    }

    if (user.role === UserRole.OWNER) {
      const ownerProfile = await this.getOwnerProfile(user.sub);
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, ownerId: ownerProfile.id },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      return conversation;
    }

    const vetProfile = await this.getVetProfile(user.sub);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, vetProfileId: vetProfile.id },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private async assertOwnerPetAssociation(
    ownerProfileId: string,
    petId: string,
    vetProfileId: string,
  ) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        ownerProfileId,
        vets: {
          some: { vetProfileId },
        },
      },
      select: { id: true },
    });

    if (!pet) {
      throw new NotFoundException('Associated pet not found');
    }
  }

  private async getOwnerProfile(userId: string) {
    const ownerProfile = await this.prisma.ownerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile) {
      throw new ForbiddenException('Owner profile required');
    }

    return ownerProfile;
  }

  private async getVetProfile(userId: string) {
    const vetProfile = await this.prisma.vetProfile.findUnique({
      where: { userId },
    });

    if (!vetProfile) {
      throw new ForbiddenException('Vet profile required');
    }

    return vetProfile;
  }
}
