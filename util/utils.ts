export function asyncPause(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
 export function withTimeout(milliseconds: number, promise: Promise<any>): Promise<any> {
    return Promise.race([asyncPause(milliseconds), promise]);
 }
