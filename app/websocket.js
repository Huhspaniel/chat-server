const crypto = require('crypto');
const { parseMsg, unparseMsg } = require('./message-parsing');

function generateAcceptKey(key) {
    return crypto.createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
        .digest('base64');
}

const chatroom = [];
chatroom.emitData = function (event, ...args) {
  chatroom.forEach(socket => {
    if (!socket.destroyed) {
      socket.write(unparseMsg({ event, args }));
    }
  })
}
chatroom.close = function (message) {
  console.log('Disconnecting all sockets');
  message = message || unparseMsg({
    event: 'server-message',
    args: ['Closing all connections...']
  });
  chatroom.forEach(socket => {
    if (!socket.destroyed) {
      socket.end(message);
    }
  })
  chatroom.length = 0;
}

module.exports = {
    parseMsg, unparseMsg, chatroom,
    createSockets(server, cb) {
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
                cb(socket, chatroom);
            }
        })
    }
}