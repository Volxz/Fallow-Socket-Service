const type = 'Timer';

const {Datastore} = require('@google-cloud/datastore');
const logger = require('../../Logger');

let datastore;

let _initialized = false;

exports.setup = async ()=> {
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
    console.debug(`Beginning update of timer with dataset ${JSON.stringify(timerData)}`);
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

exports.delete = async (timer, office) => {
    const key = await datastore.key({
        namespace: `office-${office}`,
        path: [type, timer.id]
    });
    await datastore.delete(key);
};

exports.create = async (timerData) => {
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
    const key = await datastore.key({
        namespace: `office-${office}`,
        path: [type, id]
    });
    return await datastore.get(key);
};

exports.getAllOfficeTimers = async (officeNum) => {
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
