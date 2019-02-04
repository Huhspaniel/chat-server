const { parseMsg, unparseMsg } = require('./message-parsing');

module.exports = function (socket, wsKey) {
    const stream = socket;

    const socketProps = {
        id: {
            get() {
                if (wsKey) {
                    return wsKey.slice(0, wsKey.length - 2);
                } else {
                    return null;
                }
            }
        },
        info: {
            get: function () {
                return `${socket.id}${socket.username ? ` (@${socket.username})` : ''}`;
            }
        },
        emit: {
            value: function (event, ...args) {
                return socket.write(unparseMsg({ event, args }));
            }
        },
        on: {
            value: function (event, cb) {
                stream.on(`data-${event}`, cb);
                return socket;
            }
        },
        write: {
            value: function (data, encoding, cb) {
                if (!stream.destroyed) {
                    return stream.write(data, encoding, cb);
                }
            }
        },
        end: {
            value: function (data, encoding, cb) {
                if (!stream.destroyed) {
                    stream.end(data, encoding, cb);
                }
                return socket;
            }
        },
        destroyed: {
            get() {
                return stream.destroyed;
            }
        }
    };
    const timeoutProps = {
        timeout: {
            value: 825000
        },
        lastActive: {
            value: Date.now(),
            writable: true
        },
        timeLeft: {
            get() {
                return socket.timeout - socket.timeInactive;
            }
        },
        timeoutHandler: {
            value: setInterval(() => {
                if (!socket.loggedIn) {
                    socket.emit('server-message', 'Please input a username to join.');
                } else {
                    socket.emit('ping');
                    if (socket.timeLeft <= 0) {
                        socket.emit('server-message', 'Connection timed out. Disconnecting...');
                        clearInterval(socket.timeoutHandler);
                        socket.end();
                    } else if (socket.timeLeft <= 120000) {
                        const seconds = Math.round(socket.timeLeft / 1000) + ' seconds'
                        socket.emit('server-warning', `Your connection will time out due to inactivity in ${seconds}`);
                    }
                }
            }, 55000)
        }
    }

    socket = Object.defineProperties({}, {
        ...socketProps,
        ...timeoutProps
    });

    stream
        .on('data', function (buffer) {
            socket.lastActive = Date.now();
            try {
                var data = parseMsg(buffer);
            } catch (err) {
                stream.emit('error', err, 'parsing');
                return;
            }
            if (data === null) {
                return stream.end();
            }
            console.log(`Socket ${socket.info} sent`, data);
            stream.emit('data-raw', data);
            if (data.event) {
                if (data.args instanceof Array) {
                    stream.emit(`data-${data.event}`, ...data.args);
                } else {
                    stream.emit(`data-${data.event}`, data.args);
                }
            }
        })
        .on('close', function (hadError) {
            console.log(`Socket ${socket.info} disconnected`);
            clearInterval(socket.timeoutHandler);
        })
        .on('error', function (err, type) {
            console.error(`Socket ${socket.info}%s error`, type ? ' ' + type : '');
            console.error(err.stack);
            const { name, message } = err;
            switch (type) {
                case 'parsing': {
                    socket.emit('server-error', { name, message }, 'parsing');
                    break;
                }
                default: {
                    stream.end();
                }
            }
        })

    socket._stream = stream;
    return socket;
}