import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  private transformNotification(notification: Notification): Notification {
    return {
      ...notification,
      dados: notification.dados ? JSON.parse(notification.dados) : null,
    } as unknown as Notification;
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      fk_usuario_id: createNotificationDto.userId,
      tipo: createNotificationDto.tipo,
      titulo: createNotificationDto.titulo,
      mensagem: createNotificationDto.mensagem,
      dados: createNotificationDto.dados
        ? JSON.stringify(createNotificationDto.dados)
        : null,
    });

    const savedNotification = await this.notificationRepository.save(notification);
    const transformedNotification = this.transformNotification(savedNotification);
    const unreadCount = await this.getUnreadCount(createNotificationDto.userId);

    this.notificationsGateway.emitNotification(
      createNotificationDto.userId,
      transformedNotification,
      unreadCount,
    );

    return transformedNotification;
  }

  async findAll(userId: string, limit = 20, unreadOnly = false) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const notifications = await this.notificationRepository.find({
      where: {
        fk_usuario_id: userId,
        ...(unreadOnly ? { lida: false } : {}),
      },
      order: { criado_em: 'DESC' },
      take: parsedLimit,
    });

    return notifications.map((notification) =>
      this.transformNotification(notification),
    );
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepository.count({
      where: {
        fk_usuario_id: userId,
        lida: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificacao nao encontrada');
    }

    if (notification.fk_usuario_id !== userId) {
      throw new ForbiddenException('Voce nao tem permissao para esta notificacao');
    }

    if (!notification.lida) {
      notification.lida = true;
      notification.lida_em = new Date();
      await this.notificationRepository.save(notification);
    }

    const unreadCount = await this.getUnreadCount(userId);
    this.notificationsGateway.emitUnreadCount(userId, unreadCount);

    return this.transformNotification(notification);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { fk_usuario_id: userId, lida: false },
      { lida: true, lida_em: new Date() },
    );

    this.notificationsGateway.emitUnreadCount(userId, 0);

    return { unreadCount: 0 };
  }
}
