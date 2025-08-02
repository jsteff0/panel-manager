export function connectPresence(login: string): WebSocket {
  const ws = new WebSocket(`ws://${window.location.host}/api/auth/connect?login=${login}`);
  ws.onclose = () => {
    setTimeout(() => connectPresence(login), 3000); // reconnect
  };
  return ws;
}