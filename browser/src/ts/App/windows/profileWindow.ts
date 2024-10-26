import { Profile, ProfileManager } from "../profileManager";
import { Messagebox, messagebox } from "../messagebox";
import { isNumeric } from "jquery";
import { WindowManager } from "../windowManager";
import { circleNavigate } from "../../Core/util";

export class ProfileWindow {
    public defaultServer = "mud.temporasanguinis.it";
    private $win: JQuery;

    private $serverName: JQuery;
    private $serverRow: JQuery;
    private $name: JQuery;
    private $char: JQuery;
    private $pass: JQuery;
    private $serverList: JQuery;
    private $autoLogin: JQuery;
    private $baseScripting: JQuery;
    private $baseLayout: JQuery;
    private okButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    private profile:Profile;
    private callback:(profile:Profile) => void;
    private reloadLayoutButton: JQuery;
    private windowManager: WindowManager;

    constructor(private manager:ProfileManager) {
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winProfile";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Profilo</div>
        <!--content-->
        <div id="profile-window">
            <div style="display:table;width:100%;height:100%;padding:10px;box-sizing: border-box">
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Nome profilo</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input id="nomeprofilo" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" tabindex="1" title="Il nome del profilo" placeholder="&lt;Il nome del profilo&gt;"type="text"/>
                    </div>
                </div>
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Server</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <select tabindex="2" id="serverName" size="1" class="serverName">
                        </select>
                    </div>
                </div>
                <div style="display:table-row;height:29px;" id="server_row">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Server e porta</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input tabindex="3" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" id="nomeserver" title="Server URL" placeholder="&lt;server:port&gt;" type="text"/>
                    </div>
                </div>
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Autenticazione</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                    <label style="margin-right:10px;"><input type="checkbox" tabindex="4" class="winProfile-autologin" /></label>
                    </div>
                </div>
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Personaggio</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input tabindex="5" id="nomepg" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" title="Il nome del personaggio" placeholder="&lt;nome del personaggio&gt;" type="text"/>
                    </div>
                </div>
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Password</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input tabindex="6" id="password" title="La password del personaggio" placeholder="&lt;opzionale&gt;" type="password"/>
                    </div>
                </div>
                <div style="display:table-row;height:10px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                    </div>
                </div>
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Trigger preimpostati</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                    <label title="Se abilitato il profilo avra' accesso a una base di trigger e alias gia' creati.\nSe vuoi usare i trigger preimpostati devi importare i trigger nel profilo base, premendo il pulsante giallo su di esso." style="margin-right:10px;"><input type="checkbox" tabindex="7" class="winProfile-scriptingbase" /></label>
                    </div>
                </div>
                <div style="display:table-row;height:29px;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Disposizione schermo</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                    <label title="Se abilitato questo profilo avra' una predisposizione schermo per ancorare le finestre e vario altro contenuto. Richiede Trigger preimpostati." style="margin-right:10px;"><input type="checkbox" tabindex="8" class="winProfile-uselayout" /></label>
                    <button tabindex="1000" id="reloadLayout" title="Ricarica disposizione predefinita" class="">&#x27F3;</button>
                    <button tabindex="1001" id="editLayout" title="Modifica disposizione schermo" class="">&#x270E;</button>
                    </div>
                </div>
                <div style="display:table-row;">
                    <!--<div style="display:table-cell;vertical-align: middle;">-->
                        <div class="messageboxbuttons" style="margin-top: 10px;display: inline-block;position:absolute;width:100%;">
                            <button tabindex="9" title="Applica" class="acceptbutton greenbutton">&#10004;</button>
                            <button tabindex="10" title="Annulla" class="cancelbutton redbutton">&#10006;</button>
                        </div>
                    <!--</div>-->
                </div>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$char = $("#nomepg", this.$win);
        this.$pass = $("#password", this.$win);
        this.$serverName = $("#nomeserver", this.$win);
        this.$serverRow = $("#server_row", this.$win);

        this.$autoLogin = $(".winProfile-autologin", this.$win);
        this.$baseLayout = $(".winProfile-uselayout", this.$win);
        this.$baseScripting = $(".winProfile-scriptingbase", this.$win);

        $("#editLayout", this.$win).on("click", () => {
            let lstr = JSON.stringify(this.profile.layout?this.profile.layout:{},null,2)
            Messagebox.ShowInput("Edit layout", "Definizione layout (attento)", lstr, true).then(v => {
                if (v.button == 1) {
                    this.profile.layout = JSON.parse(v.result)
                }
            })
        });

        this.$baseScripting.change(() => {
            if (this.$baseScripting.is(":checked")) {
                this.$baseLayout.removeAttr("disabled");
            } else {
                this.$baseLayout.prop('checked', false).trigger("change");
                this.$baseLayout.attr("disabled", "disabled");
            }
        });
        this.$baseScripting.prop('checked', false).trigger("change");

        this.$autoLogin.change(() => {
            if (this.$autoLogin.is(":checked")) {
                this.$char.removeAttr("disabled");
                this.$pass.removeAttr("disabled");
                $(this.reloadLayoutButton).removeAttr("disabled");
            } else {
                this.$char.attr("disabled", "disabled");
                this.$pass.attr("disabled", "disabled");
                $(this.reloadLayoutButton).attr("disabled", "disabled");
            }
        });
        this.$autoLogin.prop('checked', true).trigger("change");

        this.$serverList = $(win.getElementsByClassName("serverName")[0] as HTMLSelectElement);
        (<any>this.$serverList).jqxDropDownList({closeDelay:1, width: '100%', height:'24px',autoItemsHeight: true, autoDropDownHeight: true, scrollBarSize:8, source: [], displayMember: "label", valueMember: "value"});
        this.$serverList = $(win.getElementsByClassName("serverName")[0] as HTMLSelectElement);
        
        this.$serverList.change(c => {
            if (this.$serverList.val()=="Manual") {
                this.$serverRow.css("visibility", "visible")
            } else {
                this.$serverRow.css("visibility", "hidden")
            }
        })
        this.$name = $("#nomeprofilo", this.$win);
        this.okButton = win.getElementsByClassName("acceptbutton")[0] as HTMLButtonElement;
        this.cancelButton = win.getElementsByClassName("cancelbutton")[0] as HTMLButtonElement;
        this.reloadLayoutButton = $("#reloadLayout", this.$win);
        this.reloadLayoutButton.click(() => this.reloadLayout());
        
        this.$win.on("open", ()=>{
            setTimeout(() => {
                this.$name.focus()                
            }, 300);
        });

        (<any>this.$win).jqxWindow({width: 340, height: 350, resizable: false, showCollapseButton: true, isModal: true});
        $(this.okButton).click(this.handleOk.bind(this));
        $(this.cancelButton).click(this.handleCancelClick.bind(this));
        (<any>this.$win).jqxWindow("close");

        circleNavigate(this.$name, this.cancelButton, null, this.$win);
    }

    setWindowManager(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }
    
    private async reloadLayout() {
        await this.windowManager.getLayoutManager().loadBaseLayout(this.profile);
    }

    private handleOk() {
        if (!this.$name.val() || this.$name.val().length < 3) {
            this.handleError("Il profilo deve avere almeno 3 caratteri!");
            return;
        }
        if (this.$autoLogin.prop("checked")==true && (!this.$char.val() || this.$char.val().length < 3)) {
            this.handleError("Se usi autologin devi dare il nome del pg (con almeno tre lettere).");
            return;
        }
        if (this.$autoLogin.prop("checked")==true && (!this.$pass.val() || this.$pass.val().length < 3)) {
            this.handleError("Se usi autologin devi dare la password del pg (con almeno tre lettere).");
            return;
        }
        if (this.$serverList.val()=="Manual") {
            if ((<string>this.$serverName.val()).length<8) {
                this.handleError("Lunghezza server e port troppo breve (server:port).");
                return;
            }
            let host = (<string>this.$serverName.val()).split(":")[0];
            let port = (<string>this.$serverName.val()).split(":")[1];
            if (host.length<3) {
                this.handleError("Nome server (Host) invalido.");
                return;
            }
            if (port.length<2 || !isNumeric(port)) {
                this.handleError("Port invalido (minimo 3 caratteri e numerico).");
                return;
            }
        }
        this.apply();
        this.hide();
        this.callback(this.profile);
    }

    private handleCancelClick() {
        this.hide();
    }

    private handleError(error:string) {
        Messagebox.Show("Errore", `<b>${error}</b>`);
    }

    private apply() {
        this.profile.host = this.defaultServer;
        if (this.$serverList.val() == "Live") {
            this.profile.port = "4000";
        } else {
            this.profile.port = "6000";
        }
        if (this.$serverList.val()=="Manual") {
            this.profile.host = (<string>this.$serverName.val()).split(":")[0];
            this.profile.port = (<string>this.$serverName.val()).split(":")[1];
        }
        this.profile.autologin = this.$autoLogin.prop('checked');
        this.profile.useLayout = this.$baseLayout.prop('checked');
        this.profile.baseTriggers = this.$baseScripting.prop('checked');
        this.profile.name = this.$name.val();
        this.profile.char = this.$char.val();
        this.profile.pass = this.$pass.val();
    }

    public load() {
        let serverName = this.profile.port == "6000" ? "Tester" : "Live";
        let custom = false;
        this.$serverName.val((this.profile.host ?? "")+":"+(this.profile.port??"0"));
        if ((this.profile.host||"").toLowerCase().indexOf(this.defaultServer)==-1) {
            serverName = "Manual";
            if (!this.profile.host) {
                this.$serverName.val("");
            }
            custom=true;
        }
        if (this.profile.host == undefined && this.profile.port == undefined) {
            serverName = "Live";
            custom = false;
        }
        (<any>this.$serverList).jqxDropDownList('clear'); 
        const source = [
            { value: "Live", label:"Live"},
            { value: "Tester", label:"Tester"},
            { value: "Manual", label:"Manuale"}
        ];
        (<any>this.$serverList).jqxDropDownList({source:source});

        this.$serverList.val(serverName);
        this.$autoLogin.prop('checked', this.profile.autologin).trigger("change");
        this.$name.val(this.profile.name ?? "");
        this.$char.val(this.profile.char ?? "");
        this.$pass.val(this.profile.pass ?? "");
        this.$baseScripting.prop('checked', this.profile.baseTriggers).trigger("change");
        this.$baseLayout.prop('checked', this.profile.useLayout).trigger("change");
        this.$baseScripting.removeAttr("disabled")
        this.$baseLayout.removeAttr("disabled")
        const trgs = this.manager.getBaseConfig().get("triggers");
        if (!trgs || !trgs.length || trgs.length < 1) {
            this.$baseScripting.prop('checked', false).trigger("change");
            this.$baseLayout.prop('checked', false).trigger("change");
            this.$baseScripting.attr("disabled", "disabled").trigger("change");
            $(this.reloadLayoutButton).attr("disabled", "disabled").trigger("change");
        }
    }

    public show(profile:Profile, callback:(profile:Profile) => void) {
        this.profile = profile;
        this.callback = callback;
        this.load();
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow('bringToFront');
    }

    public destroy() {
        (<any>this.$win).jqxWindow("destroy");
    }

    private hide() {
        (<any>this.$win).jqxWindow("close");
    }
}
