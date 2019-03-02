import { EventEmitter } from 'events';
import { } from 'ramda';

function getSocket() {
    const emitter = new EventEmitter();
    emitter.on('error', () => {});
    
    const isSec = window.location.protocol === 'https:'
    const url = `${isSec ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}/socket`;
    const ws = new WebSocket(url);
    ws.onmessage = e => {
        const data = JSON.parse(e.data);
        emitter.emit('_data', data);
        emitter.emit('message', data);
        emitter.emit(data.event, data.args)
    }
    ws.onclose = e => {
        emitter.emit('_close', e);
    }
    ws.onopen = e => {
        emitter.emit('_open', e);
    }
    const socket = {};
    const send = (event, ...args) => {
        ws.send(JSON.stringify({
            event, args
        }));
    }
    socket.send = send;
    socket.on = emitter.on.bind(emitter);
    socket.once = emitter.once.bind(emitter);
    socket.close = ws.close.bind(ws);
    return socket;
}

export { getSocket };