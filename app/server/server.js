const http = require('http');
const { join } = require('path');
const serveStatic = require('./serve-static');
const ws = require('./websocket');
const chatroom = require('./chatroom');
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';

const serve = serveStatic(join(__dirname, '../client'), (req, res) => {
  res.writeHead(404, 'Not Found');
  res.end('404 Not Found');
});
const app = serve;

const server = http.createServer(app);

ws.listen(server, (socket) => {
  chatroom.connect(socket);
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});

process.on('message', (msg) => {
  if (msg === 'close') {
    server.close();
    process.exit();
  }
});
