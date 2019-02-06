const { unparseMsg } = require('./message-parsing');
const cmd = require('./commands');
const { defineTimeout } = require('./timeout');

const addChatroomTimeout = defineTimeout(100, (chatroom) => {
    chatroom.emit.room({
        event: 'server-message',
        args: ['Connection timed out due to inactivity.'],
        filter: (socket) => {
            return !socket.loggedIn;
        }
    })
    chatroom.close();
}, {
        interval: 20,
        idlePeriod: 3,
        onIdle: (chatroom, { timeLeft }) => {
            chatroom.emit.room({
                event: 'server-warning',
                args: [`Your connection will time out due to inactivity in ${timeLeft} seconds`],
                filter: (socket) => {
                    return socket.loggedIn;
                }
            })
        },
        preUpdate: (chatroom) => {
            if (chatroom.length === 0) {
                chatroom.clearTimeout();
            }
        },
        postUpdate: (chatroom) => {
            chatroom.ping();
        }
    }
);
const chatroom = addChatroomTimeout(new Array());

const addSocketTimeout = defineTimeout(250, (socket) => {
    socket.close('server-message', 'Connection timed out. Disconnecting...');
}, {
        interval: 50,
        idlePeriod: 3,
        onIdle: (socket, { timeLeft }) => {
            if (!chatroom._timer.isIdle && socket.loggedIn) {
                socket.emit('server-warning', `Your connection will time out due to inactivity in ${timeLeft} seconds`);
            }
        },
        preUpdate: (socket, { timeLeft }) => {
            if (socket._destroyed) {
                socket.clearTimeout();
            } else if (!socket.loggedIn && timeLeft <= 150) {
                socket.clearTimeout();
                socket.close('server-message', 'Connection timed out.')
            }
        }
    }
);

Object.assign(chatroom, {
    users: {},
    connect(socket) {
        socket = addSocketTimeout(socket);
        chatroom.push(socket);
        console.log(`Socket ${socket.info} connected`);
        chatroom.resetTimeout();
        socket.resetTimeout();
        socket.emit('server-message', 'Please input a username to join.');

        Object.defineProperty(socket, 'loggedIn', {
            get() {
                return !!chatroom.users[socket.username];
            }
        })

        socket
            .on('_message', (message) => {
                chatroom.resetTimeout();
                socket.resetTimeout();
            })
            .on('_close', () => {
                socket.clearTimeout();
                chatroom.remove(socket);
            })
            .on('login', function (username) {
                if (!socket.loggedIn) {
                    chatroom.login(socket, username);
                }
            })
            .on('logout', function () {
                if (socket.loggedIn) {
                    chatroom.logout(socket);
                    socket.emit('server-message', 'You have been logged out. Please input a username to join.')
                }
            })
            .on('chat', function (msg) {
                if (!socket.loggedIn) {
                    socket.emit('server-message', 'Please input a username to join');
                } else if (typeof msg !== 'string') {
                    socket.emit('error', `Type ${typeof msg} invalid for chat message. Must be 'string'`)
                } else {
                    msg = msg.trim().replace('/[\s]{2,}/', ' ');
                    if (msg.length > 255) {
                        socket.emit('error', 'Chat message cannot exceed 255 characters');
                    } else {
                        chatroom.emit.global({
                            event: 'chat',
                            args: [socket.username, msg],
                            filter: ((socket) => {
                                return socket.loggedIn;
                            }).toString()
                        });
                    }
                }
            })
            .on('cmd', function (...args) {
                if (!socket.loggedIn) {
                    socket.emit('server-message', 'Please input a username to join');
                } else {
                    cmd(...args)(socket, chatroom);
                }
            })
    },
    emit: {
        room(event, ...args) {
            let filter;
            if (typeof event === 'object') {
                ({ event, filter, args } = event);
            }
            const buf = unparseMsg.json({ event, args });

            let socket;
            for (let i = 0; i < chatroom.length; i++) {
                socket = chatroom[i];
                if (typeof filter === 'function' && !filter(socket)) {
                    continue;
                } else if (!socket._destroyed) {
                    socket._write(buf);
                }
            }
        },
        global(event, ...args) {
            let filter, pids;
            if (typeof event === 'object') {
                ({ event, filter, args, pids } = event);
            }
            const buf = unparseMsg.json({ event, args });

            let bytes = [];
            for (let i = 0; i <= buf.length - 1; i++) {
                bytes.push(buf.readUInt8(i).toString(16));
            }
            process.send({
                users: {
                    [process.pid]: Object.keys(chatroom.users)
                },
                bytes,
                filter: typeof filter === 'string'
                    ? filter
                    : null,
                pids
            });
        }
    },
    close(event, ...args) {
        console.log('Disconnecting all sockets');
        event = event || 'server-message';
        args = args[0] ? args : ['Closing all lingering connections...'];
        message = unparseMsg.json({ event, args });
        for (let i = 0; i < chatroom.length; i++) {
            const socket = chatroom[i];
            if (!socket._destroyed) {
                socket._end(socket.loggedIn ? message : '');
            }
        }
    },
    ping() {
        for (let i = 0; i < chatroom.length; i++) {
            chatroom[i].ping();
        }
    },
    write(buf, filter) {
        let socket;
        for (let i = 0; i < chatroom.length; i++) {
            socket = chatroom[i]
            if (filter && !filter(socket)) {
                continue;
            } else if (!socket._destroyed) {
                socket._write(buf);
            }
        }
    },
    login(socket, username) {
        socket.username = username;
        if (typeof username !== 'string') {
            socket.emit('error', `Type '${typeof username}' invalid for username. Must be 'string'`);
            return;
        }

        username = username.trim();
        if (!username) {
            socket.emit('error', 'Please provide a username');
        } else if (username.match(/\s/)) {
            socket.emit('error', 'Username cannot have spaces');
        } else if (username.length > 18) {
            socket.emit('error', 'Username cannot exceed 18 characters');
        } else if (!username.match(/^[a-z0-9_]+$/i)) {
            socket.emit('error', 'Username contains invalid characters')
        } else if (process.users.findPID(username) || chatroom.hasOwnProperty(username)) {
            socket.emit('error', `Username ${username} is in use`);
        } else {
            chatroom.users[username] = socket;
            chatroom.emit.global({
                event: 'login',
                args: [username],
                filter: ((socket) => {
                    return socket.loggedIn;
                }).toString()
            });
            socket.emit('server-message', 'Welcome! Type in "/help" for a list of available commands!')
        }
    },
    logout(socket) {
        const username = socket.username;
        socket.username = null;
        delete chatroom.users[username];
        chatroom.emit.global({
            event: 'logout',
            args: [username],
            filter: ((_socket) => {
                return _socket.loggedIn || _socket.id == socket.id;
            }).toString().replace(' socket.id', ` '${socket.id}'`)
        });
    },
    remove(socket) {
        if (socket.loggedIn) {
            chatroom.logout(socket);
        }
        const index = chatroom.indexOf(socket);
        if (index > -1) {
            chatroom.splice(index, 1);
        }
    }
});

process.on('message', ({ users, bytes, filter, username }) => {
    const buf = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        buf.writeUInt8(parseInt(bytes[i], 16), i);
    }
    Object.assign(process.users, users);
    if (chatroom.users.hasOwnProperty(username)) {
        chatroom.users[username].write(buf, filter ? parseFunction(filter) : null)
    } else {
        chatroom.write(buf, filter ? parseFunction(filter) : null);
    }
});

/**
 * @param {string} func Must be of format '(..args) => { body }'
 */
function parseFunction(func) {
    const args = func.match(/\(([^\)]+)\)/)[1].trim().split(', ');
    const body = func.match(/\{([^\)]+)\}/)[0];
    return Function(...args, body);
}

module.exports = chatroom;