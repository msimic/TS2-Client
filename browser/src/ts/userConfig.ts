import { EventHook } from "./event";
import { denyClientVersion, throttle } from "./util";
import { AppInfo } from './appInfo'
import { ButtonOK, Messagebox } from "./messagebox";
import { Favorite, Mapper } from "./mapper";

export class UserConfig {
    name:string;
    cfgVals: {[k: string]: any};
    private setHandlers: {[k: string]: EventHook<any>} = {};
    public evtConfigImport = new EventHook<{data: {[k: string]: any}, owner: any}>();

    private saveFunc: (v: string) => string;

    public init(name:string, userConfigStr: string, saveFunc_: (v: string) => string) {
        this.name = name;
        this.saveFunc = saveFunc_;
        
        if (userConfigStr) {
            this.cfgVals = {};
            this.copy(userConfigStr);
        } else {
            this.cfgVals = {};
        }

        this.evtConfigImport.fire({ data: this.cfgVals, owner: this });
    }

    public copy(userConfigStr: string) {
        const cfgVals: {[k: string]: any} = JSON.parse(userConfigStr);
        for (const key in cfgVals) {
            if (Object.prototype.hasOwnProperty.call(cfgVals, key)) {
                const element = cfgVals[key];
                this.set(key, element, true);
            }
        }
        this.saveConfig();
    }

    public remove(nameFilter:RegExp, cb:()=>void) {
        for (const key in this.cfgVals) {
            if (Object.prototype.hasOwnProperty.call(this.cfgVals, key)) {
                const element = this.cfgVals[key];
                if (nameFilter.test(key)) {
                    delete this.cfgVals[key];
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
        let res = this.cfgVals[key];
        return (res === undefined) ? def : res;
    }

    public get(key: string): any {
        return this.cfgVals[key];
    }

    private firing:boolean;
    public set(key: string, val: any, nosave:boolean=false) {
        if (this.firing) {
            console.log("Setting while firing");
        }
        const prev = this.cfgVals[key];
        this.cfgVals[key] = val;
        if (!nosave) this.saveConfig();
        if (prev != val && key in this.setHandlers) {
            this.firing = true;
            this.setHandlers[key].fire(val)
            this.firing = false;
        }
    }

    public saveConfig():string {
        let val:string;
        let to_convert:string[] = [];
        for (const key in this.cfgVals) {
            if (Object.prototype.hasOwnProperty.call(this.cfgVals, key)) {
                const element = this.cfgVals[key];
                if (element instanceof Map) {
                    to_convert.push(key);
                    this.cfgVals[key] = [...this.cfgVals[key]];
                }
            }
        }
        val = JSON.stringify(this.cfgVals);
        for (const iterator of to_convert) {
            this.cfgVals[iterator] = new Map<string,any>(this.cfgVals[iterator]);
        }
        return this.saveFunc(val);
    }

    public async exportToFile(mapper?:Mapper) {
        let vals = JSON.stringify(this.cfgVals);
        let jso = JSON.parse(vals);
        
        if (mapper) {
            const res = await Messagebox.ShowWithButtons("Export config","Esporta favoriti mapper nel file?","Si", "No");
            if (res.button == ButtonOK) {
                var favorites = mapper.getFavorites();
                jso.favorites = favorites;
            }
        }
        const ver = AppInfo.Version.split(".")
        jso.requiresClientMajor = parseInt(ver[0]);
        jso.requiresClientMinor = parseInt(ver[1]);
        jso.requiresClientRevision = parseInt(ver[2]);
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
            Messagebox.Show("Errore", `E' impossibile caricare questa versione di script.\nE' richiesta una versione piu' alta del client.\nVersione client richiesta: ${denyReason}\nVersione attuale: ${AppInfo.Version}\n\nAggiorna il client che usi per poter usare questa configurazione.`)
            return false;
        }
        this.cfgVals = vals;
        this.saveConfig()
        this.evtConfigImport.fire({data: vals, owner: this});
        return true;
    }
}
