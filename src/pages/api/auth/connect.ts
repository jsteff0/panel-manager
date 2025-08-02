import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'ws';
import type { Socket } from 'net';
import { getWSServer } from '@/lib/wsServer';

export const config = {
  api: {
    bodyParser: false,
  },
};
type ExtendedSocket = Socket & {
  server: Server & {
    wsInitialized?: boolean;
  };
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    throw new Error("Missing request URL");
  }
  const socket = res.socket as ExtendedSocket;
  const server = socket.server;

  if (!server.wsInitialized) {
    console.log('⚙️ Инициализация WebSocket-сервера...');
    getWSServer(server);
    server.wsInitialized = true;
    console.log('✅ WebSocket Server Started');
  }

  res.end();
}
