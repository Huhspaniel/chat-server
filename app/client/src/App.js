import React, { Component } from 'react';
import './App.css';
import Chatbox from './Chatbox';
import { Socket } from './socket';
import { prepend } from 'ramda';
import { parseMessage } from './events';

let socket;

class App extends Component {
  state = {
    messages: [],
    loggedIn: false,
    username: null,
    input: '',
    connected: false
  }
  addMessage = msg => prepend(parseMessage(this.state.username, msg), this.state.messages);
  connectSocket() {
    socket = Socket();
    socket.on('message', message => {
      console.log(message);
      let update = {
        messages: this.addMessage(message)
      };
      this.setState(update);
    }).on('login', args => {
      if (args[0] === this.state.username) {
        this.setState({
          loggedIn: true
        })
      }
    }).on('logout', args => {
      if (args[0] === this.state.username) {
        this.setState({
          loggedIn: false
        })
      }
    }).on('_close', e => {
      this.setState({
        messages: this.addMessage({
          event: 'notice',
          args: ['Disconnected from server.']
        }),
        loggedIn: false,
        connected: false
      })
    }).on('_open', e => {
      this.setState({
        messages: this.addMessage({
          event: 'notice',
          args: ['Connection to server established.'],
        }),
        connected: true
      })
    })
  }
  componentWillMount = this.connectSocket;
  send = () => {
    if (!this.state.connected) {
      return this.setState({
        messages: this.addMessage({
          event: 'error',
          args: ['Not connected to server.']
        })
      });
    }
    let update = { input: '' };
    let event;
    if (!this.state.loggedIn) {
      event = 'login'
      update.username = this.state.input
    } else {
      event = 'chat'
    }
    socket.send(event, this.state.input.trim());
    this.setState(update);
  }
  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  }
  reconnect = () => {
    const connect = () => {
      this.setState({
        input: '',
        messages: []
      });
      this.connectSocket();
    }
    if (socket.closed()) {
      connect();
    } else {
      socket.close();
      socket.once('_close', connect)
    }
  }

  render() {
    return (
      <div className="App">
        {Chatbox({
          send: this.send,
          onChange: this.onChange,
          reconnect: this.reconnect,
          state: this.state
        })}
      </div>
    );
  }
}

export default App;
