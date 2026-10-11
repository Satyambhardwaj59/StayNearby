import type { Server } from 'socket.io';

/**
 * Holds the Socket.IO server instance so feature services can publish events
 * without importing the socket bootstrap (which would create a cycle).
 * When the API runs without sockets, emits are no-ops.
 */

let io: Server | null = null;

export function setSocketServer(server: Server | null): void {
  io = server;
}

export function getSocketServer(): Server | null {
  return io;
}

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export interface RealtimeEvent {
  conversationId?: string;
  userIds?: string[];
  event: string;
  payload: unknown;
}

/** Emits to a conversation room and to each participant's personal room. */
export function emitRealtime({ conversationId, userIds, event, payload }: RealtimeEvent): void {
  if (!io) {
    return;
  }
  if (conversationId) {
    io.to(conversationRoom(conversationId)).emit(event, payload);
  }
  for (const userId of userIds ?? []) {
    io.to(userRoom(userId)).emit(event, payload);
  }
}
