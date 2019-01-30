# real-time-chat

In learning WebSocket protocol/standards and in attaining greater mastery of Node.js built-in modules and "under-the-hood" fundamentals of web development, I created this real-time-chat server with 0 external dependencies.

This project was incredibly challenging, but my greatest challenge was understanding how to parse and unmask binary data streams using Node's Buffer module. Additionally, in understanding WebSocket protocol, second-hand resources/articles were far and few between, and for full implementation and application it was necesarry to reference the barebones IETF RFC documentation on WebSocket standards.

In managing sending/receiving of different kinds of messages, I implemented an event-like system of socket/server communication, similar in implementation to Socket.IO. Greater abstraction using EventEmitters and/or EventEmitter-like objects is possible, but arguably unessecary since this is not a framework but a standalone project.