const fs = require('fs');
const childProcess = require('child_process');
const { fork } = childProcess;

let server;
function forkServer() {
    server = fork('app/server.js');
    server.on('error', (err) => {
        console.error(err);
    }).on('exit', (code, signal) => {
        if (code === 0) {
            process.stdout.write('\x1b[32m');
        } else {
            process.stdout.write('\x1b[31m');
        }
        console.log('Server exited with code ' + code);
        if (signal) process.stdout.write('and signal ' + signal);
        process.stdout.write('\x1b[0m');
    })
}
console.log('\x1b[32m%s\x1b[0m', 'Starting development server...')
forkServer();

let fsWait = false;
fs.watch('app', { recursive: true }, (type, filename) => {
    if (fsWait) return;
    fsWait = setTimeout(() => {
        fsWait = false;
    }, 2000);
    console.log('\x1b[2m%s\x1b[0m', `${type.charAt(0).toUpperCase() + type.slice(1)} detected in ${filename}`);

    console.log('\x1b[32m%s\x1b[0m', 'Restarting development server...');
    if (server.connected) {
        server.once('exit', () => {
            forkServer();
        });
        server.send('close');
    } else {
        forkServer();
    }
});

process.on('exit', (code, signal) => {
    if (server.connected) {
        console.log('\x1b[32m%s\x1b[0m', 'Closing server...');
        server.send('close');
    }
    if (code === 0) {
        process.stdout.write('\x1b[32m');
    } else {
        process.stdout.write('\x1b[31m');
    }
    console.log('Process exited with code ' + code);
    if (signal) process.stdout.write('and signal ' + signal);
    process.stdout.write('\x1b[0m');
}).on('SIGINT', () => {
    console.log('\x1b[2m%s\x1b[0m', '\nCaught interrupt signal');
    process.exit();
}).on('error', (err) => {
    console.error(err);
})