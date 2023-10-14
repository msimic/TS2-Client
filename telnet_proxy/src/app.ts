import * as http from "http";
import * as https from "https";
import * as socketio from "socket.io";
import * as net from "net";
import * as readline from "readline";
import axios, { AxiosInstance } from "axios";
import * as express from "express";
import * as fs from "fs";
import path = require("path");
import * as yargs from "yargs";
import { IoEvent } from "../../common/src/ts/ioevent";

const argv = yargs
    .option('config', {
        alias: 'c',
        description: 'Use a configuration file',
        type: 'string',
        requiresArg: true,
        config: true
    })
    .option('mudLibPath', {
        alias: 'l',
        description: 'Pass in the absolute path to the mud lib folder',
        type: 'string',
        requiresArg: true
    })
    .option('serverHost', {
        alias: 'h',
        description: 'Pass in a server Host',
        type: 'string',
        requiresArg: true
    })
    .option('serverPort', {
        alias: 'p',
        description: 'Pass in a server Port',
        type: 'number',
        requiresArg: true
    })
    .option('adminHost', {
        alias: 'ah',
        description: 'Pass in an admin Host',
        type: 'string',
        requiresArg: true
    })
    .option('adminPort', {
        alias: 'ap',
        description: 'Pass in a an admin Port',
        type: 'number',
        requiresArg: true
    })
    .option('adminWebHost', {
        alias: 'awh',
        description: 'Pass in an admin Web Host',
        type: 'string',
        requiresArg: true
    })
    .option('adminWebPort', {
        alias: 'awp',
        description: 'Pass in a an admin Web Port',
        type: 'number',
        requiresArg: true
    })
    .option('apiBaseUrl', {
        alias: 'api',
        description: 'Pass in an API base url',
        type: 'string',
        requiresArg: true,
    })
    .option('apiKey', {
        alias: 'apikey',
        description: 'Pass in an API key',
        type: 'string',
        requiresArg: true
    })
    .option('fixedTelnetHost', {
        alias: 'th',
        description: 'If provided telnet requests will go only to this host and nowhere else. The client must give null on the telnet host. Can be multiples separated by comma.',
        type: 'string',
        requiresArg: true
    })
    .option('fixedTelnetPort', {
        alias: 'tp',
        description: 'If provided telnet requests will go only to this port and nowhere else. The client must give null on the telnet port. Can be multiples separated by comma.',
        type: 'string',
        requiresArg: true
    })
    .option('privateKey', {
        description: 'The private key if using HTTPS.',
        type: 'string',
        requiresArg: true
    })
    .option('certificate', {
        description: 'The certificate file if using HTTPS.',
        type: 'string',
        requiresArg: true
    })
    .option('certAuthority', {
        description: 'The certificate authority file if using HTTPS.',
        type: 'string',
        requiresArg: true
    })
    .option('verbosity', {
        alias: 'v',
        description: 'Verbose level (0=WARN, 1=INFO, 2=DEBUG)',
        type: 'number',
        requiresArg: true,
        choices: [0, 1, 2]
    })
    .help()
    .default('verbosity', 1)
    .epilog('Copyright Tempora Sanguinis 2022')
    .strict()
    .argv;

// got some bogus extra unhypenated parameters, we support only one unnamed (which is the config file) and must be the first
if (argv._.length>1) {
    yargs.help();
    process.exit(1);
}

let VERBOSE_LEVEL = argv.verbosity;

function WARN(...args: any[])  { VERBOSE_LEVEL >= 0 && tlog.apply(console, args); }
function INFO(...args: any[])  { VERBOSE_LEVEL >= 1 && tlog.apply(console, args); }
function DEBUG(...args: any[]) { VERBOSE_LEVEL >= 2 && tlog.apply(console, args); }

const localConfig = argv.config || argv._[0];

let serverConfigImported = require("../../../configServer.js");
let serverConfig : typeof serverConfigImported;

if (localConfig) try {
    const configPath = path.isAbsolute(localConfig) || localConfig.startsWith(".")? localConfig : path.join( __dirname, localConfig);
    DEBUG("Loading local configuration from: " + configPath);
    if (fs.existsSync(configPath)) {
        serverConfig = JSON.parse(fs.readFileSync(configPath).toString());
        INFO("Local config was loaded.");
    } else {
        serverConfig = serverConfigImported;
        INFO("Local config does not exist, using built defaults.");
    }
} catch(err) {
    serverConfig = serverConfigImported;
    WARN("Local config could not be loaded, using built defaults.");
} else {
    serverConfig = serverConfigImported;
    INFO("Local config file not specified. Using built defaults.");
}

// override settings from command line arguments
serverConfig.serverHost = argv.serverHost || serverConfig.serverHost;
serverConfig.serverPort = argv.serverPort || serverConfig.serverPort;
serverConfig.adminHost = argv.adminHost || serverConfig.adminHost;
serverConfig.adminPort = argv.adminPort || serverConfig.adminPort;
serverConfig.adminWebHost = argv.adminWebHost || serverConfig.adminWebHost;
serverConfig.adminWebPort = argv.adminWebPort || serverConfig.adminWebPort;
serverConfig.apiBaseUrl = argv.apiBaseUrl || serverConfig.apiBaseUrl;
serverConfig.apiKey = argv.apiKey || serverConfig.apiKey;
serverConfig.fixedTelnetHost = argv.fixedTelnetHost || serverConfig.fixedTelnetHost;
serverConfig.fixedTelnetPort = argv.fixedTelnetPort || serverConfig.fixedTelnetPort;
serverConfig.privateKey = argv.privateKey || serverConfig.privateKey;
serverConfig.certificate = argv.certificate || serverConfig.certificate;
serverConfig.certAuthority = argv.certAuthority || serverConfig.certAuthority;
serverConfig.mudLibPath = argv.mudLibPath || serverConfig.mudLibPath;

const isHttps = (serverConfig.privateKey && serverConfig.certificate);

console.log(serverConfig);

let telnetIdNext: number = 0;

interface connInfo {
    telnetId: number;
    uuid: string;
    userIp: string;
    host: string;
    port: number;
    startTime: Date;
};

let openConns: {[k: number]: connInfo} = {};
let io: socketio.Server;
let actualServer : any;

if (!isHttps) {
    let server: http.Server = http.createServer();
    actualServer = server;
} else {
    var app = require('express')();

    let hskey:Buffer;
    let hscert:Buffer;
    let ca:Buffer;

    try {
        hskey = serverConfig.privateKey ? fs.readFileSync(serverConfig.privateKey) : null;
        hscert = serverConfig.certificate ? fs.readFileSync(serverConfig.certificate) : null;
        ca = serverConfig.certAuthority ? fs.readFileSync(serverConfig.certAuthority) : null;
    } catch {
        WARN("Could not read certificate files");
        process.exit(1);
    }

    var credentials:https.ServerOptions = {
        ca:ca,
        key: hskey,
        cert: hscert,
        requestCert: false,
        rejectUnauthorized: false
    };

    try {
        actualServer = https.createServer(credentials,app);
    } catch (error) {
        WARN("Could not start https server: " + error);
        process.exit(1);
    }
}

io = new socketio.Server(actualServer, {
    // socket.io erroneusly uses fs.readyFileSync on require.resolve in runtime therefore
    // when webpacked serving client would fail, and we cannot serve it in this case
    // no problems for running in normal mode without webpacking the whole bundle
    serveClient: (typeof require.resolve("socket.io-client") === "string"),
    pingTimeout: 120000,
    allowEIO3: true,
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: [],
        credentials: true
      }
});

let telnetNs = io.of("/telnet");
telnetNs.on("connection", (client: socketio.Socket) => {
    
    let telnet: net.Socket;
    let ioEvt = new IoEvent(client);
    let remoteAddr = client.request.headers['x-real-ip'] || client.request.connection.remoteAddress;
    let ipAddr = remoteAddr ? (typeof remoteAddr == 'string' ? <string>remoteAddr : (<string[]>remoteAddr)[0]) : "";

    let writeQueue: any[] = [];
    let canWrite: boolean =  true;
    let checkWrite = () => {
        if (!canWrite) { return; }

        if (writeQueue.length > 0) {
            let data = writeQueue.shift();
            canWrite = false;
            canWrite = telnet.write(data as Buffer);
        }
    };

    let writeData = (data: any) => {
        writeQueue.push(data);
        checkWrite();
    };

    client.on("disconnect", () => {
        if (telnet) {
            telnet.destroy();
            telnet = null;
        }
    });

    ioEvt.clReqTelnetOpen.handle((args: [string, number]) => {
        if (telnet) { return; }
        telnet = new net.Socket();

        let telnetId: number = telnetIdNext++;

        let host: string = (args[0]||"").trim();
        let port: number = args[1];

        let conStartTime: Date;

        if (serverConfig.fixedTelnetHost && host && (<string>serverConfig.fixedTelnetHost).indexOf(host)==-1) {
            const error = "The telnet host is fixed on the proxy and must not be changed by the client";
            ioEvt.srvTelnetError.fire(error);
            return;
        } else if (serverConfig.fixedTelnetHost && !host) {
            host = (<string>serverConfig.fixedTelnetHost).split(",")[0];
        }

        if (serverConfig.fixedTelnetPort && port && (<string>serverConfig.fixedTelnetPort).indexOf(port.toString())==-1) {
            const error = "The telnet port is fixed on the proxy and must not be changed by the client";
            ioEvt.srvTelnetError.fire(error);
            return;
        } else if (serverConfig.fixedTelnetPort && !port) {
            port = parseInt((<string>serverConfig.fixedTelnetPort).split(",")[0]);
        }

        openConns[telnetId] = {
            telnetId: telnetId,
            uuid: null,
            userIp: ipAddr,
            host: host,
            port: port,
            startTime: null
        };

        telnet.on("data", (data: Buffer) => {
            ioEvt.srvTelnetData.fire(data.buffer);
        });
        telnet.on("close", (had_error: boolean) => {
            let conn = openConns[telnetId];
            delete openConns[telnetId];
            ioEvt.srvTelnetClosed.fire(had_error);
            telnet = null;
            let connEndTime = new Date();
            let elapsed: number = conStartTime && (<any>connEndTime - <any>conStartTime);
            INFO(telnetId, "::", remoteAddr, "->", host, port, "::closed after", elapsed && (elapsed/1000), "seconds");

            if (conn) {
                if (axinst) axinst.post('/usage/disconnect', {
                    'uuid': conn.uuid,
                    'sid': client.id,
                    'from_addr': remoteAddr,
                    'to_addr': host,
                    'to_port': port,
                    'time_stamp': connEndTime,
                    'elapsed_ms': elapsed
                }).catch((o) => {
                    console.error("/usage/disconnect error:", o);
                });
            }
        });
        telnet.on("drain", () => {
            canWrite = true;
            checkWrite();
        });
        telnet.on("error", (err: Error) => {
            WARN(telnetId, "::", "TELNET ERROR:", err);
            ioEvt.srvTelnetError.fire(err.message);
        });

        try {
            INFO(telnetId, "::", remoteAddr, "->", host, port, "::opening");
            telnet.connect(port, host, () => {
                ioEvt.srvTelnetOpened.fire([host, port]);
                conStartTime = new Date();
                openConns[telnetId].startTime = conStartTime;

                if (axinst) axinst.post('/usage/connect', {
                    'sid': client.id,
                    'from_addr': remoteAddr,
                    'to_addr': host,
                    'to_port': port,
                    'time_stamp': conStartTime
                }).then((resp) => {
                    let conn = openConns[telnetId];
                    if (conn) {
                        conn.uuid = resp.data.uuid;
                    }
                }).catch((o) => {
                    console.error("/usage/connect error:", o);
                });
            });
        }
        catch (err) {
            delete openConns[telnetId];
            WARN(telnetId, "::", "ERROR CONNECTING TELNET:", err);
            ioEvt.srvTelnetError.fire(err.message);
        }
    });

    ioEvt.clReqTelnetClose.handle(() => {
        if (telnet == null) { return; }
        telnet.destroy();
        telnet = null;
    });

    ioEvt.clReqTelnetWrite.handle((data) => {
        if (telnet == null) { return; }
        writeData(data);
    });

    ioEvt.srvSetClientIp.fire(ipAddr);
});

actualServer.on("error", (err: Error) => {
    WARN("Server error:", err);
});

actualServer.listen(serverConfig.serverPort, serverConfig.serverHost, () => {
    INFO("Server is running on " + serverConfig.serverHost + ":" + serverConfig.serverPort);
});

function tlog(...args: any[]) {
    console.log("[[", new Date().toLocaleString(), "]]", ...args);
}

let axinst : AxiosInstance;

if (serverConfig.apiBaseUrl) {
    axinst = axios.create({
        baseURL: serverConfig.apiBaseUrl,
        auth: {
            username: serverConfig.apiKey,
            password: ':none'
        }
    });
    INFO("Using API at: " + serverConfig.apiBaseUrl);
} else {
    INFO("NOT Using API to store user data - web client must use localstorage to save");
}

// Admin CLI
let adminIdNext: number = 0;

type adminFunc = (sock: net.Socket, args: string[]) => void;

let adminFuncs: {[k: string]: adminFunc} =  {};
adminFuncs["help"] = (sock: net.Socket, args: string[]) => {
    sock.write("Available commands:\n\n");
    for (let cmd in adminFuncs) {
        sock.write(cmd + "\n");
    }
    sock.write("\n");
};

adminFuncs["ls"] = (sock: net.Socket, args: string[]) => {
    sock.write("Open connections:\n\n");
    for (let tnId in openConns) {
        let o = openConns[tnId];
        sock.write( o.telnetId.toString() + 
                    ": " + o.userIp  +
                    " => " + o.host + "," + o.port.toString() +
                    "\n");
    }
};

let adminServer = net.createServer((socket: net.Socket) => {
    let adminId: number = adminIdNext++;

    WARN("{{", adminId, "}}", "{{admin connection opened}}");

    let rl = readline.createInterface({
        input: socket
    });

    rl.on("line", (line: string) => {
        let words = line.split(" ");

        if (words.length > 0) {
            let funcName = words[0];
            if (funcName === "exit") {
                socket.end();
                return;
            }

            let afunc = adminFuncs[words[0]];

            if (!afunc) {
                socket.write("No such command. Try 'help'.\n");
            } else {
                try {
                    afunc(socket, words.slice(1));
                }
                catch (err) {
                    WARN("{{", adminId, "}}", "{{admin error '" + line + "':", err, "}}");
                    socket.write("COMMAND ERROR\n");
                }
            }
        }

        socket.write("admin> ");
    });

    socket.on("close", () => {
        INFO("{{", adminId, "}}", "{{admin closed}}");
    });

    socket.on("error", (err: Error) => {
        WARN("{{", adminId, "}}", "{{admin error: " + err);
    });

    socket.write("admin> ");
});

if (serverConfig.adminHost !== "localhost") {
    throw "Auth for Admin CLI is not implemented. Must use localhost.";
}

if (serverConfig.adminHost && serverConfig.adminPort) adminServer.listen(serverConfig.adminPort, serverConfig.adminHost, () => {
    INFO("Admin CLI server is running on " + serverConfig.adminHost + ":" + serverConfig.adminPort);
});

// Admin Web API
let adminApp = express();

adminApp.get('/conns', (req, res) => {
    let conns = [];
    for (let id in openConns) {
        let c = openConns[id];
        conns.push({
            ...c,
            startUTC: c.startTime.getTime()
        })
    }
    res.send(conns);
});

function ValidateEmail(mail:string) 
{
 if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
  {
    return (true)
  }
    return (false)
}

function ValidateToken(token:string) 
{
 if (/^\d{8}$/.test(token))
  {
    return (true)
  }
    return (false)
}

function ValidateChar(char:string) 
{
 if (/^[a-zA-Z]{3,20}$/.test(char))
  {
    return (true)
  }
    return (false)
}

function requestExists(user:string, token:string) {
    return fs.existsSync(path.join(serverConfig.mudLibPath, "players", user.toLowerCase() + ".mail." + token));
}

function approveUser(user:string, token:string) {
    var p1 = path.join(serverConfig.mudLibPath, "players", user.toLowerCase() + ".mail." + token)
    var p2 = path.join(serverConfig.mudLibPath, "players", user.toLowerCase() + ".mail.ok")
    
    fs.renameSync(p1, p2);
}

adminApp.get('/approve', (req, res) => {
    let status = "Errore di convalidazione Email";
    let message = "Richiesta di convalidazione Email non valida, inesistente oppure scaduta.<br/>Puoi richiederla al menu iniziale del gioco modificando l'email."
    if (!ValidateEmail(<string>req.query.email)) {
        // tolgo per non mandare informazioni extra
        //message = "Email non valida!"
    }
    if (!ValidateToken(<string>req.query.approveToken)) {
        // tolgo per non mandare informazioni extra
        //message = "Token non valido!"
    }
    if (!ValidateChar(<string>req.query.character)) {
        // tolgo per non mandare informazioni extra
        //message = "Nome personaggio non valido!"
    }
    if (requestExists(<string>req.query.character, <string>req.query.approveToken)) {
        approveUser(<string>req.query.character, <string>req.query.approveToken)
        status = "ok"
        //message = "Email approvata!"
    }
    if (status != "ok") {
        res.status(404).send(`
        <html><head><title>Convalidazione Email su Tempora Sanguinis</title></head><body style="background-color:orangered;color:black;text-align: center;">
            <h3 style="color:black;">${status}</h3>
            <p>${message}</p>
            <p>Premi il seguente link per ritornare <a href="https://www.temporasanguinis.it/client/">a giocare</a>.</p>
        </body></html>
        `)
    } else {
        res.send(`
        <html><head><title>Convalidazione Email su Tempora Sanguinis</title></head><body style="background-color:black;color:red;text-align: center;">
            <h3 style="color:red;">Salve ${req.query.character},</h3>
            <p>La tua email e' stata convalidata e potrai ora usufruire di funzionalita' aggiuntive dentro al gioco.</p>
            <p>Per informazioni aggiuntive digita 'help account' mentre sei in gioco.</p>
            <p>Per giocare puoi usare il <a style="color:white;" href="https://www.temporasanguinis.it/client/">client web di Tempora Sanguinis</a>.</p>
        </body></html>
        `)
    };
});

if(serverConfig.adminWebHost && serverConfig.adminWebPort) adminApp.listen(serverConfig.adminWebPort, serverConfig.adminWebHost, () => {
    INFO("Admin API server is running on " + serverConfig.adminWebHost + ":" + serverConfig.adminWebPort);
});
