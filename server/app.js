var WebSocketServer = require('websocket').server;
var static = require('node-static');
var file = new(static.Server)('./../dist');
var http = require('http');

var serverUrl = "http://localhost:3501";

var createUUID = function() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}

var server = http.createServer(function(request, response) {
    //Serve the files from app
    request.addListener('end', function () {
        file.serve(request, response, function (err, result) {
            if (err) { // There was an error serving the file
                console.error("Error serving " + request.url + " - " + err.message);
                if (err.status === 404 || err.status === 500) {
                  file.serveFile('/404.html', err.status, {}, request, response);
                } else {
                  response.writeHead(err.status, err.headers);
                  response.end();
                }
            }
        });
    });
});

server.listen(8080, function() {
  console.log((new Date()) + " Server is listening on port 8080");
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

function sendCallback(err) {
    if (err) console.error("send() error: " + err);
}


var pendingBuddies = {};

wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
    console.log(' Connection ' + connection.remoteAddress);
    
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            try {
                var msg = JSON.parse(message.utf8Data);
            } catch (e) {
                //No json valid string
                console.warn("Cant parse message",message.utf8Data,e);
                return;
            }
            if (msg.args instanceof Array) {
                switch (msg.e){
                    /** For peerConnection only assuming the buddy handshake has been made **/
                    case 'PeerConnection:ice':
                        if (connection.buddy) {
                            connection.buddy.send(message.utf8Data);   
                        } else {
                            console.log("Connection has no buddy on PeerConnection:ice message");
                        }
                    break;

                    case 'PeerConnection:dsp':
                        if (connection.buddy) {
                            connection.buddy.send(message.utf8Data);   
                        } else {
                            console.log("Connection has no buddy on PeerConnection:dsp message");
                        }
                    break;

                    /** For pairing buddies **/
                    case 'Buddy:create':
                        var id = createUUID();
                        pendingBuddies[id] = connection;
                        connection.buddyId = id;
                        connection.send(JSON.stringify({e: 'Buddy:created', args: [id]}));
                    break;

                    case 'Buddy:join':
                        if (pendingBuddies[msg.args[0]]){
                            var buddy = pendingBuddies[msg.args[0]];
                            delete pendingBuddies[msg.args[0]];
                            delete connection.buddyId;
                            delete buddy.buddyId;

                            connection.buddy = buddy;
                            buddy.buddy = connection;
                            //They are now paired so tell em
                            connection.buddy.send(JSON.stringify({e: 'Buddy:paired', args: []}));
                            connection.send(JSON.stringify({e: 'Buddy:paired', args: []}));
                        }
                    break;

                    default:
                        console.warn('Unknown message',msg);
                    break;
                } 
            } else {
                console.warn('invalid syntax message',msg);
            }
        }
    });
    
    connection.on('close', function(connection) {
        //Removing connection from buddy system
        if (connection.buddyId) delete pendingBuddies[connection.buddyId]; 

        //If already paired with someone tell him that he is gone
        if (connection.buddy) connection.buddy.send(JSON.stringify({e: 'Buddy:disconnected', msg: {}}));

        console.log((new Date()) + " Peer disconnected.");        
    });
});