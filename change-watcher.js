const fs = require('fs');
const childProcess = require('child_process');
const { fork } = childProcess;

let cluster;
function forkCluster() {
    cluster = fork('./app/cluster');
    cluster.on('error', (err) => {
        console.error(err);
    }).on('exit', (code, signal) => {
        if (code === 0) {
            process.stdout.write('\x1b[32m');
        } else {
            process.stdout.write('\x1b[31m');
        }
        console.log('Cluster exited with code ' + code);
        if (signal) process.stdout.write('and signal ' + signal);
        process.stdout.write('\x1b[0m');
    })
}
console.log('\x1b[32m%s\x1b[0m', 'Starting development cluster...')
forkCluster();

let fsWait = false;
fs.watch('app', { recursive: true }, (type, filename) => {
    if (fsWait) return;
    fsWait = setTimeout(() => {
        fsWait = false;
    }, 2000);
    console.log('\x1b[2m%s\x1b[0m', `${type.charAt(0).toUpperCase() + type.slice(1)} detected in ${filename}`);

    console.log('\x1b[32m%s\x1b[0m', 'Restarting development cluster...');
    if (cluster.connected) {
        cluster.once('exit', () => {
            forkCluster();
        });
        cluster.send('close');
    } else {
        forkCluster();
    }
});

process.on('exit', (code, signal) => {
    if (cluster.connected) {
        console.log('\x1b[32m%s\x1b[0m', 'Closing cluster...');
        cluster.send('close');
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