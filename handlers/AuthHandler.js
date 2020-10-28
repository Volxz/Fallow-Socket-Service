const jwt = require('jsonwebtoken');

const logger = require('../Logger');
const SecretConnector = require('../connectors/SecretConnector');
const TimerDSConnector = require('../connectors/datastore/TimerDSConnector');
const RedisConnector = require('../connectors/RedisConnector');

let _initialized = false;

let jwtSecret;

exports.setup = async () => {
    logger.debug(`[AuthHandler] Initializing`);

    if(_initialized)
        return;
    let secret = await SecretConnector.getSecret('jwt-secret');
    if(!secret) {
        logger.error("Could not get JWT secret from the db");
        return;
    }
    jwtSecret = secret;
    _initialized = true;
};

const verifyJWT = async (token) => {
    let jwtData;
    try {
        jwtData = await jwt.verify(token, jwtSecret);
        return jwtData.data;
    } catch (e) {
        logger.warn(`Failed to validate JWT data! Error is ${e}.`);
        return undefined;
    }
};

exports.handleAuth = async (socket, token) => {
    if ('office' in socket) {
        logger.info(`Socket ${socket.id} tried to authenticate more than once.`);
        socket.emit('auth.error', 'Your session is already authenticated');
        return false;
    }

    if(!token)
        return;

    let jwtData;
    try {
        jwtData = await verifyJWT(token);
    } catch (e) {
        return;
    }

    if (!jwtData) {
        socket.emit('auth.error', 'Invalid JWT provided.');
        return false;
    }

    const office = jwtData.office;

    const currentClients =  parseInt(await RedisConnector.getClientCount(office));

    if(currentClients > 100) {
        socket.emit('auth.error', 'Maximum amount of allowed clients for this office reached. ');
        return false;
    }

    logger.info(`Socket ${socket.id} authenticated successfully!`);

    // Set the office identifier on the socket
    socket.office = office;
    // Ensure our socket gets updates on private timers
    socket.join(`office-${office}`);
    // Increment our client count in redis
    RedisConnector.adjustClientCount(office, 1);

    return jwtData;
};

exports.postAuth = async (socket) => {
    socket.emit('server.info', {"server.name": process.env.POD_NAME || "development"});
    socket.emit('clock.status', new Date().getTime());
    socket.emit('timers', await TimerModel.getAllOfficeTimers(socket.office));
};

