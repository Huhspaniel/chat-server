const cluster = require('cluster');
const os = require('os');
process.users = {};
Object.defineProperties(process.users, {
    findPID: {
        value: function (username) {
            for (let pid in process.users) {
                if (process.users[pid].includes(username)) {
                    return pid;
                }
            }
        }
    },
    array: {
        get: function () {
            let users = [];
            for (let pid in process.users) {
                users = users.concat(process.users[pid]);
            }
            return users;
        }
    }
})

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
        worker.on('message', ({ users, bytes, filter, pids }) => {
            if (pids) {
                for (let username in pids) {
                    cluster.workers[pids[username] - process.pid].send({
                        users, bytes, filter, username
                    })
                }
            }
            Object.assign(process.users, users);
            for (const id in cluster.workers) {
                Object.assign(users, process.users);
                delete users[id + process.ppid];
                cluster.workers[id].send({ users: process.users, bytes, filter });
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