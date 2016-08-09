// Batch Request

var _ = require('lodash'),
    validator = require('validator'),
    methods = require('methods'),
    Promise = require('bluebird'),
    request = require('request-promise'),
    url = require('url'),
    es6TemplateStringsResolve = require('es6-template-strings/resolve'),
    es6TemplateStringsCompile = require('es6-template-strings/compile')
    ;

function debug() {
    var util = require('util');
    console.log(util.inspect(arguments, {depth: null, colors: true}));
    console.log('');
}

function getFinalUrl(req, r) {
    // Accept either uri or url (this is what request does, we just mirror)
    r.url = r.url || r.uri;

    // Convert relative paths to full paths
    if (typeof r.url === 'string' && /^\//.test(r.url) === true) {
        return req.protocol + '://' + req.get('host') + r.url;
    }

    return r.url;
}

var batchRequest = function (params) {

    // Set default option values
    params = params || {};
    params.localOnly = (typeof params.localOnly === 'undefined') ? true : params.localOnly;
    params.httpsAlways = (typeof params.localOnly === 'undefined') ? false : params.localOnly;
    params.max = (typeof params.max === 'undefined') ? 20 : params.max;
    params.validateRespond = (typeof params.validateRespond === 'undefined') ? true : params.validateRespond;
    params.allowedHosts = (typeof params.allowedHosts === 'undefined') ? null : params.allowedHosts;
    params.defaultHeaders = (typeof params.defaultHeaders === 'undefined') ? {} : params.defaultHeaders;
    params.forwardHeaders = (typeof params.forwardHeaders === 'undefined') ? [] : params.forwardHeaders;

    var batch = function (req, res, next) {
        // Here we assume the request has already been validated, either by
        // our included middleware or otherwise by the app developer.

        // We also assume it has been run through some middleware like
        // express.bodyParser() or express.json() to parse the requests
        var requests = req.body;

        var requestPromise = function (r) {
            r.resolveWithFullResponse = true;
            r.headers = r.headers || {};

            r.url = getFinalUrl(req, r);

            _.each(params.defaultHeaders, function (headerV, headerK) {
                if (!(headerK in r.headers)) { // copy defaults if not already exposed
                    r.headers[headerK] = headerV;
                }
            });
            _.each(params.forwardHeaders, function (headerK) {
                if (!(headerK in r.headers) && headerK in req.headers) { // copy forward if not already exposed
                    var forwardValue = req.headers[headerK];
                    r.headers[headerK] = forwardValue;
                }
            });
            return request(r)
                .then(function (response) {
                    var body = response.body;
                    if (response.headers && response.headers['content-type'] &&
                        response.headers['content-type'].indexOf('application/json') > -1) {
                        try {
                            body = JSON.parse(response.body);
                        } catch (e) {
                            // no-op
                        }
                    }
                    return {
                        'statusCode': response.statusCode,
                        'body': body,
                        'headers': response.headers
                    };
                })
                .catch(function (err) {
                    return {
                        statusCode: err.statusCode,
                        body: err.response.body,
                        headers: err.response.headers
                    };
                });
        };

        // First, let's fire off all calls without any dependencies, accumulate their promises
        var requestPromises = _.reduce(requests, function (promises, r, key) {
            if (!r.dependency || r.dependency === 'none') {
                promises[key] = requestPromise(r);
            }
            // And while we do that, build the dependency object with those items as keys
            // { key: Promise }
            return promises;
        }, {});

        // The documentation for es6-template-strings suggests using the spread operator (...),
        // but I'm avoiding it for compatibility with older node versions
        var escapeSubstitutions = function (/* literals, ...substitutions */) {
            var literals = arguments[0];
            var substitutions = Array.prototype.slice.call(arguments, 1);

            var resolvedString = '';
            for (var i = 0; i < literals.length; i++) {
                resolvedString += literals[i];
                if (typeof substitutions[i] !== 'undefined' && substitutions[i] !== null) {
                    // Since we're substituting into a JSON string, we need to escape double quotes
                    resolvedString += substitutions[i].replace(/"/gi, '\\"');
                }
            }
            return resolvedString;
        };

        // Then recursively iterate over all items with dependencies, resolving some at each pass
        var recurseDependencies = function (reqs) {

            // End state hit when the number of promises we have matches the number
            // of request objects we started with.
            if (_.size(requestPromises) >= _.size(reqs)) {
                return;
            } else {
                _.each(requestPromises, function (rp, key) {
                    // rp = the request's promise
                    // key = the request's key/name

                    var dependencyPromises = [];
                    var dependentKey = null;
                    var dependent = _.find(reqs, function (request, dKey) {
                        // dKey = the request's key/name
                        dependentKey = dKey;

                        var isDependency = false;

                        if (typeof requestPromises[dKey] === 'undefined') {
                            if (Array.isArray(request.dependency)) {
                                if (request.dependency.indexOf(key) > -1) {
                                    isDependency = true;
                                }
                            }
                            else {
                                if (request.dependency === key) {
                                    isDependency = true;
                                }
                            }
                        }

                        return isDependency;
                    });

                    if (dependent) {
                        if (!Array.isArray(dependent.dependency)) {
                            dependent.dependency = [dependent.dependency];
                        }
                        _.each(dependent.dependency, function (dependencyKey) {
                            dependencyPromises.push(requestPromises[dependencyKey]);
                        });

                        requestPromises[dependentKey] = Promise.all(dependencyPromises).then(function (dependencyResponses) {
                            // Looking good here.  dependencyResponses is an array of responses from the dependencyPromises

                            var jsonRequest = JSON.stringify(dependent),
                                compiled = es6TemplateStringsCompile(jsonRequest),
                                resolved = es6TemplateStringsResolve(compiled, {dependency: dependencyResponses}),
                                parsedJsonRequest = escapeSubstitutions.apply(null, resolved),
                                parsedDependent = JSON.parse(parsedJsonRequest)
                                ;

                            return requestPromise(parsedDependent);
                        });
                    }
                });

                recurseDependencies(reqs);
            }
        };

        // Recurse dependencies
        recurseDependencies(requests);

        // Wait for all to complete before responding
        Promise.props(requestPromises).then(function (result) {

            // remove all properties, except status, body, and headers
            var output = {};
            for (var prop in result) {
                output[prop] = {
                    statusCode: result[prop].statusCode,
                    body: result[prop].body,
                    headers: result[prop].headers
                };
            }

            if (next) {
                req.batch = output;
                next();
            } else {
                res.json(output);
            }
        });
    };

    batch.validate = function (req, res, next) {
        var err = null,
            requests = req.body,
            requestHost;

        // Validation on Request object as a whole
        try {
            if (_.size(requests) < 1) {
                throw new Error('Cannot make a batch request with an empty request object');
            }
            if (_.size(requests) > params.max) {
                throw new Error('Over the max request limit. Please limit batches to ' + params.max + ' requests');
            }
            if (req.method === 'POST' && !req.is('json')) {
                throw new Error('Batch Request will only accept body as json');
            }
        } catch (e) {
            err = {
                error: {
                    'message': e.message,
                    'type': 'ValidationError'
                }
            };
        }

        function makeValidatonError(key, message) {
            return {
                error: {
                    'message': message,
                    'request': key,
                    'type': 'ValidationError'
                }
            };
        }

        // Validation on each request object
        _.each(requests, function (r, key) {

            // If no method provided, default to GET
            r.method = (typeof r.method === 'string') ? r.method.toLowerCase() : 'get';

            r.url = getFinalUrl(req, r);

            if (!validator.isURL(r.url)) {
                err = makeValidatonError(key, 'Invalid URL');
            }
            if (!validator.isIn(r.method, methods)) {
                err = makeValidatonError(key, 'Invalid method');
            }
            if (r.body !== undefined) {
                if (!validator.isIn(r.method.toLowerCase(), ['put', 'post', 'options'])) {
                    err = makeValidatonError(key, 'Request body not allowed for this method');
                }
            }

            if (params.allowedHosts !== null) {
                requestHost = url.parse(r.url).host;
                if (params.allowedHosts.indexOf(requestHost) === -1) {
                    err = {
                        error: {
                            'message': 'Cannot make batch request to a host which is not allowed',
                            'host': requestHost,
                            'type': 'ValidationError'
                        }
                    };
                }
            }
        });

        if (err !== null) {
            res.status(400).send(err);
            next(err);
        } else {
            next();
        }
    };

    return batch;
};

module.exports = batchRequest;
