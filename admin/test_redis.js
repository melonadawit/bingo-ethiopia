
const https = require('https');

const baseId = "smiling-whippet-27638";
const token = "AWv2AAIncDFmODU2NWE4YzRlYWE0MDQ1YjAxMGZlMTgzM2E5MTUyZXAxMjc2Mzg";

const regions = [
    "", // Try raw (already failed)
    "us1-",
    "eu1-",
    "eu2-",
    "ap1-",
    "gusc1-",
    "us-east-1-",
    "eu-central-1-"
];

function checkUrl(prefix) {
    return new Promise((resolve) => {
        const host = `${prefix}${baseId}.upstash.io`;
        const options = {
            hostname: host,
            port: 443,
            path: '/',
            method: 'HEAD', // HEAD might not be supported, try basic
            timeout: 2000
        };

        console.log(`Checking ${host}...`);
        const req = https.request(options, (res) => {
            console.log(`✅ FOUND! ${host} responded with ${res.statusCode}`);
            resolve(host);
        });

        req.on('error', (e) => {
            // console.log(`❌ ${host} failed: ${e.code}`);
            resolve(null);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });

        req.end();
    });
}

async function findValues() {
    for (const region of regions) {
        const result = await checkUrl(region);
        if (result) {
            console.log(`\n🎉 SUCCESS! The correct Redis URL host is: https://${result}`);
            return;
        }
    }
    console.log("\n❌ Could not find a valid Upstash host.");
}

findValues();
