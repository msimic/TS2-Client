import { EventHook } from "./event";
import { TrigAlItem } from "./trigAlEditBase";
import { ClassManager } from "./classManager";
import { EvtScriptEmitPrint, EvtScriptEmitToggleTrigger, EvtScriptEvent, JsScript, ScripEventTypes } from "./jsScript";
import { ProfileManager } from "./profileManager";
import { Mudslinger } from "./client";
import { ConfigIf, escapeRegExp, escapeRegexReplacement, stripHtml } from "./util";

/*export interface ConfigIf {
    set(key: string, val: TrigAlItem[]): void;
    getDef(key: string, def: boolean): boolean;
    get(key:string): TrigAlItem[];
    evtConfigImport: EventHook<{[k: string]: any}>;
}*/

export interface ScriptIf {
    makeScript(owner:string, text: string, argsSig: string): any;
}

export class TriggerManager {
    public EvtEmitTriggerCmds = new EventHook<{orig: string, cmds: string[]}>();
    public EvtEmitTriggerOutputChanged = new EventHook<{line: string, buffer: string}>();
    private triggerLog = new Array<{key:string, time:number}>();
    public triggers: Array<TrigAlItem> = null;
    public allTriggers: Array<TrigAlItem> = null;
    public changed = new EventHook()
    private precompiledRegex = new Map<TrigAlItem, RegExp>()

    constructor(private jsScript: JsScript, private config: ConfigIf, private baseConfig: ConfigIf, private classManager: ClassManager, private profileManager:ProfileManager) {
        /* backward compatibility */
        let savedTriggers = localStorage.getItem("triggers");
        if (savedTriggers && baseConfig) {
            this.config.set("triggers", JSON.parse(savedTriggers));
            localStorage.removeItem("triggers");
        }

        this.loadTriggers(config);
        config.evtConfigImport.handle((d) => {
            if (d.owner.name != config.name) return;
            if (!baseConfig) {
                config.set("triggers", d.data["triggers"])
            }
            this.loadTriggers(config);
            this.saveTriggers();
        }, this);
        if (baseConfig) baseConfig.evtConfigImport.handle((d) => {
            if (d.owner.name != baseConfig.name) return;
            baseConfig.set("triggers", d.data["triggers"])
            if (config.name == baseConfig.name) {
                config.cfgVals = baseConfig.cfgVals
            }
            this.loadTriggers(config.name==baseConfig.name ? baseConfig : config);
            this.saveTriggers();
        }, this);
        EvtScriptEmitToggleTrigger.handle(this.onToggle, this);
    }

    private onToggle(data: {owner: string, id:string, state:boolean}) {
        this.setEnabled(data.id, data.state);
        if (this.config.getDef("debugScripts", false)) {
            const msg = "Trigger " + data.id + " e' ora " + (this.isEnabled(data.id) ? "ABILITATO" : "DISABILITATO");
            EvtScriptEmitPrint.fire({owner:"TriggerManager", message: msg});
        }
    }

    public setEnabled(id:string, val:boolean) {
        const t = this.getById(id);
        if (!t) {
            if (this.config.getDef("debugScripts", false)) {
                const msg = "Trigger " + id + " non esiste!";
                EvtScriptEmitPrint.fire({owner:"TriggerManager", message: msg});
            }    
            return;
        }
        if (val == undefined) {
            val = !t.enabled;
        }
        const changed = t.enabled != val;
        t.enabled = val;
        if (changed) this.saveTriggers()
    }

    public getById(id:string):TrigAlItem {
        for (let index = 0; index < this.triggers.length; index++) {
            const element = this.triggers[index];
            if (element.id == id) return element;
        }
        for (let index = 0; index < this.allTriggers.length; index++) {
            const element = this.allTriggers[index];
            if (element.id == id) return element;
        }
        return null;
    }

    public isEnabled(id:string):boolean {
        const t = this.getById(id);
        return t && t.enabled;
    }

    public contains(pattern:string, maxIndex:number, tclass:string, tid:string) {
        for (let index = 0; index < Math.min(maxIndex, this.allTriggers.length); index++) {
            const element = this.allTriggers[index];
            if (element.pattern == pattern && element.class == tclass && element.id == tid) return true;
        }
        return false;
    }

    public precompileTriggers() {
        //console.log("precompile triggers")
        this.precompiledRegex.clear()
        for (const t of this.allTriggers) {
            t.script = null;
            let pattern = t.pattern;
            if (!t.regex) {
                pattern = escapeRegExp(pattern)
                if (pattern.indexOf("\\^")==0) {
                    pattern = ("^" + pattern.substring(2))
                }
                pattern = pattern.replace(/(\\\$|\%)(\d+)/g, function(m, d) {
                    return "(.+)";
                });
            }
            this.precompiledRegex.set(t, new RegExp(pattern));
        }
    }

    public mergeTriggers() {
        const prof = this.profileManager.getProfile(this.profileManager.getCurrent());
        if ((prof && !prof.baseTriggers) || !this.baseConfig) {
            this.allTriggers = $.merge([], this.config.get("triggers") || []);
            this.precompileTriggers()
            return;
        }

        var triggers = $.merge([], this.config.get("triggers") || []);
        triggers = $.merge(triggers, this.baseConfig.get("triggers") || []);
        this.allTriggers = triggers;
        for (let index = 0; index < this.allTriggers.length; index++) {
            const element = this.allTriggers[index];
            if (element && index>0 && this.contains(element.pattern, index, element.class, element.id)) {
                this.allTriggers.splice(index, 1);
                index--;
                continue;
            }
        }
        this.precompileTriggers()
    }

    private saving = false;
    public saveTriggers() {
        if (this.saving) return;
        try {
            this.triggers.forEach(a => a.script = null);
            this.config.set("triggers", this.triggers);
            this.mergeTriggers();
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

    private loadTriggers(config:ConfigIf) {
        this.triggers = config.get("triggers") || [];
        this.mergeTriggers();
    }

    private charSent = false;
    private passSent = false;
    private handleAutologin(line: string) {
        if (!this.profileManager.getCurrent()) {
            return;
        }

        if (line.match(/^Che nome vuoi usare ?/)) {
            const prof = this.profileManager.getProfile(this.profileManager.getCurrent());
            if (prof.autologin && prof.char && !this.charSent) {
                this.charSent = true;
                setTimeout(()=>{ this.charSent = false;}, 1000);
                this.EvtEmitTriggerCmds.fire({orig: 'autologin', cmds: [prof.char]});
            }
        } else if (line.match(/^Inserisci la sua password:/)) {
            const prof = this.profileManager.getProfile(this.profileManager.getCurrent());
            if (prof.autologin && prof.pass && !this.passSent) {
                this.passSent = true;
                setTimeout(()=>{ this.passSent = false;}, 1000);
                const pass = Mudslinger.decrypt(prof.pass);
                this.EvtEmitTriggerCmds.fire({orig: 'autologin', cmds: [pass]});
            }
        }
    }

    public runTrigger(trig:TrigAlItem, line:string) {
        let fired:boolean = false;
        const jsScript = this.jsScript

        if (trig.regex) {
            if (line.endsWith("\n") && trig.pattern.endsWith("$")) {
                line = line.substring(0, line.length-1);
            }
        }

        let match = line.match(this.precompiledRegex.get(trig));
        if (!match) {
            return;
        }
        /*if (this.checkLoop(trig.pattern)) {
            EvtScriptEmitPrint.fire({ owner: "AliasManager", message: "Trovato possibile ciclo infinito tra i trigger: " +trig.pattern})
            return;
        }
        this.logScriptTrigger(trig.pattern);*/

        if (trig.is_script) {
            if (!trig.script) {
                this.createTriggerScript(trig, line, jsScript);
            }
            if (trig.script) {
                trig.script(match, line); 
                fired = true;
            } else {
                throw `Trigger '${trig.pattern}' e' una script malformata`;
            }
        } else {
            //if (!trig.script) {
                trig.script = this.createSimpleTriggerCommands(trig.value, line, match, jsScript);
            //}
            if (trig.script) {
                this.EvtEmitTriggerCmds.fire({orig: trig.id || trig.pattern, cmds: trig.script});
                fired = true;
            } else {
                throw `Trigger '${trig.pattern}' e' ha comandi malformati`;
            }
        }
        
        if (fired) {
            EvtScriptEvent.fire({event: ScripEventTypes.TriggerFired, condition: trig.id || trig.pattern, value: line});
        }
    }

    private createSimpleTriggerCommands(value: string, line: string, match: RegExpMatchArray, jsScript: JsScript) {

        value = value.replace(/(?:\\`|`(?:\\`|[^`])*`|\\"|"(?:\\"|[^"])*"|\\'|'(?:\\'|[^'])*')|(?:\$|\%)(\d+)/g, function (m, d) {
            if (d == undefined)
                return m;
            return d == 0 ? "`" + line + "`" : (match[parseInt(d)] || '');
        });

        value = value.replace(/(?:\\`|`(?:\\`|[^`])*`|\\"|"(?:\\"|[^"])*"|\\'|'(?:\\'|[^'])*')|\@(\w+)/g, function (m, d: string) {
            if (d == undefined)
                return m;
            return jsScript.getVariableValue(d) || "";
        });

        let cmds = value.replace("\r", "").split("\n");
        return cmds;
    }

    private createTriggerScript(trig: TrigAlItem, line: string, jsScript: JsScript) {
        let value = trig.value;
        value = value.replace(/(?:\\`|`(?:\\`|[^`])*`|\\"|"(?:\\"|[^"])*"|\\'|'(?:\\'|[^'])*')|(?:\$|\%)(\d+)/g, function (m, d) {
            if (d == undefined) {
                m = m.replace(/\`(.*)\$\{(?:\$|\%)(\d+)\}(.*)\`/g, "`$1${(match[$2]||'')}$3`")
                return m;
            }
            return d == 0 ? "`" + line + "`" : "(match[" + parseInt(d) + "] || '')";
        });
        value = value.replace(/(?:\\`|`(?:\\`|[^`])*`|\\"|"(?:\\"|[^"])*"|\\'|'(?:\\'|[^'])*')|\@(\w+)/g, function (m, d: string) {
            if (d == undefined)
                return m;
            return "(variable('" + d + "'))";
        });
        trig.script = jsScript.makeScript("TRIGGER: " + (trig.id || trig.pattern), value, "match, line");
    }

    checkLoop(source: string):boolean {
        let cnt = 0;
        for (const k of this.triggerLog) {
            const alL = k.time
            const now = new Date();
            const diff = Math.abs(now.getTime() -  alL);
            if (diff < 10000 && k.key == source) {
                cnt++;
            }   
        }
        return false;// cnt >= 10;
    }
    logScriptTrigger(alias:string) {
        let index = 0;
        for (const k of [...this.triggerLog]) {
            const alL = k.time
            const now = new Date();
            const diff = Math.abs(now.getTime() -  alL);
            if (diff > 20000) {
                this.triggerLog.splice(index, 1);
            }   
        }
        this.triggerLog.push({key: alias, time: new Date().getTime()})
    }


    public buffer:string;
    public line:string;

    public handleBuffer(line: string, raw:string): string {
        this.line = null;
        this.buffer = null;
        if (this.config.getDef("triggersEnabled", true) !== true) return null;
        this.buffer = raw;
        this.line = line;
        this.handleAutologin(line);

        for (let i = 0; i < this.allTriggers.length; i++) {
            let trig = this.allTriggers[i];
            if (!trig.enabled || (trig.class && !this.classManager.isEnabled(trig.class))) continue;
            if (!trig.is_prompt) continue;
            this.runTrigger(trig, line);
        }
        return this.buffer;
    }

    public findTrigger(line:string) {
        for (let i = 0; i < this.allTriggers.length; i++) {
            let trig = this.allTriggers[i];
            //if (!trig.enabled || (trig.class && !this.classManager.isEnabled(trig.class))) continue;
            
            if (trig.regex) {
                if (line.endsWith("\n") && trig.pattern.endsWith("$")) {
                    line = line.substring(0, line.length-1);
                }
            }
    
            let match = line.match(this.precompiledRegex.get(trig));
            if (match) {
                return trig;
            }
        }
        return null;
    }
    
    public handleLine(line: string, raw:string): string {
        this.line = null;
        this.buffer = null;
        if (this.config.getDef("triggersEnabled", true) !== true) return null;
        this.buffer = raw;
        this.line = line;
        for (let i = 0; i < this.allTriggers.length; i++) {
            let trig = this.allTriggers[i];
            if (!trig.enabled || (trig.class && !this.classManager.isEnabled(trig.class))) continue;
            if (trig.is_prompt) continue;
            this.runTrigger(trig, this.line);
        }
        return this.buffer;
    }

    private doReplace(sBuffer:string, positions:number[], positionsText:number[], sText:string, sWhat:string, sWith:string) {
        let rx = new RegExp(sWhat, 'gi');
        let matches = rx.exec(sText);
        if (matches && matches.length) {
            let start = matches.index;
            let end = start + matches[0].length-1;
            let closeTags = [];
            let openTags = [];
            
            let bufferStart = positions[positionsText[start]];
            let bufferEnd = positions[positionsText[end]];
            if (sBuffer[bufferEnd]=="&") bufferEnd+=3;
            let charsBefore = [];
            let chars = [];
            
            for (let i = 0; i < bufferStart; i++) {
                charsBefore.push(sBuffer[i]);
            }
            
            let intag = false;
            let closingTag = false;
            let tag = "";
            let spaceFound = false;
            for (let i = bufferStart; i < bufferEnd; i++) {
                if (sBuffer[i] == "<") {
                    tag = "";
                    spaceFound = false;
                    intag = true;
                    if (i+1 <= bufferEnd && sBuffer[i+1]=="/") {
                        closingTag = true;
                    i++;
                    }
                    continue;
                }
                if (intag) {
                    if (sBuffer[i] == ">") {
                        if (closingTag) {
                            closeTags.push(tag);
                        } else {
                            openTags.push(tag);
                        }
                        closingTag = false;
                        intag = false;
                    }
                    else {
                        if (sBuffer[i]==" ") {
                            spaceFound = true;
                        }
                        if (!spaceFound) {
                            tag+=sBuffer[i];
                        }
                    }   
                }
            }
            
            chars.push(sWith);
            
            for (let i = 0; i < openTags.length; i++) {
                charsBefore.push("<" + openTags[i] + ">");
            }
            
            for (let i = 0; i < closeTags.length; i++) {
                chars.push("</" + closeTags[i] + ">");
            }
            
            for (let i = bufferEnd+1; i < sBuffer.length; i++) {
                chars.push(sBuffer[i]);
            }
            
            return [...charsBefore,...chars].join("");
        }
        return sBuffer;
    }

    private htmlEscapes = {
        '&lt;': '<',
        '&gt;': '>',
        /*'&#39;': "'",
        '&#34;': '"',*/
        '&amp;': "&"
    };

    htmlDecode(s:string, i:number):[string,string] {
      for (const key in this.htmlEscapes) {
          if (Object.prototype.hasOwnProperty.call(this.htmlEscapes, key)) {
              const element = <string>((<any>this.htmlEscapes)[key]);
                const sub = s.substr(i, key.length);
                if (sub == key) {
                    return [element, key];
                }
          }
      }
      return null;
    }

    htmlEncode(s:string, i:number):[string,string] {
        for (const key in this.htmlEscapes) {
            if (Object.prototype.hasOwnProperty.call(this.htmlEscapes, key)) {
                const element = <string>((<any>this.htmlEscapes)[key]);
                  const sub = s.substr(i, 1);
                  if (sub == element) {
                      return [key, element];
                  }
            }
        }
        return null;
      }

    public subBuffer(sWhat: string, sWith: string) {
        sWhat = escapeRegExp(sWhat)
        sWith = escapeRegexReplacement(sWith)

        let buffer = this.buffer;
        let text = this.line.split("\n")[0];
        let intag = false;
        let positions = [];
        let positionsText = [];
        let offset = 0;
        let htmltext = "";

        for (var i = 0; i < text.length; i++) {
            const val = this.htmlEncode(text, i);
            if (val) {
                htmltext += val[0];
                positionsText.push(i+offset);
                offset+=val[0].length-1;
            } else {
                htmltext += text[i];
                positionsText.push(i+offset);
            }
        }

        for (var i = 0; i < buffer.length; i++) {
            if (buffer[i] == "<") intag = true;
            if (!intag) {
                positions.push(i);
            }
            if (buffer[i] == ">") intag = false;
        }

        this.line = text.replace(new RegExp((sWhat), 'gi'), (sWith.indexOf("<span")!=-1 ? stripHtml(sWith) : sWith));
        this.buffer = this.doReplace(buffer, positions, positionsText, text, sWhat, sWith);
        this.EvtEmitTriggerOutputChanged.fire({line: this.line, buffer:this.buffer});
    }
    
    gag() {
        this.buffer = "";
        this.line = "";
        this.EvtEmitTriggerOutputChanged.fire({line: this.line, buffer:this.buffer});
    }
}

