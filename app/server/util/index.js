const fs = require('fs');
const { join } = require('path');
const { compose, replace, curry } = require('ramda');

const sanitize = compose(replace(/\/*$/, ''), replace(/\/\.+/g, ''));
const absolute = curry((dir, path) => join(dir, path));
const staticPath = root => compose(absolute(root), sanitize);

const fsExists = path => new Promise(res => {
    fs.exists(path, (exists) => {
        res(exists);
    });
});
const fsStatus = path => new Promise((res, rej) => {
    fs.stat(path, (err, stats) => {
        if (err) return rej(err);
        res(stats);
    });
});
module.exports = {
    sanitize,
    absolute,
    staticPath,
    fsExists,
    fsStatus
}