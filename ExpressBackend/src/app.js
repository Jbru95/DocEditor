// this one file IS the backend for this application using sockets to communicate with the server and express to handle the connections
// run '$node src/app.js' to start this js application to set up the functions and start listening over the port number we set below

const portToListenOn = 4444;

const app = require('express')(); // get intances of express, http and socket.io to work with
const http = require('http').Server(app);
const io = require('socket.io')(http);

const documents = {}; // in-memory store of documents, in a production app we should use a database for this, learn mongo.db

// defining what we want our socket server to actually do 
//.on() is an event listener, first param is the name of the event and second is a callback executed when the event is fired, with the event payload. 

io.on('connection', socket => {  // connection is a reserved event type in socket.io. We get a socket variable to pass into our callback function to initiate communication with either that one socket, or to broadcast to multiple sockets
    let previousId;
    const safeJoin = currentId => { //safe join is a function that takes care of joining and leaving "rooms" in socket.io, in this case, when a client joins a room, they are editing a particular document
        socket.leave(previousId);
        socket.join(currentId);
        previousId = currentId; // technically a socket can be in multiple rooms, but we dont want one client editing multiple documents at once for this examples simplicity. if they try to do that, this func leaves the prev room and joins the new one
    };


    // there are 3 event types that our socket is listening for from the client, getDoc, addDoc, and editDoc
    socket.on("getDoc", docId => { //in this case, when a client emits the getDoc event, the sockets takes the payload(id), joins a room with that doc and then emits the stored document back to that client only
        safeJoin(docId);
        socket.emit("document", documents[docId]);
    });

    socket.on("addDoc", doc => {                        //in this case, the client passed in a document it wants to add,  
        documents[doc.id] = doc;                         // we add that doc to the collection,
        safeJoin(doc.id);                               // join it 
        io.emit("documents", Object.keys(documents));   // and then emit the new collection of documents to ALL users, so they all can see this change  
        socket.emit("document", doc);                   // NOTE: using io.emit to broadcast to all users, and socket.emit to send info back to the client that initiated the call
    });

    socket.on("editDoc", doc => {                   // this funtion gets the document from the user on an edit(after a keystroke or save, whatever the client is set up to do.
        documents[doc.id] = doc;                    // changes the old document in the collection to the new one
        socket.to(doc.id).emit("document", doc);    // then broadcast the changed document to ONLY THE CLIENT THAT ARE CURRENTLY VIEWING THAT DOCUMENT i.e. the document at the doc.id were viewing
    })

    io.emit("documents", Object.keys(documents)); // 2event types emitted from the socket, these are an individual document and the collection of documents as in this row.
});

http.listen(portToListenOn); // after the socket functions are all set up, pick a port and listen on it