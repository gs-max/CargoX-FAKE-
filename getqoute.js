const axios = require('axios');
require("@chainlink/env-enc").config();


// Demo code sample. Not indended for production use.

// See instructions for installing Request module for NodeJS
// https://www.npmjs.com/package/request

const request = require('request');
async function getFreightEstimate() {
    const apiKey = process.env.FREIGHTOS_APIKEY;
    const url = 'https://sandbox.freightos.com/api/v1';
  
    const body = {
      load: [{
        quantity: 1,
        unitType: 'container40',
        unitWeightKg: 15000,
        unitVolumeCBM: 67.0
      }],
      legs: [{
        origin: { unLocationCode: 'CNSHA' },
        destination: { unLocationCode: 'USLAX' },
        mode: 'OCEAN'
      }]
    };
  
    const resp = await axios.post(url, body, {
      headers: { 'x-apikey': apiKey }
    });
  
    const ocean = resp.data.OCEAN;
    console.log(`Ocean freight estimate: ${ocean.priceEstimates.min} – ${ocean.priceEstimates.max} USD, transit ${ocean.transitTime.min}–${ocean.transitTime.max} days`);
  }
  
  getFreightEstimate().catch(console.error);

