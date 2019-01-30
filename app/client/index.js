const socket = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);

const messages = document.querySelector('.messages');

socket.addEventListener('error', err => {
    console.log(err);
})

let loggedIn = false;
let myUsername = null;

socket.addEventListener('message', event => {
    console.log('Received: ' + event.data);
    const data = JSON.parse(event.data);
    switch (data.event) {
        case 'chat': {
            const [ username, chat ] = data.args;
            let scrollTop = messages.scrollTop;
            messages.innerHTML = 
            `<div class="chat message">
                <span class="${username === myUsername ? 'me' : ''}">@${username}:</span> ${chat}
            </div>` + messages.innerHTML;
            if (messages.scrollHeight - messages.scrollTop > messages.offsetHeight) {
                messages.scrollTop = scrollTop;
            }
            break;
        }
        case 'login': {
            const [ username ] = data.args;
            if (!loggedIn && username === myUsername) {
                loggedIn = true;
            }
            messages.innerHTML =
            `<div class="login message">
                <span class=${username === myUsername ? 'me' : ''}>@${username}</span> has joined the chatroom
            </div>` +  messages.innerHTML;
            break;
        }
        case 'logout': {
            const [ username ] = data.args;
            messages.innerHTML =
            `<div class="logout message">
                <span class=${username === myUsername ? 'me' : ''}>@${username}</span> has left the chatroom
            </div>` + messages.innerHTML;
            break;
        }
        case 'error': {
            const [ err ] = data.args;
            messages.innerHTML = 
            `<div class="error message">
                <span>ERROR:</span> ${err}
            </div>` + messages.innerHTML;
            break;
        }
        case 'info': {
            const [ info ] = data.args;
            messages.innerHTML =
            `<div class="info message">
                <span>Server:</span> ${info}
            </div>` + messages.innerHTML;
            break;
        }
    }
});

document.querySelector('.user-input input').addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        const input = e.target.value;
        e.target.value = '';
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
    }
});