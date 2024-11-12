import * as http from "http";
import * as https from "https";
import * as socketio from "socket.io";
import * as express from "express";

export class SignalingServer {
    channels: { [k:string]:{ [k:string]:socketio.Socket } } = {};
    sockets:{[id:string]: socketio.Socket} = {};
    socketChannels = new Map<string, { [k:string]:string }>()
    socketNames = new Map<string, string>()
    allowed_channels = {"Lobby":0,"Locanda":1, "Quest":2, "RPG":3, "Offtopic": 4, "Chat":5};

    constructor(host:string, port:number, credentials:https.ServerOptions) {
        let cfg = <any>{
            serveClient: false,
            pingTimeout: 120000,
            allowEIO3: true,
            exclusive: true,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                allowedHeaders: [],
                credentials: true
              }
        }
        const webapi = express()
        const server = credentials ? https.createServer(credentials, webapi) : http.createServer();
        const io = new socketio.Server(server, cfg);
        const sigServer = this

        server.listen(port, host, function() {
            console.log("WebRTC Listening on port " + port);
        });

        /**
         * Users will connect to the signaling server, after which they'll issue a "join"
         * to join a particular channel. The signaling server keeps track of all sockets
         * who are in a channel, and on join will send out 'addPeer' events to each pair
         * of users in a channel. When clients receive the 'addPeer' even they'll begin
         * setting up an RTCPeerConnection with one another. During this process they'll
         * need to relay ICECandidate information to one another, as well as SessionDescription
         * information. After all of that happens, they'll finally be able to complete
         * the peer connection and will be streaming audio/video between eachother.
         */
        io.sockets.on('connection', function (socket: socketio.Socket) {
            sigServer.sockets[socket.id] = socket;

            console.log("["+ socket.id + "] connection accepted");
            socket.on('disconnect', function () {
                for (let channel in sigServer.getSocketChannel(socket)) {
                    part(channel);
                }
                console.log("["+ socket.id + "] disconnected");
                delete sigServer.sockets[socket.id];
                sigServer.socketChannels.delete(socket.id)
            });


            socket.on('join', function (config) {
                console.log("["+ socket.id + "] join ", config);
                let channel:string = config.channel;
                let userdata:any = config.userdata;

                if (!(channel in sigServer.allowed_channels)) {
                    console.log("["+ socket.id + "] ERROR: no channel ", channel);
                    return;
                }

                if (channel in sigServer.getSocketChannel(socket)) {
                    console.log("["+ socket.id + "] ERROR: already joined ", channel);
                    return;
                }
                
                for (let c in sigServer.getSocketChannel(socket)) {
                    part(c)
                    for (const k of Object.keys(sigServer.sockets)) {
                        if (sigServer.sockets[k].connected) sigServer.sockets[k].emit("channelchange", c)
                    }
                }

                if (!(channel in sigServer.channels)) {
                    sigServer.channels[channel] = {};
                }

                sigServer.getSocketChannel(socket)[channel] = channel;
                for (let id in sigServer.channels[channel]) {
                    sigServer.channels[channel][id].emit('addPeer', {'peer_id': socket.id, 'should_create_offer': false, name: sigServer.socketNames.get(socket.id)});
                    socket.emit('addPeer', {'peer_id': id, 'should_create_offer': true, name: sigServer.socketNames.get(id)});
                }

                sigServer.locateSocket(socket)
                sigServer.channels[channel][socket.id] = socket;

                for (const k of Object.keys(sigServer.sockets)) {
                    if (sigServer.sockets[k].connected) sigServer.sockets[k].emit("channelchange", channel)
                }
            });

            socket.on('identify', function (config) {
                console.log("["+ socket.id + "] identify ", config);
                if (!sigServer.socketNames.get(config.name) && config.name) {
                    sigServer.socketNames.set(socket.id, config.name)
                    socket.emit('identified')
                }
            });

            socket.on('getchanneldata', function (config:string) {
                console.log("["+ socket.id + "] getchanneldata ", config);
                if (sigServer.channels[config]) {
                    let ret = {
                        name: config,
                        users: [] as any
                    }
                    let ks = Object.keys(sigServer.channels[config])
                    for (const k of ks) {
                        let name = sigServer.socketNames.get(k)
                        ret.users.push({
                            name: name,
                            muted: false
                        })
                    }
                    socket.emit("channeldata", ret)
                } else {
                    socket.emit("channeldata", {
                        name: config,
                        users: []
                    })
                }
            });

            socket.on('locate', function (config) {
                console.log("["+ socket.id + "] locate ", config);
                sigServer.locateSocket(socket);
            });

            function part(channel: string) {
                console.log("["+ socket.id + "] part ");

                if (!(channel in sigServer.getSocketChannel(socket))) {
                    console.log("["+ socket.id + "] ERROR: not in ", channel);
                    return;
                }

                delete sigServer.socketChannels.get(socket.id)[channel];
                delete sigServer.channels[channel][socket.id];

                for (const id in sigServer.channels[channel]) {
                    sigServer.channels[channel][id].emit('removePeer', {'peer_id': socket.id});
                    socket.emit('removePeer', {'peer_id': id});
                }
                sigServer.locateSocket(socket);
            }
            socket.on('part', part);

            socket.on('relayICECandidate', function(config) {
                let peer_id = config.peer_id;
                let ice_candidate = config.ice_candidate;
                console.log("["+ socket.id + "] relaying ICE candidate to [" + peer_id + "] ", ice_candidate);

                if (peer_id in sigServer.sockets) {
                    sigServer.sockets[peer_id].emit('iceCandidate', {'peer_id': socket.id, 'ice_candidate': ice_candidate});
                }
            });

            socket.on('relaySessionDescription', function(config) {
                let peer_id = config.peer_id;
                let session_description = config.session_description;
                console.log("["+ socket.id + "] relaying session description to [" + peer_id + "] ", session_description);

                if (peer_id in sigServer.sockets) {
                    sigServer.sockets[peer_id].emit('sessionDescription', {'peer_id': socket.id, 'session_description': session_description});
                }
            });
        });
    }

    getSocketChannel(s:socketio.Socket) {
        let sc = this.socketChannels.get(s.id)
        if (!sc) {
            this.socketChannels.set(s.id, {})
        }
        return this.socketChannels.get(s.id)
    }

    locateSocket(socket:socketio.Socket) {
        let socket_channels = Object.getOwnPropertyNames(this.getSocketChannel(socket)).join(",");
        socket.emit('located', { channels: socket_channels });
    }
}