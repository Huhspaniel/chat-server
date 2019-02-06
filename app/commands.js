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
        } else if (!msg) {
            return;
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
                const pid = process.users.findPID(username);
                if (pid) {
                    chatroom.emit.global({
                        event: 'dm',
                        args: [socket.username, username, msg],
                        pids: {
                            [username]: pid,
                            [socket.username]: process.pid
                        }
                    })
                } else {
                    from.emit('server-message', `User "${username}" does not exist or is not online`);
                }
            }
        }
    },
    users: () => (socket, chatroom) => {
        socket.emit(
            'info',
            `<p style="padding-left:10px; font-weight:bold;">Online users:</p>
      <div style="padding-left: 20px;">
        ${process.users.array.map(user => `<p>- @${user}</p>`).join('')}
      </div>`
        )
    },
    logout: () => socket => {
        socket._stream.emit('data-logout');
    },
    q: () => socket => {
        socket.close();
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
    if (!commands[cmd]) {
        return socket => {
            socket.emit('info', `<p style="padding-left: 10px;">Command "${cmd}" does not exist. Type "/help" to see available commands.</p>`)
        }
    }
    return commands[cmd](...args);
}