const crypto = require('crypto');

module.exports = {
    generateAcceptKey(key) {
        return crypto.createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
            .digest('base64');
    },
    // WebSocket Data Framing: https://tools.ietf.org/html/rfc6455#section-5.1
    parseMsg(buffer) {
        let offset = 0; // state of octet/byte offset
        const byte1 = buffer.readUInt8(offset); offset++;
        const isFinalFrame = byte1 >>> 7;
        const [reserved1, reserved2, reserved3] = [
            byte1 >>> 6 & 1,
            byte1 >>> 5 & 1,
            byte1 >>> 4 & 1
        ];
        const opCode = byte1 & 0xF;
        switch (opCode) {
            // connection close frame
            case 0x8: {
                return null;
            }
            // text frame
            case 0x1: {
                const byte2 = buffer.readUInt8(offset); offset++;
                const isMasked = byte2 >>> 7; // value of first bit
                let payloadLength = byte2 & 0x7F; // value of other seven bits
                if (payloadLength > 125) {
                    if (payloadLength === 126) {
                        payloadLength = buffer.readUInt16BE(offset); offset += 2;
                    } else {
                        // payloadLength === 127
                        const left = buffer.readUInt32BE(offset);
                        const right = buffer.readUInt32BE(offset + 4);
                        offset += 8;
                        throw new Error('Large payloads not currently implemented');
                    }
                }
                // allocation for final message data
                const data = Buffer.alloc(payloadLength);
                if (isMasked) {
                    // WebSocket Client-to-Server Masking: https://tools.ietf.org/html/rfc6455#section-5.3
                    for (let i = 0, j = 0; i < payloadLength; i++ , j = i % 4) {
                        const transformed_octet = buffer.readUInt8(offset + 4 + i);
                        const maskingKey_octet = buffer.readUInt8(offset + j);
                        data.writeUInt8(maskingKey_octet ^ transformed_octet, i);
                    }
                } else {
                    buffer.copy(data, 0, offset++);
                }
                return JSON.parse(data.toString('utf8').trim());
            }
            default: {
                throw new Error(`Unhandled frame type (opcode %x${opcode.toString('hex')})`);
            }
        }
    },
    // WebSocket Data Framing: https://tools.ietf.org/html/rfc6455#section-5.1
    unparseMsg(data) {
        const json = JSON.stringify(data);
        let length = Buffer.byteLength(json);
        let extendedBytes, realLength = length;
        if (length <= 125) {
            extendedBytes = 0;
        } else if (length <= 0xFFFF) {
            extendedBytes = 2;
            length = 126;
        } else {
            throw new Error('Large payloads not currently implemented');
        }
        const buffer = Buffer.alloc(2 + extendedBytes + realLength);
        buffer.writeUInt8(0b10000001, 0);
        buffer.writeUInt8(length, 1);
        let offset = 2;
        if (extendedBytes === 2) {
            buffer.writeUInt16BE(realLength, 2); offset += 2;
        }
        buffer.write(json, offset);
        return buffer;
    }
}