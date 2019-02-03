const crypto = require('crypto');
const { parseMsg, unparseMsg } = require('./message-parsing');

function generateAcceptKey(key) {
    return crypto.createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
        .digest('base64');
}

const chatroom = [];
Object.assign(chatroom, {
    emitData(event, ...args) {
        const filter = args[args.length - 1];
        chatroom.forEach(socket => {
            if (!socket.destroyed) {
                if (typeof filter === 'function' ? filter(socket) : true) {
                    socket.write(unparseMsg({ event, args }));
                }
            }
        })
    },
    close(message) {
        console.log('Disconnecting all sockets');
        chatroom.clearTimeoutHandler();
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
    },
    remove(socket) {
        const index = this.indexOf(socket);
        if (index > -1) {
            this.splice(index, 1);
        }
    },
    lastActive: null,
    clearTimeoutHandler() {
        clearInterval(chatroom.timeoutHandler);
        chatroom.timeoutHandler === null;
    }
});
Object.defineProperties(chatroom, {
    timeout: {
        value: 120000
    },
    timeLeft: {
        get() {
            return this.timeout - (Date.now() - this.lastActive);
        }
    }
});
// chatroom.emitData = function (event, ...args) {
//     chatroom.forEach(socket => {
//         if (!socket.destroyed) {
//             socket.write(unparseMsg({ event, args }));
//         }
//     })
// }
// chatroom.close = function (message) {
//     console.log('Disconnecting all sockets');
//     message = message || unparseMsg({
//         event: 'server-message',
//         args: ['Closing all connections...']
//     });
//     chatroom.forEach(socket => {
//         if (!socket.destroyed) {
//             socket.end(message);
//         }
//     })
//     chatroom.length = 0;
// }


function createSockets(server, cb) {
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
            chatroom.lastActive = Date.now();
            chatroom.timeoutHandler = chatroom.timeoutHandler || setInterval(() => {
                if (chatroom.lastActive === null) {
                    chatroom.clearTimeoutHandler();
                } else if (chatroom.timeLeft <= 0) {
                    chatroom.close();
                } else if (chatroom.timeLeft <= 60000) {
                    const seconds = Math.round(chatroom.timeLeft / 1000) + ' seconds'
                    chatroom.emitData('server-message', `No activity detected. Closing all connections in ${seconds}`);
                }
            }, 20000);
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
                        return socket.write(unparseMsg({ event, args }))
                    }
                },
                timeout: {
                    value: 825000
                },
                lastActive: {
                    value: Date.now(),
                    writable: true
                },
                timeLeft: {
                    get() {
                        return this.timeout - this.timeInactive;
                    }
                },
                timeoutHandler: {
                    value: setInterval(() => {
                        if (!socket.loggedIn) {
                            socket.emitData('server-message', 'Please input a username to join.');
                        } else {
                            socket.emitData('ping');
                            if (socket.timeLeft <= 0) {
                                socket.emitData('server-message', 'Connection timed out. Disconnecting...');
                                clearInterval(socket.timeoutHandler);
                                socket.end();
                            } else if (socket.timeLeft <= 120000) {
                                const seconds = Math.round(socket.timeLeft / 1000) + ' seconds'
                                socket.emitData('server-warning', `Your connection will time out due to inactivity in ${seconds}`);
                            }
                        }
                    }, 55000)
                }
            });
            chatroom.push(socket);
            socket.on('data', function (buffer) {
                this.lastActive = chatroom.lastActive = Date.now();
                try {
                    var data = parseMsg(buffer);
                } catch (err) {
                    this.emit('error', err, 'parsing');
                    return;
                }
                if (data === null) {
                    return this.end();
                }
                console.log(`Socket ${this.info} sent`, data);
                this.emit('rawdata', data);
                if (data.event) {
                    if (data.args instanceof Array) {
                        this.emit(data.event, ...data.args);
                    } else {
                        this.emit(data.event, data.args);
                    }
                }
            }).on('close', function (hadError) {
                console.log(`Socket ${this.info} disconnected`);
                clearInterval(this.timeoutHandler);
                chatroom.remove(this);
                if (this.loggedIn) {
                    this.loggedIn = false;
                    chatroom.emitData('logout', this.username);
                }
            }).on('error', function (err, type) {
                console.error(`Socket ${this.info}%s error`, type ? ' ' + type : '');
                console.error(err.stack);
                const { name, message } = err;
                switch (type) {
                    case 'parsing': {
                        this.emitData('server-error', { name, message }, 'parsing');
                        break;
                    }
                    default: {
                        this.end();
                    }
                }
            });
            cb(socket, chatroom);
        }
    })
}

module.exports = {
    parseMsg, unparseMsg, chatroom, createSockets
}