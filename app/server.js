const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PORT = process.env.PORT || 8080;
const HOST = process.env.NODE_ENV === 'production'
  ? null
  : process.env.HOST || 'localhost'

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
    let pathname = path.join(__dirname, '/client', path.normalize(url));

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

function generateAcceptKey(key) {
  return crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');
}

// WebSocket Data Framing: https://tools.ietf.org/html/rfc6455#section-5.1
function parseSocketMsg(buffer) {
  let offset = 0; // state of octet/byte offset
  const byte1 = buffer.readUInt8(offset); offset++;
  const isFinalFrame = byte1 >>> 7;
  const [reserved1, reserved2, reserved3] = [
    byte1 >>> 6 & 1,
    byte1 >>> 5 & 1,
    byte1 >>> 4 & 1
  ];
  const opCode = byte1 & 0xF;
  switch (opCode) {
    // connection close frame
    case 0x8: {
      return null;
    }
    // text frame
    case 0x1: {
      const byte2 = buffer.readUInt8(offset); offset++;
      const isMasked = byte2 >>> 7; // value of first bit
      let payloadLength = byte2 & 0x7F; // value of other seven bits
      if (payloadLength > 125) {
        if (payloadLength === 126) {
          payloadLength = buffer.readUInt16BE(offset); offset += 2;
        } else {
          // payloadLength === 127
          const left = buffer.readUInt32BE(offset);
          const right = buffer.readUInt32BE(offset + 4);
          offset += 8;
          throw new Error('Large payloads not currently implemented');
        }
      }
      // allocation for final message data
      const data = Buffer.alloc(payloadLength);
      if (isMasked) {
        // WebSocket Client-to-Server Masking: https://tools.ietf.org/html/rfc6455#section-5.3
        for (let i = 0, j = 0; i < payloadLength; i++ , j = i % 4) {
          const transformed_octet = buffer.readUInt8(offset + 4 + i);
          const maskingKey_octet = buffer.readUInt8(offset + j);
          data.writeUInt8(maskingKey_octet ^ transformed_octet, i);
        }
      } else {
        buffer.copy(data, 0, offset++);
      }
      return JSON.parse(data.toString('utf8').trim());
    }
    default: {
      throw new Error(`Unhandled frame type (opcode %x${opcode.toString('hex')})`);
    }
  }
}

// WebSocket Data Framing: https://tools.ietf.org/html/rfc6455#section-5.1
function constructReply(data) {
  const json = JSON.stringify(data);
  let length = Buffer.byteLength(json);
  let extendedBytes, realLength = length;
  if (length <= 125) {
    extendedBytes = 0;
  } else if (length <= 0xFFFF) {
    extendedBytes = 2;
    length = 126;
  } else {
    throw new Error('Large payloads not currently implemented');
  }
  const buffer = Buffer.alloc(2 + extendedBytes + realLength);
  buffer.writeUInt8(0b10000001, 0);
  buffer.writeUInt8(length, 1);
  let offset = 2;
  if (extendedBytes === 2) {
    buffer.writeUInt16BE(realLength, 2); offset += 2;
  }
  buffer.write(json, offset);
  return buffer;
}

const sockets = [];
server.on('upgrade', (req, socket) => {
  const { headers } = req;
  if (headers.upgrade !== 'websocket') {
    return socket.end('HTTP/1.1 400 Bad Request');
  } else {
    const key = headers['sec-websocket-key'];
    const acceptKey = generateAcceptKey(key);
    const res = [
      'HTTP/1.1 101 Web Socket Protocol Handshake',
      'Sec-Websocket-Accept: ' + acceptKey,
      'Connection: Upgrade',
      'Upgrade: WebSocket'
    ]
    socket.write(res.join('\r\n') + '\r\n\r\n');
    socket.id = key.slice(0, key.length - 2);
    socket.write(constructReply({
      event: 'server-msg',
      args: ['Please input a username to join']
    }));
    socket.on('data', function (buf) {
      let data;
      data = parseSocketMsg(buf);
      console.log(`Socket ${this.id || key.slice(0, key.length - 2)} sent:`, data);
      let reply = {};
      if (data === null) {
        return this.end();
      } else {
        switch (data.event) {
          case 'login': {
            if (this.loggedIn) {
              return;
            } else if (!data.args[0]) {
              reply = {
                event: 'error',
                args: ['Username cannot be null']
              };
            } else if (typeof data.args[0] !== 'string') {
              reply = {
                event: 'error',
                args: ['Username must be of type string']
              };
            } else {
              const username = data.args[0].trim();
              if (username.match(/\s/)) {
                reply = {
                  event: 'error',
                  args: ['Username cannot have spaces']
                }
              } else if (username.length > 17) {
                reply = {
                  event: 'error',
                  args: ['Username cannot exceed 17 characters']
                };
              } else if (sockets.find(socket => socket.username === username)) {
                reply = {
                  event: 'error',
                  args: ['Username taken']
                }
              } else {
                sockets.push(socket);
                this.username = username;
                this.loggedIn = true;
                reply = {
                  event: 'login',
                  args: [username]
                }
              }
            }
            break;
          }
          case 'logout': {
            return this.end();
          }
          case 'chat': {
            if (!this.loggedIn) {
              reply = {
                event: 'error',
                args: ['You have not joined and cannot send chats. Please provide a username.']
              }
            } else if (!data.args[0] || typeof data.args[0] !== 'string') {
              return;
            } else {
              const chat = data.args[0].trim().replace('/[\s]{2,}/', ' ');
              if (chat.length > 255) {
                reply = {
                  event: 'error',
                  args: ['Chat message cannot exceed 255 characters']
                }
              } else {
                reply = {
                  event: 'chat',
                  args: [this.username, chat]
                }
              }
            }
          }
        }
        if (reply.event === 'error') {
          this.write(constructReply(reply));
        } else {
          sockets.forEach(socket => {
            if (!socket.destroyed) {
              socket.write(constructReply(reply));
            } else {
              console.log('Socket ' + socket.id + ' is not connected')
            }
          });
        }
      }
    }).on('end', function () {
      console.log(`Socket ${this.id} disconnected`);
      sockets.splice(sockets.indexOf(this), 1);
      if (this.loggedIn) {
        const username = this.username;
        sockets.forEach(socket => {
          const reply = {
            event: 'logout',
            args: [username]
          }
          socket.write(constructReply(reply));
        });
      }
    });
    console.log(`Socket ${key.slice(0, key.length - 2)} connected`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}\n`);
})

process.on('message', (msg) => {
  if (msg === 'close') {
    server.close();
    process.exit();
  }
});
