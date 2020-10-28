const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const logger = require('../Logger');

let _initialized = false;

let client;

exports.setup = async () => {
    logger.debug(`[SecretConnector] Initializing`);

    if(_initialized)
        return;
    try {
        client = await new SecretManagerServiceClient();
        _initialized = true;
    } catch (e) {
        logger.error("Failed to initialize Secret Manager client.");
    }
};
// Secret name from GSM in IAM
// redis-uri
// jwt-secret
// pusher-secret
// etc
exports.getSecret = async (secret) => {
    try {
        const [version] = await client.accessSecretVersion({
            name: `projects/fallow-timer/secrets/${secret}/versions/latest`,
        });
        return version.payload.data.toString();
    } catch (e) {
        console.error(e);
        return null;
    }
};