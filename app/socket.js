const { parseMsg, unparseMsg } = require('./message-parsing');

module.exports = function (socket, wsKey) {
    const stream = socket;
    socket = Object.defineProperties({}, {
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
                const user = !!socket.username
                    ? '@' + socket.username
                    : 'Anonymous';
                const info = user + (user.length > 3
                    ? ` (${socket.id.slice(0, 23 - user.length)}..)`
                    : ` ${Array(1 + 3 - user.length).join(' ')}(${socket.id})`);
                return info;
            }
        },
        emit: {
            value: function (event, ...args) {
                return socket._write(unparseMsg.json({ event, args }));
            }
        },
        ping: {
            value: function () {
                socket.pongHandler = setTimeout(() => {
                    const err = new Error('Socket did not pong the ping');
                    err.name = 'PingError';
                    stream.destroy(err);
                }, 15000);
                return socket._write(unparseMsg(0));
            }
        },
        pong: {
            value: function () {
                return socket._write(unparseMsg(1));
            }
        },
        close: {
            value: function (event, ...args) {
                return socket._end(unparseMsg.json({ event, args }));
            }
        },
        on: {
            value: function (event, cb) {
                if (event.charAt(0) === '_') {
                    stream.on(event.slice(1), cb);
                } else {
                    stream.on(`data-${event}`, cb);
                }
                return socket;
            }
        },
        _write: {
            value: function (data, encoding, cb) {
                if (!stream.destroyed) {
                    return stream.write(data, encoding, cb);
                }
            }
        },
        _end: {
            value: function (data, encoding, cb) {
                if (!stream.destroyed) {
                    stream.end(data, encoding, cb);
                }
                return socket;
            }
        },
        _destroyed: {
            get() {
                return stream.destroyed;
            }
        }
    });

    stream
        .on('data', function (buffer) {
            try {
                var data = parseMsg.json(buffer);
            } catch (err) {
                stream.emit('error', err);
                return;
            }
            if (data === null) {
                return stream.end();
            } else if (data == 0) {
                socket.pong();
            } else if (data == 1) {
                clearTimeout(socket.pongHandler);
            } else {
                console.log(`${socket.info}`, data);
                stream.emit('message', data);
                if (data.event) {
                    if (data.args instanceof Array) {
                        stream.emit(`data-${data.event}`, ...data.args);
                    } else {
                        stream.emit(`data-${data.event}`, data.args);
                    }
                }
            }
        })
        .on('close', function (hadError) {
            if (!hadError) {
                console.log(`${socket.info} disconnected`);
            }
        })
        .on('error', function (err) {
            let type;
            const { name, message } = err;
            if (message === 'write EPIPE') {
                type = 'EPIPE';
            } else if (name === 'SyntaxError' && message.match(/JSON/)) {
                type = 'parsing';
            } else if (name === 'PingError') {
                type = 'ping';
            }
            switch (type) {
                case 'parsing': {
                    console.error(`Socket ${socket.info} JSON parsing error`);
                    socket.emit('server-error', { name, message }, 'parsing');
                    break;
                }
                case 'EPIPE': {
                    console.error(`Socket ${socket.info} disconnected due to EPIPE error`);
                    break;
                }
                case 'ping': {
                    console.error(`Socket ${socket.info} disconnected due to no pong :(`);
                    socket.emit('server-message', 'Connection timed out');
                    break;
                }
                default: {
                    console.error(`Socket ${socket.info} disconnected due to%s error`, type ? ' ' + type : '');
                    console.error(err.stack);
                    stream.destroy(err);
                }
            }
        })

    socket._stream = stream;
    return socket;
}
