import { TrigAlItem } from "./windows/trigAlEditBase";
import { EventHook } from "../Core/event";
import { ClassManager } from "./classManager";
import { API, EvtScriptEmitPrint, EvtScriptEmitToggleAlias, JsScript } from "./jsScript";
import { ProfileManager } from "../App/profileManager";
import { ConfigIf, escapeRegExp, parseScriptVariableAndParameters, parseShortcutString, parseSimpleScriptSyntax } from "../Core/util";
import { UserConfig } from "../App/userConfig";
import hotkeys from 'hotkeys-js';

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
    public changed = new EventHook();
    private precompiledRegex = new Map<TrigAlItem,RegExp>();


    constructor(public jsScript: JsScript, private config: ConfigIf, private baseConfig: ConfigIf, private classManager:ClassManager, private profileManager:ProfileManager) {
        this.loadAliases(config);
        config.evtConfigImport.handle((d) => {
            if (d.owner.data.name != config.data.name) return;
            if (!baseConfig) {
                config.set("aliases", d.data["aliases"])
            }
            this.loadAliases(config);
            //this.saveAliases();
        }, this);
        if (baseConfig) baseConfig.evtConfigImport.handle((d) => {
            if (d.owner.data.name != baseConfig.data.name) return;
            baseConfig.set("aliases", d.data["aliases"])
            if (config.data.name == baseConfig.data.name) {
                config.data.cfgVals = baseConfig.data.cfgVals
            }
            this.loadAliases(config.data.name==baseConfig.data.name ? baseConfig : config);
            //this.saveAliases();
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
        if (val == undefined) {
            val = !t.enabled;
        }
        const changed = t.enabled != val;
        t.enabled = val
        if (changed) this.saveAliases()
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
            this.aliases.forEach(a => delete a.script);
            this.config.set("aliases", this.aliases);
            this.mergeAliases();
            if (!this.baseConfig) {
                this.saving = true;
                this.config.evtConfigImport.fire({ data: this.config.data.cfgVals, owner: this.config});
            } else if (this.baseConfig && this.baseConfig.data.name == this.config.data.name) {
                this.saving = true;
                this.baseConfig.evtConfigImport.fire({ data: this.config.data.cfgVals, owner: this.config});
            }
            this.changed.fire(null)
        } finally {
            this.saving = false;
        }
    }

    public contains(pattern:string, clas:string, maxIndex:number) {
        for (let index = 0; index < Math.min(maxIndex, this.allAliases.length); index++) {
            const element = this.allAliases[index];
            if (element.pattern == pattern && element.class == clas) return true;
        }
        return false;
    }

    public setupMacro(alias:TrigAlItem) {
        const self = this
        hotkeys(parseShortcutString(alias.shortcut), 'macro',  function(event, handler){
            event.preventDefault()
            if (!alias.is_script) {
                let value = self.createSimpleAliasCommands(alias, [alias.pattern], self);
                API.functions?.send && API.functions.send(value)
            } else {
                self.createAliasScript(alias, [alias.pattern]); 
                alias.script && alias.script({}, [alias.pattern], "");
            }
          });
    }

    deleteAlias(alias:TrigAlItem) {
        let index = this.aliases.indexOf(alias)
        if (index < 0)
            return;
        this.aliases.splice(index, 1);
    }
    deleteAliasesWithClass(name: string) {
        for (const tr of [...this.aliases]) {
            if (tr.class == name) this.deleteAlias(tr)
        }
    }
    *getAliasesOfClass(name:string) {
        for (const tr of [...this.aliases]) {
            if (tr.class == name) yield(tr)
        }
    }
    public precompileAliases() {
        hotkeys.deleteScope('macro','macro');

        this.precompiledRegex.clear()
        for (const a of this.allAliases) {
            a.script = null;
            let rex:RegExp;
            if (!a.regex) {
                rex =  RegExp("^" + escapeRegExp(a.pattern) + "(?:\\s+(.*))?$","i");
            } else {
                rex = RegExp(a.pattern.charAt(0) == "^" ? a.pattern : ("^" + a.pattern), "i");
            }
            this.precompiledRegex.set(a, rex);
            a.shortcut && this.setupMacro(a);
        }
    }

    private mergeAliases() {
        const prof = this.profileManager.getProfile(this.profileManager.getCurrent());
        if ((prof && !prof.baseTriggers) || !this.baseConfig) {
            this.allAliases = $.merge([], this.config.get("aliases") || []);
            this.precompileAliases();
            return;
        }

        var aliases = $.merge([], this.config.get("aliases") || []);
        aliases = $.merge(aliases, this.baseConfig.get("aliases") || []);
        this.allAliases = aliases;
        for (let index = 0; index < this.allAliases.length; index++) {
            const element = this.allAliases[index];
            if (element && index>0 && this.contains(element.pattern, element.class, index)) {
                this.allAliases.splice(index, 1);
                index--;
                continue;
            }
        }
        this.precompileAliases();
    }
    
    private loadAliases(config:ConfigIf) {
        this.aliases = config.get("aliases") || [];
        this.mergeAliases();
    }

    public findAlias(cmd:string) {
        const aliasManager = this;

        for (let i = 0; i < this.allAliases.length; i++) {
            let alias = this.allAliases[i];
            //if (!alias.enabled || (alias.class && !this.classManager.isEnabled(alias.class))) continue;

            const re = this.precompiledRegex.get(alias);
            const match = cmd.match(re);
            if (!match || match == undefined) {
                continue;
            }
            return alias;
        }
        return  null;
    } 


    // return the result of the alias if any (string with embedded lines)
    // return true if matched and script ran
    // return null if no match
    public checkAlias(cmd: string, fromScript:boolean): boolean | string[] {
        if (this.config.getDef("aliasesEnabled", true) !== true) return null;

        const aliasManager = this;

        for (let i = 0; i < this.allAliases.length; i++) {
            let alias = this.allAliases[i];
            if (!alias.enabled || (alias.class && !this.classManager.isEnabled(alias.class))) continue;

            const re = this.precompiledRegex.get(alias);
            const match = cmd.match(re);
            if (!match || match == undefined) {
                continue;
            }

            if (alias.is_script) {
                this.createAliasScript(alias, match);
                if (alias.script) {
                    alias.script(match, cmd);
                };
                return true;
            } else {
                let value = this.createSimpleAliasCommands(alias, match, aliasManager);
                return value;
            }
        }
        return  null;
    }
    
    private createSimpleAliasCommands(alias: TrigAlItem, match: RegExpMatchArray, aliasManager: this) {
        let value = alias.value;
        let lines: string[] = (value).replace("\r", "").split("\n");
        let resLines: string[] = []

        for (const l of lines) {
            const rl = l.replace(/(?:\\`|`(?:\\`|[^`])*`|\\"|"(?:\\"|[^"])*"|\\'|'(?:\\'|[^'])*')|(?:\$|\%)(\d+)/g, function (m, d) {
                if (d == undefined)
                    return m;
                return (d == 0 ? match.input : match[parseInt(d)]) || "";
            });
            resLines.push(rl)  
        }

        lines = parseSimpleScriptSyntax(resLines, this.jsScript)

        return lines;
    }

    private createAliasScript(alias: TrigAlItem, match: RegExpMatchArray) {
        if (!alias.script) {
            let value = alias.value;
            value = parseScriptVariableAndParameters(value, match);
            alias.script = this.jsScript.makeScript("(alias) " + (alias.id || alias.pattern), value, "match, input");
        }
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
