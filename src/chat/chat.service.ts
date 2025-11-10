import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversation.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async sendMessage(sendMessageDto: SendMessageDto, userId: string) {
    const { conversationId, conteudo } = sendMessageDto;

    // Verificar se a conversa existe e se o usuário é participante
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (
      conversation.fk_participante_1_id !== userId &&
      conversation.fk_participante_2_id !== userId
    ) {
      throw new ForbiddenException('Você não tem permissão para enviar mensagens nesta conversa');
    }

    // Criar mensagem
    const message = this.messageRepository.create({
      fk_conversa_id: conversationId,
      fk_remetente_id: userId,
      conteudo,
    });

    return this.messageRepository.save(message);
  }

  async getConversationMessages(conversationId: string, userId: string) {
    // Verificar se o usuário é participante da conversa
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (
      conversation.fk_participante_1_id !== userId &&
      conversation.fk_participante_2_id !== userId
    ) {
      throw new ForbiddenException('Você não tem permissão para ver esta conversa');
    }

    // Buscar mensagens
    const messages = await this.messageRepository.find({
      where: { fk_conversa_id: conversationId },
      relations: ['remetente'],
      order: { enviada_em: 'ASC' },
    });

    return messages;
  }

  async getUserConversations(userId: string) {
    const conversations = await this.conversationRepository.find({
      where: [
        { fk_participante_1_id: userId },
        { fk_participante_2_id: userId },
      ],
      relations: [
        'participante1',
        'participante2',
        'match',
        'match.pet1',
        'match.pet2',
        'mensagens',
      ],
      order: { criado_em: 'DESC' },
    });

    // Adicionar última mensagem para cada conversa
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await this.messageRepository.findOne({
          where: { fk_conversa_id: conversation.id },
          relations: ['remetente'],
          order: { enviada_em: 'DESC' },
        });

        return {
          ...conversation,
          ultimaMensagem: lastMessage,
        };
      }),
    );

    return conversationsWithLastMessage;
  }
}

