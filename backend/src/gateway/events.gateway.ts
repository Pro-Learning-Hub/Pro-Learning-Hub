import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

function tokenFromHandshake(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) {
    return authToken;
  }
  const header = client.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  const cookieHeader = client.handshake.headers?.cookie;
  if (!cookieHeader) {
    return undefined;
  }
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('access_token='));
  return match ? decodeURIComponent(match.slice('access_token='.length)) : undefined;
}

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = tokenFromHandshake(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.TOKEN_SECRET_KEY,
      });
      (client as Socket & { user: typeof payload }).user = payload;
      client.join(`user-${payload.userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    return;
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.leave(room);
  }

  emitToRoom(room: string | string[], event: string, data: unknown, excludeUserId?: string) {
    const rooms = Array.isArray(room) ? room : [room];
    let target = this.server.to(rooms);
    if (excludeUserId) {
      target = target.except(`user-${excludeUserId}`);
    }
    target.emit(event, data);
  }
}
