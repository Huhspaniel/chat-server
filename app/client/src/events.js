function parseMessage(username, { event, args }) {
    let parse;
    switch (event) {
        case 'chat': {
            parse = (tag, text) => ({
                tag: `@${tag}: `,
                text,
                tagColor: tag === username ? 'me' : 'user'
            })
            break;
        }
        case 'server-message': {
            parse = (text) => ({
                tag: 'SERVER: ',
                text,
                textColor: 'gray'
            })
            break;
        }
        case 'login': {
            parse = (tag) => ({
                tag: `@${tag} `,
                text: 'has joined the chatroom',
                textColor: tag === username ? 'me' : 'user'
            })
            break;
        }
        case 'info': {
            parse = (html) => (
                html
            );
            break;
        }
        default: {
            return null;
        }
    }
    const message = parse(...args);
    return message;
}

export { parseMessage };