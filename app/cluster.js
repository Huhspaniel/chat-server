const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const cpus = os.cpus().length;

    let workersListening = 0;
    cluster.on('listening', () => {
        workersListening++;
        if (workersListening === cpus) {
            console.log('All workers listening\n');
        }
    })
    console.log(`Forking for ${cpus} CPUs`);
    for (let i = 0; i < cpus; i++) {
        const worker = cluster.fork();
        worker.on('message', ({ bytes, filter }) => {
            for (const id in cluster.workers) {
                if (id != worker.id) {
                    cluster.workers[id].send({ bytes, filter });
                }
            }
        })
    }
} else {
    const util = require('util');
    if (process.env.AWSEB) {
        function stampedLog (stream, data, ...args) {
            stream.write(`${(new Date()).toISOString()} - Worker ${process.pid - process.ppid} | ${util.format(data, ...args)}\n`);
        }
        console.log = stampedLog.bind(console, process.stdout);
        console.error = stampedLog.bind(console, process.stderr);
    } else {
        function stampedLog (stream, data, ...args) {
            stream.write(`Worker ${process.pid - process.ppid} | ${util.format(data, ...args)}\n`);
        }
        console.log = stampedLog.bind(console, process.stdout);
        console.error = stampedLog.bind(console, process.stderr);
    }
    require('./server');
}

process.on('message', (msg) => {
    if (msg === 'close') {
        cluster.disconnect(() => {
            process.exit();
        });
    }
});