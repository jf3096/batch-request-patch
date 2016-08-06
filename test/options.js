// Validation middleware tests

process.env.NODE_ENV = 'test';

var _ = require('lodash'),
    Chance = require('chance'),
    chance = new Chance(),
    expect = require('chai').expect,
    express = require('express'),
    methods = require('methods'),
    request = require('supertest');

// Add a Chance mixin for creating a fake batch-request object
chance.mixin({
    batchRequest: function(params) {
        params = params || {};
        params.size = params.size || chance.d12();

        var batchRequest = {};

        _.times(params.size, function() {
            var opts = _.clone(params);
            opts.endpoint = chance.pick([
                '/users/' + chance.natural({max: 5000}) + '/name',
                '/users/' + chance.natural({max: 5000}) + '/email',
                '/users/' + chance.natural({max: 5000}) + '/company'
            ]);

            opts.method = params.method || chance.pick(methods);

            opts.host = params.host || chance.domain();
            // opts.protocol = params.protocol || chance.pick(['http', 'https']);
            opts.protocol = 'http';
            opts.port = params.port || chance.pick([80, 3000, 4000, 5000]);

            // We want a long-ish word to increase entropy and avoid hash collisions
            batchRequest[chance.word({length: 15})] = {
                url: _.template('${ protocol }://${ host }:${ port }${ endpoint }', opts)
            };
        });
        return batchRequest;
    }
});

describe('options', function() {
    var app;

    before(function(done) {
        app = require('./helpers/app')();
        done();
    });

    after(function(done) {
        app.server.close(done);
    });

    describe('max', function() {

        it('obeys default of 20', function(done) {
            // First try a request that is over the max limit. Should throw 400 error
            request(app)
                .post('/batch')
                .send(chance.batchRequest({method: 'get', size: 21, host: 'localhost', port: 3000}))
                .expect(400, function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.error).to.exist;
                    expect(res.body.error.type).to.equal('ValidationError');
                    expect(res.body.error.message).to.equal('Over the max request limit. Please limit batches to 20 requests');

                    // Now let's try one that's right on the limit, it should pass.
                    request(app)
                        .post('/batch')
                        .send(chance.batchRequest({method: 'get', size: 20, host: 'localhost', port: 3000}))
                        .expect(200, function(err, res) {
                            expect(err).to.be.null;
                            expect(res.body.error).to.not.exist;
                            done();
                        });
                });
        });

    });

    it('obeys the localOnly option when set as true');
    it('obeys the httpsOnly option when set as true');

});
