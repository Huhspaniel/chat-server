const cmdDesc = {
    dm: '/dm {user} {message} -- Send direct/private message',
    users: '/users -- See list of active users',
    logout: '/logout',
    q: '/q -- Disconnect from server',
    help: '/help -- See list of available commands'
}
const commands = {
    dm: (username, msg) => (socket, chatroom) => {
        if (!username) {
            socket.emit(
                'info',
                `<p style="padding-left: 10px;">${cmdDesc.dm}</p>`
            )
        } else {
            if (username.charAt(0) === '@') username = username.slice(1);
            const to = chatroom.users[username];
            const from = socket;
            if (to) {
                if (to === from) {
                    socket.emit('dm', from.username, to.username, msg);
                } else {
                    to.emit('dm', from.username, to.username, msg);
                    from.emit('dm', from.username, to.username, msg);
                }
            } else {
                from.emit('server-message', `User "${username}" does not exist or is not online`);
            }
        }
    },
    users: () => (socket, chatroom) => {
        socket.emit(
            'info',
            `<p style="padding-left:10px; font-weight:bold;">Online users:</p>
      <div style="padding-left: 20px;">
        ${Object.keys(chatroom.users).map(user => `<p>- @${user}</p>`).join('')}
      </div>`
        )
    },
    logout: () => socket => {
        socket._stream.emit('data-logout');
    },
    q: () => socket => {
        socket.end();
    },
    help: () => socket => {
        socket.emit(
            'info',
            `<p style="padding-left:10px; font-weight:bold;">Available commands:</p>
        <div style="padding-left: 20px;">
          ${Object.values(cmdDesc).map(desc => `<p>- ${desc}</p>`).join('')}
        </div>`
        )
    }
}
for (let cmd in cmdDesc) {
    commands[cmd].desc = cmdDesc[cmd];
}
module.exports = (...args) => {
    const cmd = args.splice(0, 1) || 'help';
    return commands[cmd](...args);
}