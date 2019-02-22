const crypto = require('crypto');
const configSocket = require('./socket');
const { parseMsg, serializeMsg } = require('./util');

const generateAcceptKey = key => crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');

const listen = (server, cb) => {
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
            socket = configSocket(socket, key);
            cb(socket);
        }
    })
}

module.exports = {
    parseMsg, serializeMsg, listen
}