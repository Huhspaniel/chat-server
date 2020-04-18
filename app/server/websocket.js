const crypto = require('crypto');
const configSocket = require('./socket');
const { parseMsg, serializeMsg, compose } = require('./util');

const createAcceptKey = key => crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');
const createHandshake = acceptKey => {
    const res = [
        'HTTP/1.1 101 Web Socket Protocol Handshake',
        'Sec-Websocket-Accept: ' + acceptKey,
        'Connection: Upgrade',
        'Upgrade: WebSocket'
    ];
    return res.join('\r\n') + '\r\n\r\n';
}
const createRes = compose(createHandshake, createAcceptKey);

const listen = (server, cb) => {
    server.on('upgrade', async (req, socket) => {
        await new Promise(resolve => setTimeout(() => resolve(), 500));
        const { headers } = req;
        if (headers.upgrade !== 'websocket') {
            socket.end('HTTP/1.1 400 Bad Request');
        } else {
            const key = headers['sec-websocket-key'];
            const res = createRes(key);
            socket.write(res);
            socket = configSocket(socket, key);
            cb(socket);
        }
    })
}

module.exports = {
    parseMsg, serializeMsg, listen
}