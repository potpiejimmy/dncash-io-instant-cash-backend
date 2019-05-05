import { Router, Request, Response, NextFunction } from "express";
import * as Dncash from '../business/dncash';

export const instantApiV1: Router = Router();

/**
 * Registers a device, returns device data
 * and a braintree client authorization token
 */
instantApiV1.post('/register', function (request: Request, response: Response, next: NextFunction) {
    Dncash.registerDevice(request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Buy, create and return a cashout token
 */
instantApiV1.post('/buy', function (request: Request, response: Response, next: NextFunction) {
    Dncash.buyToken(request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Returns current tokens for device, state OPEN
 */
instantApiV1.get('/tokens/:device_uuid', function (request: Request, response: Response, next: NextFunction) {
    Dncash.getTokensForDevice(request.params.device_uuid)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Deletes token for device
 */
instantApiV1.delete('/tokens/:device_uuid/:uid', function (request: Request, response: Response, next: NextFunction) {
    Dncash.deleteTokenForDevice(request.params.device_uuid, request.params.uid)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Trigger token cashout
 */
instantApiV1.post('/trigger', function (request: Request, response: Response, next: NextFunction) {
    Dncash.performCashout(request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});
