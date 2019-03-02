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
        case 'dm': {
            parse = (from, to, text) => {
                from = from === username ? 'You' : `@${from}`;
                to = to === username ? 'You': `@${to}`;
                return {
                    tag: `${from} -> ${to}: `,
                    text,
                    tagColor: 'dm'
                }
            }
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