import { EventHook } from "../Core/event";
import { denyClientVersion, getVersionNumbers, throttle } from "../Core/util";
import { AppInfo } from '../appInfo'
import { Button, ButtonOK, Messagebox } from "./messagebox";
import { Favorite, Mapper } from "../Mapper/mapper";
import { EvtScriptEvent, ScripEventTypes } from "../Scripting/jsScript";

export class UserConfigData {
    name:string;
    cfgVals: {[k: string]: any};
}

export class UserConfig {
    public data = new UserConfigData();
    private setHandlers: {[k: string]: EventHook<any>} = {};
    public evtConfigImport = new EventHook<{data: {[k: string]: any}, owner: any}>();

    private saveFunc: (v: string) => string;
    private saveConfigFunc: (cfg: UserConfig) => UserConfig;

    public init(name:string, userConfigStr: string, saveFunc_: (v: string) => string) {
        this.data.name = name;
        this.saveFunc = saveFunc_;
        
        if (userConfigStr) {
            this.copy(userConfigStr);
        } else {
            this.data.cfgVals = {};
        }

        this.evtConfigImport.fire({ data: this.data.cfgVals, owner: this });
    }

    public clone(name:string, config: UserConfig, saveFunc_: (cfg: UserConfig) => UserConfig) {
        this.data.name = name;
        this.saveConfigFunc = saveFunc_;
        
        if (config) {
            this.copyConfig(config);
        } else {
            this.data.cfgVals = {};
            this.evtConfigImport.fire({ data: this.data.cfgVals, owner: this });
        }
    }

    public copy(userConfigStr: string) {
        this.data.cfgVals = {};
        const cfgVals: {[k: string]: any} = JSON.parse(userConfigStr);
        for (const key in cfgVals) {
            if (Object.prototype.hasOwnProperty.call(cfgVals, key)) {
                const element = cfgVals[key];
                this.set(key, element, true);
            }
        }
        this.evtConfigImport.fire({ data: this.data.cfgVals, owner: this });
        this.saveConfig();
    }

    public copyConfig(config: UserConfig) {
        this.data.cfgVals = {};
        for (const key in config.data.cfgVals) {
            if (Object.prototype.hasOwnProperty.call(config.data.cfgVals, key)) {
                const element = config.data.cfgVals[key];
                this.set(key, element, true);
            }
        }
        this.evtConfigImport.fire({ data: this.data.cfgVals, owner: this });
        this.saveConfig();
    }

    public remove(nameFilter:RegExp, cb:()=>void) {
        for (const key in this.data.cfgVals) {
            if (Object.prototype.hasOwnProperty.call(this.data.cfgVals, key)) {
                const element = this.data.cfgVals[key];
                if (nameFilter.test(key)) {
                    delete this.data.cfgVals[key];
                }
            }
        }
        cb();
        for (const key in this.setHandlers) {
            if (Object.prototype.hasOwnProperty.call(this.setHandlers, key)) {
                const element = this.setHandlers[key];
                this.setHandlers[key].fire(this.get(key));
            }
        }
    }

    public onSet(key: string, cb: (val: any) => void) {
        if (key in this.setHandlers === false) {
            this.setHandlers[key] = new EventHook<any>();
        }
        if (cb) {
            this.onSetRelease(key, cb)
            this.setHandlers[key].handle(cb);
        } else {
            delete this.setHandlers[key];
        }
    }

    public onSetRelease(key: string, cb: (val: any) => void) {
        if (key in this.setHandlers === false) {
            return
        }
        if (cb) {
            this.setHandlers[key].release(cb);
        } else {
            delete this.setHandlers[key];
        }
    }

    public getDef(key: string, def: any): any {
        let res = this.data.cfgVals[key];
        return (res === undefined) ? def : res;
    }

    public get(key: string): any {
        return this.data.cfgVals[key];
    }

    private firing:boolean;
    public set(key: string, val: any, nosave:boolean=false) {
        if (this.firing) {
            //console.log("Setting while firing");
            return
        }
        const prev = this.data.cfgVals[key];
        this.data.cfgVals[key] = val;
        if (!nosave) this.saveConfig();
        if (!nosave && 
            !["triggers", "variables","events","classes"].includes(key) &&
            ((typeof prev == "object" || typeof val == "object") ?
                (JSON.stringify(prev) != JSON.stringify(val)) :
                (prev != val))
        ) {
            EvtScriptEvent.fire({event: ScripEventTypes.SettingChanged, condition: key, value: val});
        }

        if (prev != val && key in this.setHandlers) {
            this.firing = true;
            try {
                this.setHandlers[key].fire(val)
            } finally {
                this.firing = false;
            }
        }
    }

    public saveConfigToString():string {
        let val:string;
        let to_convert:string[] = [];
        for (const key in this.data.cfgVals) {
            if (Object.prototype.hasOwnProperty.call(this.data.cfgVals, key)) {
                const element = this.data.cfgVals[key];
                if (element instanceof Map) {
                    to_convert.push(key);
                    // map is not serializable convert to array 
                    this.data.cfgVals[key] = [...this.data.cfgVals[key]];
                }
            }
        }
        val = JSON.stringify(this.data.cfgVals);
        for (const iterator of to_convert) {
            // and back to map
            this.data.cfgVals[iterator] = new Map<string,any>(this.data.cfgVals[iterator]);
        }

        return (val);
    }

    public saveConfig() {
        let val:string;
        if (!this.saveConfigFunc && this.saveFunc) {
            let to_convert:string[] = [];
            for (const key in this.data.cfgVals) {
                if (Object.prototype.hasOwnProperty.call(this.data.cfgVals, key)) {
                    const element = this.data.cfgVals[key];
                    if (element instanceof Map) {
                        to_convert.push(key);
                        this.data.cfgVals[key] = [...this.data.cfgVals[key]];
                    }
                }
            }
            val = JSON.stringify(this.data.cfgVals);
            for (const iterator of to_convert) {
                this.data.cfgVals[iterator] = new Map<string,any>(this.data.cfgVals[iterator]);
            }
            this.saveFunc(val);
        }
        else if (this.saveConfigFunc) {
            this.saveConfigFunc(this)
        } else {
            console.log("screwup in saveconfig")
        }
    }

    public async exportToFile(mapper?:Mapper) {
        let vals = JSON.stringify(this.data.cfgVals);
        let jso = JSON.parse(vals);
        
        if (mapper) {
            const res = await Messagebox.ShowWithButtons("Export config","Esporta favoriti mapper nel file?","Si", "No");
            if (res.button == ButtonOK) {
                var favorites = mapper.getFavorites();
                jso.favorites = favorites;
            }
        }
        const ver = getVersionNumbers(AppInfo.Version)
            
        jso.requiresClientMajor = (ver[0]);
        jso.requiresClientMinor = (ver[1]);
        jso.requiresClientRevision = (ver[2]);
        let json = JSON.stringify(jso, null, 2);
        let blob = new Blob([json], {type: "octet/stream"});
        let url = window.URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "userConfig.json");
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
    }

    public importFromFile(mapper?:Mapper) {
        let inp: HTMLInputElement = document.createElement("input");
        inp.type = "file";
        inp.style.visibility = "hidden";

        inp.addEventListener("change", (e: any) => {
            let file = e.target.files[0];
            if (!file) {
                return;
            }

            let reader = new FileReader();
            reader.onload = async (e1: any) => {
                let text = e1.target.result;
                let favorites = null;
                if (mapper) {
                    let vals = JSON.parse(text);
                    if (vals && vals.favorites) {
                        const res = await Messagebox.ShowWithButtons("Import config","Importa favoriti mapper dal file?","Si", "No");
                        if (res.button == ButtonOK) {
                            favorites = vals.favorites;
                            delete vals.favorites;
                            text = JSON.stringify(vals);
                        }
                    }
                }
                if (this.ImportText(text) && favorites) {
                    mapper.loadFavorites(favorites);
                }
                // saveConfig();
            };
            reader.readAsText(file);

        });

        document.body.appendChild(inp);
        inp.click();
        document.body.removeChild(inp);
    }

    public ImportText(text: any):boolean {
        let vals = typeof text == "string" ? JSON.parse(text) : text;
        let denyReason = "";
        if ((denyReason = denyClientVersion(vals))) {
            (async ()=> {
                const ret = await Messagebox.Question(`E' impossibile caricare questa versione di script.\nE' richiesta una versione piu' alta del client.\nVersione client richiesta: ${denyReason}\nVersione attuale: ${AppInfo.Version}\n\nAggiorna il client che usi per poter usare questa configurazione.\n\n<a href="https://github.com/temporasanguinis/TS2-Client/releases" target="_blank">Scarica l'ultima versione da qui</a>\n\nSe credi che questo sia un errore puoi provare a rilanciare il client senza caching premendo Si.`)
                if (ret.button == Button.Ok) {
                    $.ajax({
                        url: window.location.href,
                        headers: {
                            "Pragma": "no-cache",
                            "Expires": -1,
                            "Cache-Control": "no-cache"
                        }
                    }).done(function () {
                        window.location.reload();
                    });
                }
            })();
            return false;
        }
        this.data.cfgVals = vals;
        this.saveConfig()
        this.evtConfigImport.fire({data: vals, owner: this});
        return true;
    }
}
