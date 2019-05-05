import * as fetch from 'node-fetch';
import * as Braintree from './braintree';

export async function registerDevice(device: any): Promise<any> {
    console.log(JSON.stringify(device));
    let d = await invokeBackend("/dnapi/token/v1/devices", "POST", device);
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
    return invokeBackend("/dnapi/token/v1/tokens", "POST", token)
}

export async function getTokensForDevice(device_uuid: string): Promise<any> {
    return invokeBackend("/dnapi/token/v1/tokens?device_uuid="+device_uuid);
}

export async function deleteTokenForDevice(device_uuid: string, token_uid: string): Promise<any> {
    return invokeBackend("/dnapi/token/v1/tokens/"+token_uid+"?device_uuid="+device_uuid, "DELETE");
}

export async function performCashout(triggerData: any): Promise<any> {
    let res = await fetch(process.env.DNCASH_API_URL + "/dnapi/mobile/v1/trigger", {
        headers: {"Content-Type": "application/json"},
        method: "POST",
        body: JSON.stringify(triggerData)
    });
    console.log(res);
    let status = "OK" // XXX
    if (res.status != 204) {
        let resBody = await res.json();
        if (resBody.error) status = resBody.message;
    }
    return {status: status};
}

function invokeBackend(url: string, method: string = "GET", body?: any) : Promise<any> {
    return fetch(process.env.DNCASH_API_URL + url, {
        headers: {
            "DN-API-KEY": process.env.DNCASH_API_KEY,
            "DN-API-SECRET": process.env.DNCASH_API_SECRET,
            "Content-Type": "application/json"
        },
        method: method,
        body: body ? JSON.stringify(body) : null
    }).then(res => res.json());
}
