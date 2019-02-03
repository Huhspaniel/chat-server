if (process.env.NODE_ENV !== 'production') {
    require('./change-watcher');
} else {
    if (process.env.AWSEB) {
        const util = require('util');
        console.log = function (data, ...args) {
            process.stdout.write((new Date()).toISOString() + ' -- ' + util.format(data));
            for (let i = 0; i < args.length; i++) {
                process.stdout.write(' ' + util.format(args[i]));
            }
            process.stdout.write('\n');
        }
    }
    require('./app/server');
}