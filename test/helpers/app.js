// Test app
var _ = require('lodash'),
    express = require('express'),
    Chance = require('chance'),
    chance = new Chance(),
    batchRequest = require('../../lib/batch-request');

function getApp(options) {
    var batch = batchRequest(options);

    var app = express();

    app.use(express.json());

    // A POST endpoint to use the batch middleware
    app.post('/batch', batch.validate, batch);
    // A GET endpoint to use the batch middleware
    app.get('/batch', batch.validate, batch);

    // Let's make some fake endpoints
    app.get('/users/:id/name', function(req, res) {
        res.json(chance.name());
    });

    app.post('/users/:id/name', function(req, res) {
        // If a first name is sent in, we will reflect it so we can test that it was
        // received correctly.
        if (req.body.first) {
            res.json(req.body.first);
        } else {
            res.json(chance.name());
        }
    });

    app.put('/users/:id/name', function(req, res) {
        res.json(chance.name());
    });

    app.post('/users/:id/deep', function(req, res) {
        if(req.body.email && req.body.name) {
            res.json({
                email: req.body.email,
                mixed: {
                    name: req.body.name,
                    deep: {
                        foo: 'bar'
                    }
                }
            });
        }
        else {
            res.json({
                email: chance.email(),
                mixed: {
                    name: chance.name(),
                    deep: {
                        foo: 'bar'
                    }
                }
            });
        }
    });

    app.get('/users/:id/email', function(req, res) {
        res.json(chance.email());
    });

    app.get('/users/:id/company', function(req, res) {
        res.json(chance.capitalize(chance.word()));
    });

    app.get('/users/:id/hammertime', function(req, res) {
        res.json(new Date().getTime());
    });

    app.get('/users/:id/delay', function(req, res, next) {
        setTimeout(function() {
            res.json(new Date().getTime());
            next();
        }, 250);
    });

    app.get('/header/:name', function(req, res) {
        if ((req.params.name in req.headers)) {
            res.json({
                name: req.params.name,
                value: req.headers[req.params.name]
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    var port = 3000;
    if (options && 'port' in options) {
        port = options.port;
    }

    var server = app.listen(port);

    app.server = server;

    return app;
}

exports = module.exports = getApp;
