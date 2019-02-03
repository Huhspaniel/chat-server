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
const socketUrl = `${isSec ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}`;
let socket = { readyState: 3 };
function connectSocket() {
    const { readyState } = socket;
    switch (readyState) {
        case 2: {
            break;
        }
        case 3: {
            break;
        }
        default: {
            socket.close();
        }
    }
    socket = new WebSocket(socketUrl);
    socket.onopen = event => {
        console.log('Connection to server established: ', event);
        renderMessage('NOTICE:', 'Connection to server established', { msgColor: 'orange' });
    };
    socket.onclose = event => {
        loggedIn = false;
        form[0].placeholder = 'Input a username';
        console.log('Disconnected from server: ', event);
        renderMessage('NOTICE:', 'Disconnected from server', { msgColor: 'orange' })
    }
    socket.onerror = event => {
        console.log('WebSocket error event: ', event);
        renderMessage('ERROR:', 'Caught error (in console). Try reconnecting', { msgColor: 'error' });
    };
    socket.onmessage = event => {
        console.log('Received:', JSON.parse(event.data));
        const data = JSON.parse(event.data);
        switch (data.event) {
            case 'chat': {
                const [username, chat] = data.args;
                renderMessage(
                    `@${username}:`, chat,
                    { tagColor: username === myUsername ? 'me' : 'user' }
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
                break;
            }
            case 'error': {
                const [err] = data.args;
                renderMessage('ERROR:', err, { msgColor: 'error' });
                break;
            }
            case 'info': {
                let [info] = data.args;
                info = '<span>SERVER:</span><br />' + info;
                renderHTML(info, 'green');
                break;
            }
            case 'server-message': {
                const [msg] = data.args;
                renderMessage('SERVER:', msg, { msgColor: 'gray' });
                break;
            }
            case 'server-warning': {
                const [msg] = data.args;
                renderMessage('WARNING:', msg, { msgColor: 'gray' });
            }
            case 'server-error': {
                break;
            }
        }
    };
}
connectSocket();

reconnectBtn.addEventListener('click', e => {
    e.preventDefault();
    form[0].value = '';
    messages.innerHTML = '';
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

form.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target[0].value.trim();
    if (input) {
        const { readyState } = socket;
        switch (readyState) {
            case 0: {
                renderMessage('NOTICE:', 'Connecting to server... please wait',
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