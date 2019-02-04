const { unparseMsg } = require('./message-parsing');
const cmd = require('./commands');

const chatroom = new Array();
Object.assign(chatroom, {
    users: {},
    connect(socket) {
        chatroom.timeoutHandler();
        chatroom.push(socket);
        console.log(`Socket ${socket.info} connected`);

        Object.defineProperty(socket, 'loggedIn', {
            get() {
                return !!chatroom.users[socket.username];
            }
        })

        socket
            .on('login', function (username) {
                if (!socket.loggedIn) {
                    chatroom.login(socket, username);
                }
            })
            .on('logout', function () {
                if (socket.loggedIn) {
                    chatroom.logout(socket);
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
                        chatroom.emit({
                            event: 'chat', 
                            args: [socket.username, msg],
                            filter: socket => {
                                return socket.loggedIn;
                            }
                        });
                    }
                }
            })
            .on('ping', function () {
                socket.emit('pong');
            })
            .on('cmd', function (...args) {
                if (!socket.loggedIn) {
                    socket.emit('server-message', 'Please input a username to join');
                } else {
                    cmd(...args)(socket, chatroom);
                }
            })

        socket._stream
            .on('data', chatroom.timeoutHandler)
            .on('close', () => {
                chatroom.disconnect(socket);
            });

        socket.emit('server-message', 'Please input a username to join');
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
        } else if (!username.match(/^[a-z0-9_-]+$/i)) {
            socket.emit('error', 'Username contains invalid characters')
        } else if (chatroom.users[username]) {
            socket.emit('error', `Username ${username} is in use`);
        } else {
            chatroom.users[username] = socket;
            chatroom.emit({
                event: 'login',
                args: [username],
                filter: _socket => {
                    return _socket.loggedIn;
                }
            });
            socket.emit('server-message', 'Welcome! Type in "/help" for a list of available commands!')
        }
    },
    logout(socket) {
        const username = socket.username;
        socket.username = null;
        delete chatroom.users[username];
        chatroom.emit({
            event: 'logout',
            args: [username],
            filter: _socket => {
                return _socket.loggedIn || _socket === socket;
            }
        });
        socket.emit('server-message', 'You have been logged out. Please input a username to join.')
    },
    disconnect(socket) {
        chatroom.logout(socket);
        const index = chatroom.indexOf(socket);
        if (index > -1) {
            chatroom.splice(index, 1);
        }
        socket.end();
    },
    emit(event, ...args) {
        let filter;
        if (typeof event === 'object') {
            ({ event, filter, args } = event);
        }
        const data = unparseMsg({ event, args, status: {
            users: Object.keys(chatroom.users)
        }});
        let socket;
        for (let i = 0; i < chatroom.length; i++) {
            socket = chatroom[i];
            if (filter && !filter(socket)) {
                continue;
            } else if (!socket.destroyed) {
                socket.write(data);
            }
        }
    },
    close(event, ...args) {
        console.log('Disconnecting all sockets');
        event = event || 'server-message';
        args = args || ['Closing all connections...'];
        message = unparseMsg({ event, args, status: {
            users: Object.keys(chatroom.users)
        }});
        for (let i = 0; i < chatroom.length; i++) {
            const socket = chatroom[i];
            if (!socket.destroyed) {
                socket.end(message);
            }
        }
        chatroom.length = 0;
        chatroom.users = {};
    }
});

const timeoutProps = {
    timeout: {
        value: 120000
    },
    timeLeft: {
        get() {
            return this.timeout - (Date.now() - this.lastActive);
        }
    },
    timeoutHandler: {
        value() {
            chatroom.lastActive = Date.now();
            chatroom.timeoutInterval = chatroom.timeoutInterval || setInterval(() => {
                if (chatroom.length === 0) {
                    chatroom.clearTimeout();
                } else if (chatroom.timeLeft <= 0) {
                    chatroom.close();
                } else if (chatroom.timeLeft <= 60000) {
                    const seconds = Math.round(chatroom.timeLeft / 1000) + ' seconds'
                    chatroom.emit('server-message', `No activity detected. Closing all connections in ${seconds}`);
                }
            }, 20000);
        }
    },
    clearTimeout: {
        value() {
            clearInterval(chatroom.timeoutInterval);
            chatroom.timeoutHandler === null;
        }
    }
}
Object.defineProperties(chatroom, timeoutProps);

module.exports = chatroom;