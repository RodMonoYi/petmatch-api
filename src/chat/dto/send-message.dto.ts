import { IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  conteudo: string;
}

