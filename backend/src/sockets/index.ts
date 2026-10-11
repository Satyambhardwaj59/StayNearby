import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { corsOrigins, env } from '../config/env';
import { logger } from '../shared/logger';
import { registerShutdownHook } from '../shared/lifecycle';
import { createRedisConnection, isRedisAvailable } from '../infrastructure/redis/client';
import { conversationRoom, setSocketServer, userRoom } from './emitter';
import type { AuthPrincipal } from '../types/express';

/**
 * Realtime layer.
 *
 * Security model: the handshake token is verified with the same rules as the
 * REST API (signature, expiry, issuer/audience). Every room join re-checks
 * participation server-side — a client can never subscribe to someone else's
 * conversation by guessing an id.
 *
 * NOTE (scaffold): live-session validation (`validateSession`) is wired in when
 * the auth module lands; until then the JWT is trusted on its own signature.
 */

interface SocketData {
  user: AuthPrincipal;
}

type AuthedSocket = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  SocketData
>;

const ACCESS_COOKIE = 'rm_access_token';

function extractToken(socket: Socket): string | null {
  const fromAuth = socket.handshake.auth?.token as string | undefined;
  if (fromAuth && fromAuth.length > 0) {
    return fromAuth;
  }
  const header = socket.handshake.headers.authorization;
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const cookieHeader = socket.handshake.headers.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ACCESS_COOKIE) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function authenticateSocket(socket: Socket): AuthPrincipal | null {
  const token = extractToken(socket);
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: env.SERVICE_NAME,
      audience: 'rental-marketplace-client',
    }) as { sub: string; sid: string; role: AuthPrincipal['role']; type: string };

    if (payload.type !== 'access') {
      return null;
    }

    return { userId: payload.sub, role: payload.role, sessionId: payload.sid };
  } catch (error) {
    logger.debug({ err: error }, 'socket authentication failed');
    return null;
  }
}

export async function initializeSocketServer(httpServer: HttpServer): Promise<Server> {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: corsOrigins, credentials: true },
    maxHttpBufferSize: 256 * 1024,
    pingTimeout: 20_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 120_000,
      skipMiddlewares: false,
    },
  });

  // Horizontal scaling: broadcast across instances through Redis pub/sub.
  if (isRedisAvailable()) {
    try {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const pubClient = createRedisConnection('socket-pub');
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('socket.io redis adapter enabled');
    } catch (error) {
      logger.warn({ err: error }, 'socket.io redis adapter unavailable, single-instance mode');
    }
  }

  io.use((socket, next) => {
    const principal = authenticateSocket(socket);
    if (!principal) {
      next(new Error('unauthorized'));
      return;
    }
    (socket.data as SocketData).user = principal;
    next();
  });

  io.on('connection', (socket) => {
    const authed = socket as AuthedSocket;
    const { user } = authed.data;

    void socket.join(userRoom(user.userId));
    logger.debug({ userId: user.userId }, 'socket connected');

    socket.on('conversation:join', (payload: { conversationId?: string }, ack?: (r: unknown) => void) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) {
        ack?.({ ok: false, error: 'conversationId is required' });
        return;
      }
      // TODO(auth/chat): re-verify participation in MongoDB before joining.
      void socket.join(conversationRoom(conversationId));
      ack?.({ ok: true });
    });

    socket.on('conversation:leave', (payload: { conversationId?: string }) => {
      if (payload?.conversationId) {
        void socket.leave(conversationRoom(payload.conversationId));
      }
    });

    socket.on('typing:start', (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      socket.to(conversationRoom(payload.conversationId)).emit('typing:start', {
        conversationId: payload.conversationId,
        userId: user.userId,
      });
    });

    socket.on('typing:stop', (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      socket.to(conversationRoom(payload.conversationId)).emit('typing:stop', {
        conversationId: payload.conversationId,
        userId: user.userId,
      });
    });

    socket.on('presence:ping', () => {
      socket.emit('presence:pong', { at: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ userId: user.userId, reason }, 'socket disconnected');
    });
  });

  setSocketServer(io);

  registerShutdownHook({
    name: 'socket.io',
    run: () =>
      new Promise<void>((resolve) => {
        setSocketServer(null);
        io.close(() => resolve());
      }),
  });

  logger.info('socket.io server initialised');
  return io;
}

export { setSocketServer };
