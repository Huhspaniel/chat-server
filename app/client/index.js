const messages = document.querySelector('.messages');
const form = document.querySelector('.user-input');
const reconnectBtn = document.querySelector('button.reconnect');
let loggedIn = false;
let myUsername = null;
let lastActivity = null;
let pinger = null;

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
        lastActivity = null;
        clearInterval(pinger);
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
                    pinger = setInterval(() => {
                        if (socket.readyState === 1) {
                            let timeout = 1.2e+6 - (Date.now() - lastActivity); // times out after 20 minutes of inactivity
                            if (timeout <= 0) {
                                renderMessage(
                                    'NOTICE:', 'Connection timed out due to inactivity',
                                    { msgColor: 'error' }
                                )
                                socket.close();
                                clearInterval(pinger);
                            } else {
                                if (timeout <= 120000) {
                                    timeout = Math.trunc(timeout / 1000) + ' seconds'
                                    renderMessage(
                                        'WARNING:', `Connection will time out due to inactivity in ${timeout}`,
                                        { msgColor: 'info' }
                                    )
                                }
                                console.log('Pinging server');
                                socket.send('{ "event": "ping" }');
                            }
                        } else {
                            clearInterval(pinger);
                        }
                    }, 30000);
                }
                break;
            }
            case 'logout': {
                const [username] = data.args;
                messages.innerHTML =
                    `<div class="logout message">
                    <span class=${username === myUsername ? 'me' : ''}>@${username}</span> has left the chatroom
                </div>` + messages.innerHTML;
                break;
            }
            case 'error': {
                const [err] = data.args;
                messages.innerHTML =
                    `<div class="error message">
                    <span>ERROR:</span> ${err}
                </div>` + messages.innerHTML;
                break;
            }
            case 'server-message': {
                const [msg] = data.args;
                messages.innerHTML =
                    `<div class="gray message">
                    <span>SERVER:</span> ${msg}
                </div>` + messages.innerHTML;
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

form[0].addEventListener('input', e => {
    lastActivity = Date.now();
})

form.addEventListener('submit', e => {
    e.preventDefault();
    lastActivity = Date.now();
    const input = e.target[0].value.trim();
    if (input) {
        const { readyState } = socket;
        switch (readyState) {
            case 0: {
                renderMessage(null, 'Connecting to server... please wait', 'client');
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
                renderMessage('Not connected to server. Try reconnecting', 'error', 'ERROR');
                break;
            }
        }
    }
})