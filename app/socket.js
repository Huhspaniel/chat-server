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
                if (event.charAt(0) === '_') {
                    stream.on(event.slice(1), cb);
                } else {
                    stream.on(`data-${event}`, cb);
                }
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
    });

    stream
        .on('data', function (buffer) {
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
            stream.emit('message', data);
            if (data.event) {
                if (data.args instanceof Array) {
                    stream.emit(`data-${data.event}`, ...data.args);
                } else {
                    stream.emit(`data-${data.event}`, data.args);
                }
            }
        })
        .on('close', function (hadError) {
            if (!hadError) {
                console.log(`Socket ${socket.info} disconnected`);
            }
        })
        .on('error', function (err, type) {
            const { name, message } = err;
            if (message === 'write EPIPE') {
                type = 'EPIPE';
            }
            switch (type) {
                case 'parsing': {
                    console.error(`Socket ${socket.info} parsing error`);
                    console.error(err.stack);
                    socket.emit('server-error', { name, message }, 'parsing');
                    break;
                }
                case 'EPIPE': {
                    console.error(`Socket ${socket.info} disconnected due to EPIPE error`);
                    stream.end();
                    break;
                }
                default: {
                    console.error(`Socket ${socket.info} disconnected due to%s error`, type ? ' ' + type : '');
                    console.error(err.stack);
                    stream.end();
                }
            }
        })

    socket._stream = stream;
    return socket;
}