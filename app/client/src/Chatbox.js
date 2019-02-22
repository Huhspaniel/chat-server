import React from 'react';
import { map, compose } from 'ramda';
import uuidv1 from 'uuid/v1';

const eventParse = {
    'chat': (username, chat) => ({ tag: `@${username}`, text: chat }),
    'server-message': (text) => ({ tag: 'SERVER', text })
}
const parse = ({ event, args }) => eventParse[event](...args);

const addId = obj => Object.assign({ id: uuidv1() }, obj);

const Message = ({ tag, text, id }) => (
    <div key={id} className='message'>
        {tag ? <span>{tag}: </span> : ''}{text}
    </div>
)

const msgToJsx = compose(Message, addId, parse);

const Chatbox = ({ messages }) => (
    <div className='chatbox'>
        {map(msgToJsx, messages)}
    </div>
)

export default Chatbox;