import React from 'react';
import { map, compose } from 'ramda';
import uuidv1 from 'uuid/v1';
import events from './events';

const parse = ({ event, args }) => events[event](...args);

const addId = obj => Object.assign({ id: uuidv1() }, obj);

const Message = ({ tag, text, id }) => (
    <div key={id} className='message'>
        {tag ? <span>{tag}</span> : ''}{text}
    </div>
)

const msgToJsx = compose(Message, addId, parse);

const Chatbox = ({ messages, login, chat, loggedIn }) => (
    <div className='chatbox'>
        <div className='messages'>
            {map(msgToJsx, messages)}
        </div>
        <form action="" onSubmit={e => {
            e.preventDefault();
            const input = e.target[0].value.trim();
            e.target[0].value = '';
            if (input) {
                if (loggedIn) {
                    chat(input);
                } else {
                    login(input);
                }
            }
        }}>
            <input type="text" /><input type="submit" />
        </form>
    </div>
)

export default Chatbox;