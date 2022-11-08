import del from "del";
import { isNumeric } from "jquery";
import { AliasManager } from "./aliasManager";
import { ClassManager } from "./classManager";
import { EventHook } from "./event";
import { Mapper } from "./mapper";
import { OutputManager } from "./outputManager";
import { ProfileManager } from "./profileManager";
import { TrigAlItem } from "./trigAlEditBase";
import { TriggerManager } from "./triggerManager";
import { ConfigIf, throttle } from "./util";

export let EvtScriptEmitCmd = new EventHook<{owner:string, message:string, silent:boolean}>();
export let EvtScriptEmitPrint = new EventHook<{owner:string, message:string, window?:string, raw?:any}>();
export let EvtScriptEmitError = new EventHook<{owner:string, err:any, stack?:string}>();
export let EvtScriptEmitCls = new EventHook<{owner:string, window?:string}>();
export let EvtScriptEmitEvalError = new EventHook<any>();
export let EvtScriptEmitToggleAlias = new EventHook<{owner:string, id:string, state:boolean}>();
export let EvtScriptEmitToggleTrigger = new EventHook<{owner:string, id:string, state:boolean}>();
export let EvtScriptEmitToggleClass = new EventHook<{owner:string, id:string, state:boolean}>();
export let EvtScriptEmitToggleEvent = new EventHook<{owner:string, id:string, state:boolean}>();

export let EvtScriptEvent = new EventHook<{event:ScripEventTypes, condition:string, value:any}>();

declare global {
    interface Window {
        repeats: any;
        timeouts: any;
    }
}

export interface PropertyChanged {
    obj: any;
    propName: any;
    oldValue: any;
    newValue: any;
}

declare interface ScriptThis {
    startWatch(onWatch:(ev:PropertyChanged)=>void) : void;
    [prop:string]:any;
}

function isEqual(obj1:any, obj2:any) {
    if (obj1 == undefined && obj2 == undefined) return true;
    if (obj1 == undefined && obj2 != undefined) return false;
    if (obj1 != undefined && obj2 == undefined) return false;
    if (obj1 == obj2) return true;

    let props1 = Object.getOwnPropertyNames(obj1);
    let props2 = Object.getOwnPropertyNames(obj2);
    if (props1.length != props2.length) {
      return false;
    }
    for (let i = 0; i < props1.length; i++) {
      let prop = props1[i];
      let bothAreObjects = typeof(obj1[prop]) === 'object' && typeof(obj2[prop]) === 'object';
      if ((!bothAreObjects && (obj1[prop] !== obj2[prop]))
      || (bothAreObjects && !isEqual(obj1[prop], obj2[prop]))) {
        return false;
      }
    }
    return true;
  }

function clone(o:any):any {
    return ((<any>window).structuredClone)(o);
}

let startWatch = function (this : ScriptThis, onWatch:(ev:PropertyChanged)=>void) {

    var self = <any>this;

    if (!self.watchTask) {
        self._oldValues = [];

        for (var propName in self) {
            self._oldValues[propName] = self[propName];
        }


        setInterval(function () {
            const oldKeys = new Map<string,boolean>(Object.keys(self._oldValues).map(v => [v ,true]));
            for (var propName in self) {
                
                oldKeys.delete(propName)

                var propValue = self[propName];
                if (typeof (propValue) != 'function' && propName != "_oldValues") {


                    var oldValue = self._oldValues ? self._oldValues[propName] : undefined;

                    if (((typeof(oldValue) == 'object' || typeof(propValue) == 'object') && !isEqual(oldValue, propValue))
                         || (!(typeof(oldValue) == 'object' || typeof(propValue) == 'object') && 
                             (propValue != oldValue || (oldValue == undefined && propValue != undefined)))) {

                        onWatch({ obj: self, propName: propName, oldValue: oldValue, newValue: propValue });
                        self._oldValues[propName] = (typeof(propValue) == 'object') ? clone(propValue) : propValue;

                    }

                }
            }
            for (const key in oldKeys.keys()) {
                var oldValue = self._oldValues ? self._oldValues[key] : undefined;
                if (oldValue) {
                    onWatch({ obj: self, propName: key, oldValue: oldValue, newValue: undefined });
                    self._oldValues[key] = undefined;
                }
            }
        }, 30);
    }
}

export function colorize(sText: string, sColor:string, sBackground:string, bold:boolean, underline:boolean, blink:boolean) {
    if (typeof bold == "string") bold=(bold=="true");
    if (typeof underline == "string") underline=(underline=="true");
    if (typeof blink == "string") blink=(blink=="true");

    let classes = "";
    if (blink) {
        classes += "blink ";
    }
    if (underline) {
        classes += "underline "
    }
    let styles = "display: inline-block;";
    if (sColor) {
        styles += "color:" + sColor + ";"
    }
    if (sBackground) {
        styles += "background-color:" + sBackground + ";"
    }
    if (bold) {
        styles += "font-weight:bold;"
    }
    /*if (underline) {
        styles += "border-bottom-style:solid;border-bottom-width:1px;border-bottom-color:" + (sColor || "white") + ";";
    }*/
    let content = sText;
    let span = "";
    if (sText) {
        span = `<span class="${classes}" style="${styles}">${content}</span>`;
    } else {
        span = `<span class="${classes}" style="${styles}">${content}`;
    }
    return span;
};

export interface Variable {
    name: string;
    class: string;
    value: any;
}
/*
export interface ConfigIf {
    set(key: string, val: [string, Variable][]): void;
    set(key: string, val: [string, ScriptEvent[]][]): void;
    getDef(key: string, def: any): any;
    get(key: string): Map<string, Variable>;
    evtConfigImport: EventHook<{[k: string]: any}>;
}*/

export enum ScripEventTypes {
    VariableChanged,
    ConnectionState,
    SettingChanged,
    ClassChanged,
    TriggerFired
}

export class ScriptEventsIta {
    public static nameof(index:string):string {
        const itaNames = [
            'Variabile cambiata',
            'Stato conessione cambiato',
            'Impostazione cambiata',
            'Stato classe cambiato',
            'Trigger scattato'
        ];
        return itaNames[Number(index)];
    }
};

export interface ScriptEvent {
    type: string;
    condition: string;
    value: string;
    id: string,
    class: string;
    enabled: boolean;
    script?: Function;
}

export class JsScript {
    private scriptThis: ScriptThis = {
        startWatch: startWatch
    }; /* the 'this' used for all scripts */
    private classManager: ClassManager;
    private aliasManager: AliasManager;
    private triggerManager: TriggerManager;
    private outputManager: OutputManager;
    private variables: Map<string, Variable>;
    private eventList: ScriptEvent[] = [];
    private events: Map<string, ScriptEvent[]> = new Map<string, ScriptEvent[]>();
    private baseVariables: Map<string, Variable>;
    private baseEventList: ScriptEvent[] = [];
    private baseEvents: Map<string, ScriptEvent[]> = new Map<string, ScriptEvent[]>();
    public variableChanged = new EventHook<string>();
    public eventChanged = new EventHook<ScriptEvent>();
    private linkedEvents: Map<string, string[]> = new Map<string, string[]>();
    public linkEvent = (ev:string, lev:string) => {
        let evl = this.linkedEvents.get(ev)
        if (!evl) {
            this.linkedEvents.set(ev, []);
        }
        evl = this.linkedEvents.get(ev)
        if (evl.indexOf(lev)>-1) return;
        evl.push(lev);
    }

    public unlinkEvent = (ev:string, lev:string) => {
        let evl = this.linkedEvents.get(ev)
        if (!evl) {
            return;
        }
        evl = this.linkedEvents.get(ev)
        const levindex = evl.indexOf(lev);
        if (levindex>-1) {
            evl.splice(levindex, 1);
        }
    }

    private self = this;
    constructor(private config: ConfigIf,private baseConfig: ConfigIf, public profileManager: ProfileManager, private mapper:Mapper) {
        this.loadBase();
        this.load();
        this.saveVariablesAndEventsToConfig = throttle(this.saveVariablesAndEventsToConfigInternal, 500);
        EvtScriptEmitToggleEvent.handle(this.onToggleEvent, this);
        config.evtConfigImport.handle((d) => {
            this.loadBase();
            this.load();
        }, this);
        this.scriptThis.startWatch((e)=>{
            //console.debug(e.propName + ": " + e.newValue);
            //this.aliasManager.checkAlias("on"+e.propName + " " + e.oldValue);
            EvtScriptEvent.fire({event: ScripEventTypes.VariableChanged, condition: e.propName, value: e});
            let evl = this.linkedEvents.get(e.propName)

            if (evl) {
                for (const le of evl) {
                    e.propName = le;
                    EvtScriptEvent.fire({event: ScripEventTypes.VariableChanged, condition: le, value: e});
                }
            }
        
        });
        EvtScriptEvent.handle((e) => {
            this.eventFired(e)
        });
    }
    onToggleEvent(ev:{owner:string, id:string, state:boolean}) {
        const t = this.getEvent(ev.id)
        if (!t) {
            if (this.config.getDef("debugScripts", false)) {
                const msg = "Event " + ev.id + " non esiste!";
                EvtScriptEmitPrint.fire({owner:"EventManager", message: msg});
            }    
            return;
        }
        if (ev.state == undefined) {
            ev.state = !t.enabled;
        }
        t.enabled = ev.state;
        this.save()
    }

    eventFired(e: any) {
        let evt = ScripEventTypes[e.event];
        let cond = e.condition;
        let val = e.value;
        this.onEvent(<string>evt, cond, val);
        if (e.event == ScripEventTypes.VariableChanged) {
            this.variableChanged.fire(evt)
            this.save();
        }
    }

    checkEventCondition(ev:ScriptEvent, condition:string):boolean {
        return ev.condition == condition || (ev.type == ScripEventTypes[ScripEventTypes.VariableChanged] && ev.condition.split(",").indexOf(condition)!=-1);
    }

    triggerEvent(ev:ScriptEvent, param:any) {
        if (!ev.script) {
            ev.script = this.makeScript("event " +ev.type + "(" + ev.condition + ")", ev.value, "args");
        }
        ev.script(param);
    }

    onEvent(type:string, condition:string, param:any) {
        if (this.config.getDef("triggersEnabled", true) !== true) return;
        if (this.events.has(type)) {
            const evts = this.events.get(type);
            for (const ev of evts) {
                if (ev.enabled && this.checkEventCondition(ev, condition) && (!ev.class || this.classManager.isEnabled(ev.class))) {
                    this.triggerEvent(ev, param);
                }
            }
        }
        if (this.baseEvents.has(type)) {
            const evts = this.baseEvents.get(type);
            for (const ev of evts) {
                if (ev.enabled && this.checkEventCondition(ev, condition) && (!ev.class || this.classManager.isEnabled(ev.class))) {
                    this.triggerEvent(ev, param);
                }
            }
        }
    }

    putEvents(events:ScriptEvent[]) {
        for (const ev of events) {
            this.addEvent(ev);
        }
    }

    clearEvents() {
        this.eventList = [];
        this.events.clear();
        this.eventChanged.fire(null)
    }

    clearBaseEvents() {
        this.baseEventList = [];
        this.baseEvents.clear();
    }

    getEvents(Class?:string):ScriptEvent[] {
        let ret:ScriptEvent[] = [];
        for (const ev of this.events) {
            ret = ret.concat(ev[1]||[]);
        }
        return ret.filter(ev => ev.class == Class || !Class);
    }

    getEvent(id:string):ScriptEvent {
        return this.eventList.find(e => e.id == id) || this.baseEventList.find(e => e.id == id);
    }

    getBaseEvents(Class?:string):ScriptEvent[] {
        let ret:ScriptEvent[] = [];
        for (const ev of this.baseEvents) {
            ret = ret.concat(ev[1]||[]);
        }
        return ret.filter(ev => ev.class == Class || !Class);
    }

    getBaseEvent(id:string):ScriptEvent {
        return this.baseEventList.find(e => e.id == id);
    }

    addEvent(ev:ScriptEvent) {
        this.eventList.push(ev);
        if (!this.events.has(ev.type)) {
            this.events.set(ev.type, []);
        }
        this.events.get(ev.type).push(ev);
        this.eventChanged.fire(ev)
    }

    addBaseEvent(ev:ScriptEvent) {
        this.baseEventList.push(ev);
        if (!this.baseEvents.has(ev.type)) {
            this.baseEvents.set(ev.type, []);
        }
        this.baseEvents.get(ev.type).push(ev);
        this.eventChanged.fire(ev)
    }

    delEvent(ev:ScriptEvent) {
        let ind = this.eventList.indexOf(ev);
        if (ind != -1) {
            this.eventList.splice(ind, 1);
        }
        for (const kvp of this.events) {
            ind = kvp[1].indexOf(ev);
            if (ind != -1) {
                kvp[1].splice(ind, 1);
            }
        }
        
        if (this.eventList.length == 0) {
            this.events.clear();
        }
        this.eventChanged.fire(ev)
    }

    delBaseEvent(ev:ScriptEvent) {
        let ind = this.baseEventList.indexOf(ev);
        if (ind != -1) {
            this.baseEventList.splice(ind, 1);
        }
        for (const kvp of this.baseEvents) {
            ind = kvp[1].indexOf(ev);
            if (ind != -1) {
                kvp[1].splice(ind, 1);
            }
        }
        
        if (this.baseEventList.length == 0) {
            this.baseEvents.clear();
        }
        this.eventChanged.fire(ev)
    }

    getVariableValue(name:string):any {
        const vari = this.variables.get(name)
        return vari ? vari.value : null;
    }

    getVariables(Class?:string):Variable[] {
        this.save();
        return [...this.variables.values()].filter(v => v.class == Class || !Class);
    }

    setVariable(variable:Variable) {
        if (isNumeric(variable.value)) {
            variable.value = Number(variable.value);
        }
        this.variables.set(variable.name, variable);
        this.scriptThis[variable.name] = variable.value;
    }

    delVariable(variable:Variable) {
        this.variables.delete(variable.name);
        delete this.scriptThis[variable.name];
    }

    setVariables(variables:Variable[]) {
        this.variables.clear();
        for (const v of variables) {
            this.setVariable(v);
        }
    }

    loadBase() {
        this.clearBaseEvents();
        const prof = this.profileManager.getProfile(this.profileManager.getCurrent());
        if (prof && !prof.baseTriggers) {
            return;
        }

        let sc = this.baseConfig.getDef("script_events", []);
        this.baseEvents = new Map<string, ScriptEvent[]>(sc);
        for (const ev of this.baseEvents) {
            if (ev[1]) this.baseEventList = this.baseEventList.concat(ev[1]);
        }
        this.baseVariables = new Map<string, Variable>(this.baseConfig.getDef("variables", []));
        for (const v of this.baseVariables) {
            if (v[0] && v[1].value) this.scriptThis[v[0]] = v[1].value;
        }
    }

    load() {
        this.clearEvents();
        let sc = this.config.getDef("script_events", []);
        this.events = new Map<string, ScriptEvent[]>(sc);
        for (const ev of this.events) {
            if (ev[1]) this.eventList = this.eventList.concat(ev[1]);
        }
        if (this.variables) for (const v of this.variables) {
            delete this.scriptThis[v[0]];
        }
        if (this.baseVariables) for (const v of this.baseVariables) {
            if (v[0] && v[1].value) this.scriptThis[v[0]] = v[1].value;
        }
        const savedVars = this.config.getDef("variables", []);
        for (const v of savedVars) {
            // backward compat
            if (v && v[0] && v[1] && !v[1].name && (<any>v[1]).Name) {
                v[1].name = (<any>v[1]).Name
                v[1].value = (<any>v[1]).Value
                v[1].class = (<any>v[1]).Class
                delete (<any>v[1]).Name
                delete (<any>v[1]).Value
                delete (<any>v[1]).Class         
            }
        }
        this.variables = new Map<string, Variable>(savedVars);
        for (const v of this.variables) {
            if (v[0] && v[1].value != undefined && v[1].value != null) this.scriptThis[v[0]] = v[1].value;
        }
    }

    save() {
        /*if (this.events.size == 0) {
            console.log("Eventi cancellati? Errore. Non salvo.");
            return;
        }*/
        for (const key in this.scriptThis) {
            if (Object.prototype.hasOwnProperty.call(this.scriptThis, key)) {
                const element = this.scriptThis[key];
                if (typeof element != "function" && key != "_oldValues") {
                    let variable = this.variables.get(key) || { name: key, class: "", value: null };
                    variable.value = element;
                    variable.name = variable.name || key;
                    if (this.baseVariables.get(variable.name)?.value != variable.value) {
                        this.variables.set(key, variable);
                    }
                }
            }
        }
        for (const k of this.variables.keys()) {
            if (this.variables.get(k).value == undefined || k == "_oldValues") {
                this.variables.delete(k);
            }
        }
        this.saveVariablesAndEventsToConfig(this.events, this.variables);
    }

    saveBase() {
        this.saveVariablesAndEventsToConfig(this.baseEvents, this.baseVariables);
    }

    private saveVariablesAndEventsToConfig:any;
    private saveVariablesAndEventsToConfigInternal(ev:any, vars:any) {
        this.config.set("script_events", [...ev]);
        this.config.set("variables", [...vars]);
    }

    private saveBaseVariablesAndEventsToConfig(ev:any, vars:any) {
        this.baseConfig.set("script_events", [...ev]);
        this.baseConfig.set("variables", [...vars]);
    }

    public getScriptThis() { return this.scriptThis; }

    public makeScript(owner:string, text: string, argsSig: string): any {
        try {
            let scr = makeScript.call(this.scriptThis, owner, text, argsSig, this.classManager, this.aliasManager, this.triggerManager, this.outputManager, this.mapper, this);
            if (!scr) { return null; }
            return (...args: any[]) => {
                const ret = scr(...args);
                return ret;
            }
        } catch (err2) {
            EvtScriptEmitEvalError.fire(err2);
        }
    }

    public setClassManager(classManager:ClassManager) {
        this.classManager = classManager;
    }

    public setTriggerManager(triggerManager:TriggerManager) {
        this.triggerManager = triggerManager;
    }

    public setAliasManager(aliasManager:AliasManager) {
        this.aliasManager = aliasManager;
    }

    public setOutputManager(manager:OutputManager) {
        this.outputManager = manager;
    }
}
function CreateFunction(name:string, args:any[], body:string, scope:any, values:any[]) {
    if (typeof args == "string")
        values = scope, scope = body, body = args, args = [];

    if (name) name = name.replace(/\s/g, "_")
    if (!Array.isArray(scope) || !Array.isArray(values)) {
        if (typeof scope == "object") {
            var keys = Object.keys(scope);
            values = keys.map(function(p) { return scope[p]; });
            scope = keys;
        } else {
            values = [];
            scope = [];
        }
    }
    return Function(scope, "function "+(name?name:"")+"("+args.join(", ")+") {\n"+body+"\n}\nreturn "+name+";").apply(scope, values);
};
function makeScript(owner:string, userScript: string, argSignature: string,
    classManager: ClassManager,
    aliasManager: AliasManager,
    triggerManager: TriggerManager,
    outputManager: OutputManager,
    map:Mapper,
    scriptManager:JsScript) {

    let own = owner;

    /* Scripting API section */
    const mapper = map;
    const color = colorize;
    const variable = function(vr: string, val?:string, cls?:string):any {

        let v = scriptManager.getVariables(cls).filter(v => v.name == vr)[0];
        if (!(val === undefined)) {
            if (!v) {
                v = {
                    class: cls,
                    name: vr,
                    value: val
                };
                scriptManager.setVariable(v)
            } else {
                if (!(cls === undefined)) v.class = cls;
                v.value = val;
            }
        }
        return v.value;
    };
    
    const setvar = function(vr: string, val?:string, cls?:string):any {
        return variable(vr, val, cls);
    };

    const getvar = function(vr: string):any {
        return variable(vr);
    };

    const sub = function(sWhat: string, sWith:string) {
        if (triggerManager) triggerManager.subBuffer(sWhat.split("\n")[0], sWith);
    };
    const link = function(text: string, func:Function, hover?:string) {
        let rnd = Math.floor(Math.random()*10000)
        let line = `<span><a id="customLink${rnd}" class="underline clickable" title="${hover?hover:""}">${text}</a></span>`
        setTimeout(() => {
            const lnk = $("#customLink"+rnd)
            lnk.click(()=>{
                func();
            })
        }, 150)
        return line;
    };
    const playAudio = function(url: string) {
        if (scriptManager.profileManager.activeConfig.getDef("soundsEnabled", true)==false) return; 
        if ((<any>window).audio) {
            (<any>window).audio.pause();
        }
        (<any>window).audio = new Audio(url);
        (<any>window).audio.play();
    };
    const stopAudio = function() {
        (<any>window).audio?.pause();
        (<any>window).audio = null;
    };
    const highlight = function(fore: string, back:string, blink:boolean = false) {
        if (triggerManager) triggerManager.subBuffer(triggerManager.line.split("\n")[0], color(triggerManager.line.split("\n")[0], fore, back, true, false, blink));
    };
    const delay = function(id: string, time:number, func:Function) {
        if (!window.timeouts) {
            window.timeouts = {};
        }
        if (!id) {
            throw "Devi specificare l'ID del delay";
        }
        if (!func) {
            throw "Devi provvedere la funzione da eseguire dopo il delay";
        }
        if (window.timeouts[id]) {
            clearTimeout(window.timeouts[id]);
            delete window.timeouts[id];
        }
        window.timeouts[id] = setTimeout(() => {
            func();
            delete window.timeouts[id];
        }, time);   
    };
    const repeat = function(id: string, time:number, func:Function) {
        if (!window.repeats) {
            window.repeats = {};
        }
        if (!id) {
            throw "Devi specificare l'ID del repeat";
        }
        if (window.repeats[id]) {
            clearTimeout(window.repeats[id]);
            delete window.repeats[id];
        }
        if (func) {
            window.repeats[id] = setInterval(() => {
                func();
                delete window.repeats[id];
            }, time);
        }
    };
    const gag = function() {
        if (triggerManager) triggerManager.gag();
    };
    const cap = function(window:string) {
        if (outputManager) {
            outputManager.sendToWindow(window, triggerManager.line, triggerManager.buffer);
        }
    };
    const deleteWindow = function(window:string) {
        if (outputManager) {
            outputManager.getWindowManager().destroyWindow(window,true);
        }
    };
    const getWindow = function(window:string) {
        if (outputManager) {
            return outputManager.getWindowManager().windows.get(window);
        }
        return null;
    };
    const createWindow = function(window:string, data:any) {
        if (outputManager) {
            return outputManager.getWindowManager().createWindow(window,data);
        }
        return null;
    };
    const send = function(cmd: string, silent = false) {
        EvtScriptEmitCmd.fire({owner: own, message: cmd.toString(), silent: silent});
    };
    const print = function(message: string, window?:string) {
        EvtScriptEmitPrint.fire({owner: own, message: (message||"<null>").toString(), window: window});
    };
    const cls = function(window?:string) {
        EvtScriptEmitCls.fire({owner: own, window: window});
    };
    const toggleTrigger = function(id:string, state: boolean) {
        EvtScriptEmitToggleTrigger.fire({owner: own, id: id, state: state});
    };
    const toggleAlias = function(id:string, state: boolean) {
        EvtScriptEmitToggleAlias.fire({owner: own, id: id, state: state});
    };
    const toggleClass = function(id:string, state: boolean) {
        EvtScriptEmitToggleClass.fire({owner: own, id: id, state: state});
    };
    const toggleEvent = function(id:string, state: boolean) {
        EvtScriptEmitToggleEvent.fire({owner: own, id: id, state: state});
    };

    const classEnabled = function(id:string):boolean {
        if (classManager) return classManager.isEnabled(id);
        return true;
    };

    const triggerEnabled = function(id:string):boolean {
        if (triggerManager) return triggerManager.isEnabled(id);
        return true;
    };

    const eventEnabled = function(id:string):boolean {
        const ev = scriptManager.getEvent(id);
        return (ev && ev.enabled)?true:false;
    };

    const getEvent = function(id:string):ScriptEvent {
        const ev = scriptManager.getEvent(id);
        return (ev || null);
    };

    const aliasEnabled = function(id:string):boolean {
        if (aliasManager) return aliasManager.isEnabled(id);
        return true;
    };

    const getTrigger = function(id:string):TrigAlItem {
        if (triggerManager) return triggerManager.getById(id);
        return null;
    };

    const getAlias = function(id:string):TrigAlItem {
        if (aliasManager) return aliasManager.getById(id);
        return null;
    };

    /* end Scripting API section */
    const _errEmit = EvtScriptEmitError;
    

    const api = {
        getAlias: getAlias,
        getTrigger: getTrigger,
        print: print,
        send: send,
        _errEmit: _errEmit,
        owner: owner,
        aliasEnabled: aliasEnabled,
        getEvent: getEvent,
        eventEnabled: eventEnabled,
        triggerEnabled: triggerEnabled,
        classEnabled: classEnabled,
        toggleAlias: toggleAlias,
        toggleClass: toggleClass,
        toggleEvent: toggleEvent,
        toggleTrigger: toggleTrigger,
        cls: cls,
        createWindow: createWindow,
        getWindow: getWindow,
        deleteWindow: deleteWindow,
        cap: cap,
        gag: gag,
        delay: delay,
        repeat: repeat,
        highlight: highlight,
        color: color,
        stopAudio: stopAudio,
        playAudio: playAudio,
        link: link,
        sub: sub,
        variable: variable,
        getvar: getvar,
        setvar: setvar,
        mapper: mapper,
        classManager: classManager,
        aliasManager: aliasManager,
        triggerManager: triggerManager,
        outputManager: outputManager,
        map:map,
        scriptManager:scriptManager
    }

    const scriptSource = `
        const { ${Object.keys(api).join(', ')} } = api;
        with (this) {
            return async (${argSignature}) => {
                "use strict";
                try {
                    ${userScript}
                } catch (err) {
                    _errEmit.fire({owner:owner,err:err,stack:err.stack}) // script execution error
                }
            };
        }
    `;
    try {
        return new Function('api', scriptSource).call(this, api);
    } catch (err) {
        EvtScriptEmitEvalError.fire(err); // script "compilation" exception
        return null;
    }
}
