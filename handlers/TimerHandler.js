const {
    v4: uuidv4
} = require('uuid');

const TimerDSConnector = require("../connectors/datastore/TimerDSConnector");
const RedisManager = require('../connectors/RedisConnector');
const NotificationConnector = require('../connectors/NotificationConnector');
const logger = require('../Logger');

exports.handleReset = async (socket,id) => {
    if (typeof id !== "string")
        return;
    if(id.length < 1)
        return;
    let timer = await TimerDSConnector.get(id, socket.office);
    if(!timer)
        return;
    logger.debug(`[TimerReset] Resetting Timer ${id}`);

    if (typeof timer.notification === "string" && timer.notification) {
        await NotificationConnector.cancelNotification(timer.notification);
    }
    timer.expires_at = await (new Date().getTime() + (timer.length * 1000));
    timer.notification = await NotificationConnector.scheduleNotification(timer);
    logger.debug(`[TimerReset] Resetting Timer ${id} to it's set time of ${timer.length}. Timer data is ${JSON.stringify(timer)}`);
    await TimerDSConnector.update(timer);
    await RedisManager.emitEvent(socket.office, 'timer.updated', timer);
};

exports.handleZero = async (socket, id) => {
    if(id.length < 1)
        return;
    let timer = await TimerDSConnector.get(id, socket.office);
    if(!timer)
        return;
    logger.debug(`[TimerZero] Zeroing Timer ${id}`);
    timer.expires_at = 0;
    await TimerDSConnector.update(timer);

    await RedisManager.emitEvent(socket.office, 'timer.updated', timer);
    if (typeof timer.notification === "string" && timer.notification) {
        await NotificationConnector.cancelNotification(timer.notification);
    }
};

exports.handleDelete = async (socket, id) => {
    if(id.length < 1)
        return;
    let timer = await TimerDSConnector.get(id, socket.office);
    if(!timer)
        return;
    logger.debug(`[TimerDelete] Deleting timer with id ${id}`);
    await TimerDSConnector.delete(timer, socket.office);
    await RedisManager.emitEvent(socket.office, 'timer.deleted', timer);
    if (typeof timer.notification === "string" && timer.notification) {
        await NotificationConnector.cancelNotification(timer.notification);
    }
};

exports.handleCreate = async (socket, data) => {
    if (
        typeof data.name !== "string" ||
        typeof data.length !== "string" ||
        data.name.length < 1 ||
        data.name.length > 50 ||
        isNaN(data.length) ||
        parseInt(data.length) < 30 ||
        parseInt(data.length) > 172800
    ) {
        return;
    }

    let timer = {
        id: await uuidv4(),
        name: data.name,
        length: parseInt(data.length),
        office: socket.office,
        expires_at: 0
    };
    console.debug(`[TimerCreate] Creating timer in DB and broadcasting. Data: ${timer}`);
    await TimerDSConnector.create(timer);
    await RedisManager.emitEvent(socket.office, 'timer.created', timer);
};