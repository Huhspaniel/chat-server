import React, { Component } from 'react';
import './App.css';
import Chatbox from './Chatbox';
import { getSocket } from './socket';

let socket;

class App extends Component {
  state = {
    messages: [],
    loggedIn: false,
    username: null,
    input: '',
    connected: false
  }
  connectSocket() {
    socket = getSocket();
    socket.on('message', message => {
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
          loggedIn: false
        })
      }
    }).on('_close', e => {
      this.setState({
        messages: Array({
          event: 'notice',
          args: ['Disconnected from server.']
        }).concat(this.state.messages),
        loggedIn: false,
        connected: false
      })
    }).on('_open', e => {
      this.setState({
        messages: Array({
          event: 'notice',
          args: ['Connection to server established.']
        }).concat(this.state.messages),
        connected: true
      })
    })
  }
  componentWillMount = this.connectSocket;
  send = () => {
    if (!this.state.connected) {
      return this.setState({
        messages: Array({
          event: 'error',
          args: ['Not connected to server.']
        }).concat(this.state.messages)
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
    socket.close();
    socket.once('_close', () => {
      this.connectSocket();
      this.setState({
        input: ''
      })
    })
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
