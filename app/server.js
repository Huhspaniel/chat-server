const http = require('http');
const fs = require('fs');
const path = require('path');
const parseUrl = require('url').parse;
const ws = require('./websocket');
const chatroom = require('./chatroom');
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';


const mimeType = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.eot': 'appliaction/vnd.ms-fontobject',
  '.ttf': 'aplication/font-sfnt'
};

const server = http.createServer((req, res) => {
  let { method, url } = req;
  if (method === 'GET') {
    url = url.replace(/^(\.\.[\/\\])+/, '');
    url = parseUrl(url);
    let pathname = path.join(__dirname, '/client', path.normalize(url.pathname));

    fs.exists(pathname, function (exist) {
      if (!exist) {
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
      } else if (fs.statSync(pathname).isDirectory()) {
        pathname += '/index.html';
      }

      const ext = path.parse(pathname).ext;
      res.setHeader('Content-type', mimeType[ext] || 'text/plain');

      const src = fs.createReadStream(pathname);
      src.pipe(res);
    });
  }
});

ws.listen(server, (socket) => {
  chatroom.connect(socket);
})

server.listen(PORT, HOST, () => {
  console.log(`Server listening on port ${HOST}:${PORT}`);
})

process.on('message', (msg) => {
  if (msg === 'close') {
    server.close();
    process.exit();
  }
});
