import React from 'react';
import { map, compose, identity, both, ifElse, is } from 'ramda';
import { parseMessage } from './events';
import uuidv4 from 'uuid/v4'

const Message = ({ tag, text, tagColor = '', textColor = '' }) => (
    <div key={uuidv4()} className={`message ${textColor}`}>
        {tag ? <span className={tagColor}>{tag}</span> : ''}{text}
    </div>
)
const ServerHtml = html => (
    <div key={uuidv4()} className='message blue' dangerouslySetInnerHTML={{__html: html}} />
);

const handleMessage = both(identity, ifElse(is(String), ServerHtml, Message))

const msgToJsx = compose(handleMessage, parseMessage);

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