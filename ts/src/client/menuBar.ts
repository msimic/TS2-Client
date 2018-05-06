import { GlEvent, GlDef } from "./event";

import { UserConfig } from "./userConfig";

import { getUrlParameter } from "./util";

import { Client } from "./client";
import { Socket } from "./socket";
import { AliasEditor } from "./aliasEditor";
import { TriggerEditor } from "./triggerEditor";
import { JsScriptWin } from "./jsScriptWin";
import { AboutWin } from "./aboutWin";
import { ConnectWin } from "./connectWin";

declare let configClient: any;

export class MenuBar {
    private $menuBar: JQuery;
    private $chkEnableColor: JQuery;
    private $chkEnableUtf8: JQuery;
    private $chkEnableTrig: JQuery;
    private $chkEnableAlias: JQuery;
    private $chkEnableMap: JQuery;
    private $chkEnableGauges: JQuery;

    constructor(
        private client: Client,
        private socket: Socket,
        private aliasEditor: AliasEditor,
        private triggerEditor: TriggerEditor,
        private jsScriptWin: JsScriptWin,
        private aboutWin: AboutWin,
        private connectWin: ConnectWin
        ) {

        this.makeClickFuncs();

        this.$menuBar = $("#menuBar");

        this.$chkEnableColor = $("#menuBar-chkEnableColor");
        this.$chkEnableUtf8 = $("#menuBar-chkEnableUtf8");

        this.$chkEnableTrig = $("#menuBar-chkEnableTrig");
        this.$chkEnableAlias = $("#menuBar-chkEnableAlias");

        (<any>this.$menuBar).jqxMenu({ width: "100%", height: "4%"});
        this.$menuBar.on("itemclick", (event: any) => { this.handleClick(event); });

        this.$chkEnableColor.change(function() {
            GlEvent.setColorsEnabled.fire(this.checked);
        });

        this.$chkEnableUtf8.change(function() {
            UserConfig.set("utf8Enabled", this.checked);
            GlEvent.setUtf8Enabled.fire(this.checked);
        });

        (this.$chkEnableUtf8[0] as HTMLInputElement).checked = UserConfig.get("utf8Enabled");

        this.$chkEnableTrig.change(function() {
            GlEvent.setTriggersEnabled.fire(this.checked);
        });

        this.$chkEnableAlias.change(function() {
            GlEvent.setAliasesEnabled.fire(this.checked);
        });

        GlEvent.telnetConnect.handle(() => {
            $("#menuBar-conn-disconn").text("Disconnect");
        });

        GlEvent.telnetDisconnect.handle(() => {
            $("#menuBar-conn-disconn").text("Connect");
        });

        GlEvent.wsDisconnect.handle(() => {
            $("#menuBar-conn-disconn").text("Connect");
        });
    }

    private clickFuncs: {[k: string]: () => void} = {};
    private makeClickFuncs() {
        this.clickFuncs["Connect"] = () => {
            if (configClient.hardcodedTarget === true) {
                this.socket.openTelnet(null, null);
            } else {
                let hostParam = getUrlParameter("host");
                let portParam = getUrlParameter("port");

                if (hostParam !== undefined && portParam !== undefined) {
                    let host = hostParam.trim();
                    let port = Number(portParam.trim());

                    this.socket.openTelnet(host, port);
                } else {
                    this.connectWin.show();
                }
            }
        };

        this.clickFuncs["Disconnect"] = () => {
            this.socket.closeTelnet();
        };

        this.clickFuncs["Aliases"] = () => {
            this.aliasEditor.show();
        };

        this.clickFuncs["Triggers"] = () => {
            this.triggerEditor.show();
        };

        this.clickFuncs["Green on Black"] = () => {
            GlEvent.changeDefaultColor.fire(["green", "low"]);
            GlEvent.changeDefaultBgColor.fire(["black", "low"]);
        };

        this.clickFuncs["White on Black"] = () => {
            GlEvent.changeDefaultColor.fire(["white", "low"]);
            GlEvent.changeDefaultBgColor.fire(["black", "low"]);
        };

        this.clickFuncs["Black on Grey"] = () => {
            GlEvent.changeDefaultColor.fire(["black", "low"]);
            GlEvent.changeDefaultBgColor.fire(["white", "low"]);
        };

        this.clickFuncs["Black on White"] = () => {
            GlEvent.changeDefaultColor.fire(["black", "low"]);
            GlEvent.changeDefaultBgColor.fire(["white", "high"]);
        };

        this.clickFuncs["Script"] = () => {
            this.jsScriptWin.show();
        };

        this.clickFuncs["Export"] = () => {
            UserConfig.exportToFile();
        };

        this.clickFuncs["Import"] = () => {
            UserConfig.importFromFile();
        };

        this.clickFuncs["About"] = () => {
            this.aboutWin.show();
        };
    }

    private handleClick(event: any) {
        let item = event.args;
        let text = $(item).text();
        if (text in this.clickFuncs) {
            this.clickFuncs[text]();
        }
    }
}
