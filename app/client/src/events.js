import uuidv4 from 'uuid/v4';

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
        default: {
            return null;
        }
    }
    const message = parse(...args);
    message.id = uuidv4();
    return message;
}

export { parseMessage };