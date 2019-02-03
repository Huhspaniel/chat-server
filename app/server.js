const http = require('http');
const fs = require('fs');
const path = require('path');
const parseUrl = require('url').parse;
const ws = require('./websocket');
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

// let lastActivity = null;
// let timeoutMessages = null;
// function handleTimeoutMessages() {
//   if (!timeoutMessages) {
//     timeoutMessages = setInterval(() => {
//       if (chatroom.length === 0) {
//         console.log('All sockets disconnected')
//         clearInterval(timeoutMessages);
//         lastActivity = timeoutMessages = null;
//       } else {
//         let timeout = 300000 - (Date.now() - lastActivity);
//         if (timeout <= 0) {
//           chatroom.endAll();
//         } else if (timeout <= 60000) {
//           timeout = Math.trunc(timeout / 1000) + ' seconds.'
//           chatroom.writeAll(unparseMsg({
//             event: 'server-message',
//             args: ['No activity detected. Timing out in ' + timeout]
//           }))
//         }
//       }
//     }, 10000);
//   }
// }

const commands = {
  dm: '/dm {user} {message} -- Send direct/private message',
  users: '/users -- See list of active users',
  help: '/help -- See list of available commands'
}

ws.createSockets(server, (socket, chatroom) => {
  console.log(`Socket ${socket.id} connected`);
  socket.emitData('server-message', 'Please input a username to join');

  socket.on('login', function (username) {
    if (typeof username !== 'string') {
      return this.emitData('error', `Type '${typeof username}' invalid for username. Must be 'string'`)
    }
    username = username.trim();
    if (username.match(/\s/)) {
      this.emitData('error', 'Username cannot have spaces');
    } else if (username.match(/[@#%^~`/<>;:'"\[\]\{\}+=()*&?.,|]/)) {
      this.emitData('error', 'Username contains invalid characters')
    } else if (username.length > 17) {
      this.emitData('error', 'Username cannot exceed 17 characters');
    } else if (chatroom.find(socket => socket.username === username)) {
      this.emitData('error', `Username ${username} is in use`);
    } else {
      Object.assign(this, {
        username, loggedIn: true
      });
      chatroom.emitData('login', username);
      this.emitData('server-message', 'Welcome! Type in "/help" for a list of available commands!')
    }
  }).on('chat', function (chat) {
    if (!this.loggedIn) {
      this.emitData('error', 'You have not joined. Please provide a username.')
    } else if (typeof chat !== 'string') {
      this.emitData('error', `Type ${typeof chat} invalid for chat message. Must be 'string'`)
    } else {
      chat = chat.trim().replace('/[\s]{2,}/', ' ');
      if (chat.length > 255) {
        this.emitData('error', 'Chat message cannot exceed 255 characters');
      } else {
        chatroom.emitData('chat', this.username, chat);
      }
    }
  }).on('cmd', function (...args) {
    args[0] = args[0] || 'help';
    switch (args[0]) {
      case 'help': {
        this.emitData(
          'info',
          `<p style="padding-left:10px; font-weight:bold;">Available commands:</p>
            <div style="padding-left: 20px;">
              ${Object.values(commands).map(cmd => `<p>- ${cmd}</p>`).join('')}
            </div>`
        )
        break;
      }
      case 'dm': {
        let [username, ...msg] = args.slice(1);
        if (!username) {
          this.emitData(
            'info',
            `<p style="padding-left: 10px;">${commands.dm}</p>`
          )
        } else {
          if (username.charAt(0) === '@') username = username.slice(1);
          const to = chatroom.get(username);
          const from = this;
          if (to) {
            msg = msg.join(' ');
            if (to === from) {
              this.emitData('dm', from.username, to.username, msg);
            } else {
              to.emitData('dm', from.username, to.username, msg);
              from.emitData('dm', from.username, to.username, msg);
            }
          } else {
            from.emitData('server-message', `User "${username}" is not online`);
          }
        }
        break;
      }
      case 'users': {
        this.emitData(
          'info',
          `<p style="padding-left:10px; font-weight:bold;">Online users:</p>
          <div style="padding-left: 20px;">
            ${chatroom.users.map(user => `<p>- @${user}</p>`).join('')}
          </div>`
        )
        break;
      }
      default: {
        this.emitData(
          'info',
          `Command "${args[0]}" not found. Input /help for a list of available commands.`
        )
      }
    }
  }).on('logout', function () {
    this.emitData('server-message', 'Disconnecting...');
    this.end();
  }).on('ping', function () {
    this.emitData('pong');
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}\n`);
})

process.on('message', (msg) => {
  if (msg === 'close') {
    server.close();
    process.exit();
  }
});
