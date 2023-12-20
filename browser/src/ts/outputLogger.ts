import { EventHook } from "./event";
import { openDB, IDBPDatabase, DBSchema } from 'idb';

export interface OutputLogDBSchema extends DBSchema {
    lines: {
      value: string;
      key: number;
    };
  }

export let EvtLogExceeded = new EventHook<{owner:string, message:string, silent:boolean}>();

export class OutputLogger {
    private static instance: OutputLogger;
    private dbName = 'TsOutputLog';
    private dbVersion = 1;
    private numLines = 0;

    private db:IDBPDatabase<OutputLogDBSchema> = null;

    constructor() {
        if (OutputLogger.instance) {
            return OutputLogger.instance;
        }
        OutputLogger.instance = this;
        this.init()
    }

    async init() {
        this.db = await openDB<OutputLogDBSchema>(this.dbName, this.dbVersion, {
            upgrade(db, oldVersion, newVersion) {
                db.createObjectStore('lines', {autoIncrement:true});
            },
            terminated() {
                console.log("IndexedDB logging failed")
            }
        });
        this.numLines = await (this.db).count("lines");
    }
    
    async log(buffer: string) {
        if (!this.db || !this.isEnabled()) {
            return;
        }

        if (buffer.endsWith('\n')) {
            buffer = buffer.slice(0, buffer.length - 1)
        }

        if (buffer.indexOf('\n') != -1) {
            let lines = buffer.split('\n')
            const tx = this.db.transaction("lines", "readwrite")
            const ops = []
            for (const line of lines) {
                ops.push(tx.store.add(line))
            }
            await Promise.all([...ops,tx.done])
        } else {
            await this.db.add("lines", buffer);
        }
        this.numLines = await this.db.count("lines");
        //console.log("Logger lines: " + this.numLines)
        if (this.lineCount() > 50000) {
            EvtLogExceeded.fire({
                owner: "outputLogger",
                message: "Lunghezza Log superata (100000 linee). Verra' azzerato. Vuoi scaricarlo ora?",
                silent: false
            })
        }
    }

    lineCount():number {
        return this.numLines;
    }
    
    clear() {
        if (!this.db) {
            return;
        }
        this.db.clear("lines")
        this.numLines = 0;
    }

    isEnabled() {
        return localStorage.getItem("autologging")=="true";
    }

    start() {
        localStorage.setItem("autologging", true.toString())
    }

    stop() {
        localStorage.setItem("autologging", false.toString())
    }

    empty(): boolean {
        return this.numLines == 0;
    }

    async allLines() {
        return (this.db).getAll("lines")
    }

    async content(): Promise<string> {
        
        let lines:Array<string> = await this.allLines();
        
        if (!lines) {
            return "";
        }

        return lines.join("\n");
    }
}