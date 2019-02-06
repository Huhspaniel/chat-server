const { parseMsg, unparseMsg } = require('./message-parsing');
const { defineTimeout } = require('./timeout');

const addSocketTimeout = defineTimeout(600, function () {
    this.emit('server-message', 'Connection timed out. Disconnecting...');
    this.end();
}, {
    interval: 50,
    idleIntervals: 3,
    onIdle: function (timeLeft) {
        this.emit('server-warning', `Your connection will time out due to inactivity in ${timeLeft} seconds`);
    },
    preCheck: function (timeLeft) {
        if (this.destroyed) {
            this.stopTimeout();
        }
    },
    postCheck: function (timeLeft) {
        if (!this.loggedIn) {
            this.emit('server-message', 'Please input a username to join.');
        } else {
            this.emit('ping');
        }
    }
})

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
    });

    socket = addSocketTimeout(socket);
    socket.resetTimeout();

    stream
        .on('data', function (buffer) {
            socket.resetTimeout();
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
            if (!hadError) {
                console.log(`Socket ${socket.info} disconnected`);
            }
            clearInterval(socket.timeoutHandler);
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