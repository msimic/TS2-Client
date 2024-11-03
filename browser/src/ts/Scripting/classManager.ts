import { EventHook } from "../Core/event";
import { TrigAlItem } from "./windows/trigAlEditBase";
import { EvtScriptEmitPrint, EvtScriptEmitToggleClass, EvtScriptEvent, ScripEventTypes } from "./jsScript";
import { ConfigIf } from "../Core/util";
import { ProfileManager } from "../App/profileManager";

export interface Class{
    name: string;
    enabled: boolean;
}

export class ClassManager {
    public EvtEmitTriggerCmds = new EventHook<{orig: string, cmds: string[]}>();

    public classes: Map<string, Class> = new Map<string, Class>();
    public changed = new EventHook()

    constructor(private config: ConfigIf, private profileManager:ProfileManager) {
        EvtScriptEmitToggleClass.handle(this.onToggle, this);
        this.loadClasses();
        profileManager.evtProfileChanged.handle(async d => {
            this.loadClasses();
            this.changed.fire(true)
        })
    }

    private onToggle(data: {owner: string, id:string, state:boolean}) {
        const oldState = this.classes.get(data.id)?.enabled
        this.Toggle(data.id, data.state);
        if (this.classes.get(data.id)?.enabled != oldState) {
            const msg = "La classe " + data.id + " e' ora " + (this.isEnabled(data.id) ? "ABILITATA" : "DISABILITATA");
            if (this.config.getDef("debugScripts", false)) {
                EvtScriptEmitPrint.fire({owner:"ClassManager", message: msg});
            }
        }
    }

    public Delete(id:string) {
        this.classes.delete(id);
    }
    public Create(id:string, val:boolean) {
        this.classes.set(id, {
            name: id,
            enabled: val
        });
        this.saveClasses();
    }
    public Toggle(id: string, val:boolean):void {
        if (!this.classes.has(id)) {
            this.Create(id, val == undefined ? true : val);
            this.saveClasses();
            return;
        }
        const cls = this.classes.get(id);
        if (val == undefined) {
            val = !cls.enabled;
        }
        const changed = cls.enabled != val;
        if (changed) {
            cls.enabled = val;
            this.saveClasses()
            EvtScriptEvent.fire({event: ScripEventTypes.ClassChanged, condition: id, value: cls.enabled});
        }
    }

    public isEnabled(id: string):boolean {
        if (this.classes.has(id)) {
            return this.classes.get(id).enabled;
        }
        return true;
    }

    public saveClasses() {
        this.config.set("classes", this.classes);
    }

    private loadClasses() {
        let cls = <any>this.config.get("classes") || [];
        if (typeof (<any>cls).push != "function") {
            (<any>cls) = [];
        }
        this.classes = this.config.get("classes") ? new Map<string, Class>(cls) : new Map<string, Class>();
    }
}

