const events = {
    'chat': ({ username }, tag, text) => ({
        tag: `@${tag}: `,
        text,
        tagColor: tag === username ? 'me' : 'user'
    }),
    'server-message': (state, text) => ({
        tag: 'SERVER: ',
        text,
        textColor: 'gray'
    }),
    'login': ({ username }, tag) => ({
        tag: `@${tag} `,
        text: 'has joined the chatroom',
        textColor: tag === username ? 'me' : 'user'
    })
}

export default events;