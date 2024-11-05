import { EventHook } from "./event";

import * as ioc from "socket.io-client";
import { Mxp } from "./mxp";
import { OutputManager } from "../App/outputManager";
import { IoEvent } from "../../../../common/src/ts/ioevent";
import { TelnetClient } from "./telnetClient";
import { utf8decode, utf8encode } from "./util";
import { UserConfig } from "../App/userConfig";
import * as apiUtil from "./apiUtil";


export class Socket {
    public EvtServerEcho = new EventHook<boolean>();
    public EvtTelnetTryConnect = new EventHook<[string, number]>();
    public EvtTelnetConnect = new EventHook<[string, number]>();
    public EvtTelnetDisconnect = new EventHook<void>();
    public EvtTelnetError = new EventHook<string>();
    public EvtWsError = new EventHook<any>();
    public EvtWsConnect = new EventHook<{sid: string}>();
    public EvtWsDisconnect = new EventHook<void>();
    public EvtSetClientIp = new EventHook<string>();

    private ioConn: ioc.Socket;
    private ioEvt: IoEvent;
    private telnetClient: TelnetClient;
    private clientIp: string;
    socketConnected: boolean;

    public isTelnetConnected() {
        return this.telnetClient != null;
    }

    public mxpActive(): boolean {
        return this.telnetClient && this.telnetClient.mxp;
    }

    constructor(private outputManager: OutputManager, private mxp: Mxp, private config:UserConfig) {
        this.outputManager.setSocket(this);
    }

    public async open() {
        let res;
        try {
            res = await apiUtil.apiGetClientConfig();
        } catch (err) {
            this.EvtWsError.fire(err);
            return false;
        }
        let url:URL;
        let protocol = location.protocol;
        let host = res.data.socket_io_host;
        let port = location.port;
        try {
            // check if res.data.socket_io_host is a full url specification and if yes use that
            url = new URL(res.data.socket_io_host);
            if (url.protocol) {
                protocol = url.protocol;
            }
            if (url.hostname) {
                host = url.hostname;
            }
            if (url.port) {
                port = url.port;
            }
        } catch (error) {
            // assume we have host and porta separately
            host = res.data.socket_io_host;
            port = res.data.socket_io_port;
        }
        let ioUrl = protocol + "//" +
            (host) +
            ":" +
            (port) +
            "/telnet";
        console.log("Connecting to telnet proxy server at", ioUrl);
        this.ioConn = ioc.io(ioUrl);

        this.ioConn.on("connect", () => {
            this.EvtWsConnect.fire({sid: this.ioConn.id});
            this.socketConnected = true;
        });

        this.ioConn.on("disconnect", (rsn:any) => {
            this.EvtWsDisconnect.fire(null);
            this.socketConnected = false;
        });

        this.ioConn.on("error", (msg: any) => {
            this.EvtWsError.fire(msg);
            this.socketConnected = false;
        });

        this.ioConn.on("connect_error", (msg: any) => {
            this.EvtWsError.fire(msg);
            this.socketConnected = false;
        });

        this.ioEvt = new IoEvent(this.ioConn);

        this.ioEvt.srvTelnetOpened.handle((val: [string, number]) => {
            this.telnetClient = new TelnetClient((data) => {
                this.ioEvt.clReqTelnetWrite.fire(data);
            }, this.config);
            this.telnetClient.clientIp = this.clientIp;

            this.telnetClient.EvtData.handle((data) => {
                // this.handleTelnetData(data);
                this.outputManager.handleTelnetData(data, true);
            });

            this.telnetClient.EvtServerEcho.handle((data) => {
                this.EvtServerEcho.fire(data);
            });

            this.EvtTelnetConnect.fire(val);
        });

        this.ioEvt.srvTelnetClosed.handle(() => {
            this.telnetClient = null;
            this.EvtTelnetDisconnect.fire(null);
        });

        this.ioEvt.srvTelnetError.handle((data) => {
            this.EvtTelnetError.fire(data);
        });

        this.ioEvt.srvTelnetData.handle((data) => {
            if (this.telnetClient) {
                this.telnetClient.handleData(data);
            }
        });

        this.ioEvt.srvSetClientIp.handle((ipAddr: string) => {
            let re = /::ffff:(\d+\.\d+\.\d+\.\d+)/;
            let match = re.exec(ipAddr);
            if (match) {
                ipAddr = match[1];
            }

            this.clientIp = ipAddr;
            if (this.telnetClient) {
                this.telnetClient.clientIp = ipAddr;
            }
            this.EvtSetClientIp.fire(this.clientIp);
        });

        return true;
    }

    public async openTelnet(host: string, port: number) {
        if (this.telnetClient) await this.closeTelnet();
        if (this.socketConnected) {
            this.EvtTelnetTryConnect.fire([host, port]);
            this.ioEvt.clReqTelnetOpen.fire([host, port]);
        } else {
            this.EvtTelnetError.fire("Il WebSocket deve essere connesso.");
        }
    }

    public async closeTelnet() {
        let resolve:Function = null;
        const p = new Promise(r => {
            resolve = r;
        });

        this.ioEvt.clReqTelnetClose.fire(null);
        let cnt = 0;
        let interval = setInterval(() => {
            if (this.telnetClient && ++cnt<5) {
                return;
            }
            this.telnetClient = null;
            clearInterval(interval);
            resolve();
        }, 100);
        return p;
    }

    sendCmd(cmd: string) {
        cmd += "\r\n";
        let arr: Uint8Array;
        if (this.config.get("utf8Enabled") === true) {
            arr = utf8encode(cmd);
        } else {
            arr = new Uint8Array(cmd.length);
            for (let i = 0; i < cmd.length; i++) {
                arr[i] = cmd.charCodeAt(i);
            }
        }

        this.ioEvt.clReqTelnetWrite.fire(arr.buffer);
    }
}
