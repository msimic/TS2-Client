import { EventHook } from "../../Core/event";
import { OutWinBase } from "./outWinBase";
import { TriggerManager } from "../../Scripting/triggerManager";
import * as Util from "../../Core/util";
import { ConfigIf } from "../../Core/util";

export class OutputWin extends OutWinBase {
    private outer:JQuery;
    clearWindow(owner: string) {
        this.cls();
        if (this.debugScripts) this.append(
            "<span style=\"color:orange\">(cls): " /*+ owner + ": "*/
            + Util.rawToHtml(owner)
            + "<br>"
            + "</span>", true);
    }
    constructor(config: ConfigIf, private triggerManager:TriggerManager) {
        super("winOutput",$("#winOutput"), config);
        this.outer = $("#winOutput").parent();
        this.postInit();
        this.setupLogTime();
        $(document).ready(() => {
            window.onerror = this.handleWindowError.bind(this);
        });

        triggerManager.EvtEmitTriggerOutputChanged.handle((data)=> {
            return this.outputChanged([data.line, data.buffer]);
        });
    }

    protected logLine(): void {
        if (this.log) {
            const line = this.lineText;
            this.logger.log(line);
        }
    }

    protected getOuterElement():JQuery {
        return this.outer;
    }

    handleSendCommand(cmd: string, fromScript:boolean, debug?:boolean) {
        this.append(
            "<span style=\"color:yellow"+(debug?";padding-left: 15px; opacity: 0.5;":"")+"\">"
            + Util.rawToHtml(cmd)
            + "<br>"
            + "</span>", true);
        this.scrollBottom(!fromScript);
    }

    debugScriptSendingCommand(owner:string, cmd: string) {
        if (!this.debugScripts) return;
        
        this.append(
            "<span style=\"color:cyan;padding-left: 15px; opacity: 0.5;\">[" + owner /*": "
            + Util.rawToHtml(cmd)*/
            + " running commands]<br>"
            + "</span>", true);
        setTimeout(()=>{
        this.scrollBottom(false);
        },0)
    }

    debugScriptPrinting(owner:string, cmd: string) {
        if (!this.debugScripts) return;
        
        this.append(
            "<span style=\"color:cyan;padding-left: 15px; opacity: 0.5;\">[" + owner /*": "
            + Util.rawToHtml(cmd)*/
            + " printing]<br>"
            + "</span>", true);
        setTimeout(()=>{
        this.scrollBottom(false);
        },0)
    }

    debugTriggerSentCommands(orig:string, cmds:string[]) {
        if (!this.debugScripts) return;
        
        let html = "<span style=\"color:magenta;padding-left: 15px; opacity: 0.5;\">[(trigger) " + orig + " sent " + cmds.join(",") + "]<br></span>";

        /*for (let i = 0; i < data.length; i++) {
            if (i >= 5) {
                html += "...<br>";
                break;
            } else {
                html += Util.rawToHtml(data[i]) + "<br>";
            }
        }*/
        this.append(html, true);
        setTimeout(()=>{
        this.scrollBottom(false);
        },0)
    }

    debugAliasSentCommands(orig: string, cmds: string[], fromScript:boolean) {
        if (!this.debugScripts) return;
        let html = "<span style=\"color:cyan;padding-left: 15px; opacity: 0.5;\">[(alias) " + orig + (!cmds.length ? " executed" : " sent: " + cmds.join(",")) + "]<br></span>";
        /*html += Util.rawToHtml(orig);
        html += "</span><span style=\"color:cyan\"> --> ";

        for (let i = 0; i < cmds.length; i++) {
            if (i >= 5) {
                html += "...<br>";
                break;
            } else {
                html += Util.rawToHtml(cmds[i]) + "<br>";
            }
        }
        */
        this.append(html, true);
        setTimeout(()=>{
          if (!fromScript) this.scrollBottom(false);
        },0)
    }

    private connIntervalId: number = null;

    handleTelnetTryConnect(host: string, port: number): void {
        if (this.connIntervalId) {
            clearInterval(this.connIntervalId);
            this.connIntervalId = null;
        }

        let elem = "<span>";
        if (host && port) {
            elem += "<br/><span style='color:cyan'><br/>"
                + "[[Connessione telnet a " + host + ":" + port.toString()
                + "<span class='conn-dots blink'>...</span>"
                + "]]<br>";
        }
        else {
            elem += "<br/><span style='color:cyan'>"
                + "[[Connessione telnet "
                + "<span class='conn-dots blink'>...</span>"
                + "]]<br>";
        }

        elem += "</span>"
        //let dots = elem.getElementsByClassName('conn-dots')[0] as HTMLSpanElement;

        //this.connIntervalId = <number><any>setInterval(() => dots.textContent += '.', 1000);

        this.append(elem, true);
        this.scrollBottom(true);
    }

    handleTelnetConnect(): void {
        if (this.connIntervalId) {
            clearInterval(this.connIntervalId);
            this.connIntervalId = null;
        }
        this.append(
            "<span style=\"color:cyan\"><br/>"
            + "[[Telnet connesso]]"
            + "<br>"
            + "</span>", true);
        this.scrollBottom(true);
    }

    handleTelnetDisconnect() {
        if (this.connIntervalId) {
            clearInterval(this.connIntervalId);
            this.connIntervalId = null;
        }
        this.append(
            "<span style=\"color:cyan\"><br/>"
            + "[[Telnet disconnesso]]"
            + "<br>"
        + "</span>", true);
        this.scrollBottom(true);
    }

    handleWsConnect() {
        this.append(
            "<span style=\"color:cyan\"><br/>"
            + "[[Websocket connesso]]"
            + "<br>"
            + "</span>", true);
        this.scrollBottom(false);
    }

    handleWsDisconnect() {
        if (this.connIntervalId) {
            clearInterval(this.connIntervalId);
            this.connIntervalId = null;
        }
        this.append(
            "<span style=\"color:cyan\"><br/>"
            + "[[Websocket disconnesso]]"
            + "<br>"
            + "</span>", true);
        this.scrollBottom(false);
    }

    handleTelnetError(data: string) {
        this.append(
            "<span style=\"color:red\"><br/>"
            + "[[Errore Telnet:" + "<br>"
            + data + "<br>"
            + "]]"
            + "<br>"
            + "</span>", true);
        this.scrollBottom(true);
    }

    handleWsError() {
        this.append(
            "<span style=\"color:red\"><br/>"
            + "[[Errore Websocket]]"
            + "<br>"
            + "</span>", true);
        this.scrollBottom(true);
    }

    public handleWindowError(message: any, source: any, lineno: any, colno: any, error: any) {
        this.append(
            "<span style=\"color:red\"><br/>"
            + "[[Errore Web Client:<br>"
            + message + "<br>"
            + source + "<br>"
            + lineno + "<br>"
            + colno + "<br>"
            + (error ? error.stack : "")
            + "]]"
            + "<br>"
            + "</span>", true
        );
        this.scrollBottom(true);
    }

    handleScriptEvalError(err: any) {
        //let msg = Util.rawToHtml(err.toString());
        let stack = Util.rawToHtml(err.stack);

        this.append(
            "<span style=\"color:red\"><br/>"
            + "[[Errore compilazione script:<br>"
            + err.toString() + "<br>"
            + "<br>"
            + stack + "<br>"
            + "]]"
            + "<br>"
            + "</span>", true
        );
        this.scrollBottom(true);
    }

    handleScriptError(data:{owner:string, err:any, stack?:string}) {

        this.append(
            "<span style=\"color:red\"><br/>"
            + "[[Errore Script (" + data.owner + "):<br>"
            + data.err.toString() + "<br>"
            + "<br>"
            + (data.stack || data.err.stack) + "<br>"
            + "]]"
            + "<br>"
            + "</span>", true
        );
        this.scrollBottom(true);
    }
}
