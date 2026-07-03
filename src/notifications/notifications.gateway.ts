import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Notification } from '../entities/notification.entity';
import {
  getCorsOrigin,
  shouldEnableCorsCredentials,
} from '../config/cors.config';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
    credentials: shouldEnableCorsCredentials(),
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedUsers.set(client.id, userId);
      client.join(`user_${userId}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  emitNotification(
    userId: string,
    notification: Notification,
    unreadCount: number,
  ) {
    this.server.to(`user_${userId}`).emit('notification:new', notification);
    this.server.to(`user_${userId}`).emit('notification:unreadCount', unreadCount);
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.server.to(`user_${userId}`).emit('notification:unreadCount', unreadCount);
  }
}
