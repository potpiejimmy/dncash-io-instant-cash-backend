import * as fetch from 'node-fetch';
import * as Braintree from './braintree';

export async function registerDevice(device: any): Promise<any> {
    console.log(JSON.stringify(device));
    let d = await invokeBackend(process.env.DNCASH_API_URL+"/dnapi/token/v1/devices", "POST", device);
    // add the braintree authorization token for convenience
    d.braintree_auth = await Braintree.generateClientToken();
    return d;
}

export async function buyToken(token: any): Promise<any> {

    // first, pay the amount:
    let paymentResult = await Braintree.sale(token.amount / 100, token.paymentMethodNonce);
    console.log("Payment: success=" + paymentResult.success);
    if (!paymentResult.success) throw "Payment unsuccessful";

    // create the token:
    token.type = 'CASHOUT';
    token.refname = paymentResult.transaction.id;
    token.info.paymentInfo = {
        transaction: {
            id: paymentResult.transaction.id,
            status: paymentResult.transaction.status
        }
    };
    delete token.paymentMethodNonce;
    console.log(JSON.stringify(token));
    return invokeBackend(process.env.DNCASH_API_URL+"/dnapi/token/v1/tokens", "POST", token)
}

function invokeBackend(url: string, method: string, body?: any) : Promise<any> {
    return fetch(url, {
        headers: {
            "DN-API-KEY": process.env.DNCASH_API_KEY,
            "DN-API-SECRET": process.env.DNCASH_API_SECRET,
            "Content-Type": "application/json"
        },
        method: method
    }, JSON.stringify(body)).then(res => res.json());
}
