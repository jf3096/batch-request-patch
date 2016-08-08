Batch Request Patch
===================

## Introduction

This library is derived from [batch request](http://batch-request.socialradar.com). Due to project needs, 
I need to further process data after batch response. Therefore I patched it to fulfill following needs:

1. I need it to have a typescript interface for typescript support.
2. I need to further porcess data such as sign it for security purpose, 
hash it to ensure data integrity as well as help for my own caching infrastructure layer.

Looking for [the Koa version of this module](https://github.com/socialradar/koa-batch)?

## Prerequisite

Before you use this library, please keep in mind that you have used [body-parser](https://www.npmjs.com/package/body-parser) as one of your middlewares (express.bodyParser() or express.json() is needed). 
The official batch request documentation is somehow did not document it. 
However, it is mentioned in its source code batch-request/lib/batch-request.js line 48.


## What Now

You can do as followings:

    var batch = require('batch-request')();

    // Javascript/Typescript way: Use Batch Request as middleware on an endpoint you want to service batch requests
    app.post('/batch', batch);


Optionally included 'batch.validate' middleware to check the validity of your batch request, as well as further process return data as you need:

    // Include the batch.validate middleware before batch middleware
    app.post('/batch', batch.validate, batch, (req,res)=>{
        // proxy return data will be passed into the req.batch object
        console.log(req.batch);
    });
    
    //Typescript way. Recommended to write in this way:
    batchRouter.post('/batch', batch.validate, batch, (req: IBatchRequest, res: express.Response)=> {
        res.json(req.batch);
    });
