import { EventHook } from "./event";

import { UserConfig } from "./userConfig";

import { AliasEditor } from "./aliasEditor";
import { TriggerEditor } from "./triggerEditor";
import { JsScriptWin } from "./jsScriptWin";
import { AboutWin } from "./aboutWin";
import { Mudslinger, setupWorkers } from "./client";
import { ProfilesWindow } from "./profilesWindow";
import { WindowManager } from "./windowManager";
import { VariablesEditor } from "./variablesEditor";
import { ClassEditor } from "./classEditor";
import { EventsEditor } from "./eventsEditor";
import { AskReload, circleNavigate, denyClientVersion, downloadJsonToFile, downloadString, importFromFile, isTrue } from "./util";
import { LayoutManager } from "./layoutManager";
import { EvtScriptEmitPrint, JsScript, ScriptEvent, Variable } from "./jsScript";
import { OutputWin } from "./outputWin";
import { Button, Messagebox, Notification } from "./messagebox";
import { Class } from "./classManager";
import { TrigAlItem } from "./trigAlEditBase";
import { AppInfo } from "./appInfo";
import { NumpadWin } from "./numpadWin";
import { HelpWin } from "./helpWindow";
import { Mapper } from "./mapper";
import { VersionsWin } from "./versionsWindow";
import { OutputLogger } from "./outputLogger";

export class MenuBar {
    public EvtChangeDefaultColor = new EventHook<[string, string]>();
    public EvtChangeDefaultBgColor = new EventHook<[string, string]>();
    public EvtContactClicked = new EventHook<void>();
    public EvtConnectClicked = new EventHook<void>();
    public EvtProfileClicked = new EventHook<void>();
    public EvtDisconnectClicked = new EventHook<void>();
    private clickFuncs: {[k: string]: (value:any) => void} = {};
    private windowManager:WindowManager;
    private layout:LayoutManager;
    private config:UserConfig;
    private optionMappingToStorage = new Map([
        ["connect", ""],
        ["log", ""],
        ["use-profile", ""],
        ["aliases", ""],
        ["variables", ""],
        ["triggers", ""],
        ["base_triggers", ""],
        ["classes", ""],
        ["script", ""],
        ["config", ""],
        ["text-color", ""],
        ["white-on-black", "text-color"],
        ["green-on-black", "text-color"],
        ["black-on-gray", "text-color"],
        ["black-on-white", "text-color"],
        ["wrap-lines", "wrap-lines"],
        ["enable-color", "colorsEnabled"],
        ["enable-utf8", "utf8Enabled"],
        ["enable-mxp", "mxpEnabled"],
        ["enable-mxp-images", "mxpImagesEnabled"],
        ["enable-aliases", "aliasesEnabled"],
        ["enable-triggers", "triggersEnabled"],
        ["enable-sounds", "soundsEnabled"],
        ["smallest-font", "font-size"],
        ["extra-small-font", "font-size"],
        ["small-font", "font-size"],
        ["normal-font", "font-size"],
        ["large-font", "font-size"],
        ["extra-large-font", "font-size"],
        ["courier", "font"],
        ["consolas", "font"],
        ["monospace", "font"],
        ["lucida", "font"],
        ["vera", "font"],
        ["reset-settings", ""],
        ["import-settings", ""],
        ["export-settings", ""],
        ["import-layout", ""],
        ["export-layout", ""],
        ["log-time", "logTime"],
        ["debug-scripts", "debugScripts"],
        ["about", ""],
        ["docs", ""],
        ["contact", ""],
        ["profiles", ""],
        ["scrollbuffer", "maxLines"],
        ["animatescroll", "animatescroll"],
        ["copyOnMouseUp", "copyOnMouseUp"],
    ]); 

    private attachMenuOption(name:string, value:string, element:Element, checkbox:Element) {
        const clickable = name in this.clickFuncs;
        const storageKey = this.optionMappingToStorage.get(name);
        if (checkbox && storageKey) {
            const storageVal = this.config.get(storageKey);
            const onStorageChanged:(val:string)=>void = (storageValNew) => {
                if (storageValNew) {
                    $(checkbox).attr('checked', storageValNew);
                    $(checkbox).prop('checked', storageValNew);
                    $(element)[0].setAttribute("data-checked", storageValNew);
                    if (clickable) this.clickFuncs[name](storageValNew);
                } else if (storageValNew != undefined) {
                    $(checkbox).removeAttr('checked');
                    $(checkbox).prop('checked', storageValNew);
                    $(element)[0].setAttribute("data-checked", "false");
                    if (clickable) this.clickFuncs[name](storageValNew);
                }
                if (storageValNew != undefined) {
                    console.log(`${name} set to ${storageValNew}`);
                    //Notification.Show(`${name}: ${storageValNew}`, true)
                }
            };
            onStorageChanged(storageVal);
            this.config.onSet(storageKey, onStorageChanged);
            let config = this.config
            $(checkbox).change((event: JQueryEventObject) => {
                const val = (<any>event.target).checked;
                config.set(storageKey, val);
                if (!clickable) {
                    Notification.Show(`${name}: ${val?"abilitato":"disabilitato"}`, true)
                }
                //if (clickable) this.clickFuncs[name]((<any>event.target).checked);
            });
        } else if (checkbox && !storageKey) {
            $(checkbox).change((event: JQueryEventObject) => {
                if (clickable) this.clickFuncs[name](!(<any>event.target).checked);
            });
        } else if (storageKey) {
            if (clickable) this.clickFuncs[name](this.config.get(storageKey));
        }
        if (clickable) {
            //console.log(`Attaching menu item ${name}`);
            let x = $(element);
            $(element).click((event: JQueryEventObject) => {
                if (!event.target || (event.target.tagName != "LI")) return;
                if (!checkbox && storageKey) {
                    this.config.set(storageKey, value || name);
                    this.clickFuncs[name](name);
                    //Notification.Show(`${name}: ${value|| name}`, true)
                } else {
                    const checked = $(element)[0].getAttribute("data-checked");
                    this.clickFuncs[name](checked);
                    //Notification.Show(`${name}: ${checked}`, true)
                }
            });
        } else if (value && name && storageKey) {
            $(element).click((event: JQueryEventObject) => {
                if (!event.target || (event.target.tagName != "LI" /*&& event.target.tagName != "LABEL"*/)) return;
                
                this.config.set(storageKey, value);
                Notification.Show(`${name}: ${value}`, true)
            });
        } /*else if (name && storageKey) {
            $(element).click((event: JQueryEventObject) => {
                if (!event.target || (event.target.tagName != "LI" )) return;
                
                this.config.set(storageKey, name);
            });
        };*/
    }

    private detachMenuOption(name:string, element:Element, checkbox:Element) {
        if (element) $(element).off("click");
        const storageKey = this.optionMappingToStorage.get(name);
        if (storageKey) this.config.onSet(storageKey, null);
        if (checkbox) $(checkbox).off("change");
    }

    private attachMenu() {
        $("document").ready(()=>{
            $("[data-option-name]").each((i, e) => {
                const name = $(e)[0].getAttribute("data-option-name");
                const val = $(e)[0].getAttribute("data-option-value");
                const chk = $(e).find("input[type='checkbox']")[0];
                this.attachMenuOption(name, val, e, chk);
            });
        });
    }

    private detachMenu() {
        $("document").ready(()=>{
            $("[data-option-name]").each((i, e) => {
                const name = $(e)[0].getAttribute("data-option-name");
                const chk = $(e).find("input[type='checkbox']")[0];
                this.detachMenuOption(name, e, chk);
            });
        });
    }

    constructor(
        private aliasEditor: AliasEditor,
        private triggerEditor: TriggerEditor,
        private baseTriggerEditor: TriggerEditor,
        private baseAliasEditor: AliasEditor,
        private jsScriptWin: JsScriptWin,
        private aboutWin: AboutWin,
        private profileWin: ProfilesWindow,
        config: UserConfig,
        private variableEditor:VariablesEditor,
        private classEditor: ClassEditor,
        private eventEditor: EventsEditor,
        private baseEventEditor: EventsEditor,
        private numpadWin: NumpadWin,
        private jsScript: JsScript,
        private outWin:OutputWin,
        private baseConfig: UserConfig,
        private helpWin: HelpWin,
        private mapper: Mapper,
        private changelog: VersionsWin
        ) 
    {
        var userAgent = navigator.userAgent.toLowerCase();
        function toggleFullscreen() {
            let elem = document.documentElement;
          
            if (!document.fullscreenElement) {
              elem.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          }

        $("#menuBar>ul").append("<div class='rightMenu'><span class='electron' id='electronMenu'><button id='electronZoomOut'>-</button><span id='electronZoom'></span><button id='electronZoomIn'>+</button></span><span id='currentTime'></span><span id='fullscreenButton' title='Schermo intero'>&#x26F6;</span></div>");
        var currentTimeSpan = $("#currentTime");
        var fsButton = $("#fullscreenButton");
        if (!document.documentElement.requestFullscreen) {
            fsButton.remove()
        } else {
            fsButton.on("click", (ev) => {
                toggleFullscreen();
            })
        }



        if (userAgent.indexOf(' electron/') > -1) {
            console.log("In electron")

            $("#electronZoomOut").on('click', ()=> {
                if ((<any>window).ipcRenderer) (<any>window).ipcRenderer.invoke('setZoom', 'out').then(()=>console.log("Invoked"))
            })
            $("#electronZoomIn").on('click', ()=> {
                if ((<any>window).ipcRenderer) (<any>window).ipcRenderer.invoke('setZoom', 'in').then(()=>console.log("Invoked"))
            })
            $(".electron", "#menuBar").css({"display": "inline-block"}).show();
        } else {
            $(".electron", "#menuBar").remove();
        }

        if (!(<any>window).deferredPrompt) {
            $("#appInstallMenu").remove()
        }

        const mnu:any = <JQuery>((<any>$("#menuBar")).jqxMenu({autoOpen: true, clickToOpen: true, keyboardNavigation: true}));

        circleNavigate($("#connessione",$("#menuBar")), $("#altro",$("#menuBar")), null, null);
        
        $("#menuBar").on('itemclick', (event) =>
        {
            document.getSelection().removeAllRanges();
            if (event.originalEvent instanceof KeyboardEvent) {
                $((<any>event).args).click()
                return;
            }
            if ($((<any>event).args).find(".jqx-icon-arrow-right").length || $((<any>event).args).closest(".jqx-menu-popup").length==0) return;
            mnu.jqxMenu('closeItem',"connessione")
            mnu.jqxMenu('closeItem',"impostazioni")
            mnu.jqxMenu('closeItem',"scripting")
            mnu.jqxMenu('closeItem',"finestre")
            mnu.jqxMenu('closeItem',"altro")
        });

        $("#menuBar").on('keyup', (event) =>
        {
            if (event.key == "Escape") {
                event.preventDefault()
                event.stopPropagation()
                mnu.jqxMenu('closeItem',"connessione")
                mnu.jqxMenu('closeItem',"impostazioni")
                mnu.jqxMenu('closeItem',"scripting")
                mnu.jqxMenu('closeItem',"finestre")
                mnu.jqxMenu('closeItem',"altro")
                $("#cmdInput").focus()
            }
        });

        $(document).on("keydown", (ev)=>{
            if (ev.altKey && !ev.shiftKey && !ev.ctrlKey && ev.key == "Alt") {
                //ev.preventDefault()
                //ev.stopPropagation()
            }
        });
        window.addEventListener("blur", (ev)=>{
            if (document.activeElement == document.body) setTimeout(()=>{
                if (document.activeElement == document.body)
                     $("#cmdInput").focus()
                },10)
        }, true);
        window.addEventListener("focus", (ev)=>{
            if (document.activeElement == document.body) setTimeout(()=>{
                if (document.activeElement == document.body)
                     $("#cmdInput").focus()
                },10)
        }, true);

        $("#cmdInput").on("keyup", (ev)=>{
            if (!ev.altKey && !ev.shiftKey && !ev.ctrlKey && ev.key == "Alt") {
                const loc = (<any>ev.originalEvent).location || 0;
                if (document.activeElement != mnu[0] && loc == 1) {
                    mnu.jqxMenu('focus');
                    ev.preventDefault()
                    ev.stopPropagation()
                } else {
                    $("#cmdInput").focus()
                    ev.preventDefault()
                    ev.stopPropagation()
                }
            }
        });

        (<any>Date.prototype).timeNow = function () {
            return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
        }

        currentTimeSpan.text((<any>new Date()).timeNow())
        setInterval(()=>{
            currentTimeSpan.text((<any>new Date()).timeNow())
        }, 30000);

        this.makeClickFuncs();
        setTimeout(() => {
            this.setConfig(config)
        }, 0);

        setupWorkers();
    }

    public setWIndowManager(windowM:WindowManager) {
        this.windowManager = windowM;
        this.windowManager.EvtEmitWindowsChanged.handle((v) => this.windowsChanged(v));
        this.layout = this.windowManager.getLayoutManager();
    }

    windowsChanged(windows: string[]) {
        $("#windowList").empty();
        if (windows.length == 0) {
            $("#windowList").append("<li>&lt;nessuna&gt;</li>");
            return;
        }
        for (const iterator of windows) {
            if (iterator == "Mapper") continue;
            let li = $("<li class='jqx-item jqx-menu-item jqx-rc-all' role='menuitem'>" + iterator + "</li>");
            let self = this;
            li.on("click", () => {
                self.windowManager.show(iterator);
            });
            $("#windowList").append(li);
        }
    }

    public setConfig(newConfig:UserConfig) {
        if (this.config) {
            this.detachMenu();
            this.config.evtConfigImport.release(this.onImport);
        }
        this.config = newConfig;
        this.handleNewConfig();
        this.attachMenu();
    }

    public triggerAction(action: string, param: string) {
        const f = this.clickFuncs[action]
        if (f instanceof Function) {
            f(param)
        } else {
            this.outWin.handleWindowError(`L'azione ${action} non esiste.`, "menuBar.triggerAction", '', '', null); 
        }
    }

    private onImport = ()=> {
        //this.detachMenu();
        //this.attachMenu();
    }

    private handleNewConfig() {
        this.config.evtConfigImport.handle(this.onImport);
    }

    private makeClickFuncs() {
        let logger = new OutputLogger();

        this.clickFuncs["installapp"] = (val) => {
            Mudslinger.AskForInstall(true);
        }
        
        this.clickFuncs["theme-default"] = (val) => {
            Mudslinger.setTheme("metro", "light", "neat")
        }

        this.clickFuncs["theme-light"] = (val) => {
            Mudslinger.setTheme("metro", "light", "neat")
        }

        this.clickFuncs["theme-dark"] = (val) => {
            Mudslinger.setTheme("metrodark", "dark", "material")
        }

        this.clickFuncs["connect"] = (val) => {
            if (isTrue(val)) {
                this.EvtDisconnectClicked.fire();
                Notification.Show(`Disconnessione`, true)
            }
            else {
                this.EvtConnectClicked.fire();
                Notification.Show(`Connessione`, true)
            }
        };

        this.clickFuncs["help"] = (val) => {
            this.helpWin.show();            
        };

        this.clickFuncs["changelog"] = (val) => {
            this.changelog.show();            
        };

        this.clickFuncs["stoplog"] = (val) => {
            logger.clear()
            this.outWin.log = false
            EvtScriptEmitPrint.fire({owner:"TS2Client", message: "Logging interrotto"})
            Notification.Show(`Logging interrotto`, true)
        };
        this.clickFuncs["log"] = (val) => {
            logger.clear()
            this.outWin.log = true
            EvtScriptEmitPrint.fire({owner:"TS2Client", message: "Inizio log"})
            Notification.Show(`Inizio log`, true)
        };

        this.clickFuncs["downloadlog"] = async (val) => {
            if (val || !logger.empty()) {
                downloadString(val || await logger.content(), `log-${this.jsScript.getVariableValue("TSPersonaggio")||"sconosciuto"}-${new Date().toLocaleDateString()}.txt`)
            }
        };

        this.clickFuncs["reset-settings"] = (val) => {
            this.config.remove(new RegExp("^(?!alias)(?!trigger)"), () => {Mudslinger.setDefaults(this.config)});
            location.reload();
        };

        this.clickFuncs["export-settings"] = () => {
            this.config.exportToFile(this.mapper);
        };

        this.clickFuncs["import-settings"] = () => {
            this.config.importFromFile(this.mapper);
        };

        this.clickFuncs["export-layout"] = () => {
            this.layout.exportToFile();
        };

        this.clickFuncs["import-layout"] = () => {
            this.layout.importFromFile();
        };

        this.clickFuncs["update-triggers"] = async () => {
            if ((await Messagebox.Question("Sei sicuro di voler aggiornare i script preimpostati?")).button == Button.Ok) {
                localStorage.setItem("old_UserConfig", localStorage.getItem("userConfig"))
                this.profileWin.ImportBaseTriggers(true);
            }
        }

        this.clickFuncs["mapper"] = () => {
            this.windowManager.createWindow("Mapper");
            this.windowManager.show("Mapper");
        };

        this.clickFuncs["wrap-lines"] = (val) => {
            if (!isTrue(val)) {
                $(".outputText").addClass("output-prewrap");
                Notification.Show(`Capolinea disabilitato`, true)
            } else {
                $(".outputText").removeClass("output-prewrap");
                Notification.Show(`Capolinea abilitato`, true)
            }
        };

        var removeFontSizes = () => {
            $(".outputText").removeClass("smallest-text");
            $(".outputText").removeClass("extra-small-text");
            $(".outputText").removeClass("small-text");
            $(".outputText").removeClass("normal-text");
            $(".outputText").removeClass("large-text");
            $(".outputText").removeClass("extra-large-text");
        };

        var removeFonts = () => {
            $(".outputText").removeClass("courier");
            $(".outputText").removeClass("consolas");
            $(".outputText").removeClass("monospace");
            $(".outputText").removeClass("lucida");
            $(".outputText").removeClass("vera");
        };

        this.clickFuncs["enable-color"] = (val) => {
            if (isTrue(val)) {
                this.EvtChangeDefaultColor.fire(["white", "low"]);
                this.EvtChangeDefaultBgColor.fire(["black", "low"]);
                Notification.Show(`Colori ANSI abilitati`, true)
            } else {
                Notification.Show(`Colori ANSI disabilitati`, true)
            }
        }

        this.clickFuncs["use-profile"] = (val) => {
            this.EvtProfileClicked.fire();
        }

        this.clickFuncs["courier"] = (val) => {
            if (val == "courier") {
                removeFonts();
                $(".outputText").addClass("courier");
                Notification.Show(`Font: Courier`, true)
            }
        };

        this.clickFuncs["consolas"] = (val) => {
            if (val == "consolas") {
                removeFonts();
                $(".outputText").addClass("consolas");
                Notification.Show(`Font: Consolas`, true)
            }
        };

        this.clickFuncs["lucida"] = (val) => {
            if (val == "lucida") {
                removeFonts();
                $(".outputText").addClass("lucida");
                Notification.Show(`Font: Lucida Console`, true)
            }
        };

        this.clickFuncs["numpadconfig"] = (val) => {
            this.numpadWin.show()            
        };

        this.clickFuncs["monospace"] = (val) => {
            if (val == "monospace") {
                removeFonts();
                $(".outputText").addClass("monospace");
                Notification.Show(`Font: Monospace`, true)
            }
        };

        this.clickFuncs["vera"] = (val) => {
            if (val == "vera") {
                removeFonts();
                $(".outputText").addClass("vera");
                Notification.Show(`Font: Bitstream Vera Sans`, true)
            }
        };

        this.clickFuncs["extra-small-font"] = (val) => {
            if (val == "extra-small-font") {
                removeFontSizes();
                $(".outputText").addClass("extra-small-text");
                Notification.Show(`Font: minuscolo`, true)
            }
        };

        this.clickFuncs["smallest-font"] = (val) => {
            if (val == "smallest-font") {
                removeFontSizes();
                $(".outputText").addClass("smallest-text");
                Notification.Show(`Font: microscopico`, true)
            }
        };

        this.clickFuncs["small-font"] = (val) => {
            if (val == "small-font") {
                removeFontSizes();
                $(".outputText").addClass("small-text");
                Notification.Show(`Font: piccolo`, true)
            }
        };

        this.clickFuncs["normal-font"] = (val) => {
            if (val == "normal-font") {
                removeFontSizes();
                $(".outputText").addClass("normal-text");
                Notification.Show(`Font: normale`, true)
            }
        };

        this.clickFuncs["large-font"] = (val) => {
            if (val == "large-font") {
                removeFontSizes();
                $(".outputText").addClass("large-text");
                Notification.Show(`Font: grande`, true)
            }
        };

        this.clickFuncs["extra-large-font"] = (val) => {
            if (val == "extra-large-font") {
                removeFontSizes();
                $(".outputText").addClass("extra-large-text");
                Notification.Show(`Font: enorme`, true)
            }
        };

        this.clickFuncs["aliases"] = (val) => {
            this.aliasEditor.show();
        };

        this.clickFuncs["base_aliases"] = (val) => {
            this.baseAliasEditor.show();
        };

        this.clickFuncs["triggers"] = (val) => {
            this.triggerEditor.show();
        };

        this.clickFuncs["base_triggers"] = (val) => {
            this.baseTriggerEditor.show();
        };

        this.clickFuncs["base_events"] = (val) => {
            this.baseEventEditor.show();
        };

        function hasDuplicates(array:any[]) {
            return (new Set(array)).size !== array.length;
        }

        var exportClassFunc = async (config:UserConfig) => {
            const response = await Messagebox.ShowMultiInput("Esporta scripts", ["Nome o regex della classe (richiesto)","Descrizione (opzionale)","Nome file (opzionale)"], ["", "", ""])
        
            if (response.button != Button.Ok || !response.results[0]) return;

            const cfg = JSON.parse(config.saveConfig())


            const cls = [...(new Map<string,Class>(cfg.classes))].filter((tr) => !!tr[0].match(new RegExp("^" + response.result + "$", "i"))).map(v => v[1]);
            
            if (!cls || !cls[0]) {
                Messagebox.Show("Errore", "Classi insesistenti con questo filtro, anche se forse hai i trigger con quella classe.\nCreala manualmente oppure disabilita o abilita quella classe almeno una volta.");
                return;
            }

            const flt = (tr:any):boolean => {
                const ret = !!cls.find(v => v.name == tr.class);
                return ret;
            }

            const trgs: TrigAlItem[] = cfg.triggers ? (cfg.triggers).filter(flt) : [];
            const als: TrigAlItem[] = cfg.aliases ? (cfg.aliases).filter(flt) : [];
            const evs: ScriptEvent[] = cfg.script_events ? [...[...(new Map<string,ScriptEvent[]>(cfg.script_events))].map(v => v[1])].flat().filter(flt) : [];
            const vars: Variable[] = cfg.variables ? [...[...(new Map<string,Variable>(cfg.variables))].map(v => v[1])].filter(flt) : [];

            if (!(trgs.length + als.length + evs.length + vars.length)) {
                Messagebox.Show("Errore", "La classe non contiene trigger, alias, variabili o eventi (e' vuota).");
                return;
            }

            {
                if (hasDuplicates(trgs.map(t => t.pattern + t.id))) {
                    Messagebox.Show("Errore", "Trigger non univoci (pattern + id).");
                    return;
                }
                if (hasDuplicates(als.map(t => t.pattern + t.id))) {
                    Messagebox.Show("Errore", "Alias non univoci (pattern + id).");
                    return;
                }
                if (hasDuplicates(evs.map(t => t.type + t.condition + t.id))) {
                    Messagebox.Show("Errore", "Eventi non univoci (type + condition + id).");
                    return;
                }
            }

            const ver = AppInfo.Version.split(".")
            const dt = new Date();
            const exportObj = {
                aliases: als,
                triggers: trgs,
                events: evs,
                classes: cls,
                variables: vars,
                requiresClientMajor: parseInt(ver[0]),
                requiresClientMinor: parseInt(ver[1]),
                requiresClientRevision: parseInt(ver[2]),
                description: response.results[1],
                datetime: dt.toDateString() + " " + dt.getHours() + ":" + dt.getMinutes() 
            }

            downloadJsonToFile(exportObj, response.results[2] || "export_scripts.json")
        }

        var importScriptsFunc = async (config:UserConfig) => {
            importFromFile(async (data) => {
                let importObj = <any>null;
                try {
                importObj = JSON.parse(data)
                } catch {
                    Messagebox.Show("Errore", "File script non valido")
                    return;
                }

                let denyReason = "";
                if ((denyReason = denyClientVersion(importObj))) {
                    Messagebox.Show("Errore", `E' impossibile caricare questa versione di script.\nE' richiesta una versione piu' alta del client.\nVersione client richiesta: ${denyReason}\nVersione attuale: ${AppInfo.Version}\n\nAggiorna il client che usi per poter usare questa configurazione.`)
                    return;
                }

                if (!importObj.aliases ||
                    !importObj.triggers ||
                    !importObj.classes ||
                    !importObj.variables ||
                    !importObj.events) {
                    Messagebox.Show("Errore", "File script non valido")
                    return;
                }

                if (importObj.aliases.length +
                    importObj.triggers.length +
                    importObj.classes.length +
                    importObj.variables.length +
                    importObj.events.length == 0) {
                    Messagebox.Show("Errore", "Il file non contiene scripts (e' vuoto)")
                    return;
                }

                const str = `${config.name?"["+config.name+"]\n":"[preimpostati]\n"}Verranno importati scripts${importObj.description ? " '" + importObj.description + "'": ""}:

Alias: ${importObj.aliases.length}
Triggers: ${importObj.triggers.length}
Classi: ${importObj.classes.length}
Variabili: ${importObj.variables.length}
Eventi: ${importObj.events.length}

${importObj.datetime ? "Esportati in data: " + importObj.datetime + "\n": ""}Vuoi procedere?`
                if ((await Messagebox.Question(str)).button == Button.Ok) {
                    const trgs:TrigAlItem[] = config.get("triggers") || [];
                    const als:TrigAlItem[] = config.get("aliases") || [];
                    const evs = [...(config.get("script_events") || [])];
                    const vars = [...(config.get("variables") || [])];
                    const cls = [...(config.get("classes") || [])];
                    const trgsI:TrigAlItem[] = importObj.triggers
                    const alsI:TrigAlItem[] = importObj.aliases
                    const varsI:[] = importObj.variables
                    const clsI:[] = importObj.classes
                    const evsI:[] = importObj.events
                    
                    const trgMap = new Map<string, TrigAlItem>()
                    trgs.forEach((el) => {
                        trgMap.set(el.pattern+el.class+el.id, el)
                    });
                    trgsI.forEach((el) => {
                        trgMap.set(el.pattern+el.class+el.id, el)
                    });
                    const newTr = [...trgMap.values()]

                    const alsMap = new Map<string, TrigAlItem>()
                    als.forEach((el) => {
                        alsMap.set(el.pattern+el.class+el.id, el)
                    });
                    alsI.forEach((el) => {
                        alsMap.set(el.pattern+el.class+el.id, el)
                    });
                    const newAls = [...alsMap.values()]

                    const varMapNew = new Map<string, Variable>(vars)
                    varsI.forEach((el:Variable) => {
                        varMapNew.set(el.name, el)
                    });
                    const newVars = [...varMapNew]

                    const clsMapNew = new Map<string, Variable>(cls)
                    clsI.forEach((el:Variable) => {
                        clsMapNew.set(el.name, el)
                    });
                    const newCls = [...clsMapNew]

                    const evMapNew = new Map<string, ScriptEvent[]>(evs)
                    evsI.forEach((el:ScriptEvent) => {
                        let etype = evMapNew.get(el.type) as ScriptEvent[]
                        if (!etype) {
                            etype = []
                            evMapNew.set(el.type, etype)
                        }
                        const insertIndex = etype.findIndex((v) => v.type + v.condition + v.id + v.class == el.type + el.condition + el.id + el.class)
                        if (insertIndex > -1) {
                            etype[insertIndex] = el
                        } else {
                            etype.push(el)
                        }
                    });
                    const newEvs = [...evMapNew]
                    
                    config.set("triggers", newTr, true);
                    config.set("aliases", newAls, true);
                    config.set("script_events", newEvs, true);
                    config.set("variables", newVars, true);
                    config.set("classes", newCls, true);

                    config.saveConfig()
                    
                    AskReload()
                }
            })
        }

        this.clickFuncs["exportclass"] = async (val) => {
            exportClassFunc(this.config);
        };

        this.clickFuncs["importscript"] = (val) => {
            importScriptsFunc(this.config)
        };

        this.clickFuncs["base_exportclass"] = async (val) => {
            exportClassFunc(this.baseConfig);
        };

        this.clickFuncs["base_importscript"] = (val) => {
            importScriptsFunc(this.baseConfig)
        };

        this.clickFuncs["colorsEnabled"] = (val) => {
            if (isTrue(val)) {
                this.config.set("text-color", undefined);
                Notification.Show(`Colori: abilitati`, true)
            } else {
                Notification.Show(`Colori: disabilitati`, true)
            }
        };

        this.clickFuncs["green-on-black"] = (val) => {
            if (val == "green-on-black") {
                this.EvtChangeDefaultColor.fire(["green", "low"]);
                this.EvtChangeDefaultBgColor.fire(["black", "low"]);
                Notification.Show(`Testo: verde su nero`, true)
            }
        };

        this.clickFuncs["white-on-black"] = (val) => {
            if (val == "white-on-black") {
                this.EvtChangeDefaultColor.fire(["white", "low"]);
                this.EvtChangeDefaultBgColor.fire(["black", "low"]);
                Notification.Show(`Testo: bianco su nero`, true)
            }
        };

        this.clickFuncs["black-on-gray"] = (val) => {
            if (val == "black-on-gray") {
                this.EvtChangeDefaultColor.fire(["black", "low"]);
                this.EvtChangeDefaultBgColor.fire(["white", "low"]);
                Notification.Show(`Testo: nero su grigio (funziona solo senza colori ansi)`, true)
            }
        };

        this.clickFuncs["variables"] = (val) => {
            
            this.variableEditor.show();
        };

        this.clickFuncs["classes"] = (val) => {
            
            this.classEditor.show();
        };

        this.clickFuncs["events"] = (val) => {
            
            this.eventEditor.show();
        };

        this.clickFuncs["black-on-white"] = (val) => {
            if (val == "black-on-white") {
                this.EvtChangeDefaultColor.fire(["black", "low"]);
                this.EvtChangeDefaultBgColor.fire(["white", "high"]);
                Notification.Show(`Testo: nero su bianco (funziona solo senza colori ansi)`, true)
            }
        };

        this.clickFuncs["script"] = (val) => {
            this.jsScriptWin.show();
        };

        this.clickFuncs["about"] = (val) => {
            this.aboutWin.show();
        };

        this.clickFuncs["contact"] = (val) => {
            this.EvtContactClicked.fire(null);
        };
    }

    handleTelnetConnect() {
        $("#menuBar-conn-disconn").html("<span style='float: left; margin-right: 5px;width:16px;height:16px;text-align:center;' >&#69464;</span>Disconnetti");
        $("#menuBar-conn-disconn")[0].setAttribute("data-checked", "true");
    }

    handleTelnetDisconnect() {
        $("#menuBar-conn-disconn").html("<span style='float: left; margin-right: 5px;width:16px;height:16px;text-align:center;' >&#128279;</span>Connetti");
        $("#menuBar-conn-disconn")[0].setAttribute("data-checked", "false");
    }
}
