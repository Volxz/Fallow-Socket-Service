const type = 'Timer';

const {Datastore} = require('@google-cloud/datastore');
const logger = require('../../Logger');

let datastore;

let _initialized = false;

exports.setup = async ()=> {
    logger.debug(`[TimerDSConnector] Initializing`);

    if(_initialized)
        return false;
    try {
        datastore = await new Datastore();
        return true;
    } catch (e) {
        logger.error('[TimerConnector] Failed to initialize Cloud Datastore. Error: ' + e)
    }
};

exports.update = async (timerData) => {
    logger.debug(`Updating timer ${JSON.stringify(timerData)}`);
    const {id, name, length, expires_at, office, notification} = timerData;
    const key = await datastore.key({
        namespace: `office-${office}`,
        path: [type, id]
    });
    const timer = {
        key,
        data: {
            name, length, expires_at, office, notification
        }
    };
    await datastore.save(timer);
};

exports.delete = async (timer, office) => {
    logger.debug(`Deleting timer ${JSON.stringify(timer)}`);

    const key = await datastore.key({
        namespace: `office-${office}`,
        path: [type, timer.id]
    });
    await datastore.delete(key);
};

exports.create = async (timerData) => {
    logger.debug(`Creating timer ${JSON.stringify(timerData)}`);
    const {id, name, length, expires_at, office} = timerData;
    const key = await datastore.key({
        namespace: `office-${office}`,
        path: [type, id]
    });
    const timer = {
        key,
        data: {
            name, length, expires_at, office
        }
    };
    await datastore.save(timer);
};

exports.get = async (id, office) => {
    logger.debug(`Getting Timer ${id}`);
    const key = await datastore.key({
        namespace: `office-${office}`,
        path: [type, id]
    });
    const [timer] = await datastore.get(key);
    if(!timer) {
        logger.debug(`Could not retrieve timer ${id} in office ${office}`);
        return null;
    }
    timer.id = timer[datastore.KEY]['name'];
    return timer;
};

exports.getAllOfficeTimers = async (officeNum) => {
    logger.debug(`Getting all office timers for office ` + officeNum);
    const query = datastore.createQuery(`office-${officeNum}`, 'Timer');
    const [data] =  await datastore.runQuery(query);
    let idTimers = [];
    for( let i = 0; i < data.length; i++) {
        let timer = data[i];
        timer.id = data[i][datastore.KEY]['name'];
        idTimers.push(timer);
    }
    return idTimers;
};
