import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

type RequestUser = {
  sub: string;
  role: UserRole;
};

@Controller()
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: RequestUser) {
    return this.messagesService.listConversations(user);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.createConversation(user, dto);
  }

  @Get('conversations/:id/messages')
  listMessages(@CurrentUser() user: RequestUser, @Param('id') conversationId: string) {
    return this.messagesService.listMessages(user, conversationId);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user, conversationId, dto);
  }
}
