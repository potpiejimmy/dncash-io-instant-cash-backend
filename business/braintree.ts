import * as braintree from 'braintree';

let gateway;

export function connectGateway() {
    gateway = braintree.connect({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.BRAINTREE_MERCHANT_ID,
        publicKey:  process.env.BRAINTREE_PUBLIC_KEY,
        privateKey: process.env.BRAINTREE_PRIVATE_KEY
    });
}

export function generateClientToken(): Promise<string> {
    return gateway.clientToken.generate({}).then(res => res.clientToken);
}

export async function sale(amount: number, nonceFromTheClient): Promise<any> {
    let result = await gateway.transaction.sale({
        amount: amount,
        paymentMethodNonce: nonceFromTheClient,
        options: {
            submitForSettlement: true
        }
    });
    console.log("Transaction: " + result.transaction.id + ", " + result.transaction.status);
    return result;
}
