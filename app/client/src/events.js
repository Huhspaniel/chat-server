function parseMessage(username, { event, args }) {
    let parse;
    switch (event) {
        case 'chat': {
            parse = (tag, text) => ({
                tag: `@${tag}: `,
                text,
                tagColor: tag === username ? 'me' : 'user',
                username: tag
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
        case 'server-warning': {
            parse = (text) => ({
                tag: 'WARNING: ',
                text,
                textColor: 'error'
            })
            break;
        }
        case 'login': {
            parse = (tag) => ({
                tag: `@${tag} `,
                text: 'has joined the chatroom',
                textColor: tag === username ? 'me' : 'user',
                username: tag
            })
            break;
        }
        case 'logout': {
            parse = (tag) => ({
                tag: `@${tag} `,
                text: 'has left the chatroom',
                tagColor: tag === username ? 'me' : '',
                textColor: 'logout',
                username: tag
            })
            break;
        }
        case 'info': {
            parse = (html) => html;
            break;
        }
        case 'dm': {
            parse = (from, to, text) => {
                from = from === username ? 'You' : `@${from}`;
                to = to === username ? 'You': `@${to}`;
                return {
                    tag: `${from} -> ${to}: `,
                    text,
                    tagColor: 'dm',
                    username: from
                }
            }
            break;
        }
        case 'notice': {
            parse = (text) => ({
                tag: 'NOTICE: ',
                text,
                textColor: 'orange'
            })
            break;
        }
        case 'error': {
            parse = (text) => ({
                tag: 'ERROR: ',
                text,
                textColor: 'error'
            })
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