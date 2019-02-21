if (process.env.NODE_ENV !== 'production') {
    require('./change-watcher');
} else {
    const util = require('util');

    const formatTime = date => {
        date = date.toISOString().replace(/-/g, '/').replace('T', '|');
        return date.slice(0, date.length - 5);
    }

    function timestampLog(stream, data, ...args) {
        const time = formatTime(new Date());
        stream.write(`[${time}] ${util.format(data, ...args)}\n`);
    }
    console.log = timestampLog.bind(console, process.stdout);
    console.error = timestampLog.bind(console, process.stderr);

    // Restart app
    process.on('SIGHUP', () => {
        process.once('exit', () => {
            require("child_process").spawn(process.argv.shift(), process.argv, {
                cwd: process.cwd(),
                detached : true,
                stdio: "inherit"
            });
        })
        console.log('Caught SIGHUP, restarting...\n');
        process.exit();
    })

    require('./app/server');
}
