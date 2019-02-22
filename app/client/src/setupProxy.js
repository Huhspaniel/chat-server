const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(proxy('/socket', {
      target: 'http://localhost:8080/',
      ws: true,
      pathRewrite: {
          '.*': ''
      }
    }));
};