// header options tests

process.env.NODE_ENV = 'test';

var _ = require('lodash'),
    Chance = require('chance'),
    chance = new Chance(),
    expect = require('chai').expect,
    methods = require('methods'),
    request = require('supertest');

describe('header options', function() {
    var app;

    before(function(done) {
        app = require('./helpers/app')({
            defaultHeaders: {
                'default1': 'default1_value'
            },
            forwardHeaders: ['forward1', 'dependency1']
        });
        done();
    });

    after(function(done) {
        app.server.close(done);
    });

    describe('defaultHeaders', function() {
        it('Header default1', function(done) {
            request(app)
                .post('/batch')
                .send({
                    getHeader: {
                        url: 'http://localhost:3000/header/default1'
                    }
                })
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body).to.have.property('getHeader');
                    expect(res.body.getHeader.statusCode).to.equal(200);
                    expect(res.body.getHeader.body.value).to.be.a('string');
                    expect(res.body.getHeader.body.value).to.be.equal('default1_value');
                    done();
                });
        });

        it('Header default2 does not exist if no default set', function(done) {
            request(app)
                .post('/batch')
                .send({
                    getHeader: {
                        url: 'http://localhost:3000/header/default2'
                    }
                })
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body).to.have.property('getHeader');
                    expect(res.body.getHeader.statusCode).to.equal(404);
                    done();
                });
        });
    });

    describe('forwardHeaders', function() {
        it('Header forward1 exists', function(done) {
            request(app)
                .post('/batch')
                .set('forward1', 'forward1_value')
                .send({
                    getHeader: {
                        url: 'http://localhost:3000/header/forward1'
                    }
                })
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body).to.have.property('getHeader');
                    expect(res.body.getHeader.statusCode).to.equal(200);
                    expect(res.body.getHeader.body.value).to.be.a('string');
                    expect(res.body.getHeader.body.value).to.be.equal('forward1_value');
                    done();
                });
        });

        it('Header forward1 does not exist if not provided', function(done) {
            request(app)
                .post('/batch')
                .send({
                    getHeader: {
                        url: 'http://localhost:3000/header/forward1'
                    }
                })
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body).to.have.property('getHeader');
                    expect(res.body.getHeader.statusCode).to.equal(404);
                    done();
                });
        });

        it('Headers for both calls exist when dependency exists', function(done) {
            request(app)
                .post('/batch')
                .set('forward1', 'forward1_value')
                .set('dependency1', 'dependency1_value')
                .send({
                    getHeader: {
                        url: 'http://localhost:3000/header/forward1',
                        dependency: 'dependencyEndpoint'
                    },
                    dependencyEndpoint: {
                        url: 'http://localhost:3000/header/dependency1'
                    }
                })
                .expect(200, function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.body).to.have.property('getHeader');
                    expect(res.body.getHeader.statusCode).to.equal(200);
                    expect(res.body.getHeader.body.value).to.be.a('string');
                    expect(res.body.getHeader.body.value).to.be.equal('forward1_value');

                    expect(res.body).to.have.property('dependencyEndpoint');
                    expect(res.body.dependencyEndpoint.statusCode).to.equal(200);
                    expect(res.body.dependencyEndpoint.body.value).to.be.a('string');
                    expect(res.body.dependencyEndpoint.body.value).to.be.equal('dependency1_value');

                    done();
                });
        });
    });
});
