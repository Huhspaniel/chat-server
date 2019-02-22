const uuidv4 = require('uuid/v4');

const clearTimeouts = (...ids) => ids.forEach(clearTimeout);

const timers = {};

const startTimer = (id) => {
    if (timers.hasOwnProperty(id)) {
        timers[id]();
        return true;
    } else {
        return false;
    }
}
const startTimers = (...ids) => ids.map(startTimer);

const stopTimer = id => {
    if (timers.hasOwnProperty(id)) {
        const { intervalID, timeoutID } = timers[id];
        clearTimeouts(intervalID, timeoutID);
        timers[id].active = false;
        return true;
    } else {
        return false;
    }
}
const stopTimers = (...ids) => ids.map(stopTimer);

const restartTimer = id => {
    if (timers.hasOwnProperty(id)) {
        stopTimer(id);
        startTimer(id);
        return true;
    } else {
        return false;
    }
}
const restartTimers = (...ids) => ids.map(restartTimer);

const clearTimer = id => {
    if (timers.hasOwnProperty(id)) {
        stopTimer(id);
        delete timers[id];
        return true;
    } else {
        return false;
    }
}
const clearTimers = (...ids) => ids.map(clearTimer);

const clockTimer = id => {
    if (timers.hasOwnProperty(id)) {
        return timers[id].clock();
    }
}

const setTimer = (time, opts, cb = () => {}) => {
    if (typeof opts === 'function') {
        cb = opts;
    } else if (typeof opts !== 'object') {
        opts = {};
    }
    if (typeof time === 'object'){
        opts = time;
    } else {
        opts.time = time;
    }

    time = opts.time * 1000;
    let {
        interval = time, onInterval = () => {}
    } = opts;
    interval *= 1000;

    const id = uuidv4();
    timers[id] = () => {
        const start = Date.now();
        timers[id].active = true;
        timers[id].clock = () => timers[id].active ? time - (Date.now() - start) : 0;
        timers[id].intervalID = setInterval(() => {
            if (!timers[id].active) return;
            const clock = timers[id].clock();
            if (clock <= 0) {
                cb();
                stopTimer(id);
            } else {
                onInterval(clock, id);
            }
        }, interval);
        if (time % interval > 100) {
            timers[id].timeoutID = setTimeout(() => {
                if (!timers[id].active) return;
                cb();
                stopTimer(id);
            }, time);
        }
    }
    return id;
}

module.exports = {
    startTimer,
    startTimers,
    stopTimer,
    stopTimers,
    restartTimer,
    restartTimers,
    clearTimer,
    clearTimers,
    clockTimer,
    setTimer
}