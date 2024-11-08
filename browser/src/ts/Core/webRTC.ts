import { Stream } from 'stream';
import { Notification } from '../App/messagebox';
import { EventHook } from '../Core/event';
import * as ioc from "socket.io-client";

let ICE_SERVERS = [
    {urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
        "stun:stun.ekiga.net"
    ]}
];

const channels = ["Lobby","Locanda", "Quest", "RPG", "Offtopic", "Chat"];
    
export interface PeerData {
    id:string;
    name:string;
    connection:RTCPeerConnection,
    element: HTMLMediaElement
}

export interface UserData{
    name: string;
    muted: boolean;
}

export interface ChannelData {
    name: string;
    users: UserData[]
}

export class WebRTC {
    USE_AUDIO = true;
    USE_VIDEO = false;
    DEFAULT_CHANNEL = 'Lobby';
    MUTE_AUDIO_BY_DEFAULT = false;

    signaling_socket:ioc.Socket = null;   /* our socket.io connection to our webserver */
    private _local_media_stream: MediaStream = null; /* our own microphone / webcam */
    public get local_media_stream(): MediaStream {
        return this._local_media_stream;
    }
    public set local_media_stream(value: MediaStream) {
        this._local_media_stream = value;
    }
    peers = new Map<string, PeerData>();                /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */
    active_channels = {};
    public userName:string = null;
    mediaAllowed: boolean;
    autojoin: boolean = false;
    audioEnabled = true
    videoEnabled = true

    getPeerMediaElement(id:string) {
        return this.peers.get(id)?.element
    }
    public EvtPeersChanged = new EventHook<string[]>();
    public EvtMicChanged = new EventHook<boolean>();
    public EvtAudioChanged = new EventHook<boolean>();
    public EvtPeersLeft = new EventHook<string>();
    public EvtPeersCame = new EventHook<string>();
    public EvtChannelChange = new EventHook<string>();
    public EvtNewChannelData = new EventHook<ChannelData>();
    public EvtEnteredChannel = new EventHook<string>();
    public EvtExitedChannel = new EventHook<string>();
    public EvtConnected = new EventHook<string>();
    public EvtDisconnected = new EventHook<boolean>();

    constructor(private host:string, private port:number, private container:JQuery) {
        
    }

    Join(channel?:string) {
        channel = channel || this.DEFAULT_CHANNEL
        if ((channels.indexOf(channel)<0) || !this.userName || !this.signaling_socket) return
        this.join_chat_channel(channel, {})
    }

    IsMicEnabled() {
        const stream:MediaStream = this.local_media_stream
        if (!stream) return false
        const audioTracks = stream.getAudioTracks();
        let rt = true
        audioTracks.map(track => {
            rt &&= track.enabled
        });
        return rt
    }
    ToggleMicrophone(val:boolean) {
        const stream:MediaStream = this.local_media_stream
        if (!stream) return
        const audioTracks = stream.getAudioTracks();
        
        audioTracks.forEach(track => {
            track.enabled = val;
        });
        this.EvtMicChanged.fire(val)
    }

    ToggleAudio(val:boolean) {
        this.audioEnabled = val
        let ks = [...this.peers.keys()]
        for (const k of ks) {
            this.togglePeerAudio(k, val)
        }
        this.EvtAudioChanged.fire(val)
    }

    IsAudioEnabled() {
        return this.audioEnabled
    }

    ToggleVideo(val:boolean) {
        this.videoEnabled = val
        let ks = [...this.peers.keys()]
        for (const k of ks) {
            this.togglePeerVideo(k, val)
        }
    }

    Leave() {
        if (!this.userName || !this.signaling_socket) return
        Object.keys(this.active_channels).forEach(k => {
            this.part_chat_channel(k)
        })
        this.Disconnect()
    }

    Connect() {
        this.init()
    }

    getChannels():string[] {
        return channels
    }

    isConnected() {
        return this.signaling_socket && this.mediaAllowed && this.local_media_stream
    }

    getChannelData(channel:string) {
        if (!this.signaling_socket) {
            return
        }
        this.signaling_socket.emit("getchanneldata", channel)
    }

    removePeer(peer_id:string) {
        $(this.peers.get(peer_id).element).remove()
        this.peers.get(peer_id)?.connection?.close();
        this.peers.delete(peer_id)
    }

    removePeers() {
        for (const p1 of this.peers.values()) {
            this.removePeer(p1.id)
        }
        this.peers.clear();  
        this.container.empty()            
    }
    Disconnect() {
        this.local_media_stream = null; 
        this.active_channels = {};
        this.mediaAllowed = false;
        this.removePeers()
        if (!this.signaling_socket) return
        this.signaling_socket.offAny()
        this.signaling_socket.disconnect()
        this.signaling_socket = null;
    }

    setUsername(name:string) {
        this.userName = name
        if (this.signaling_socket) {
            this.identify(this.userName)
        }
    }
    attachMediaStream = (element:HTMLAudioElement|HTMLVideoElement, stream:MediaStream) => {
        element.srcObject = stream;
    };

    init() {
        if (this.signaling_socket && this.signaling_socket.connected) {
            return
        }
        this.removePeers()
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
        this.signaling_socket = ioc.io(this.host + ":" + this.port, cfg);

        this.signaling_socket.on("channelchange", (channel:string) => {
            this.EvtChannelChange.fire(channel)
        })

        this.signaling_socket.on("channeldata", (cd:ChannelData) => {
            this.EvtNewChannelData.fire(cd)
        })

        this.signaling_socket.on("identified", async (data) => {
            /* once the user has given us access to their
            * microphone/camcorder, join the channel and start peering up */
            if (this.mediaAllowed && this.autojoin) this.join_chat_channel(this.DEFAULT_CHANNEL, {});
            this.EvtConnected.fire(this.userName)
        })
        this.signaling_socket.on('connect', async () => {
            console.log("Connected to signaling server");
            await this.setup_local_media(this.userName);
            if (this.userName) this.identify(this.userName);
        });
        this.signaling_socket.on('located', (data) => {
            if (data.channels) {
                this.active_channels = Object.fromEntries((data.channels as string).split(",").map((value:string, index:number) => [value, index])) ;
                Object.keys(this.active_channels).forEach(k => {
                    this.EvtEnteredChannel.fire(k)
                })
            } else {
                this.active_channels = {}
                this.EvtExitedChannel.fire("")
            }
        })
        this.signaling_socket.on('disconnect', () => {
            console.log("Disconnected from signaling server");
            /* Tear down all of our peer connections and remove all the
            * media divs when we disconnect */
            this.removePeers()
            this.EvtDisconnected.fire(true)
        });
        /** 
        * When we join a group, our signaling server will send out 'addPeer' events to each pair
        * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
        * in the channel you will connect directly to the other 5, so there will be a total of 15 
        * connections in the network). 
        */
        this.signaling_socket.on('addPeer', (config) => {
            console.log('Signaling server said to add peer:', config);
            let peer_id = config.peer_id;
            if (peer_id in this.peers) {
                /* This could happen if the user joins multiple channels where the other peer is also in. */
                console.log("Already connected to peer ", peer_id);
                return;
            }
            let rtcPc = RTCPeerConnection as any;
            let peer_connection:RTCPeerConnection = new rtcPc(
                {"iceServers": ICE_SERVERS},
                {"optional": [
                    {"DtlsSrtpKeyAgreement": true}
                ]} /* this will no longer be needed by chrome
                    * eventually (supposedly), but is necessary 
                    * for now to get firefox to talk to chrome */
            );
            this.peers.set(peer_id, {
                id: peer_id,
                name: config.name,
                connection: peer_connection,
                element: null
            });
            console.log(config.active_channels)
                
            peer_connection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.signaling_socket.emit('relayICECandidate', {
                        'peer_id': peer_id, 
                        'ice_candidate': {
                            'sdpMLineIndex': event.candidate.sdpMLineIndex,
                            'candidate': event.candidate.candidate
                        }
                    });
                }
            }
            peer_connection.ontrack = (event) => {
                console.log("ontrack", event);
                let remote_media = event.track.kind == "video" ? $("<video style='display:block'>") : $("<audio style='display:block'>");
                let mediaEl = (remote_media[0] as HTMLAudioElement)
                if (this.MUTE_AUDIO_BY_DEFAULT || event.track.kind == "video") {
                    mediaEl.muted = true;
                }
                mediaEl.controls = false;
                mediaEl.autoplay = true;
                this.addPeerMedia(peer_id, mediaEl);
                this.attachMediaStream(mediaEl, event.streams[0]);
            }

            /* Add our local stream */
            (peer_connection as any).addStream(this.local_media_stream);

            /* Only one side of the peer connection should create the
            * offer, the signaling server picks one to be the offerer. 
            * The other user will get a 'sessionDescription' event and will
            * create an offer, then send back an answer 'sessionDescription' to us
            */
            if (config.should_create_offer) {
                console.log("Creating RTC offer to ", peer_id);
                peer_connection.createOffer(
                    (local_description) => { 
                        console.log("Local offer description is: ", local_description);
                        peer_connection.setLocalDescription(local_description,
                            () => { 
                                this.signaling_socket.emit('relaySessionDescription', 
                                    {'peer_id': peer_id, 'session_description': local_description});
                                console.log("Offer setLocalDescription succeeded"); 
                            },
                            () => { console.log("Offer setLocalDescription failed!"); }
                        );
                    },
                    (error) => {
                        console.log("Error sending offer: ", error);
                    });
            }

            this.EvtPeersCame.fire(config.name)
        });

        /** 
         * Peers exchange session descriptions which contains information
         * about their audio / video settings and that sort of stuff. First
         * the 'offerer' sends a description to the 'answerer' (with type
         * "offer"), then the answerer sends one back (with type "answer").  
         */
        this.signaling_socket.on('sessionDescription', (config) => {
            console.log('Remote description received: ', config);
            let peer_id = config.peer_id;
            if (!this.peers.get(peer_id)) return
            let peer = this.peers.get(peer_id).connection;
            let remote_description = config.session_description;
            console.log(config.session_description);

            let desc = new RTCSessionDescription(remote_description);
            peer.setRemoteDescription(desc, 
                () => {
                    console.log("setRemoteDescription succeeded");
                    if (remote_description.type == "offer") {
                        console.log("Creating answer");
                        peer.createAnswer(
                            (local_description) => {
                                console.log("Answer description is: ", local_description);
                                peer.setLocalDescription(local_description,
                                    () => { 
                                        this.signaling_socket.emit('relaySessionDescription', 
                                            {'peer_id': peer_id, 'session_description': local_description});
                                        console.log("Answer setLocalDescription succeeded");
                                    },
                                    () => { console.log("Answer setLocalDescription failed!"); }
                                );
                            },
                            (error) => {
                                console.log("Error creating answer: ", error);
                                console.log(peer);
                            });
                    }
                },
                (error) => {
                    console.log("setRemoteDescription error: ", error);
                }
            );
            console.log("Description Object: ", desc);
        });
        /**
         * The offerer will send a number of ICE Candidate blobs to the answerer so they 
         * can begin trying to find the best path to one another on the net.
         */
        this.signaling_socket.on('iceCandidate', (config) => {
            if (!this.peers.get(config.peer_id)) return
            let peer = this.peers.get(config.peer_id).connection;
            let ice_candidate = config.ice_candidate;
            peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
        });


        /**
         * When a user leaves a channel (or is disconnected from the
         * signaling server) everyone will recieve a 'removePeer' message
         * telling them to trash the media channels they have open for those
         * that peer. If it was this client that left a channel, they'll also
         * receive the removePeers. If this client was disconnected, they
         * wont receive removePeers, but rather the
         * signaling_socket.on('disconnect') code will kick in and tear down
         * all the peer sessions.
         */
        this.signaling_socket.on('removePeer', (config) => {
            console.log('Signaling server said to remove peer:', config);
            let peer_id = config.peer_id;
            let name = this.peers.get(peer_id)?.name
            this.removePeer(peer_id)
            this.EvtPeersLeft.fire(name)
            this.notifyPeers();
        });
    }

    public getPeerMuted(peer:string) {
        let p = this.peers.get(peer)
        return p.element?.muted || false
    }
    public hasPeer(peer:string) {
        return this.peers.has(peer)
    }
    public getPeerVolume(peer:string) {
        let p = this.peers.get(peer)
        return p.element?.volume || 0
    }
    public setPeerMuted(peer:string, muted?:boolean) {
        let p = this.peers.get(peer)
        return p.element.muted = muted == undefined ? !p.element.muted : muted
    }

    public setPeerVolume(peer:string, vol:number) {
        let p = this.peers.get(peer)

        let nv = vol
        if (nv<0) {
            nv = 0
        } else if (nv > 1) {
            nv = 1
        }
        p.element.volume = nv
        p.element.muted = nv > 0 ? false : true

    }
    private addPeerMedia(peer_id: any, mediaEl: HTMLAudioElement) {
        this.peers.get(peer_id).element = mediaEl;
        if (!this.audioEnabled) {
            mediaEl.muted = true
        }
        this.container.append(mediaEl)
        this.notifyPeers();
    }

    private notifyPeers() {
        this.EvtPeersChanged.fire([...this.peers.keys()].map(p => this.peers.get(p).name));
    }

    togglePeerVideo(peer_id:string, val:boolean) {
        const localVideo = this.peers.get(peer_id).element;
        if (!localVideo) return
        const stream:MediaStream = localVideo.srcObject as any;
        if (!stream) return
        const tracks = stream.getVideoTracks();
      
        tracks.forEach(track => {
          track.enabled = val;
        });
      }
    
    isPeerAudioEnabled(peer_id:string) {
        const localVideo = this.peers.get(peer_id).element;
        if (!localVideo) return false
        const stream:MediaStream = localVideo.srcObject as any;
        if (!stream) return false
        const audioTracks = stream.getAudioTracks();

        let ret = true
        audioTracks.forEach(track => {
            ret &&= track.enabled;
        });
        return ret;
    }
    togglePeerAudio(peer_id:string, val:boolean) {
        const localVideo = this.peers.get(peer_id).element;
        if (!localVideo) return
        const stream:MediaStream = localVideo.srcObject as any;
        if (!stream) return
        const audioTracks = stream.getAudioTracks();
        
        audioTracks.forEach(track => {
            track.enabled = val;
        });
    }

    identify(name:string) {
        this.signaling_socket.emit('identify', {"name": name});
        this.signaling_socket.emit('locate', null);
    }

    join_chat_channel(channel:string, userdata:{ [k:string]:string}) {
        if (!this.signaling_socket) {
            return;
        }
        this.signaling_socket.emit('join', {"channel": channel, "userdata": userdata});
    }

    part_chat_channel(channel:string) {
        this.signaling_socket.emit('part', channel);
    }

    async setup_local_media(name:string) {
        if (this.local_media_stream != null) {  /* ie, if we've already been initialized */
            return; 
        }
        /* Ask user for permission to use the computers microphone and/or camera, 
         * attach it to an <audio> or <video> tag if they give us access. */
        console.log("Requesting access to local audio / video inputs");
    
        let userStream:MediaStream

        try {
            userStream = await navigator.mediaDevices.getUserMedia({"audio":this.USE_AUDIO, "video":this.USE_VIDEO});
            this.mediaAllowed = true
        } catch {
            console.log("Access denied for audio/video");
            this.mediaAllowed = false
            this.Disconnect()
        }
        
        if (userStream) {
            console.log("Access granted to audio/video");
            this.local_media_stream = userStream;
            let local_media = this.USE_VIDEO ? $("<video style='display:block'>") : $("<audio style='display:block'>");
            let mediaEl = (local_media[0] as HTMLAudioElement)
                
            mediaEl.autoplay = true;
            mediaEl.muted = true; /* always mute ourselves by default */
            mediaEl.controls = false;
            this.addLocalMedia(mediaEl)
            this.attachMediaStream(mediaEl, userStream);
        }
    }
    addLocalMedia(mediaEl: HTMLAudioElement) {
        this.container.append(mediaEl)
    }
    
}