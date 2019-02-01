const messages = document.querySelector('.messages');
const form = document.querySelector('.user-input');
const reconnectBtn = document.querySelector('button.reconnect');
let loggedIn = false;
let myUsername = null;

function renderMessage(span, msg, colors) {
    if (typeof colors === 'object') {
        var { msgColor, spanColor } = colors;
    }
    let scrollTop = messages.scrollTop;
    messages.innerHTML =
        `<div class="${msgColor || ''} message">
            ${span ? `<span class="${spanColor || ''}">${span}</span> ` : ''}${msg}
        </div>` + messages.innerHTML;
    if (messages.scrollHeight - messages.scrollTop > messages.offsetHeight) {
        messages.scrollTop = scrollTop;
    }
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
        renderMessage('NOTICE:', 'Connection to server established', { msgColor: 'info' });
    };
    socket.onclose = event => {
        loggedIn = false;
        form[0].placeholder = 'Input a username';
        console.log('Disconnected from server: ', event);
        renderMessage('NOTICE:', 'Disconnected from server', { msgColor: 'info' })
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
                    { spanColor: username === myUsername ? 'me' : 'user' }
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
                    { msgColor: 'logout', spanColor: `${username === myUsername ? 'me' : ''}` }
                );
                break;
            }
            case 'error': {
                const [err] = data.args;
                renderMessage('ERROR:', err, { msgColor: 'error' });
                break;
            }
            case 'server-message': {
                const [msg] = data.args;
                renderMessage('SERVER:', msg, { msgColor: 'gray' });
                break;
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

form.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target[0].value.trim();
    if (input) {
        const { readyState } = socket;
        switch (readyState) {
            case 0: {
                renderMessage('NOTICE:', 'Connecting to server... please wait',
                    { msgColor: 'info' }
                );
                break;
            }
            case 1: {
                e.target[0].value = '';
                const message = {
                    event: null,
                    args: [input]
                }
                if (loggedIn) {
                    message.event = 'chat';
                } else {
                    message.event = 'login';
                    myUsername = input;
                }
                socket.send(JSON.stringify(message));
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