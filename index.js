const core = require('@actions/core');
const fsPath = require('path');
const fs = require('fs');
const IpfsHttpClient = require('ipfs-http-client');
const { globSource } = IpfsHttpClient;

const ipfsGateway = 'https://crustwebsites.net/api/v0';

async function main() {
    // 1. Get all inputs
    let path = core.getInput('path');
    const crustSecretKey = core.getInput('crust-secret-key');

    // 2. Check path and convert path
    const workspace = process.env.GITHUB_WORKSPACE.toString();
    if (!fsPath.isAbsolute(path)) {
        path = fsPath.join(workspace, path);
    }
    if (!fs.existsSync(path)) {
        throw new Error(`File/directory not exist: ${path}`);
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