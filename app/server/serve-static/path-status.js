const fs = require('fs');
const { join, parse } = require('path');
const { fsExists, fsStatus } = require('../util');

const resolve = async path => {
    try {
        const stats = await fsStatus(path);
        return stats.isDirectory() ? join(path, '/index.html') : path;
    } catch (err) {
        throw err;
    }
}

const getStats = async path => {
    let file, exists, ext, stream;
    try {
        file = await resolve(path);
        exists = await fsExists(file);
        if (exists) {
            ext = parse(file).ext.slice(1);
            stream = fs.createReadStream(file);
        }
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        exists = false;
    }
    return { file, exists, ext, stream };
}

module.exports = getStats;