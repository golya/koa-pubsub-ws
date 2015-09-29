var debug = require('debug')('koa-pubsub-ws:request');

function Request (socket, payload) {
    this.socket = socket;
    this.currentId = payload.id;
    this.method = payload.method;
    this.params = payload.params;
    this.session = socket.session;
};

Request.prototype.error = function (code, message) {
    try {
        var payload = {
            jsonrpc: '2.0',
            error: {
                code: code,
                message: message
            },
            id: this.currentId
        };
        debug('→ Error %s: %o', payload.error.code, payload.error.message);
        this.socket.send(JSON.stringify(payload));
    }  catch (e) {
        console.error('Something went wrong: ', e.stack);
    }
};

Request.prototype.result = function (result) {
    try {
        var payload = {
            jsonrpc: '2.0', 
            result: result,
            id: this.currentId
        };
        debug('→ SEND (%s) Result: %o', payload.id, payload.result);
        this.socket.send(JSON.stringify(payload));
    } catch (e) {
        console.error('Something went wrong: ', e.stack);
    }
};

Request.prototype.emit = function (socket, result, user) {
    try {
        var payload = {
            jsonrpc: '2.0',
            result: {result: result, user: user, id: this.currentId},
            publication: true,
            id: this.currentId
        };
        debug('→ EMIT (subscribeQueue.%s) Result: %o', payload.id, payload.result);
        socket.send(JSON.stringify(payload));
    } catch (e) {
        console.error('Something went wrong: ', e.stack);
    }
};

module.exports = Request;