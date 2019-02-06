if (process.env.NODE_ENV !== 'production') {
    require('./change-watcher');
} else {
    require('./app/cluster');
}