const http = require('http');
const fs = require('fs');
const path = require('path');
const parseUrl = require('url').parse;
const { parseMsg, unparseMsg, generateAcceptKey } = require('./message-parsing');
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

const socks = [];
socks.emitData = function (event, ...args) {
  socks.forEach(socket => {
    if (!socket.destroyed) {
      socket.write(unparseMsg({ event, args }));
    }
  })
}
socks.endAll = function (message) {
  console.log('Disconnecting all sockets');
  message = message || unparseMsg({
    event: 'server-message',
    args: ['Closing all connections...']
  });
  socks.forEach(socket => {
    if (!socket.destroyed) {
      socket.end(message);
    }
  })
  socks.length = 0;
}

// let lastActivity = null;
// let timeoutMessages = null;
// function handleTimeoutMessages() {
//   if (!timeoutMessages) {
//     timeoutMessages = setInterval(() => {
//       if (socks.length === 0) {
//         console.log('All sockets disconnected')
//         clearInterval(timeoutMessages);
//         lastActivity = timeoutMessages = null;
//       } else {
//         let timeout = 300000 - (Date.now() - lastActivity);
//         if (timeout <= 0) {
//           socks.endAll();
//         } else if (timeout <= 60000) {
//           timeout = Math.trunc(timeout / 1000) + ' seconds.'
//           socks.writeAll(unparseMsg({
//             event: 'server-message',
//             args: ['No activity detected. Timing out in ' + timeout]
//           }))
//         }
//       }
//     }, 10000);
//   }
// }

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
    Object.defineProperties(socket, {
      id: {
        value: key.slice(0, key.length - 2)
      },
      info: {
        get: function () {
          return `${this.id}${this.username ? ` (@${this.username})` : ''}`;
        }
      },
      emitData: {
        value: function (event, ...args) {
          return this.write(unparseMsg({ event, args }))
        }
      },
      onData: {
        value: function (event, cb) {
          cb = cb.bind(this);
          return this.on('data', buffer => {
            try {
              var data = parseMsg(buffer);
            } catch (err) {
              this.emit('error', err);
              return;
            }
            if (data === null) return this.end();
            if (event === data.event) {
              if (data.args instanceof Array) {
                cb(...data.args);
              } else {
                cb();
              }
            }
          })
        }
      }
    });
    console.log(`Socket ${socket.id} connected`);
    socket.emitData('server-message', 'Please input a username to join');

    socket.onData('login', function (username) {
      if (typeof username !== 'string') {
        return this.emitData('error', `Type '${typeof username}' invalid for username. Must be 'string'`)
      }
      username = username.trim();
      if (username.match(/\s/)) {
        this.emitData('error', 'Username cannot have spaces');
      } else if (username.length > 17) {
        this.emitData('error', 'Username cannot exceed 17 characters');
      } else if (socks.find(socket => socket.username === username)) {
        this.emitData('error', `Username ${username} is in use`);
      } else {
        Object.assign(this, {
          username, loggedIn: true
        });
        socks.push(this);
        socks.emitData('login', username);
      }
    }).onData('chat', function (chat) {
      if (!this.loggedIn) {
        this.emitData('error', 'You have not joined. Please provide a username.')
      } else if (typeof chat !== 'string') {
        this.emitData('error', `Type ${typeof chat} invalid for chat message. Must be 'string'`)
      } else {
        chat = chat.trim().replace('/[\s]{2,}/', ' ');
        if (chat.length > 255) {
          this.emitData('error', 'Chat message cannot exceed 255 characters');
        } else {
          socks.emitData('chat', this.username, chat);
        }
      }
    }).onData('logout', function () {
      this.emitData('server-message', 'Disconnecting...');
      this.end();
    }).onData('ping', function () {
      this.emitData('pong');
    }).on('close', function () {
      console.log(`Socket ${this.info} disconnected`);
      if (socks.length > 0) {
        const socketIndex = socks.indexOf(this);
        if (socketIndex > -1) {
          socks.splice(socketIndex, 1);
        }
        if (this.loggedIn) {
          socks.emitData('logout', this.username);
        }
      }
    });
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
