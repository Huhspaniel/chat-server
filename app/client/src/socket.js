import { EventEmitter } from 'events';
import events from './events';

const emitter = new EventEmitter();

const isSec = window.location.protocol === 'https:'
const url = `${isSec ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}/socket`;
const ws = new WebSocket(url);
ws.onmessage = e => {
    const data = JSON.parse(e.data);
    emitter.emit('_data', data);
    if (events.hasOwnProperty(data.event)) {
        emitter.emit('_event', data);
        emitter.emit(data.event, data.args)
    }
}
const socket = {};
const send = (event, ...args) => {
    ws.send(JSON.stringify({
        event, args
    }));
}
const on = (event, cb) => {
    emitter.on(event, cb);
    return socket;
};
socket.send = send;
socket.on = on;

export default socket;