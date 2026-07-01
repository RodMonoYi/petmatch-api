import { NotificationType } from '../../entities/notification.entity';

export class CreateNotificationDto {
  userId: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  dados?: Record<string, unknown>;
}
