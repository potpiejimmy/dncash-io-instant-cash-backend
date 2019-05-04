/**
 * Set the following environment variables:
 * 
 * BRAINTREE_MERCHANT_ID
 * BRAINTREE_PUBLIC_KEY
 * BRAINTREE_PRIVATE_KEY
 * DNCASH_API_KEY
 * DNCASH_API_SECRET
 * DNCASH_API_URL
 */

import * as express from 'express';
import { json } from 'body-parser';
import * as nocache from 'nocache';
import * as Braintree from './business/braintree';

console.log("Setting up Express");

const app: express.Application = express();

// Routes:
import { instantApiV1 } from "./routes/instantapi.v1";

app.use(nocache());
app.use(json());

// add CORS headers
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin); // XXX do not allow all origins for production
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, DN-API-KEY, DN-API-SECRET");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    next();
});

app.get('/', (req, res) => res.send('dncash.io Instant Cash backend is running.'));

// Routes:
app.use("/instant/v1", instantApiV1);

// production error handler
// no stacktrace leaked to user
app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
    if (process.env.NODE_ENV !== 'test') {
        console.log(err);
    }
    res.status(err.status || 500);
    res.json({
        error: {},
        message: err.message || err
    });
});

console.log("Connecting to Braintree Gateway");
Braintree.connectGateway();

console.log("Server initialized successfully");

export let appReady = new Promise(resolve => {
    // listen:
    let port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log('Instant Cash backend is up and running, listening on port ' + port)
        resolve();
    });
});
