const core = require('@actions/core');

const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const fsPath = require('path');
const fs = require('fs');
const axios = require('axios');
const MFormData = require('form-data');

const { Keyring } = require('@polkadot/keyring');

const ipfsPath = uuidv4();
function getAllFiles(rootPath, dirPath, ipfsPath) {
    const files = fs.readdirSync(dirPath);
    let arrayOfFiles = [];
    files.forEach((file) => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = _.concat(arrayOfFiles, getAllFiles(rootPath, dirPath + "/" + file, ipfsPath));
        }
        else {
            const absPath = fsPath.join(dirPath, "/", file);
            const realPath = _.replace(absPath, rootPath, ipfsPath);
            arrayOfFiles.push({
                absPath: absPath,
                path: realPath,
            })
        }
    })
    return arrayOfFiles;
}

async function main() {
    // 1. Get all inputs
    let path = core.getInput('path');
    const seeds = core.getInput('seeds');
    const ipfsGateway = core.getInput('gateway') || 'https://crustipfs.xyz';

    // 2. Check path and convert path
    const workspace = process.env.GITHUB_WORKSPACE.toString();
    if (!fsPath.isAbsolute(path)) {
        path = fsPath.join(workspace, path);
    }
    if (!fs.existsSync(path)) {
        throw new Error(`File/directory not exist: ${path}`);
    }

    // 3. Construct auth header
    const keyring = new Keyring();
    const pair = keyring.addFromUri(seeds);
    const sig = pair.sign(pair.address);
    const sigHex = '0x' + Buffer.from(sig).toString('hex');

    const authHeader = Buffer.from(`${pair.address}:${sigHex}`).toString('base64');

    // 4. Construct request form data
    const form = new MFormData();
    core.info(`Query all files`);
    const files = getAllFiles(path, path, ipfsPath);
    for (const f of files) {
        const fileStream = fs.createReadStream(f.absPath);
        form.append('file', fileStream, { filepath: f.path });
        core.info(`Add file ${f.path}`);
    }

    // 5. Uploading files
    core.info(`Start uploading`);
    const result = await axios.request({
        headers: {
            ...form.getHeaders(),
            authorization: 'Basic ' + authHeader
        },
        data: form,
        method: 'POST',
        url: ipfsGateway + '/api/v0/add',
        timeout: 3600000,
        maxBodyLength: 10737418240
    });

    // 6. Parse output
    const resultArr = result.data.split('\n');
    const folder = JSON.parse(resultArr[resultArr.length - 2]);
    core.info(`CID: ${folder.Hash}, Size: ${folder.Size}`);
    core.setOutput('hash', folder.Hash);
}

main().catch(error => {
    core.setFailed(error.message);
});
