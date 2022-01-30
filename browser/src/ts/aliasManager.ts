import { TrigAlItem } from "./trigAlEditBase";
import { EventHook } from "./event";
import { ClassManager } from "./classManager";
import { EvtScriptEmitPrint, EvtScriptEmitToggleAlias } from "./jsScript";
import { ProfileManager } from "./profileManager";
import { ConfigIf } from "./util";
import { UserConfig } from "./userConfig";

interface RegexMatchCapability {
    regex:string;
    enabled:boolean;
}

export interface ScriptIf {
    makeScript(owner:string, text: string, argsSig: string): any;
    getVariableValue(name:string):any;
}

export class AliasManager {
    public aliases: Array<TrigAlItem> = null;
    public allAliases: Array<TrigAlItem> = null;
    private aliasLog = new Array<{key:string, time:number}>();
    public changed = new EventHook()

    constructor(private jsScript: ScriptIf, private config: ConfigIf, private baseConfig: ConfigIf, private classManager:ClassManager, private profileManager:ProfileManager) {
        this.loadAliases(config);
        config.evtConfigImport.handle((d) => {
            if (d.owner.name != config.name) return;
            if (!baseConfig) {
                config.set("aliases", d.data["aliases"])
            }
            this.loadAliases(config);
            this.saveAliases();
        }, this);
        if (baseConfig) baseConfig.evtConfigImport.handle((d) => {
            if (d.owner.name != baseConfig.name) return;
            baseConfig.set("aliases", d.data["aliases"])
            if (config.name == baseConfig.name) {
                config.cfgVals = baseConfig.cfgVals
            }
            this.loadAliases(config.name==baseConfig.name ? baseConfig : config);
            this.saveAliases();
        }, this);
        EvtScriptEmitToggleAlias.handle(this.onToggle, this);
    }

    private onToggle(data: {owner: string, id:string, state:boolean}) {
        this.setEnabled(data.id, data.state);
        if (this.config.getDef("debugScripts", false)) {
            const msg = "Alias " + data.id + " e' ora " + (this.isEnabled(data.id) ? "ABILITATO" : "DISABILITATO");
            EvtScriptEmitPrint.fire({owner:"AliasManager", message: msg});
        }
    }

    public setEnabled(id:string, val:boolean) {
        const t = this.getById(id);
        if (!t) {
            if (this.config.getDef("debugScripts", false)) {
                const msg = "Alias " + id + " non esiste!";
                EvtScriptEmitPrint.fire({owner:"AliasManager", message: msg});
            }    
            return;
        }
    }

    public getById(id:string):TrigAlItem {
        for (let index = 0; index < this.aliases.length; index++) {
            const element = this.aliases[index];
            if (element.id == id) return element;
        }
        return null;
    }

    public isEnabled(id:string):boolean {
        const t = this.getById(id);
        return t && t.enabled;
    }

    private saving:boolean;
    public saveAliases() {
        if (this.saving) return;
        try {
            this.config.set("aliases", this.aliases);
            this.mergeAliases();
            if (!this.baseConfig) {
                this.saving = true;
                this.config.evtConfigImport.fire({ data: this.config.cfgVals, owner: this.config});
            } else if (this.baseConfig && this.baseConfig.name == this.config.name) {
                this.saving = true;
                this.baseConfig.evtConfigImport.fire({ data: this.config.cfgVals, owner: this.config});
            }
            this.changed.fire(null)
        } finally {
            this.saving = false;
        }
    }

    public contains(pattern:string, maxIndex:number) {
        for (let index = 0; index < Math.min(maxIndex, this.allAliases.length); index++) {
            const element = this.allAliases[index];
            if (element.pattern == pattern) return true;
        }
        return false;
    }

    private mergeAliases() {
        const prof = this.profileManager.getProfile(this.profileManager.getCurrent());
        if ((prof && !prof.baseTriggers) || !this.baseConfig) {
            this.allAliases = $.merge([], this.config.get("aliases") || []);
            return;
        }

        var aliases = $.merge([], this.config.get("aliases") || []);
        aliases = $.merge(aliases, this.baseConfig.get("aliases") || []);
        this.allAliases = aliases;
        for (let index = 0; index < this.allAliases.length; index++) {
            const element = this.allAliases[index];
            if (element && index>0 && this.contains(element.pattern, index)) {
                this.allAliases.splice(index, 1);
                index--;
                continue;
            }
        }
    }
    
    private loadAliases(config:ConfigIf) {
        this.aliases = config.get("aliases") || [];
        this.mergeAliases();
    }

    // return the result of the alias if any (string with embedded lines)
    // return true if matched and script ran
    // return null if no match
    public checkAlias(cmd: string, fromScript:boolean): boolean | string {
        if (this.config.getDef("aliasesEnabled", true) !== true) return null;

        const aliasManager = this;

        for (let i = 0; i < this.allAliases.length; i++) {
            let alias = this.allAliases[i];
            if (!alias.enabled || (alias.class && !this.classManager.isEnabled(alias.class))) continue;
            if (alias.regex) {
                let re = RegExp(alias.pattern.charAt(0) == "^" ? alias.pattern : ("^" + alias.pattern), "i");
                let alias_match:RegExpMatchArray;
                alias_match = cmd.match(re);
                if (!alias_match || alias_match == undefined) {
                    continue;
                }
                if (fromScript && this.checkLoop(re.source)) {
                    EvtScriptEmitPrint.fire({ owner: "AliasManager", message: "Trovato possibile ciclo infinito negli alias: " +alias.pattern})
                    continue;
                }
                if (fromScript) this.logScriptAlias(re.source);
                if (alias.is_script) {
                    if (!alias.script) {
                        let value = alias.value;
                        value = value.replace(/\$(\d+)/g, function(m, d) {
                            return alias_match[parseInt(d)] || "";
                        });
                        alias.script = this.jsScript.makeScript(alias.id || alias.pattern, value, "match, input");
                    }
                    if (alias.script) {
                        alias.script(alias_match, cmd);
                    };
                    return true;
                } else {
                    let value = alias.value;

                    value = value.replace(/\$(\d+)/g, function(m, d) {
                        return alias_match[parseInt(d)] || "";
                    });
                    value = value.replace(/(\@\w+)/g, function(m, d) {
                        return aliasManager.jsScript.getVariableValue(d.substring(1)) || "";
                    });
                    return value;
                }
            } else {
                let re = RegExp("^" + alias.pattern + "(?:\\s+(.*))?$","i");
                let match = cmd.match(re);
                if (!match) {
                    continue;
                }
                if (fromScript && this.checkLoop(re.source)) {
                    EvtScriptEmitPrint.fire({ owner: "AliasManager", message: "Trovato possibile ciclo infinito negli alias: " +alias.pattern})
                    continue;
                }
                if (fromScript) this.logScriptAlias(re.source);
                if (alias.is_script) {
                    if (!alias.script) {
                        let value = alias.value;
                        value = value.replace(/\$(\d+)/g, function(m, d) {
                            return "match["+parseInt(d)+"] || ''";
                        });
                        alias.script = this.jsScript.makeScript(alias.id || alias.pattern, value, "match, input");
                    }
                    if (alias.script) { alias.script(match, cmd); };
                    return true;
                } else {
                    let value = alias.value;
                    value = value.replace(/\$(\d+)/g, function(m, d) {
                        return match[parseInt(d)] || "";
                    });
                    value = value.replace(/(\@\w+)/g, function(m, d:string) {
                        return aliasManager.jsScript.getVariableValue(d.substring(1)) || "";
                    });
                    return value;
                }
            }
        }
        return null;
    }   
    checkLoop(source: string):boolean {
        let cnt = 0;
        for (const k of this.aliasLog) {
            const alL = k.time
            const now = new Date();
            const diff = Math.abs(now.getTime() -  alL);
            if (diff < 10000 && k.key == source) {
                cnt++;
            }   
        }
        return false; //cnt >= 10;
    }
    logScriptAlias(alias:string) {
        let index = 0;
        for (const k of [...this.aliasLog]) {
            const alL = k.time
            const now = new Date();
            const diff = Math.abs(now.getTime() -  alL);
            if (diff > 20000) {
                this.aliasLog.splice(index, 1);
            }   
        }
        this.aliasLog.push({key: alias, time: new Date().getTime()})
    }
}
