import { Mudslinger } from "./client";
import { EventHook } from "./event";
import { UserConfig } from "./userConfig";
import { Messagebox, messagebox } from "./messagebox";
import { AppInfo } from "./appInfo";
import { WindowData } from "./windowManager";
import { LayoutDefinition } from "./layoutManager";
import { throttle } from "./util";
import { UserConfigStorage } from './Storage/configStorage'

export class Profile {
    public name:string;
    public host:string;
    public port:string;
    public autologin: boolean;
    public char:string;
    public pass:string;
    public baseTriggers: boolean;
    public useLayout: boolean;
    public windows:WindowData[];
    public layout?:LayoutDefinition;
}

export class ProfileManager {
    private appInfo = AppInfo;
    public evtProfileChanged = new EventHook<{[k: string]: any}>();
    private _current : string = null;
    private _activeConfig:UserConfig = new UserConfig();
    private profiles:Map<string,Profile> = new Map<string,Profile>();
    private configs:Map<string,UserConfig> = new Map<string,UserConfig>();
    public lastProfile: string;
    private storage: UserConfigStorage;
    private changingActive = false;

    public constructor(private baseConfig:UserConfig) {
        //this.load();
    }

    public getBaseConfig():UserConfig {
        return this.baseConfig;
    }

    private activeChanged = (v:string):string => {
        const ac = this.getCurrentConfig();
        ac.copy(v);
        //console.log("active changed " + this._current)
        return v;
    }

    private activeConfigChanged = (cfg:UserConfig):UserConfig => {
        if (this.changingActive) return cfg;
        try {
            this.changingActive = true;
            const ac = this.getCurrentConfig();
            ac.copyConfig(cfg);
            //console.log("active changed " + this._current)
            return cfg;
        } finally {
            this.changingActive = false;
        }
    }

    public saveWindows(profile:string, windows:WindowData[]) {
        if (!profile) return;

        var p = this.getProfile(profile);
        if (p) {
            if ((windows as any).loadedFrom && (windows as any).loadedFrom != profile) {
                console.log("BUG: Saving windows of " + (windows as any).loadedFrom + " into " + profile)
                debugger;
            }
            p.windows = windows;
            this.saveProfiles();
        }
    }

    public get activeConfig():UserConfig {
        return this._activeConfig;
    }

    public async load() {
        if (!this.storage) {
            this.storage = new UserConfigStorage()
            await this.storage.init()
        }
        const pstr = localStorage.getItem("profiles");
        let last = localStorage.getItem("lastProfile");
        if (pstr) {
            try {
                this.profiles = new Map(JSON.parse(pstr));
                for (const profKvp of this.profiles) {
                    let cfgData = await this.storage.getConfig(profKvp[0])
                    if (!cfgData) {
                        let cfg = this.createConfigFromString(localStorage.getItem("config_" + profKvp[0]), profKvp[0])
                        cfg = this.loadConfigFromStorage(cfg)
                        this.configs.set(profKvp[0], cfg);
                    } else {
                        const tmp = new UserConfig();
                        tmp.data = cfgData;
                        const cfg = this.loadConfigFromStorage(tmp)
                        this.configs.set(profKvp[0], cfg);
                    }
                }
            } catch (err) {
                Messagebox.Show("Errore", "Non riesco a leggere i profili");
            }
        }
        if (last && !this.profiles.has(last)) {
            last = "";
            Messagebox.Show("Errore", "Non riesco a trovare il profilo usato precedentemente. Uso il base.");
        }
        this.setCurrent("");
        this.lastProfile = last || "";
        localStorage.setItem("lastProfile", this.lastProfile);
    }

    private saveConfigToStorage(key:string): (config: UserConfig) => UserConfig {
        return (config: UserConfig):UserConfig => {
            if (this.changingActive) return config;
            try {
                this.changingActive = true;
                this.storage.setConfig(key, config);
                this.saveProfiles();
                return config;
            } finally {
                this.changingActive = false;
            }
        }
    }

    private saveConfigStringToStorage(key:string): (val: string) => string {
        return /*<any>throttle(*/(val: string):string => {
            if (this.changingActive) return val;
            try {
                this.changingActive = true;
                localStorage.setItem("config_" + key, val);
                this.saveProfiles();
                return val;
            } finally {
                this.changingActive = false;
            }
        }/*, 1000);*/
    }

    public getProfile(name:string):Profile {
        return this.profiles.get(name);
    }

    public getProfiles():string[] {
        let profiles:string[] = [];
        this.profiles.forEach((v,k)=>{
            profiles.push(k);
        });
        return profiles;
    }

    public setCurrent(name:string, force?:boolean) {
        if (this._current != name || force) {
            this.changingActive = true
            try {
                this._current = name;
                this.lastProfile = name;
                this.saveProfiles();
                //this.activeConfig.init(name, this.getCurrentConfig().saveConfig(), this.activeChanged);
                this.activeConfig.clone(name, this.getCurrentConfig(), this.activeConfigChanged);
                this.evtProfileChanged.fire({current: name});
                this.setTitle();
            } finally {
                this.changingActive = false
            }
        }
    }

    public setTitle() {
        const inWeb = !!!(<any>window).ipcRenderer;
        const title = inWeb ? AppInfo.AppTitle : AppInfo.AppTitle.replace("Web ","");
        if (this._current) {
            document.title = `${this._current} - ${title}`;
        } else {
            document.title = `${title} - Server Live`;
        }
    }

    public getCurrent():string {
        return this._current;
    }
    
    private loadConfigFromStorage(config:UserConfig):UserConfig {
        const cfg = new UserConfig();
        cfg.clone(config.data.name, config, this.saveConfigToStorage(config.data.name));
        Mudslinger.setDefaults(cfg);
        return cfg;
    }

    private newConfigFromStorage(name: string):UserConfig {
        const cfg = new UserConfig();
        cfg.clone(name, null, this.saveConfigToStorage(name));
        Mudslinger.setDefaults(cfg);
        return cfg;
    }

    private createConfigFromString(str:string, name:string):UserConfig {
        const cfg = new UserConfig();
        cfg.init(name, str,this.saveConfigStringToStorage(name));
        Mudslinger.setDefaults(cfg);
        return cfg;
    }

    public create(profile:Profile) {
        this.profiles.set(profile.name, profile);
        //const cfg = this.createConfig(null, profile.name);
        const cfg = this.newConfigFromStorage(profile.name);
        this.configs.set(profile.name, cfg);
        this.setCurrent(profile.name);
        this.saveProfiles();
    }

    public rename(profile:Profile, oldname:string) {
        var cfg = this.getConfigFor(oldname);
        if (cfg) {
            const cfgValues = cfg.saveConfigToString();
            const config = new UserConfig();
            config.data.name = profile.name
            config.copy(cfgValues);
            //cfg.init(profile.name, cfgValues,this.saveConfigStringToStorage(profile.name));
            cfg.clone(profile.name, config, this.saveConfigToStorage(profile.name));
        } else  {
            cfg = this.newConfigFromStorage(profile.name);
        }
        this.configs.delete(oldname);
        this.storage.delConfigs(profile.name)
        localStorage.removeItem("config_" + oldname);
        this.profiles.delete(oldname);
        this.profiles.set(profile.name, profile);
        this.configs.set(profile.name, cfg);
        this.saveProfiles();
        if (this._current == oldname) {
            this.setCurrent(profile.name);
        }
        this.load();
    }

    public delete(profile:Profile) {
        this.configs.delete(profile.name);
        this.profiles.delete(profile.name);
        this.storage.delConfigs(profile.name)
        localStorage.removeItem("config_" + profile.name);
        if (this._current == profile.name)
            this.setCurrent("");

        this.saveProfiles();
        this.load();
    }

    public getCurrentConfig():UserConfig {
        if (!this._current) return this.baseConfig;
        return this.configs.get(this._current);
    }

    public getConfigFor(name:string):UserConfig {
        if (!name||name.length==0) return this.baseConfig;
        return this.configs.get(name);
    }

    private inSaving = false;
    public saveProfiles() {
        if (this.inSaving) return;
        this.inSaving = true;
        try {
            localStorage.setItem("profiles", JSON.stringify([...this.profiles]));
            localStorage.setItem("lastProfile", this._current);
            this.configs.forEach((v) => {
                v.saveConfig();
            });
        } finally {
            this.inSaving = false;
        }
    }
}
