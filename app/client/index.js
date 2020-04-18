const messages = document.querySelector('.messages');
const form = document.querySelector('.user-input');
const reconnectBtn = document.querySelector('button.reconnect');
let loggedIn = false;
let myUsername = null;

function renderMessage(tag, msg, colors) {
    if (typeof colors === 'object') {
        var { msgColor, tagColor } = colors;
    }
    let scrollTop = messages.scrollTop;
    const message = document.createElement('div');
    message.classList.add('message', msgColor);
    if (tag) {
        const span = document.createElement('span');
        if (tagColor) span.classList.add(tagColor);
        span.append(tag + ' ');
        message.append(span);
    }
    message.append(msg);
    messages.prepend(message);
    if (messages.scrollHeight - messages.scrollTop > messages.offsetHeight) {
        messages.scrollTop = scrollTop;
    }
}
function renderHTML(html, color) {
    const message = document.createElement('div');
    message.classList.add(color || 'gray', 'message');
    message.innerHTML = html;
    messages.prepend(message);
}

const isSec = window.location.protocol === 'https:'
const socketUrl = `${isSec ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}/socket`;
/** @type {WebSocket} */
let socket;
async function connectSocket() {
    const readyState = socket ? socket.readyState : WebSocket.CLOSED;
    switch (readyState) {
        case WebSocket.CONNECTING: return;
        case WebSocket.OPEN: return;
    }
    renderMessage(null, 'Connecting...', { msgColor: 'gray' });
    socket = new WebSocket(socketUrl);
    const open = new Promise(resolve => {
        socket.onopen = event => {
            renderMessage(null, 'Connection to server established', { msgColor: 'orange' });
            resolve();
        };
    });
    socket.onclose = event => {
        loggedIn = false;
        form[0].placeholder = 'Input a username';
        renderMessage(null, 'Disconnected from server', { msgColor: 'orange' })
    }
    socket.onerror = event => {
        console.log('WebSocket error: ', event);
        renderMessage('ERROR:', 'Oops! Something went wrong.', { msgColor: 'error' });
    };
    socket.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data == 0) { // ping pong
            return socket.send(1);
        } else if (data == 1) {
            return;
        }
        switch (data.event) {
            case 'chat': {
                const [username, chat] = data.args;
                renderMessage(
                    `@${username}:`, chat,
                    { tagColor: username === myUsername ? 'me' : 'user' }
                );
                break;
            }
            case 'dm': {
                let [to, from, msg] = data.args;
                to = to === myUsername
                    ? 'You'
                    : '@' + to;
                from = from === myUsername
                    ? 'You'
                    : '@' + from;
                renderMessage(
                    `${to} -> ${from}:`, msg,
                    { tagColor: 'dm' }
                );
                break;
            }
            case 'login': {
                const [username] = data.args;
                renderMessage(
                    `@${username}`, 'has joined the chatroom',
                    { msgColor: username === myUsername ? 'me' : 'user' }
                );
                if (!loggedIn && username === myUsername) {
                    loggedIn = true;
                    form[0].placeholder = '';
                }
                break;
            }
            case 'logout': {
                const [username] = data.args;
                renderMessage(
                    `@${username}`, ' has left the chatroom',
                    { msgColor: 'logout', tagColor: `${username === myUsername ? 'me' : ''}` }
                );
                if (username === myUsername) {
                    loggedIn = false;
                    form[0].placeholder = 'Input a username'
                }
                break;
            }
            case 'error': {
                const [err] = data.args;
                renderMessage('ERROR:', err, { msgColor: 'error' });
                break;
            }
            case 'info': {
                let [info] = data.args;
                // info = '<span>SERVER:</span><br />' + info;
                renderHTML(info, 'blue');
                break;
            }
            case 'server-message': {
                const [msg] = data.args;
                renderMessage('SERVER:', msg, { msgColor: 'gray' });
                break;
            }
            case 'server-warning': {
                const [msg] = data.args;
                renderMessage('WARNING:', msg, { msgColor: 'error' });
            }
            case 'server-error': {
                break;
            }
        }
    };
    await open;
}
async function disconnectSocket() {
    if (socket.readyState === WebSocket.CLOSED) return;
    socket.close();
    await new Promise(resolve => socket.addEventListener('close', resolve));
}
connectSocket();

reconnectBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (socket.readyState === WebSocket.CONNECTING) return;
    form[0].value = '';
    messages.innerHTML = '';
    await disconnectSocket();
    connectSocket();
});

let lastPing = null;
form[0].addEventListener('input', e => {
    if (loggedIn && Date.now() - lastPing > 300000) {
        console.log('Pinging server...')
        socket.send('{ "event": "ping" }');
        lastPing = Date.now();
    }
})

const cmds = [];
Object.defineProperties(cmds, {
    index: {
        value: 0,
        writable: true
    },
    prev: {
        get: () => {
            if (cmds.index !== cmds.length) {
                cmds.index++;
            }
            return cmds[cmds.length - cmds.index] || '';
        }
    },
    next: {
        get: () => {
            if (cmds.index !== 0) {
                cmds.index--
            }
            return cmds[cmds.length - cmds.index] || '';
        }
    },
    last: {
        get: () => cmds[cmds.length - 1]
    },
    push: {
        value: function (cmd) {
            cmds.index = 0;
            if (cmd !== cmds.last) {
                cmds[cmds.length] = cmd;
            }
        }
    }
})
form.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target[0].value.trim();
    cmds.index = 0;
    if (input) {
        const { readyState } = socket;
        switch (readyState) {
            case 0: {
                renderMessage(null, 'Connecting to server... please wait',
                    { msgColor: 'orange' }
                );
                break;
            }
            case 1: {
                e.target[0].value = '';
                let event, args;
                if (loggedIn) {
                    if (input.charAt(0) === '/') {
                        event = 'cmd';
                        args = input.slice(1).trim().split(/[\s]/);
                        let cmd = args;
                        switch (args[0]) {
                            case 'dm': {
                                args[2] = args.splice(2).join(' ');
                                cmd = cmd.slice(0, 2);
                                break;
                            }
                        }
                        cmd = cmd.join(' ');
                        cmds.push(cmd);
                    } else {
                        event = 'chat';
                        args = [input];
                    }
                } else {
                    event = 'login';
                    myUsername = input;
                    args = [input];
                    lastPing = Date.now();
                }
                socket.send(JSON.stringify({ event, args }));
                break;
            }
            default: {
                renderMessage('ERROR:', 'Not connected to server. Try reconnecting',
                    { msgColor: 'error' }
                );
                break;
            }
        }
    }
})
form[0].addEventListener('keydown', (e) => {
    let cmd;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (cmds.index === 0) return;
        cmd = cmds.next;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (cmds.index === cmds.length) return;
        cmd = cmds.prev;
    } else {
        return;
    }
    e.target.value = cmd ? `/${cmd} ` : '';
})
