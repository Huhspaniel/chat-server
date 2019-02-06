const { unparseMsg } = require('./message-parsing');
const cmd = require('./commands');
const { defineTimeout } = require('./timeout');

const addChatroomTimeout = defineTimeout(90, (chatroom) => {
    chatroom.emit({
        event: 'server-message',
        args: ['Connection timed out.'],
        filter: (socket) => {
            return !socket.loggedIn;
        }
    })
    chatroom.close();
}, {
        interval: 15,
        idlePeriod: 3,
        onIdle: (chatroom, { timeLeft }) => {
            chatroom.emit({
                event: 'server-message',
                args: [`No activity detected. Closing chatroom in ${timeLeft} seconds`],
                filter: (socket) => {
                    return socket.loggedIn;
                }
            })
        },
        preUpdate: (chatroom) => {
            if (chatroom.length === 0) {
                chatroom.clearTimeout();
            }
        }
    }
);
const chatroom = addChatroomTimeout(new Array());

const addSocketTimeout = defineTimeout(250, (socket) => {
    socket.emit('server-message', 'Connection timed out. Disconnecting...');
    socket.end();
}, {
        interval: 50,
        idlePeriod: 3,
        onIdle: (socket, { timeLeft }) => {
            if (!chatroom._timer.isIdle && socket.loggedIn) {
                socket.emit('server-warning', `Your connection will time out due to inactivity in ${timeLeft} seconds`);
            }
        },
        preUpdate: (socket) => {
            if (socket.destroyed) {
                socket.clearTimeout();
            }
        },
        postUpdate: (socket, { isIdle }) => {
            if (!isIdle && !chatroom._timer.isIdle) {
                socket.emit('ping');
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

        socket
            .on('_data', () => {
                chatroom.resetTimeout();
                socket.resetTimeout();
            })
            .on('_close', () => {
                socket.clearTimeout();
                chatroom.disconnect(socket);
            });

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
            .on('cmd', function (...args) {
                if (!socket.loggedIn) {
                    socket.emit('server-message', 'Please input a username to join');
                } else {
                    cmd(...args)(socket, chatroom);
                }
            })
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
        const data = unparseMsg({ event, args });
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
        args = args[0] ? args : ['Closing all lingering connections...'];
        message = unparseMsg({ event, args });
        for (let i = 0; i < chatroom.length; i++) {
            const socket = chatroom[i];
            if (!socket.destroyed) {
                socket.end(socket.loggedIn ? message : '');
            }
        }
        chatroom.length = 0;
        chatroom.users = {};
    }
});

// function startInterval(cb, timeout, ...args) {
//     cb(...args);
//     return setInterval(cb, timeout, ...args);
// }

// const timeoutProps = {
//     timeout: {
//         value: 20 // Inactivity of chatroom before timeout (seconds)
//     },
//     interval: {
//         value: 4 // Interval for checking timeout (seconds)
//     },
//     resetTimeout: {
//         value() {
//             chatroom.clearTimeout();
//             let count = Math.round(chatroom.timeout / chatroom.interval);
//             console.log('ran resetTimeout');
//             chatroom.timeoutInterval = chatroom.timeoutInterval || startInterval(() => {
//                 if (chatroom.length === 0) {
//                     chatroom.clearTimeout();
//                 } else if (count === 0) {
//                     chatroom.close();
//                 } else if (count <= 3) { // number of server messages before timeout
//                     const seconds = count * chatroom.interval + ' seconds'
//                     chatroom.emit('server-message', `No activity detected. Closing chatroom in ${seconds}`);
//                 }
//                 count--;
//             }, chatroom.interval * 1000);
//         }
//     },
//     clearTimeout: {
//         value() {
//             clearInterval(chatroom.timeoutInterval);
//             chatroom.timeoutInterval = null;
//         }
//     }
// }
// Object.defineProperties(chatroom, timeoutProps);

module.exports = chatroom;