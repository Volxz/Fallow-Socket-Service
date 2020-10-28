const io = require('socket.io')(process.env.PORT || "8080");
const logger = require('./Logger');
const SecretConnector = require('./connectors/SecretConnector');
const RedisConnector = require('./connectors/RedisConnector');
const NotificationConnector = require('./connectors/NotificationConnector');
const TimerDSConnector = require('./connectors/datastore/TimerDSConnector');

const TimerHandler = require('./handlers/TimerHandler');
const AuthHandler = require('./handlers/AuthHandler');

// Format: OfficeID : AmountOfClients
const _clientsPerOffice = new Map();
const main = async () => {
    // Setup our core connectors
    await SecretConnector.setup(); // This MUST BE FIRST as it provides keys for our services
    await RedisConnector.setup();
    await NotificationConnector.setup();
    await TimerDSConnector.setup();
    // Setup Handlers
    await AuthHandler.setup();
    //

    // Handle daemon exit
    registerExitHandlers();

    io.on('connection', socket => {
            console.log(`Socket ${socket.id} connected! IP: ${socket.handshake.headers['x-forwarded-for'] || socket.handshake.address}`);
            // Authentication
            setTimeout(() => {
                if (!socket.office) {
                    logger.info(`Socket ${socket.id} auth timed out!`);
                    socket.emit('auth-error', 'Session timeout');
                    socket.disconnect();
                }
            }, 5000);


            socket.once('auth', async (token) => {
                    const authenticated = await AuthHandler.handleAuth(socket, token);
                    if (authenticated) {
                        // Get our count of clients connected to this clients office
                        let currentOfficeAmount = _clientsPerOffice.get(socket.office);
                        // We dont have any clients with this office yet, lets subscribe!
                        if (typeof currentOfficeAmount === "undefined") {
                            _clientsPerOffice.set(socket.office, 1);
                            logger.info("Subscribing to office " + socket.office);
                            await RedisConnector.subToTopic(socket.office);
                        } else {
                            _clientsPerOffice.set(socket.office, currentOfficeAmount + 1);
                        }
                        registerListeners(socket);
                        await AuthHandler.postAuth(socket);
                    }
                }
            );

            socket.once('disconnect', () => {
                logger.info(`Socket ${socket.id} disconnected.`);
                // If the client was authenticated
                if (socket.office) {
                    const officeNum = socket.office;
                    const newOfficeCount = _clientsPerOffice.get(officeNum) - 1;
                    RedisConnector.adjustClientCount(officeNum, -1);
                    if (newOfficeCount <= 0) {
                        logger.debug("Client is the last of the office. Unsubbing...");
                        _clientsPerOffice.delete(officeNum);
                        RedisConnector.removeTopic(officeNum);
                    } else {
                        logger.debug("Reducing client count by 1 as others in the same office are still connected.");
                        _clientsPerOffice.set(officeNum, newOfficeCount);
                    }
                }
            });

            socket.emit('auth.request');
        }
    );
};


const registerListeners = (socket) => {

    socket.on('clock.get', () => socket.emit('clock.status', new Date().getTime()));

    socket.on('timer.reset', (timerID) => TimerHandler.handleReset(socket, timerID));

    socket.on('timer.zero', (timerID) => TimerHandler.handleZero(socket, timerID));

    socket.on('timer.delete', (timerID) => TimerHandler.handleDelete(socket, timerID));

    socket.on('timer.create', (data) => TimerHandler.handleCreate(socket, data));
};

const registerExitHandlers = () => {

    const exitHandler = ()=>{
        io.close(() => {
            process.exit();
        });
    };

    process.stdin.resume();
    process.on('exit', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGUSR1', exitHandler);
    process.on('SIGUSR2', exitHandler);
    process.on('uncaughtException', exitHandler);

};

main();

module.exports = io;