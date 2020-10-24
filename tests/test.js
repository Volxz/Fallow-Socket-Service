/*
 * You can edit the below credentials
 */
const creds = {
    "ethan@exclnetworks.com": "",
    "testerson@exclnetworks.com": "",
    "testerson2@exclnetworks.com": "",
    "testerson3@exclnetworks.com": "",
    "testerson4@exclnetworks.com": ""
};

const clientAmount = 1000;
const clients = [];

/*** DO NOT EDIT BELOW THIS LINE **/

const axios = require('axios');

let jwtTokens = [];


// Normal function declarations below
const getAccounts = async () => {
    for (const email of Object.keys(creds)) {
        let responseBody;
        try {
            responseBody = await axios.post('https://us-central1-fallow-timer.cloudfunctions.net/login', {
                email: email,
                password: creds [email]
            });
            jwtTokens.push(responseBody.data.token);
            console.log('TOKEN: ' + responseBody.data.token)
        } catch (e) {
            console.warn(`CREDENTIAL ERROR: The credential for ${email} failed to fetch.`)
            //console.log(e);
        }

    }
};

const connectSockets = () => {
    const handlers = require('socket.io-client');
    for(let i = 0; i < clientAmount; i++) {
        const token = jwtTokens[Math.floor(Math.random() * jwtTokens.length)];
        const socket = handlers.connect('http://localhost:8080', {
            'reconnection delay': 0
            , 'reopen delay': 0
            , 'force new connection': true
        });

        socket.on('connect', () => {
            console.log(`[Socket ${i}] Connected to Server.`);
        });

        socket.on('timers', (data) => {
            console.log(`[Socket ${i}] Server Provided a list of timers.`);
        });
        socket.on('auth.error', (data) => {
            console.log(`[Socket ${i}] Authentication error occurred. Error is: ${data}`);
        });
        socket.on('auth.request', (data) => {
            console.log(`[Socket ${i}] Server prompted for authentication. Sending token...`);
            socket.emit('auth', token);
        });
        socket.on('server.info', (data) => {
            console.log(`[Socket ${i}] Server gave us info. Server info is: ${JSON.stringify(data)}`);
        });
        socket.on('disconnect', (reason) => {
            console.log(`[Socket ${i}] DISCONNECTED, Reason: ${reason}`);
        });
        clients[i] = socket;
    }

};


const run = async () => {
    await getAccounts();
    connectSockets();
};

run();

