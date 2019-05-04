import { Router, Request, Response, NextFunction } from "express";
import * as Dncash from '../business/dncash';

export const instantApiV1: Router = Router();

/**
 * Registers a device, returns device data
 * and a braintree client authorization token
 */
instantApiV1.post('/register', (req, res) => {
    Dncash.registerDevice(req.body).then(d => res.send(d));
});

/**
 * Buy, create and return a cashout token
 */
instantApiV1.post('/buy', (req, res) => {
    Dncash.buyToken(req.body).then(t => res.send(t));
});
