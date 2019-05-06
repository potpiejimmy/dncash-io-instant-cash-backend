import * as fetch from 'node-fetch';
import * as Braintree from './braintree';
import * as WebSocket from 'ws';
import * as Utils from '../util/utils';
import * as PubSub from 'pubsub-js'

let ws;
let lastWsReconnect = 0;

export async function connectDncashIo() {
    // open a websocket for token change notification
    let wsUrl = process.env.DNCASH_API_URL.replace("https:","wss:").replace("http:","ws:");
    ws = new WebSocket(wsUrl + "/dnapi/tokenws/v1/tokenchange/" + process.env.DNCASH_API_KEY);
    lastWsReconnect = Date.now();

    ws.onmessage = m => {
        console.log("WebSocket: <<< " + m.data);
        handleTokenUpdate(JSON.parse(m.data).uuid);
    }
    
    ws.onopen = () => {
        console.log("WebSocket: open");
    };
    
    ws.onerror = m => {
        console.log("WebSocket: error [" + m.message + "]");
    };
    
    ws.onclose = m => {
        console.log("WebSocket: close [" + m.reason + "]");
        // reconnect immediately (wait up to 3 seconds if immediately closed).
        setTimeout(connectDncashIo, Math.max(0,(3000-(Date.now()-lastWsReconnect))));
    };
}

async function handleTokenUpdate(uuid: string) {
    let t = await getToken(uuid);
    let ignoreStatus = ['OPEN','LOCKED'];
    // publish token internally
    if (!ignoreStatus.includes(t.state)) PubSub.publish(uuid, t);
}

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
    return invokeBackend("/dnapi/token/v1/tokens", "POST", token)
}

export async function getTokensForDevice(device_uuid: string): Promise<any> {
    return invokeBackend("/dnapi/token/v1/tokens?device_uuid="+device_uuid);
}

export async function getToken(token_uuid: string): Promise<any> {
    return invokeBackend("/dnapi/token/v1/tokens/"+token_uuid);
}

export async function deleteTokenForDevice(device_uuid: string, token_uid: string): Promise<any> {
    return invokeBackend("/dnapi/token/v1/tokens/"+token_uid+"?device_uuid="+device_uuid, "DELETE");
}

export async function performCashout(triggerData: any): Promise<any> {
    // listen for token id changes:
    let tokenState;
    try {
        let waitForTokenStatus = new Promise(resolve => {
            PubSub.subscribe(triggerData.uuid, (m,t) => {
                console.log("Token published: ", m, t.state);
                tokenState = t.state;
                resolve();
            });
        });

        // trigger against the dncash.io Mobile API
        let res = await fetch(process.env.DNCASH_API_URL + "/dnapi/mobile/v1/trigger", {
            headers: {"Content-Type": "application/json"},
            method: "POST",
            body: JSON.stringify(triggerData)
        });
        console.log("Trigger result: HTTP " + res.status);
        if (res.status != 204) {
            // read body (if not HTTP 204)
            let resBody = await res.json();
            console.log("Trigger result body: " + JSON.stringify(resBody));
            return {success:false, status:resBody.error ? resBody.message : "An error occurred: HTTP " + res.status}
        }
        // HTTP 204 = successfully triggered.

        // wait up to 60 sec. for token status
        res = await Utils.withTimeout(60000, waitForTokenStatus);
        if (!tokenState) {
            return {success:false, status:"Timed out waiting for status."}
        }
    } finally {
        PubSub.unsubscribe(triggerData.uuid);
    }

    return {success: tokenState=='COMPLETED', status: tokenState};
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
