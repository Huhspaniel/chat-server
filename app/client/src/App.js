import React, { Component } from 'react';
import './App.css';
import Chatbox from './Chatbox';
import socket from './socket';

class App extends Component {
  state = {
    messages: [],
    loggedIn: false,
    username: null
  }
  constructor(...args) {
    super(...args);
    socket.on('_event', message => {
      console.log(message);
      this.setState({
        messages: this.state.messages.concat(message)
      })
    }).on('login', args => {
      if (args[0] === this.state.username) {
        this.setState({
          loggedIn: true
        })
      }
    })
  }

  login = (username) => {
    socket.send('login', username);
    this.setState({ loggedIn: true })
  }
  chat = (chat) => {
    socket.send('chat', chat);
  }

  render() {
    return (
      <div className="App">
        {Chatbox({ ...this.state, chat: this.chat, login: this.login })}
      </div>
    );
  }
}

export default App;
