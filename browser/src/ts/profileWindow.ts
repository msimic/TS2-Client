import { Profile, ProfileManager } from "./profileManager";
import { Messagebox, messagebox } from "./messagebox";
import { isNumeric } from "jquery";
import { WindowManager } from "./windowManager";

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
        <div>
            <div style="display:table;width:100%;height:100%;padding:10px;box-sizing: border-box">
                <div style="display:table-row;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Nome profilo</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input id="nomeprofilo" tabindex="1" style="margin-top:5px;width:100%;" title="Il nome del profilo" placeholder="&lt;Il nome del profilo&gt;"type="text"/>
                    </div>
                </div>
                <div style="display:table-row;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Server</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <div class="select-box" style="margin-left:-10px;margin-right:-10px;">   
                            <div class="inner-box">    
                                <label for="serverName" class="label select-box1"><span class="label-desc"></span> </label>
                                <select tabindex="2" id="serverName" size=1" class="dropdown serverName">
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display:table-row;" id="server_row">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Server e porta</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input tabindex="3" id="nomeserver" style="margin-top:5px;width:100%;" title="Server URL" placeholder="&lt;Url server (server:port)&gt;" type="text"/>
                    </div>
                </div>
                <div style="display:table-row;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Personaggio</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input tabindex="4" id="nomepg" style="margin-top:5px;width:100%;" title="Il nome del personaggio" placeholder="&lt;Il nome del personaggio&gt;" type="text"/>
                    </div>
                </div>
                <div style="display:table-row;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Password</label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <input tabindex="5" id="password" style="margin-top:5px;width:100%;" title="La password del personaggio" placeholder="&lt;Password: opzionale&gt;" type="password"/>
                    </div>
                </div>
                <div style="display:table-row;">
                    <div style="display:table-cell;text-align:right;vertical-align: middle;">
                        <label style="margin-right:10px;">Autologin<input type="checkbox" tabindex="3" class="winProfile-autologin" /></label>
                    </div>
                    <div style="display:table-cell;vertical-align: middle;">
                        <div class="messageboxbuttons" style="margin-top: 10px;display: inline-block;float:right;">
                            <button tabindex="1000" id="reloadLayout" title="Ricarica layour base" class="">Layout</button>
                            <button tabindex="6" title="Applica" class="acceptbutton greenbutton">Accetta</button>
                            <button tabindex="7" title="Annulla" class="cancelbutton redbutton">Annulla</button>
                        </div>
                    </div>
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
        this.$autoLogin.change(() => {
            if (this.$autoLogin.is(":checked")) {
                this.$char.removeAttr("disabled");
                this.$pass.removeAttr("disabled");
            } else {
                this.$char.attr("disabled", "disabled");
                this.$pass.attr("disabled", "disabled");
            }
        });
        this.$autoLogin.prop('checked', false).trigger("change");

        $("select", this.$win).on("click" , function() {
  
            $(this).parent(".select-box").toggleClass("open");
            
          });

        $("select", this.$win).on("change" , function() {
  
            var selection = $(this).find("option:selected").text(),
                labelFor = $(this).attr("id"),
                label = $("[for='" + labelFor + "']");
              
            label.find(".label-desc").html(selection);
              
          });
          
          $("select", this.$win).on("focus" , function() {
            $(this).parent().addClass("focused");  
          });

          $("select", this.$win).on("blur" , function() {
            $(this).parent().removeClass("focused");              
          });

        this.$serverList = $(win.getElementsByClassName("serverName")[0] as HTMLSelectElement);
        this.$serverList.change(c => {
            if (this.$serverList.val()=="Manual") {
                this.$serverRow.show()
            } else {
                this.$serverRow.hide()
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

        (<any>this.$win).jqxWindow({width: 450, height: 290, showCollapseButton: true, isModal: true});
        $(this.okButton).click(this.handleOk.bind(this));
        $(this.cancelButton).click(this.handleCancelClick.bind(this));
        (<any>this.$win).jqxWindow("close");
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
        this.profile.name = this.$name.val();
        this.profile.char = this.$char.val();
        this.profile.pass = this.$pass.val();
    }

    private load() {
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
        this.$serverList.empty();
        let base = $(`<option value="Live" ${serverName=="Live"?"selected":""}>Live</option>`);
        this.$serverList.append(base);
        let test = $(`<option value="Tester" ${serverName=="Tester"?"selected":""}>Tester</option>`);
        this.$serverList.append(test);
        let cserver = $(`<option value="Manual" ${custom?"selected":""}>Manuale</option>`);
        this.$serverList.append(cserver);
        this.$serverList.val(serverName).change();
        this.$autoLogin.prop('checked', this.profile.autologin).trigger("change");
        this.$name.val(this.profile.name ?? "");
        this.$char.val(this.profile.char ?? "");
        this.$pass.val(this.profile.pass ?? "");
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
