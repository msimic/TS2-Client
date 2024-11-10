import { Stream } from 'stream';
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
    audioEnabled: boolean;
    videoEnabled: boolean;
    muted: boolean;
    volume: number;
    connection:RTCPeerConnection,
    streamsByType: Map<"audio/video"|"screenshare", WebRTCStream>,
}

export interface UserData{
    name: string;
    muted: boolean;
}

export interface ChannelData {
    name: string;
    users: UserData[]
}

export interface WebRTCTrack {
    type: "audio" | "video";
    track: MediaStreamTrack;
    mediaPlayer: HTMLMediaElement;
}

export interface WebRTCStream {
    type: "audio/video" | "screenshare";
    stream: MediaStream;
    tracksByType: Map<"audio" | "video", WebRTCTrack[]>;
    audioSourceNode: MediaStreamAudioSourceNode;
}

export interface LocalMedia {
    streamsByType: Map<"audio/video"|"screenshare", WebRTCStream>,
    mediaAllowed: boolean
}

export type ActiveChannels = {
    [key: string]: number;
};

export class WebRTC {
    audioContext = new (window.AudioContext)();
    audioAnalyser = this.audioContext.createAnalyser();
    defaultChannel = channels[0];
    globalMutePeers = false;
    voiceActivityThreshold = 30

    signaling_socket:ioc.Socket = null;   /* our socket.io connection to our webserver */
    private localMedia: LocalMedia = {
        streamsByType: new Map<"audio/video"|"screenshare", WebRTCStream>,
        mediaAllowed: false
    }
    peers = new Map<string, PeerData>();                /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */
    active_channels:ActiveChannels = { };
    public userName:string = null;
    autojoin: boolean = false;
    microphoneEnabled = false
    webcamEnabled = false
    lastChannel: string = null;
    connectionError: boolean = false

    public EvtVoiceActivity = new EventHook<string>();
    public EvtAuthenticated = new EventHook<string>();
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

    constructor(private host:string, private port:number, private peerContainer:HTMLElement, private localContainer:HTMLElement) {
        this.audioAnalyser.fftSize = 32
    }

    Join(channel?:string) {
        channel = channel || this.lastChannel || this.defaultChannel
        if ((channels.indexOf(channel)<0) || !this.userName || !this.signaling_socket) return
        this.lastChannel = channel
        this.join_chat_channel(channel, {})
    }

    IsMicEnabled() {
        const ls = this.localMedia.streamsByType.get("audio/video")
        if (!ls || !this.microphoneEnabled) return false
        
        return true
    }
    ToggleMicrophone(val:boolean) {
        const stream:MediaStream = this.localMedia.streamsByType.get("audio/video")?.stream
        if (!stream) return
        const audioTracks = stream.getAudioTracks();
        this.microphoneEnabled = val
        audioTracks.forEach(track => {
            track.enabled = val;
        });
        this.EvtMicChanged.fire(val)
    }

    ToggleAudio(val:boolean) {
        this.globalMutePeers = !val
        let ks = [...this.peers.keys()]
        for (const k of ks) {
            this.togglePeerAudio(k, val)
        }
        this.EvtAudioChanged.fire(val)
    }

    IsAudioEnabled() {
        return !this.globalMutePeers
    }

    IsVideoEnabled() {
        return this.webcamEnabled
    }

    ToggleVideo(val:boolean) {
        this.webcamEnabled = val
        let ks = [...this.peers.keys()]
        for (const k of ks) {
            this.togglePeerVideo(k, val)
        }
    }

    Leave() {
        if (!this.userName || !this.signaling_socket) return
        Object.keys(this.active_channels).forEach(k => {
            this.part_chat_channel(k)
            delete this.active_channels[k]
        })
        this.Disconnect()
    }

    Connect() {
        this.init()
    }

    getChannels():string[] {
        return channels
    }

    async isMicAllowed(noprompt:boolean) {
        let ok = false

        if (!navigator.mediaDevices.getSupportedConstraints ||
            !navigator.mediaDevices.getSupportedConstraints() ||
            !navigator.permissions) {
            return false;
        }

        let pm = await navigator.permissions.query({
            name: "microphone" as any
        })
        ok = pm.state == "granted"
        if (ok && !noprompt) try {
            await this.tryGetMicrophone()
        } catch {
            ok = false
        }

        return ok
    }

    async isCameraAllowed(noprompt:boolean) {
        let ok = false

        if (!navigator.mediaDevices.getSupportedConstraints ||
            !navigator.mediaDevices.getSupportedConstraints() ||
            !navigator.permissions) {
            return false;
        }

        let pm = await navigator.permissions.query({
            name: "camera" as any
        })
        ok = pm.state == "granted"
        if (ok && !noprompt) try {
            await this.tryGetWebcam()    
        } catch {
            ok = false
        }

        return ok
    }

    isConnected() {
        return !!(this.signaling_socket &&
               this.signaling_socket.connected &&
               this.localMedia.mediaAllowed &&
               this.localMedia.streamsByType.size)
    }

    getChannelData(channel:string) {
        if (!this.signaling_socket) {
            return
        }
        this.signaling_socket.emit("getchanneldata", channel)
    }

    removePeerTrack(peer:PeerData, stream: WebRTCStream, track: WebRTCTrack) {
        const tracks = stream.tracksByType.get(track.type)
        if (!tracks) return
        const ti = tracks.indexOf(track)
        if (ti < 0) return
        tracks.splice(ti)
        track.mediaPlayer.remove()
        stream.stream.removeTrack(track.track)
        if (!tracks.length) {
            stream.audioSourceNode = null
            peer.streamsByType.delete(stream.type)
        }
        if (!stream.tracksByType.has("audio")) {
            stream.audioSourceNode = null
        }
    }

    removePeer(peer_id:string) {
        const peer = this.peers.get(peer_id)
        if (!peer) return

        for (const st of [...peer.streamsByType.values()]) {
            st.audioSourceNode = null
            for (const tracks of [...st.tracksByType.values()] || []) {
                for (const track of tracks) {
                    this.removePeerTrack(peer, st, track)
                }
            }
        }
        
        this.peers.get(peer_id)?.connection?.close();
        this.peers.delete(peer_id)
    }

    removePeers() {
        for (const p1 of [...this.peers.keys()]) {
            this.removePeer(p1)
        }
        this.peers.clear();  
        this.peerContainer.replaceChildren()           
    }

    clearLocalStreams() {
        for (const ls of this.localMedia.streamsByType.values()) {
            for (const lt of ls.tracksByType.values()) {
                lt.forEach(l => {
                    l.track.stop()
                    l.mediaPlayer.remove()
                })
            }
        }
        this.localMedia.streamsByType.clear(); 
    }
    Disconnect() {
        this.clearLocalStreams()
        this.active_channels = {};
        this.removePeers()
        if (!this.signaling_socket) return
        const socket = this.signaling_socket
        this.signaling_socket = null;
        socket.offAny()
        socket.disconnect()
        this.EvtDisconnected.fire(true)
    }

    didConnectionFail() {
        return this.connectionError
    }
    didAllowMedia() {
        return this.localMedia.mediaAllowed
    }
    checkAutentication() {
        this.EvtAuthenticated.fire(this.userName)
        return !!this.userName
    }

    setUsername(name:string) {
        if (name) {
            this.userName = name
            this.EvtAuthenticated.fire(name)
        } else {
            this.Leave()
            this.userName = null
            this.EvtAuthenticated.fire(null)
        }
    }

    async tryGetMicrophone() {
        let ret:MediaStream;
        try {
            ret = await navigator.mediaDevices.getUserMedia({"audio":true, "video":false});
        } catch {
            return false
        }
        if (ret) {
            ret.getAudioTracks().forEach(t => {
                t.stop()
                ret.removeTrack(t) 
            })
            ret.getVideoTracks().forEach(t => {
                t.stop()
                ret.removeTrack(t) 
            })
            ret.getTracks().forEach(t => {
                t.stop()
                ret.removeTrack(t) 
            })
        }
        return ret
    }

    async tryGetWebcam() {
        let ret:MediaStream;
        try {
            ret = await navigator.mediaDevices.getUserMedia({"audio":false, "video":true});
        } catch {
            return false
        }
        if (ret) {
            ret.getAudioTracks().forEach(t => {
                t.stop()
                ret.removeTrack(t) 
            })
            ret.getVideoTracks().forEach(t => {
                t.stop()
                ret.removeTrack(t) 
            })
            ret.getTracks().forEach(t => {
                t.stop()
                ret.removeTrack(t) 
            })
        }
        return ret
    }

    init() {
        if (this.signaling_socket && this.signaling_socket.connected) {
            return
        }
        this.connectionError = false
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

        this.signaling_socket.on('connect_error', (err) => {
            this.connectionError = true
            this.Disconnect()
             console.error('Initial connection failed:', err.message);
        });

        this.signaling_socket.on("channelchange", (channel:string) => {
            this.EvtChannelChange.fire(channel)
        })

        this.signaling_socket.on("channeldata", (cd:ChannelData) => {
            this.EvtNewChannelData.fire(cd)
        })

        this.signaling_socket.on("identified", async (data) => {
            /* once the user has given us access to their
            * microphone/camcorder, join the channel and start peering up */
            if (this.localMedia.mediaAllowed && this.autojoin)
                this.Join();
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
            this.Disconnect()
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
                volume: 1,
                audioEnabled: true,
                videoEnabled: false,
                muted: this.globalMutePeers,
                streamsByType: new Map<"audio/video"|"screenshare", WebRTCStream>()
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
                
                this.addPeerTrack(peer_id, event.streams[0], event.track)
                
            }


            /* Add our local stream */            
            for (const ls of this.localMedia.streamsByType.values()) {
                for (const lt of ls.tracksByType.values()) {
                    lt.forEach(l => peer_connection.addTrack(l.track, ls.stream));
                }
            }

            /* Only one side of the peer connection should create the
            * offer, the signaling server picks one to be the offerer. 
            * The other user will get a 'sessionDescription' event and will
            * create an offer, then send back an answer 'sessionDescription' to us
            */
            if (config.should_create_offer) {
                console.log("Creating RTC offer to ", peer_id);
                peer_connection.createOffer().then(
                    (local_description) => { 
                        console.log("Local offer description is: ", local_description);
                        peer_connection.setLocalDescription(local_description).then(
                            () => { 
                                this.signaling_socket.emit('relaySessionDescription', 
                                    {'peer_id': peer_id, 'session_description': local_description});
                                console.log("Offer setLocalDescription succeeded"); 
                            }).catch(
                            () => { console.log("Offer setLocalDescription failed!"); }
                        );
                    }).catch(
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
            peer.setRemoteDescription(desc) 
                .then(() => {
                    console.log("setRemoteDescription succeeded");
                    if (remote_description.type == "offer") {
                        console.log("Creating answer");
                        peer.createAnswer().then(
                            (local_description) => {
                                console.log("Answer description is: ", local_description);
                                peer.setLocalDescription(local_description).then(
                                    () => { 
                                        this.signaling_socket.emit('relaySessionDescription', 
                                            {'peer_id': peer_id, 'session_description': local_description});
                                        console.log("Answer setLocalDescription succeeded");
                                    }).catch(
                                    () => { console.log("Answer setLocalDescription failed!"); }
                                )
                            }).catch(
                            (error) => {
                                console.log("Error creating answer: ", error);
                                console.log(peer);
                            })
                    }
                }).catch(
                (error) => {
                    console.log("setRemoteDescription error: ", error);
                })
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
            if (!ice_candidate) {
                console.log("Run out of ice candidates")
            } else {
                peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
            }
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

    public addLocalTrack(streamType: "audio/video"|"screenshare",
                         trackType: "audio" | "video",
                         track: MediaStreamTrack,
                         element: HTMLMediaElement) {
        
        let localStream = this.localMedia.streamsByType.get(streamType)
        if (!localStream) return

        let localTracks = localStream.tracksByType.get(trackType);
        if (!localTracks) {
            localTracks = []
            localStream.tracksByType.set(trackType, localTracks)
        }
        
        localTracks.push({
            mediaPlayer: element,
            type: trackType,
            track: track
        })

        localStream.stream.addTrack(track);

        for (const pc of this.peers.values()) {
            if (!pc.connection) continue;
            if (pc.connection.addTrack) {
                pc.connection.addTrack(track, localStream.stream);
              } else {
                // If you have code listening for negotiationneeded events:
                setTimeout(() => pc.connection.dispatchEvent(new Event("negotiationneeded")));
              }
        }
    }

    removeLocalTrack(streamType:"audio/video"|"screenshare",
                     trackType: "audio" | "video",
                     track:MediaStreamTrack) {
        
        let localStream = this.localMedia.streamsByType.get(streamType)
        if (!localStream) return

        let localTracks = localStream.tracksByType.get(trackType);
        if (!localTracks || localTracks.length == 0) {
            return // doesnt exist
        }

        const ti = localTracks.findIndex(t => t.track == track)
        if (ti < 0) return

        localTracks.splice(ti, 1)
        localTracks.forEach(l => {
            l.mediaPlayer.remove()
        })
        
        if (!localTracks.length) {
            localStream.tracksByType.delete(trackType)
        }

        if (!localStream.tracksByType.has("audio")) {
            localStream.audioSourceNode = null
        }

        localStream.stream.removeTrack(track);
        if (localStream.tracksByType.size == 0) {
            localStream.audioSourceNode = null
            this.localMedia.streamsByType.delete(streamType)
        }

        for (const pc of this.peers.values()) {
            if (!pc.connection) continue;
            if (pc.connection.removeTrack) {
                pc.connection.removeTrack(pc.connection.getSenders().find((sender) => sender.track === track));
            } else {
                // If you have code listening for negotiationneeded events:
                setTimeout(() => pc.connection.dispatchEvent(new Event("negotiationneeded")));
            }
        }
    }

    public getPeerMuted(peer:string) {
        let p = this.peers.get(peer)
        return p.muted || false
    }
    public hasPeer(peer:string) {
        return this.peers.has(peer)
    }
    public getPeerVolume(peer:string) {
        let p = this.peers.get(peer)
        return p.volume || 0
    }
    public setPeerMuted(peer:string, muted?:boolean) {
        let p = this.peers.get(peer)
        p.muted = muted ?? !p.muted

        const ps = p.streamsByType.get("audio/video")
        if (!ps) return

        const as = ps.tracksByType.get("audio")
        if (!as) return
        as.forEach(at => {
            at.mediaPlayer.muted = p.muted
            at.mediaPlayer.volume = p.muted ? 0 : p.volume
        })
    }

    public setPeerVolume(peer:string, vol:number) {
        let p = this.peers.get(peer)

        let nv = vol
        if (nv<0) {
            nv = 0
        } else if (nv > 1) {
            nv = 1
        }
        p.volume = nv
        p.muted = nv > 0 ? false : true
        
        const ps = p.streamsByType.get("audio/video")
        if (!ps) return

        const as = ps.tracksByType.get("audio")
        if (!as) return
        as.forEach(at => {
            at.mediaPlayer.volume = nv
            at.mediaPlayer.muted = p.muted
        })
    }

    createPeerMediaPlayer(str:WebRTCStream, tr:WebRTCTrack) {
        let mediaEl:HTMLMediaElement = tr.track.kind == "video" ?
             document.createElement("video") :
             document.createElement("audio");

        if (this.globalMutePeers) {
            mediaEl.muted = true;
        }
        mediaEl.controls = false;
        mediaEl.autoplay = true;
        tr.mediaPlayer = mediaEl
        tr.mediaPlayer.srcObject = str.stream;
        this.peerContainer.append(tr.mediaPlayer)
    }

    deduceTrackStreamType(track: MediaStreamTrack):"audio/video"|"screenshare" {
        if (track.kind == "audio") return "audio/video"
        if (track.label?.match(/screen/))
            return "screenshare"
        return "audio/video"
    }

    private addPeerTrack(peerId: string, stream: MediaStream, track: MediaStreamTrack) {
        const streamType = this.deduceTrackStreamType(track)
        const peer = this.peers.get(peerId)
        if (!peer) return
        let str = peer.streamsByType.get(streamType)
        let peerTracks:WebRTCTrack[] = []
        if (!str) {
            str = {
                tracksByType: new Map<"audio"|"video", WebRTCTrack[]>(),
                type: streamType,
                stream: stream,
                audioSourceNode: null
            }
            peer.streamsByType.set(streamType, str)
        }
        let trackType:"audio"|"video" = track.kind == "audio" ? "audio" : "video"
        
        let rtcTrack:WebRTCTrack = {
            type: trackType,
            track: track,
            mediaPlayer: null
        }

        this.createPeerMediaPlayer(str, rtcTrack);
        peerTracks.push(rtcTrack)

        if (trackType == "audio") {
            
            this.setupAudioAnalyzer(str, peerId);
            peer.muted = !this.IsAudioEnabled()
            peer.volume = 1
            rtcTrack.mediaPlayer.muted = peer.muted
            rtcTrack.mediaPlayer.volume = peer.volume
        } else {
            peer.videoEnabled = this.IsVideoEnabled()
            rtcTrack.track.enabled = peer.videoEnabled
        }

        str.tracksByType.set(trackType, peerTracks)

        stream.onremovetrack = ({track}) => {
            this.removePeerTrack(peer, str, rtcTrack)
        };

        this.notifyPeers();
    }

    private notifyPeers() {
        this.EvtPeersChanged.fire([...this.peers.keys()].map(p => this.peers.get(p).name));
    }

    togglePeerVideo(peer_id:string, val:boolean) {
        const peer = this.peers.get(peer_id)
        if (!peer) return

        const avStream = peer.streamsByType.get("audio/video")

        if (!avStream) return
        peer.videoEnabled = val
        const videoTracks = avStream.tracksByType.get("video") || []
        for (const track of videoTracks) {
            track.track.enabled = val
        }
    }
    
    isPeerAudioEnabled(peer_id:string) {
        const peer = this.peers.get(peer_id);
        if (!peer) return false
        return peer.audioEnabled
    }
    togglePeerAudio(peer_id:string, val:boolean) {
        const peer = this.peers.get(peer_id);
        if (!peer) return
        const str = peer.streamsByType.get("audio/video")
        if (!str) return
        const tracks = str.tracksByType.get("audio")
        if (!tracks || !tracks.length) return
        peer.audioEnabled = val
        tracks.forEach(t => {
            t.track.enabled = val
        })
    }

    identify(name:string) {
        if (!this.signaling_socket) return;
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
        if (this.localMedia.streamsByType.size) {  /* ie, if we've already been initialized */
            return; 
        }
        /* Ask user for permission to use the computers microphone and/or camera, 
         * attach it to an <audio> or <video> tag if they give us access. */
        console.log("Requesting access to local audio / video inputs");
    
        let userStream:MediaStream

        userStream = await this.getLocalMicrophoneStream();
        
        if (userStream) {
            console.log("Access granted to audio/video");
            this.addLocalStream("audio/video", userStream);
        }
    }

    private async getLocalMicrophoneStream() {
        let userStream: MediaStream;
        try {
            let audioConstraint:MediaTrackConstraints|boolean = (this.microphoneEnabled = true)
            const sc = navigator.mediaDevices.getSupportedConstraints()
            if (sc && audioConstraint) {
                audioConstraint = {}
                if (sc.echoCancellation) {
                    audioConstraint.echoCancellation = true
                }
                if (sc.noiseSuppression) {
                    audioConstraint.noiseSuppression = true
                }
                if (sc.autoGainControl) {
                    audioConstraint.autoGainControl = true
                }
            }
            userStream = await navigator.mediaDevices.getUserMedia(
                { "audio": audioConstraint, "video": this.webcamEnabled }
            );
            this.localMedia.mediaAllowed = true;
        } catch (err) {
            console.log("Access denied for audio/video");
            this.microphoneEnabled = false;
            this.localMedia.mediaAllowed = false;
            this.Disconnect();
        }
        return userStream;
    }

    signalVoiceActivity(peer_id:string) {

    }

    addLocalStream(type:"audio/video"|"screenshare", stream:MediaStream) {
        
        let videoTracks = stream.getVideoTracks()
        let audioTracks = stream.getVideoTracks()

        const localStream: WebRTCStream = {
            stream: stream,
            type: type,
            tracksByType: new Map<"audio"|"video", WebRTCTrack[]>(),
            audioSourceNode: null
        }

        this.setupAudioAnalyzer(localStream, null);

        this.localMedia.streamsByType.set(type, localStream)

        let tracks = [...videoTracks, ...audioTracks]
        if (!tracks.length) {
            tracks = stream.getTracks()
        }

        for (const tr of tracks) {
            const trackType = tr.kind == "audio" ? "audio" : "video";
            let localTracks = localStream.tracksByType.get(trackType)
            if (!localTracks || !localTracks.length) {
                localTracks = []
                localStream.tracksByType.set(trackType, localTracks)
            }
            let mediaElement = tr.kind == "video" ? document.createElement("video") : document.createElement("audio")
            mediaElement.autoplay = true;
            mediaElement.muted = true; /* always mute ourselves by default */
            mediaElement.controls = false;
            mediaElement.srcObject = stream
            localTracks.push({
                mediaPlayer: mediaElement,
                track: tr,
                type: trackType
            })
            this.localContainer.append(mediaElement)
        }

    }
    

    private setupAudioAnalyzer(rtcStream: WebRTCStream, peerId: string) {
        
        if (rtcStream.audioSourceNode) return;

        const source = this.audioContext.createMediaStreamSource(rtcStream.stream);
        source.connect(this.audioAnalyser);
        rtcStream.audioSourceNode = source;

        const bufferLength = 1;
        const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
        const circularBuffer = new Array(bufferLength).fill(new Uint8Array(this.audioAnalyser.frequencyBinCount));
        let bufferIndex = 0;

        const detectVoiceActivity = () => {
            if (!rtcStream.audioSourceNode) {
                source.disconnect()
                return;
            }
            this.audioAnalyser.getByteFrequencyData(dataArray);
            circularBuffer[bufferIndex] = new Uint8Array(dataArray);
            bufferIndex = (bufferIndex + 1) % bufferLength;

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                for (let j = 0; j < dataArray.length; j++) {
                    sum += circularBuffer[i][j];
                }
            }
            const average = sum / (bufferLength * dataArray.length);

            if (average > this.voiceActivityThreshold) { // Adjust the threshold as needed
                if ((peerId && !this.peers.get(peerId)?.muted) ||
                     this.IsMicEnabled()) {
                    console.log("Voice activity "+peerId);
                    this.EvtVoiceActivity.fire(peerId);
                }
            }

            console.log((peerId ?? "local") + ": " + average);

            setTimeout(detectVoiceActivity, 150);
        };

        detectVoiceActivity();
    }
}