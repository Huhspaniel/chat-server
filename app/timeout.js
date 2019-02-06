function startInterval(cb, timeout, ...args) {
    cb(...args);
    return setInterval(cb, timeout, ...args);
}

/**
 * Defines timeout functionality for any object.
 * 
 * This is a partial application and returns a function that
 * can be passed an object on which the timeout should be
 * applied. Within all callback functions, 'this' refers
 * to that object.
 * 
 * @param {Number}   timeout                    Time before timeout (seconds).
 * @param {Function} cb                         Called on timeout.
 * @param {Object}   [options]                  Optional parameters.
 * @param {Number}   [options.interval=20]      Time between timeout checks (seconds).
 * @param {Number}   [options.idleIntervals=3]  Number of times to call onIdle.
 * @param {Function} [options.onIdle]           Called when close to timing out.
 * @param {Function} [options.preCheck]         Timeout check pre-hook
 * @param {Function} [options.postCheck]        Timeout check post-hook
 * 
 * @returns {(obj: Object) => Object} Partially applied function.
 */
function defineTimeout(timeout, onTimeout, options) {
    if (typeof timeout === 'object') {
        options = timeout;
        timeout = onTimeout = null;
    } else if (typeof options === 'object') {
        Object.assign(options, {
            timeout, onTimeout
        })
    } else {
        options = {
            timeout, onTimeout
        }
    }

    ({
        timeout,
        onTimeout,
        interval = 20,
        idleIntervals = 3,
        onIdle = () => {},
        preCheck = () => {},
        postCheck = () => {},
    } = options);
    if (!timeout || !onTimeout) {
        return;
    }

    const _timeout = {
        timeout,
        onTimeout,
        interval,
        idleIntervals,
        onIdle,
        preCheck,
        postCheck,
    };

    let count;
    Object.defineProperties(_timeout, {
        isIdle: {
            get: () => _timeout.idleIntervals <= count
        }
    })
    return (obj) => {
        let handler = true;
        Object.assign(_timeout, {
            reset() {
                count = Math.round(_timeout.timeout / _timeout.interval);
                clearInterval(handler);
                handler = startInterval(() => {
                    const timeLeft = count * _timeout.interval
                    _timeout.preCheck.apply(obj, [timeLeft]);
                    if (handler) {
                        if (count === 0) {
                            _timeout.stop();
                            _timeout.onTimeout.apply(obj);
                            return;
                        } else if (count <= _timeout.idleIntervals) {
                            _timeout.onIdle.apply(obj, [timeLeft]);
                        }
                        count--;
                        _timeout.postCheck.apply(obj, [timeLeft]);
                    }
                }, _timeout.interval * 1000);
            },
            stop() {
                clearInterval(handler);
                handler = null;
            }
        })
        return Object.defineProperties(obj, {
            _timeout: {
                get: () => _timeout
            },
            resetTimeout: {
                get: () => _timeout.reset
            },
            stopTimeout: {
                get: () => _timeout.stop
            }
        })
    }
}

module.exports = {
    defineTimeout
}