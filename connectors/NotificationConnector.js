const {CloudTasksClient} = require('@google-cloud/tasks');
const SecretConnector = require('./SecretConnector');
const logger = require('../Logger');
let _initialized = false;

let pusherSecret;
let client;

// Our parent region we execute timed requests from.
let parent;


exports.setup = async() => {
    logger.debug(`[NotificationConnector] Initializing`);

    if(_initialized)
        return false;
    try {
        client = await new CloudTasksClient();
        // Set the parent region
        parent = client.queuePath('fallow-timer', 'us-central1', 'notification-queue');
        pusherSecret = await SecretConnector.getSecret('pusher-secret');
        _initialized = true;
    } catch (e) {
        console.error("Failed to initialize CloudTasks Client.")
    }
};


exports.scheduleNotification = async (timer) => {
    const pusherBody = {
        "interests": ["timers"],
        "web": {
            "notification": {
                "title": "Timer " + timer.name + " Expired.",
                "body": "Timer " + timer.name + " has completed. Click here to view timer status.",
                "deep_link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            }
        }
    };


    const task = {
        //name: `projects/fallow-timer/locations/us-central1/queues/notification-queue/tasks/${timer.id}`,
        httpRequest: {
            httpMethod: 'POST',
            url: "https://7fc5670a-8ea6-4ab4-bc99-b273af43a9d0.pushnotifications.pusher.com/publish_api/v1/instances/7fc5670a-8ea6-4ab4-bc99-b273af43a9d0/publishes",
            body: Buffer.from(JSON.stringify(pusherBody)).toString('base64'),
            headers: {
                'Authorization': `Bearer ${pusherSecret}`,
                'Content-Type': 'application/json'
            }
        },
        scheduleTime: {
            seconds: timer.expires_at / 1000
        }
    };

    const request = {parent,task};
    const [response] = await client.createTask(request);
    if(!response || !response.name) {
        return null;
    }
    return response.name;
};

exports.cancelNotification = async (notification) => {
    await client.deleteTask({name:notification}).catch(err=> {});
};