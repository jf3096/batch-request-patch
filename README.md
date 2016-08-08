Batch Request Patch
===================

## Introduction
Batch Request is lightweight connect/express middleware for Node.js which allows clients to send multiple requests to a server running Node.js in batch.
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

    // Javascript/Typescript way. Simple case.
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