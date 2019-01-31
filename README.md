# chat-server

In learning WebSocket protocol/standards and in attaining greater mastery of the Node.js runtime, its built-in modules, and "under-the-hood" fundamentals of web development, I created this real-time-chat server with 0 external dependencies.

This project was incredibly challenging for me, from understanding how to parse and unmask binary data using Node's Buffer module, to implementing the reading, parsing, writing, and formatting of data according to WebSocket protocols without assistance from much middleware. Additionally, in understanding WebSocket standards and applying them in Node.js, second-hand resources or articles, though present and helpful, were far and few inbetween, so for full implementation, application, and understanding, it was necesarry to reference the barebones IETF RFC documentation. Configuring the AWS deployment environment to allow WebSocket communication with SSL was also a real pain.

In managing sending/receiving of different kinds of messages, I implemented an event-like system of socket/server communication, similar in implementation to Socket.IO. Greater abstraction using EventEmitters and/or EventEmitter-like objects is possible, but arguably unessecary since this is not a framework but a standalone project. Further compartmentalization of code and files is also possible.

# Deployment:
* AWS: https://chat.huhspaniel.com
* Heroku: https://chat-server-huhspaniel.herokuapp.com (Outdated)
