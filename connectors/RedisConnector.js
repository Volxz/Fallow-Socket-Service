const redis = require('redis');
const SecretConnector = require('./SecretConnector');
const logger = require('../Logger');

let _initialized = false;

let _subscriber;
let _publisher;

exports.removeTopic =  async (officeNum) => {
    await _subscriber.unsubscribe(`office-${officeNum}`)
};

exports.subToTopic = async (officeNum) => {
    const topicName = `office-${officeNum}`;
    await _subscriber.subscribe(topicName);
};

exports.emitEvent = async (officeNum, eventType, data) => {
    const topicName = `office-${officeNum}`;
    data['event_type'] = eventType;
    _publisher.publish(topicName, JSON.stringify(data));
};

exports.adjustClientCount = async (officeID, amount) => {
    _publisher.hincrby('client.count',officeID, amount);
};


exports.getClientCount = async (officeID) => {
    return await _publisher.hget('client.count',officeID);
};

exports.setup = async () => {
    logger.debug(`[RedisConnector] Initializing`);

    if(_initialized)
        return false;
    const redisURL = await SecretConnector.getSecret('redis-uri');
    if (!redisURL) {
        return logger.error("Could not get redis URL from secret manager");
    }
    _subscriber = await redis.createClient(redisURL);
    _publisher = await redis.createClient(redisURL);
    _subscriber.on('message', (channel, message) => {
        if (channel.includes('office-')) {
            const messageObj = JSON.parse(message);
            require('../socket').to(channel).emit(messageObj.event_type, messageObj);
        }
    });
    _initialized = true;
    return true;
};