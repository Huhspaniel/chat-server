import React from 'react';
import { map, identity, both, ifElse, is } from 'ramda';
import uuidv4 from 'uuid/v4'

const Message = ({ tag, text, tagColor = '', textColor = '' }) => (
    <div key={uuidv4()} className={`message ${textColor}`}>
        {tag ? <span className={tagColor}>{tag}</span> : ''}{text}
    </div>
)
const ServerHtml = html => (
    <div key={uuidv4()} className='message blue' dangerouslySetInnerHTML={{__html: html}} />
);

const msgToJsx = both(identity, ifElse(is(String), ServerHtml, Message));

const Chatbox = ({ send, reconnect, onChange, state: { username, input, messages, loggedIn, connected } }) => (
    <div className='chat-box'>
        <button className='reconnect fas fa-sync-alt' onClick={reconnect}></button>
        <div className='messages'>
            {map(msgToJsx, messages)}
        </div>
        <form className='user-input' action='/' onSubmit={e => {
            e.preventDefault();
            if (input) {
                send();
            }
        }}>
            <span className='input-carrot me'>{loggedIn ? `@${username} ` : ''}> </span>
            <input type='text'
                onChange={onChange}
                value={input}
                name='input'
                placeholder={!loggedIn && connected ? 'Input a username' : ''}
                autoComplete='off'
            />
            <input type='submit' value='Send' />
        </form>
    </div>
)

export default Chatbox;