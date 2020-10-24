const secretManager = require('../connectors/SecretConnector');

const x = async ()=>{
    const secret = await secretManager.getSecret('jwt-secret');
    console.log(secret);
};

x();