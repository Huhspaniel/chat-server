import React from 'react';
import { map, compose } from 'ramda';
import uuidv1 from 'uuid/v1';
import events from './events';

const parse = (state, { event, args }) => events[event](state, ...args);

const addId = obj => Object.assign({ id: uuidv1() }, obj);

const Message = ({ tag, text, tagColor = '', textColor = '', id }) => (
    <div key={id} className={`message ${textColor}`}>
        {tag ? <span className={tagColor}>{tag}</span> : ''}{text}
    </div>
)

const msgToJsx = compose(Message, addId, parse);

const Chatbox = ({ sendLogin, sendChat, onChange, state, state: { chat, messages, loggedIn } }) => (
    <div className='chat-box'>
        <button className="reconnect fas fa-sync-alt"></button>
        <div className='messages'>
            {map(msg => msgToJsx(state, msg), messages)}
        </div>
        <form className="user-input" action="/" onSubmit={e => {
            e.preventDefault();
            if (chat) {
                if (loggedIn) {
                    sendChat(chat);
                } else {
                    sendLogin(chat);
                }
            }
        }}>
            <span className="input-carrot">> </span>
            <input type="text"
                onChange={onChange}
                value={chat}
                name="chat"
                placeholder="Input a username"
                autoComplete='off'
            />
            <input type="submit" value="Send" />
        </form>
    </div>
)

export default Chatbox;