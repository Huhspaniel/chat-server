const events = {
    'chat': (username, chat) => ({ tag: `@${username}: `, text: chat }),
    'server-message': (text) => ({ tag: 'SERVER: ', text }),
    'login': (username) => ({ tag: `@${username} `, text: 'has joined the chatroom' })
}

export default events;