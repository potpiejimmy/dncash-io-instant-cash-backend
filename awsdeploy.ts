import { spawn } from "child_process";

spawn("eb", ["deploy","-l","dncash-io-instant-cash-"+process.env.npm_package_version], {stdio:'inherit'});
