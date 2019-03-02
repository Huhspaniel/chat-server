import React from 'react';
import { map, compose, identity, both } from 'ramda';
import { parseMessage } from './events';

const Message = ({ tag, text, tagColor = '', textColor = '', id }) => (
    <div key={id} className={`message ${textColor}`}>
        {tag ? <span className={tagColor}>{tag}</span> : ''}{text}
    </div>
)

const msgToJsx = compose(both(identity, Message), parseMessage);

const Chatbox = ({ sendLogin, sendChat, onChange, state: { username, chat, messages, loggedIn } }) => (
    <div className='chat-box'>
        <button className="reconnect fas fa-sync-alt"></button>
        <div className='messages'>
            {map(msg => msgToJsx(username, msg), messages)}
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