var fs = require('fs');
var path = require('path');
var objectAssign = require('object-assign');
var replaceStream = require('replacestream');
var debug = require('debug')('koa-pubsub-ws:middleware');
var Keygrip = require('keygrip');

var KoaWebSocketServer = require('./server');

module.exports = function (app, passedOptions) {
    // Default options
    var options = {
        serveClientFile: true,
        clientFilePath: '/koaws.js',
        heartbeat: true,
        heartbeatInterval: 5000,
        validatePubSub: {}
    };
    // Override with passed options
    objectAssign(options, passedOptions || {});

    var oldListen = app.listen;
    app.listen = function () {
        debug('Attaching server...')
        app.server = oldListen.apply(app, arguments);
        app.ws.listen(app.server);
        app.ws.subscriptions = {};
        app.address = function() {
            return app.server.address();
        }
        return app;
    };

    function getSessionID(cookie, name, keys) {
        var sigName = name + '.sig';
        var cookies = cookie;
        if(!cookies) return;
        var match = cookies.match(getPattern(name));
        var match2 = cookies.match(getPattern(sigName));
        if(!match) return;
        var value = match[1];
        if(!keys) return value;

        var signedCookie = match2[1];
        if(!signedCookie) return;

        var keygrip;
        if(Array.isArray(keys)) {
            for(var i = 0; i < keys.length; i++) {
                if(!(typeof keys[i] == 'string' || keys[i] instanceof String))
                    return;
            }
            keygrip = new Keygrip(keys);
        }
        else if(keys.constructor && keys.constructor.name === 'Keygrip')
            keygrip = keys;
        else
            return;

        var data = name + "=" + value;
        var index = keygrip.index(data, signedCookie);
        if(index < 0) return;
        return value;
    };


    // cache used by cookie pattern matcher
    var cache = {};

    function getPattern(name) {
        if (cache[name]) return cache[name];

        return cache[name] = new RegExp(
            "(?:^|;) *" +
            name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") +
            "=([^;]*)"
        );
    };

    app.ws = app.io = new KoaWebSocketServer(app, options);

    return function* (next) {
        if (this.session) {
            var sessionId = getSessionID(this.req.headers.cookie, 'koa:sess', this.app.keys);
            if (!('sessions' in app.ws)) {
                app.ws.sessions = {};
            }
            app.ws.sessions[sessionId] = this.session;
        }
        yield next;
    };
};