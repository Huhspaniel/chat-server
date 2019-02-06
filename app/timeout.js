/**
 * Defines timeout functionality for any object.
 * 
 * This is a partial application and returns a function that
 * can be passed an object on which the timeout should be
 * applied.
 * 
 * @param {Number}   timeout                    Timeout in seconds.
 * @param {Function} onTimeout                  Invoked on timeout.
 * @param {Object}   [options]                  Optional parameters.
 * @param {Number}   [options.interval=timeout] Interval between updates in seconds. Defaults to equal value of timeout.
 * @param {Function} [options.onIdle]           Invoked on update if is idle (defined by options.idlePeriod)
 * @param {Number}   [options.idlePeriod=0]     Defined as a number of intervals preceeding the timeout. Defaults to 0.
 * @param {Function} [options.preUpdate]        Update pre-hook.
 * @param {Function} [options.postUpdate]       Update post-hook.
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

    let interval, idlePeriod, onIdle, preUpdate, postUpdate;
    ({
        timeout,
        onTimeout,
        interval = timeout,
        idlePeriod = 0,
        onIdle = () => { },
        preUpdate = () => { },
        postUpdate = () => { },
    } = options);
    if (!timeout || !onTimeout) {
        return;
    }

    return (obj) => {
        let count, handler, timeLeft, isIdle;
        const _timer = Object.defineProperties({}, {
            count: { get: () => count },
            timeLeft: { get: () => timeLeft },
            isIdle: { get: () => isIdle },
            clear: {
                value: function () {
                    clearInterval(handler);
                    handler = null;
                }
            },
            reset: {
                value: function () {
                    _timer.clear();
                    count = Math.round(timeout / interval) - 1;
                    handler = setInterval(() => {
                        timeLeft = count * interval;
                        isIdle = count <= idlePeriod;
                        preUpdate(obj, {
                            count, timeLeft, isIdle
                        });
                        if (handler) {
                            if (count === 0) {
                                _timer.clear();
                                onTimeout(obj);
                                return;
                            } else if (count <= idlePeriod) {
                                onIdle(obj, {
                                    count, timeLeft, isIdle
                                });
                            }
                            count--;
                            postUpdate(obj, {
                                count, timeLeft, isIdle
                            });
                        }
                    }, interval * 1000);
                }
            },
            timeout: {
                get: () => timeout,
                set: (val) => {
                    if (typeof val !== 'number') {
                        throw new Error('timeout must be of type \'number\'');
                    } else {
                        timeout = val;
                    }
                }
            },
            interval: {
                get: () => interval,
                set: (val) => {
                    if (typeof val !== 'number') {
                        throw new Error('interval must be of type \'number\'');
                    } else {
                        interval = val;
                    }
                }
            },
            idlePeriod: {
                get: () => idlePeriod,
                set: (val) => {
                    if (typeof val !== 'number') {
                        throw new Error('interval must be of type \'number\'')
                    } else {
                        idlePeriod = val;
                    }
                }
            },
            onTimeout: {
                set: (func) => {
                    if (typeof func === 'function') {
                        onTimeout = func;
                    } else {
                        throw new Error('onTimeout must be of type \'function\'');
                    }
                }
            },
            onIdle: {
                set: (func) => {
                    if (typeof func === 'function') {
                        onIdle = func;
                    } else {
                        throw new Error('onIdle must be of type \'function\'');
                    }
                }
            },
            postUpdate: {
                set: (func) => {
                    if (typeof func === 'function') {
                        postUpdate = func;
                    } else {
                        throw new Error('postUpdate must be of type \'function\'');
                    }
                }
            },
            preUpdate: {
                set: (func) => {
                    if (typeof func === 'function') {
                        preUpdate = func;
                    } else {
                        throw new Error('preUpdate must be of type \'function\'');
                    }
                }
            }
        });

        return Object.defineProperties(obj, {
            _timer: {
                get: () => _timer
            },
            resetTimeout: {
                get: () => _timer.reset
            },
            clearTimeout: {
                get: () => _timer.clear
            }
        })
    }
}

module.exports = {
    defineTimeout
}