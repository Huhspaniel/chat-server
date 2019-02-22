import { EventEmitter } from 'events';

const emitter = new EventEmitter();

const isSec = window.location.protocol === 'https:'
const url = `${isSec ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}/socket`;
const ws = new WebSocket(url);