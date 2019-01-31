const messages = document.querySelector('.messages');
const form = document.querySelector('.user-input');
const reconnectBtn = document.querySelector('button.reconnect');
let loggedIn = false;
let myUsername = null;
function renderMessage(tag, msg, msgClass, tagClass) {
    messages.innerHTML =
        `<div class="${msgClass || ''} message">
                <span class="${tagClass || ''}">${tag}:</span> ${msg}
        </div>` + messages.innerHTML;
}

const isSec = window.location.protocol === 'https:'
const socketUrl = `${isSec ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}`;
let socket = { readyState: 3 };
function connectSocket() {
    console.log(socket);
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
        renderMessage('CLIENT', 'Connection to server established', 'client');
    };
    socket.onclose = event => {
        loggedIn = false;
        form[0].placeholder = 'Input a username';
        console.log('Disconnected from server: ', event);
        renderMessage('CLIENT', 'Disconnected from server', 'client')
    }
    socket.onerror = event => {
        console.log('WebSocket error event: ', event);
        renderMessage('ERROR', 'Caught WebSocket error (in console)', 'error');
    };
    socket.onmessage = event => {
        console.log('Received:', JSON.parse(event.data));
        const data = JSON.parse(event.data);
        switch (data.event) {
            case 'chat': {
                const [username, chat] = data.args;
                let scrollTop = messages.scrollTop;
                messages.innerHTML =
                    `<div class="chat message">
                    <span class="${username === myUsername ? 'me' : 'user'}">@${username}:</span> ${chat}
                </div>` + messages.innerHTML;
                if (messages.scrollHeight - messages.scrollTop > messages.offsetHeight) {
                    messages.scrollTop = scrollTop;
                }
                break;
            }
            case 'login': {
                const [username] = data.args;
                messages.innerHTML =
                    `<div class="login message${username === myUsername ? ' me' : ''}">
                    <span>@${username}</span> has joined the chatroom
                </div>` + messages.innerHTML;
                if (!loggedIn && username === myUsername) {
                    loggedIn = true;
                    form[0].placeholder = '';
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
            case 'info': {
                const [info] = data.args;
                messages.innerHTML =
                    `<div class="server message">
                    <span>SERVER:</span> ${info}
                </div>` + messages.innerHTML;
                break;
            }
        }
    };
}
connectSocket();
reconnectBtn.addEventListener('click', connectSocket);

form.addEventListener('submit', e => {
    e.preventDefault();
    const { readyState } = socket;
    switch (readyState) {
        case 0: {
            renderMessage('INFO', 'Connecting to server... please wait', 'info');
            break;
        }
        case 1: {
            const input = e.target[0].value;
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
            renderMessage('ERROR', 'Not connected to server', 'error');
            break;
        }
    }
})