const core = require('@actions/core');
const fs = require('fs');
const IpfsHttpClient = require('ipfs-http-client');
const { globSource } = IpfsHttpClient;

const ipfsGateway = 'https://crustwebsites.net/api/v0';

async function main() {
    // 1. Get all inputs
    const path = core.getInput('path');
    const crustSecretKey = core.getInput('crust-secret-key');

    // 2. Check legality of path
    if (!fs.existsSync(path)) {
        throw new Error(`File/directory is not exists: ${path}`);
    }

    // 3. Create ipfs http client
    const ipfs = IpfsHttpClient({
        url: ipfsGateway,
        headers: {
            authorization: 'Basic ' + crustSecretKey
        }
    });

    const { cid } = await ipfs.add(globSource(path, { recursive: true }));

    if (cid) {
        core.setOutput('hash', cid.toV0().toString());
    } else {
        throw new Error('IPFS add failed, please try again.');
    }
}

main().catch(error => {
    core.setFailed(error.message);
});