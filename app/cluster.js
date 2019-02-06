const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const cpus = os.cpus().length;

    console.log(`Forking for ${cpus} CPUs`);
    for (let i = 0; i < cpus; i++) {
        const worker = cluster.fork();
        worker.on('message', ({ bytes, filter }) => {
            console.log(filter);
            for (const id in cluster.workers) {
                if (id != worker.id) {
                    cluster.workers[id].send({ bytes, filter });
                }
            }
        })
    }
} else {
    require('./server');
}

process.on('message', (msg) => {
    if (msg === 'close') {
        cluster.disconnect(() => {
            process.exit();
        });
    }
});