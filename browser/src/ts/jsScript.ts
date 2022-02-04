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

export let EvtScriptEmitCmd = new EventHook<{owner:string, message:string}>();
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

let startWatch = function (this : ScriptThis, onWatch:(ev:PropertyChanged)=>void) {

    var self = <any>this;

    if (!self.watchTask) {
        self._oldValues = [];

        for (var propName in self) {
            self._oldValues[propName] = self[propName];
        }


        setInterval(function () {
            for (var propName in self) {
                var propValue = self[propName];
                if (typeof (propValue) != 'function') {


                    var oldValue = self._oldValues[propName];

                    if (propValue != oldValue) {

                        onWatch({ obj: self, propName: propName, oldValue: oldValue, newValue: propValue });
                        self._oldValues[propName] = propValue;

                    }

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
    Name: string;
    Class: string;
    Value: any;
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
    
    private self = this;
    constructor(private config: ConfigIf,private baseConfig: ConfigIf, private profileManager: ProfileManager, private mapper:Mapper) {
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

    addEvent(ev:ScriptEvent) {
        this.eventList.push(ev);
        if (!this.events.has(ev.type)) {
            this.events.set(ev.type, []);
        }
        this.events.get(ev.type).push(ev);
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

    getVariableValue(name:string):any {
        const vari = this.variables.get(name)
        return vari ? vari.Value : null;
    }

    getVariables(Class?:string):Variable[] {
        this.save();
        return [...this.variables.values()].filter(v => v.Class == Class || !Class);
    }

    setVariable(variable:Variable) {
        if (isNumeric(variable.Value)) {
            variable.Value = Number(variable.Value);
        }
        this.variables.set(variable.Name, variable);
        this.scriptThis[variable.Name] = variable.Value;
    }

    delVariable(variable:Variable) {
        this.variables.delete(variable.Name);
        delete this.scriptThis[variable.Name];
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
        this.baseVariables = new Map<string, Variable>(this.config.getDef("variables", []));
        for (const v of this.baseVariables) {
            if (v[0] && v[1].Value) this.scriptThis[v[0]] = v[1].Value;
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
        this.variables = new Map<string, Variable>(this.config.getDef("variables", []));
        for (const v of this.variables) {
            if (v[0] && v[1].Value) this.scriptThis[v[0]] = v[1].Value;
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
                    let variable = this.variables.get(key) || { Name: key, Class: "", Value: null };
                    variable.Value = element;
                    variable.Name = variable.Name || key;
                    this.variables.set(key, variable);
                }
            }
        }
        for (const k of this.variables.keys()) {
            if (this.variables.get(k).Value == undefined || k == "_oldValues") {
                this.variables.delete(k);
            }
        }
        this.saveVariablesAndEventsToConfig(this.events, this.variables);
    }

    private saveVariablesAndEventsToConfig:any;
    private saveVariablesAndEventsToConfigInternal(ev:any, vars:any) {
        this.config.set("script_events", [...ev]);
        this.config.set("variables", [...vars]);
    }

    public getScriptThis() { return this.scriptThis; }

    public makeScript(owner:string, text: string, argsSig: string): any {
        try {
            let scr = makeScript.call(this.scriptThis, owner, text, argsSig, this.classManager, this.aliasManager, this.triggerManager, this.outputManager, this.mapper, this);
            if (!scr) { return null; }
            return (...args: any[]) => {
                    let ret = scr(...args);
                    return ret;
            };
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
function makeScript(owner:string, text: string, argsSig: string,
    classManager: ClassManager,
    aliasManager: AliasManager,
    triggerManager: TriggerManager,
    outputManager: OutputManager,
    map:Mapper,
    scriptManager:JsScript) {

    let _scriptFunc_: any;
    let own = owner;

    /* Scripting API section */
    const mapper = map;
    const color = colorize;
    const sub = function(sWhat: string, sWith:string) {
        if (triggerManager) triggerManager.subBuffer(sWhat, sWith);
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
    const createWindow = function(window:string, data:any) {
        if (outputManager) {
            outputManager.getWindowManager().createWindow(window,data);
        }
    };
    const send = function(cmd: string) {
        EvtScriptEmitCmd.fire({owner: own, message: cmd.toString()});
    };
    const print = function(message: string, window?:string) {
        EvtScriptEmitPrint.fire({owner: own, message: message.toString(), window: window});
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
    try {

        let code = `
                (async () => {
                    try {
                        ${text}
                    } catch (err) {
                        _errEmit.fire({owner:owner, err: err, stack: err.stack});
                    }
                })()
        `;
        const scrTxt = "_scriptFunc_ = function(" + argsSig + ") {\n" + code + "\n}";
        eval(scrTxt);
    }
    catch (err) {
        EvtScriptEmitEvalError.fire(err);
        return null;
    }

    const ret = _scriptFunc_.bind(this);
    return ret;
}
