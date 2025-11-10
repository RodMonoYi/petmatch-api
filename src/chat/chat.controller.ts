import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(sendMessageDto, req.user.id);
  }

  @Get('conversations')
  getUserConversations(@Request() req) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @Get('conversations/:id/messages')
  getConversationMessages(@Param('id') id: string, @Request() req) {
    return this.chatService.getConversationMessages(id, req.user.id);
  }
}

