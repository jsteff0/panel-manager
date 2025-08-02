import { WebSocketServer, Server } from 'ws';
import url from 'url';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

let wss: WebSocketServer | null = null;
const onlineUsers = new Set<string>();

export function getWSServer(server: Server) {
  if (wss) return wss;

  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
    if (!request.url) {
      throw new Error("Missing request URL");
    }
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    // Получаем login из query параметров
    const query = url.parse(req.url || '', true).query;
    const login = query.login as string;

    if (!login) {
      ws.close();
      return;
    }

    onlineUsers.add(login);
    console.log(`Пользователь ${login} подключился. Онлайн:`, onlineUsers.size);

    ws.on('close', () => {
      onlineUsers.delete(login);
      console.log(`Пользователь ${login} отключился. Онлайн:`, onlineUsers.size);
    });

    ws.on('message', (message) => {
      if (message.toString() === 'getOnlineUsers') {
        ws.send(JSON.stringify({ onlineUsers: Array.from(onlineUsers) }));
      }
    });
  });

  return wss;
}
