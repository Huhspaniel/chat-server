if (process.env.NODE_ENV !== 'production') {
    require('./change-watcher');
} else {
    if (process.env.AWSEB) {
        const util = require('util');
        function timestampLog (stream, data, ...args) {
            stream.write((new Date()).toISOString() + ' -- ' + util.format(data, ...args) + '\n');
        }
        console.log = timestampLog.bind(console, process.stdout);
        console.error = timestampLog.bind(console, process.stderr);
    }
    require('./app/server');
}