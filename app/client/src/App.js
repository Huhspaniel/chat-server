import React, { Component } from 'react';
import './App.css';
import Chatbox from './Chatbox';
import socket from './socket';

class App extends Component {
  state = {
    messages: [],
    loggedIn: false,
    username: null,
    chat: ''
  }
  componentWillMount() {
    socket.on('_event', message => {
      console.log(message);
      this.setState({
        messages: Array(message).concat(this.state.messages)
      })
    }).on('login', args => {
      if (args[0] === this.state.username) {
        this.setState({
          loggedIn: true
        })
      }
    }).on('logout', args => {
      if (args[0] === this.state.username) {
        this.setState({
          loggedIn: false,
          username: null
        })
      }
    }).on('_close', e => {
      this.setState({
        messages: Array({
          event: 'notice',
          args: ['Disconnected from server.']
        }).concat(this.state.messages)
      })
    }).on('_open', e => {
      this.setState({
        messages: Array({
          event: 'notice',
          args: ['Connection to server established.']
        })
      })
    })
  }

  sendLogin = (username) => {
    socket.send('login', username);
    this.setState({ username, chat: '' })
  }
  sendChat = (chat) => {
    socket.send('chat', chat);
    this.setState({ chat: '' })
  }
  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  }

  render() {
    return (
      <div className="App">
        {Chatbox({
          sendChat: this.sendChat,
          sendLogin: this.sendLogin,
          onChange: this.onChange,
          state: this.state
        })}
      </div>
    );
  }
}

export default App;
