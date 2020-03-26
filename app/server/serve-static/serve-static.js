const MIME = require('./mime-types.json');
const pathStatus = require('./path-status');
const { staticPath } = require('../util');

const errorHandler = (req, res, err) => {
    console.error(err);
    res.writeHead(err.statusCode || 500, {
        'content-type': 'application/json'
    })
    res.end(JSON.stringify({
        error: err.message
    }));
}

const serveStatic = (root, _next) => {
    const getPathFromUrl = staticPath(root);
    return async (req, res, next = _next || (() => { }), error = errorHandler) => {
        const path = getPathFromUrl(req.url);
        try {
            const { exists, ext, stream } = await pathStatus(path);
            if (!exists) {
                next(req, res);
            } else {
                res.writeHead(200, {
                    'content-type': MIME[ext],
                    'cache-control': 'no-store',
                    'cache-control': 'no-cache, no-store, must-revalidate'
                });
                stream.pipe(res);
            }
        } catch (err) {
            error(req, res, err);
        }
    }
}

module.exports = serveStatic;