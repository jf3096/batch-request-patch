// Source: http://batch-request.socialradar.com/
declare module 'batch-request-patch' {
    import {RequestHandler} from 'express';
    import * as express from 'express';

    interface IBatchRequestOption {
        /**
         * This is the maximum number of requests
         * Batch Request will accept in one batch.
         * Any more than this max will result in a 400 error.
         * @default 20
         */
        max: number;
        /**
         * Whether or not to respond in the validation middleware.
         * Setting to false leaves it up to you to respond.
         * @default true
         */
        validateRespond: boolean;
        /**
         * Must include port if used.
         * If any request is not in the list of allowedHosts,
         * Setting to false leaves it up to you to respond.
         * the Batch Request validator will return a 400 error.
         * @default null
         */
        allowedHosts: string[];
    }

    interface IBatchRequestHandler extends RequestHandler {
        validate: RequestHandler
    }

    interface IBatch {
        (option?: IBatchRequestOption): IBatchRequestHandler;
    }

    var e: IBatch;

    namespace e {
        export interface IBatchRequest extends express.Request {
            batch: Object;
        }
    }

    export =  e;
}
