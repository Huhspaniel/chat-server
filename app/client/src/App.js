import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Chatbox from './Chatbox';

class App extends Component {
  state = {
    messages: [
      { event: 'chat', args: ['bill', 'hi everyone'] }
    ]
  }
  constructor(...args) {
    super(...args);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
        {Chatbox({ messages: this.state.messages })}
      </div>
    );
  }
}

export default App;
