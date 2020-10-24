const io = require('socket.io-client');
const axios = require('axios');

process.env.PORT = 8080;
let server1 = require('../socket');

let socket1;

let jwtToken;

let creds = {
    username: "ethan@exclnetworks.com",
    password: "This isn't my password :P"
};

/**
 * Run before each test
 */
beforeAll((done) => {
    // Setup
    // Do not hardcode server port and address, square brackets are used for IPv6
    socket1 = io.connect(`http://localhost:8080`, {
        'reconnection delay': 0,
        'reopen delay': 0,
        'force new connection': true,
        transports: ['websocket'],
    });

    socket1.on('connect', () => {
        done();
    });
});

/**
 * Run after each test
 */
afterAll((done) => {
    // Cleanup
    if (socket1.connected) {
        socket1.disconnect();
    }
    server1 = null;
    done();
});

describe('Test HTTP API', () => {
    test('[Login] Should provide a JWT token.', async (done) => {
        let responseBody;
        try {
            responseBody = await axios.post('https://us-central1-fallow-timer.cloudfunctions.net/login', {
                email: creds.username,
                password: creds.password
            });
            jwtToken = responseBody.data.token;
            done();
        } catch (e) {
            console.warn(`CREDENTIAL ERROR: The credential for ${creds.username} failed to fetch.`)
        }
    });
});

describe('Test SocketIO Client', () => {

    describe('Authorization and Authentication', () => {
        test('[Auth] should pass authentication check.', (done) => {
            let authFailed = false;
            socket1.on('auth.error', (reason) => {
                console.error(`Auth error occurred. Reason is: ${reason}`);
                authFailed = true;
                return false;
            });
            socket1.emit('auth', jwtToken);
            setTimeout(() => {
                expect(authFailed).toBeFalsy();
                done();
            }, 2000);
        });

        test('[Auth] Check that user info is matching', (done) => {
            const b64info = jwtToken.split('.')[1];
            const infoBuffer = Buffer.from(b64info, 'base64');
            const infoString = infoBuffer.toString('ascii');
            const info = JSON.parse(infoString);

            if (info.data.email === creds.username) {
                done();
            }
        });
    });


    const testTimerName = `Unit-Test-Timer #${Math.floor(Math.random() * Math.floor(100000))}`;
    const updatedTimerName = `Unit-Test-Timer-UPDATED #${Math.floor(Math.random() * Math.floor(100000))}`;
    const timerLength = Math.floor(Math.random() * Math.floor(500));

    let testTimerId = '';
    test('[Timer] Timer Create Submission', (done) => {
        // Listen for the timer to be created
        socket1.on('timer.created', (timer) => {
            testTimerId = timer.id;
            if (timer.name === testTimerName) {
                done();
            }
        });
        // Tell the server to create the timer.
        socket1.emit('timer.create', {
            name: testTimerName,
            length: timerLength
        });
    });

    test('[Timer] Timer Delete Submission', (done) => {
        // Listen for the timer to be deleted
        socket1.on('timer.deleted', (timer) => {
            console.log("TIMER DELETED" + JSON.stringify(timer));
            if (timer.id === testTimerId) {
                done();
            }
        });
        // Tell the server to delete the timer.
        socket1.emit('timer.delete', testTimerId);
    });

});
