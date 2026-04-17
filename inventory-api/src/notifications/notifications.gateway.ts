import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // Set to specific origin in production
  },
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader) {
        client.disconnect();
        return;
      }
      
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // Join the user to their own personal room by user ID
      client.join(`user_${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} joined room user_${payload.sub}`);
    } catch (e) {
      this.logger.error('WebSocket connection failed during JWT verify', e.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Push notification via WebSocket
  sendNotification(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit('new_notification', payload);
  }

  // Broadbast audit log update to all connected clients (triggers UI refresh)
  broadcastAuditLog(payload?: any) {
    this.server.emit('audit_log_updated', payload);
  }
}
