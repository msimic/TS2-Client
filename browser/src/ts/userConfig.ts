import { EventHook } from "./event";
import { throttle } from "./util";


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

    public exportToFile() {
        let json = JSON.stringify(this.cfgVals, null, 2);
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

    public importFromFile() {
        let inp: HTMLInputElement = document.createElement("input");
        inp.type = "file";
        inp.style.visibility = "hidden";

        inp.addEventListener("change", (e: any) => {
            let file = e.target.files[0];
            if (!file) {
                return;
            }

            let reader = new FileReader();
            reader.onload = (e1: any) => {
                let text = e1.target.result;
                this.ImportText(text);
                // saveConfig();
            };
            reader.readAsText(file);

        });

        document.body.appendChild(inp);
        inp.click();
        document.body.removeChild(inp);
    }

    public ImportText(text: any) {
        let vals = typeof text == "string" ? JSON.parse(text) : text;
        this.cfgVals = vals;
        this.saveConfig()
        this.evtConfigImport.fire({data: vals, owner: this});
    }
}
