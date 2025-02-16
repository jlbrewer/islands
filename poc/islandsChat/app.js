const express = require("express"),

      app = express(),

      path = require('path'),
      bodyParser = require("body-parser"),
      logger = require('morgan'),
      PORT = 4000,
      TorConnector = require('./classes/TorConnector'),
      controllers = require('./controllers/persistence');


      //Debugging consts
let doCallPeer = false;


process.argv.forEach((val, index, array)=>{
    if (val === "-c")
        doCallPeer = true;
});


app.set('view engine', 'pug');


app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "pug");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

if (app.get('env') === 'development')
    app.use(logger('dev'));
app.locals.pretty = true;
app.use(express.static(path.join(__dirname, 'public')));

//index route
app.get('/', (req, res)=>{
    res.render('index');
});

//This one is blank yet
app.get('/private', (req, res)=>{
    res.render('private');
});

app.get("/files", (req, res)=>{
   res.render('files');
});



/*****FILES EXPERIMENTS******/
app.get("/files", (req, res)=>{
    res.render('files');
});
app.post("/files", controllers.run_files_experiment);
/*****_END OF FILES EXPERIMENTS******/



//This one is blank yet
app.get('/cryptground', (req, res)=>{
    res.render('cryptground', {title: "Cryptground"});
});

app.get('/icrypto', (req, res)=>{
    res.render('icrypto', {title: "iCrypto testing"});
});

app.get('/chat', (req, res)=>{
    res.render('chat', {title: "Welcome to idevcom chat!"});
});

//Dictionary of active socket connections
//key is socket id
const USERS_ONLINE = {};
const CONNECTED_ISLANDS = {};


let server = app.listen(PORT, '0.0.0.0', ()=>{
    console.log('app started on port ' + PORT);
});

const io  = require("socket.io").listen(server);



function torConnEventHandler(event, data){
    console.log("torConn called: " + event + " " + data);

    switch(event){
        case "broadcast_msg":
            io.sockets.emit("new_message", data)
    }
}


let tc = new TorConnector();

tc.setFunc(torConnEventHandler);





function islandTest(){
    //connect to another island
    tc.callPeer("t5lowoc4xls7gn6k.onion");



    //save socket into CONNECTED_ISLANDS (not now)

    //on user connection:
    // 1. send message to another island that new user is online
    // 2. obtain online users from aonther island
    // 3. display online users
    //


    //on new message:
    // 1. send to local users
    // 2. send to another island
    // 3. broadcast on another island.

}


if (doCallPeer){
    console.log("Calling peer");
    islandTest();
}

//TESTING

//END

//defining event handlers for socket.io
io.on('connection', (socket)=>{

    

    if(socket.handshake.query.name !== undefined){
        //creating new user object
        user = {
            name : socket.handshake.query.name,
            id : socket.id,
        };
        console.log(user.name + ' with id ' + user.id + ' has connected');

        //if User with such id is not already online, add him to USERS_ONLINE
        if (!USERS_ONLINE.hasOwnProperty(socket.id)){
            USERS_ONLINE[socket.id] = user.name;
        }

        console.log(socket.id);
        //returning added socket id
        socket.send(socket.id);

        //asking all the clients to update online users list
        updateOnlineUsersList(socket);
    }

    //
    socket.on('broadcast_msg', (data)=>{
        message = {
            author: USERS_ONLINE[socket.id],
            message: data.message,
            id: socket.id
        };
        io.sockets.emit('new_message', message);
        tc.broadcast(message);
    });

    socket.on('message', (message)=>{
        let data;
        try{
            data = JSON.parse(message)
        } catch(err) {
            console.log('invalid JSON');
            data = {}
        }

        switch(data.type){
            case "offer":
                console.log("sending offer to: " + data.name);
                let conn = USERS_ONLINE[data.id];

                socket.otherName = data.name;

                if (conn !== null){
                    sendTo(conn, {
                       type: "offer",
                       offer: data.offer,
                       name: socket.name
                    });
                }
                break;

            case "answer":
                console.log("Sending answer to: ", data.name);
        }

    });

    //disconnect handler
    socket.on('disconnect', ()=>{
        //removing connected user from USERS_ONLINE dict
        if(USERS_ONLINE.hasOwnProperty(socket.id)){
            userName = USERS_ONLINE[socket.id];
            delete USERS_ONLINE[socket.id];
            console.log('User ' + userName + ' with id ' + socket.id + ' has been disconnected');
        }else{
            console.log('user disconnected');
        }
        //asking all the clients to update online users list
        updateOnlineUsersList(socket);
    });
});

function updateOnlineUsersList(socket){
    socket.emit('update_online_users', USERS_ONLINE);

}

function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}



io.on('ready', (socket)=>{
    socket.join(socket.data);
    io.room(socket.data).broadcast('announce', {
        message: 'New client in the ' + socket.data + ' room.'
    });
});

module.exports = app;


    