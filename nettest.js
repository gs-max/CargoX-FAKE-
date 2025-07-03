const fetch = require('node-fetch');
const https = require('https');

async function testFetch() {
    try {
        const agent = new https.Agent({
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3'
        });

        const response = await fetch('https://freightos-api-sandbox.com/api/v1/freightEstimates', {
            method: 'GET',
            headers: {
                'x-apikey': 'mDE7xlxD0Z5ilcWG5A9SzAL0DpW15bcv',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            agent: agent
        });

        console.log('Status:', response.status);
        console.log('Headers:', response.headers.raw());
        const data = await response.json();
        console.log('Data:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testFetch();