import { EventHook } from "../Core/event";

import {AliasManager} from "../Scripting/aliasManager";
import { UserConfig } from "./userConfig";
import { createPath, isTrue, parseScriptVariableAndParameters, throttle } from "../Core/util";
import { EvtScriptEmitPrint, EvtScriptEvent, JsScript, ScripEventTypes } from "../Scripting/jsScript";
import Split from "split.js";
import { OutputWin } from "./windows/outputWin";
import hotkeys from "hotkeys-js";

export enum ScrollType {
    Bottom,
    Top,
    PageUp,
    PageDown
}

export const NumPadConfigDef = {
    NumpadSubtract: "NumpadSubtract",
    NumpadAdd: "NumpadAdd",
    NumpadMultiply: "NumpadMultiply",
    NumpadDivide: "NumpadDivide",
    NumpadEnter: "NumpadEnter",
    NumpadDecimal: "NumpadDecimal",
    Numpad0: "Numpad0",
    Numpad1: "Numpad1",
    Numpad2: "Numpad2",
    Numpad3: "Numpad3",
    Numpad4: "Numpad4",
    Numpad5: "Numpad5",
    Numpad6: "Numpad6",
    Numpad7: "Numpad7",
    Numpad8: "Numpad8",
    Numpad9: "Numpad9"
}

export const NumPadMap = {
    "/": NumPadConfigDef.NumpadDivide,
    "*": NumPadConfigDef.NumpadMultiply,
    "-": NumPadConfigDef.NumpadSubtract,
    "7": NumPadConfigDef.Numpad7,
    "8": NumPadConfigDef.Numpad8,
    "9": NumPadConfigDef.Numpad9,
    "+": NumPadConfigDef.NumpadAdd,
    "4": NumPadConfigDef.Numpad4,
    "5": NumPadConfigDef.Numpad5,
    "6": NumPadConfigDef.Numpad6,
    "1": NumPadConfigDef.Numpad1,
    "2": NumPadConfigDef.Numpad2,
    "3": NumPadConfigDef.Numpad3,
    "Enter": NumPadConfigDef.NumpadEnter,
    "0": NumPadConfigDef.Numpad0,
    ",": NumPadConfigDef.NumpadDecimal,
    ".": NumPadConfigDef.NumpadDecimal,
};

export const defNumpad:typeof NumPadConfigDef = {
    NumpadSubtract: "cambiascudo",
    NumpadAdd: "cambiaarma",
    NumpadMultiply: "",
    NumpadDivide: "",
    NumpadEnter: "",
    NumpadDecimal: "porte",
    Numpad0: "cura",
    Numpad1: "casta",
    Numpad2: "south",
    Numpad3: "down",
    Numpad4: "west",
    Numpad5: "stoporfleeorlook",
    Numpad6: "east",
    Numpad7: "attack",
    Numpad8: "north",
    Numpad9: "up"
}

export class CommandInput {
    public EvtEmitScroll = new EventHook<ScrollType>();
    public EvtEmitCommandsAboutToArrive = new EventHook<boolean>();
    public EvtEmitPreparseCommands = new EventHook<{commands:string, callback:(parsed:string[])=>void}>();
    public EvtEmitCmd = new EventHook<{command:string,fromScript:boolean}>();
    public EvtEmitAliasCmds = new EventHook<{orig: string, commands: string[], fromScript: boolean}>();
    public NumPad:typeof NumPadConfigDef = defNumpad;
    private cmd_history: string[] = [];
    private cmd_index: number = -1;
    private cmd_entered: string = "";

    private $cmdInput: JQuery;

    private chkCmdStack: JQuery;
    private chkCmdAliases: JQuery;
    private chkCmdTriggers: JQuery;
    private chkCmdSplit: JQuery;
    private _splitScrolling = false;
    public get splitScrolling() {
        return this._splitScrolling;
    }
    public set splitScrolling(value) {
        this._splitScrolling = value;
    }

    isSplitScrolling() {
        return this.splitScrolling && $(".scrollBackContainer").is(":visible");
    }

    constructor(private aliasManager: AliasManager, private jsScript: JsScript,private config:UserConfig, private outputWin:OutputWin) {
        this.$cmdInput = $("#cmdInput");
        
        this.$cmdInput.on("focus", () => {
            hotkeys.setScope('macro');
        })
        this.$cmdInput.on("blur", () => {
            hotkeys.setScope('app');
        })

        this.chkCmdStack = $("#chkCmdStack");
        this.chkCmdAliases = $("#chkCmdAliases");
        this.chkCmdTriggers = $("#chkCmdTriggers");
        this.chkCmdSplit = $("#chkCmdSplit");
        this.splitScrolling = this.config.getDef("splitScrolling",false);
        this.chkCmdSplit.prop('checked', isTrue(this.config.getDef("splitScrolling",false)))
        this.chkCmdAliases.prop('checked', isTrue(this.config.getDef("aliasesEnabled",true)));
        this.chkCmdTriggers.prop('checked', isTrue(this.config.getDef("triggersEnabled",true)));

        config.evtConfigImport.handle((data) => {
            setTimeout(()=>{
                this.config.onSet("triggersEnabled", (v)=>{
                    this.chkCmdTriggers.prop('checked', isTrue(v))
                });
        
                this.config.onSet("splitScrolling", (v)=>{
                    this.splitScrolling = isTrue(v)
                });
        
                this.config.onSet("numpad", (v)=>{
                    readNumpad();
                });
        
                this.config.onSet("aliasesEnabled", (v)=>{
                    this.chkCmdAliases.prop('checked', isTrue(v))
                });
            }, 500)
        })

        const readNumpad = ()=> {
            if (this.config.getDef("numpad",false)!=false) {
                const npd = this.config.get("numpad")
                this.NumPad = typeof npd === "string" ? JSON.parse(npd) : npd;
            }
        }
        this.config.onSet("triggersEnabled", (v)=>{
            this.chkCmdTriggers.prop('checked', isTrue(v))
        });

        this.config.onSet("splitScrolling", (v)=>{
            this.splitScrolling = isTrue(v)
        });

        this.config.onSet("numpad", (v)=>{
            readNumpad();
        });

        this.config.onSet("aliasesEnabled", (v)=>{
            this.chkCmdAliases.prop('checked', isTrue(v))
        });

        $("#cmdCont").on('mousedown', () => {
            let textarea = this.$cmdInput[0] as HTMLInputElement;
            let start = textarea.selectionStart;
            textarea.setSelectionRange(start, start);
        })
        
        this.chkCmdStack.on('change', () => {
            EvtScriptEmitPrint.fire({
                owner: "commandLine",
                message: "COMANDI MULTIPLI " + (this.chkCmdStack.is(":checked") ? "ABILITATI" : "DISABILITATI")
            })
        })
        
        this.chkCmdAliases.on('change', () => {
            this.config.set("aliasesEnabled", this.chkCmdAliases.is(":checked"));
            EvtScriptEmitPrint.fire({
                owner: "commandLine",
                message: "ALIASES " + (this.chkCmdAliases.is(":checked") ? "ABILITATI" : "DISABILITATI")
            })
        })

        this.chkCmdSplit.on('change', () => {
            this.SplitScroll(this.chkCmdSplit.is(":checked"));
        })

        this.chkCmdTriggers.on('change', () => {
            this.config.set("triggersEnabled", this.chkCmdTriggers.is(":checked"));
            EvtScriptEmitPrint.fire({
                owner: "commandLine",
                message: "TRIGGERS " + (this.chkCmdTriggers.is(":checked") ? "ABILITATI" : "DISABILITATI")
            })
        })

        this.$cmdInput.keydown((event: JQueryEventObject) => { return this.keydown(event); });
        const thrInputChange = throttle(this.inputChange, 200, this)
        this.$cmdInput.bind("keyup", v => <any>thrInputChange(v));

        var contextMenu = (<any>$("#menuHistory")).jqxMenu({ animationShowDuration: 0, width: '120px', height: 'auto', source: [], autoOpenPopup: false, autoCloseOnClick: true, mode: 'popup'});
        
        let menuX = 0;
        let menuY = 0;
        
        $("#btnHistory").click((event)=>{
            var scrollTop = $(window).scrollTop();
            var scrollLeft = $(window).scrollLeft();
            const src = this.getHistoryMenuSource();
            contextMenu.jqxMenu({ source: src});
            menuX = $("#btnHistory").offset().left + 0 + scrollLeft;
            menuY = $("#btnHistory").offset().top - 5 + scrollTop;
            contextMenu.jqxMenu('open', menuX, menuY);
        })

        contextMenu.on("itemclick", (ev:any) => {
            const cmd = $(ev.target).attr("item-value");
            this.sendCmd(cmd, true, false);
        })

        contextMenu.on("shown", (ev:any) => {
            setTimeout(() => {
                $(contextMenu).css("max-height", ($(window).height()/2)+"px");
                $(contextMenu).css("min-height", "20px");
                $(contextMenu).css("height", "unset");
                $(contextMenu).css("overflow-y", "auto");
                $(contextMenu).css("opacity", 0.0);
                const h = $(contextMenu).height();
                let top = Math.floor(menuY - h);
                $(contextMenu)[0].scrollTop = $(contextMenu)[0].scrollHeight;
                $(contextMenu).animate({
                    top: top+"px",
                    opacity: 1.0
                }, 150)
            },1);
        })

        $(document).ready(() => {
            this.loadHistory();
            this.inputChange(); // Force a resize
        });
    }

    m_pos:number; // Store initial mouse position
    gutterClicked = true

    resize = (e:MouseEvent) => {
        var parent = $(".scrollBackContainer")[0] as HTMLElement; // Get the parent div
        var dx = this.m_pos - e.y; // Calculate mouse movement
        this.m_pos = e.y; // Update mouse position
        parent.style.height = ($(parent).height() - dx) + "px"; // Resize parent width
        e.preventDefault()
        e.stopPropagation()
    }

    onMouseUp = (ev:MouseEvent) => {
        if (this.gutterClicked) {
            $(".scrollBack")[0].scrollTop = $(".scrollBack")[0].scrollHeight
            localStorage.setItem('split-sizes', parseInt($(".scrollBackContainer").height().toString()).toString())    
        }
        this.gutterClicked = false
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
    onMouseDown = (e:MouseEvent) => {
        this.m_pos = e.y; // Store initial mouse position
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.addEventListener('mousemove', this.resize);
        document.addEventListener('mouseup', this.onMouseUp);
        e.preventDefault()
        e.stopPropagation()
    }

    SplitScroll(enabled: boolean) {

        console.log("split " + enabled)
        if (!enabled) {
            this.searchLine = -1;
            const elms = [$(".scrollBack")[0] as HTMLElement,$(".fill-parent.winOutput")[0] as HTMLElement]
            $("#scrollBack")[0].innerHTML = ""
            $($(".scrollBackContainer")).hide()
            $(".scrollBack")[0].scrollTop = $(".scrollBack")[0].scrollHeight
            let gutter = $(".scrollBackContainer>.gutter")[0];
            gutter.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mousemove', this.resize);
            document.removeEventListener('mouseup', this.onMouseUp);
            
        } else {
            $("#scrollBack")[0].innerHTML = $("#winOutput")[0].innerHTML
            let sizes:any = localStorage.getItem('split-sizes')
            if (sizes) {
                $(".scrollBackContainer").height(parseInt(sizes))
            }
            $(".scrollBackContainer").show()
            const elms = [$(".scrollBack")[0] as HTMLElement,$(".fill-parent.winOutput")[0] as HTMLElement]
            
            elms.forEach(e => e.scrollTop = e.scrollHeight)
            
            let gutter = $(".scrollBackContainer>.gutter")[0];
            gutter.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mousemove', this.resize);
            document.removeEventListener('mouseup', this.onMouseUp);
            gutter.addEventListener('mousedown', this.onMouseDown);
            
        }
    }

    private getHistoryMenuSource() {
        const hist = this.cmd_history;
        const menu = [];

        for (let i = 0; i < hist.length; i++) {
            let str = hist[i].replace(/$/g, " ");
            str = str.length > 20 ? str.slice(0, 20) + "..." : str;
            menu.push({
                html: str,
                value: hist[i]  
            });
        }
        return menu;
    }

    public setInput(str:string) {
        this.$cmdInput.val(str);
        this.$cmdInput.focus();
    }

    public execCommand(cmd: string, ocmd:string, fromScript:boolean) {
        if (cmd && cmd.charAt(0) == '~') {
            this.EvtEmitCmd.fire({command:cmd.slice(1),fromScript:fromScript});
            EvtScriptEvent.fire({event: ScripEventTypes.CommandExecuted, condition: (!!fromScript).toString(), value: { command: cmd, script: !!fromScript }});                
            return;
        }
        let result = this.aliasManager.checkAlias(cmd, fromScript);
        if (result !== true && result !== undefined && result !== null) {
            
            this.EvtEmitAliasCmds.fire({orig: ocmd, commands: result as string[], fromScript: fromScript});
            EvtScriptEvent.fire({event: ScripEventTypes.CommandExecuted, condition: (!!fromScript).toString(), value: { command: cmd, script: !!fromScript }});                
            
        } else if (!result) {
            let cmds:string[] = []
            let ocmds:string[] = []
            this.prepareCommands(cmd, cmds, ocmds, fromScript)
            for (const cmd of cmds) {
                this.EvtEmitCmd.fire({command:cmd,fromScript:fromScript});
                EvtScriptEvent.fire({event: ScripEventTypes.CommandExecuted, condition: (!!fromScript).toString(), value: { command: cmd, script: !!fromScript }});                        
            }
        } else if (result === true) {
            this.EvtEmitAliasCmds.fire({orig:cmd,commands:[], fromScript: fromScript});
            EvtScriptEvent.fire({event: ScripEventTypes.CommandExecuted, condition: (!!fromScript).toString(), value: { command: cmd, script: !!fromScript }});                
        }

    }

    public prepareCommands(cmd:string,cmds:string[],ocmds:string[], script:boolean) {
        cmds.splice(0,cmds.length)
        ocmds.splice(0,cmds.length)
        if (script || this.chkCmdStack.prop("checked")) {
            cmd.split(";").map(v1=> v1.split("\n").map(v=> {
                cmds.push(v)
                ocmds.push(v)
            }));
        } else {
            cmd.split("\n").map(v=> {
                cmds.push(v)
                ocmds.push(v)
            });
        }
    }

    public execCommands(cmds: string[], ocmds: string[], fromScript:boolean) {
        for (let i = 0; i < cmds.length; i++) {
            this.execCommand(cmds[i], ocmds[i], fromScript)
        }
    }
    private searchLine = -1;
    public sendCmd(cmd: string = undefined, nohistory:boolean=false, script:boolean=false): void {

        if (cmd==undefined) cmd = this.$cmdInput.val();

        if (!script && cmd[0] == ">" && cmd.length > 1) {
            cmd = cmd.slice(1)
            let value = parseScriptVariableAndParameters(cmd, {} as any)
            let script = this.jsScript.makeScript("commandLine", value, "");
            if (script) { script(); };
            this.$cmdInput.select();
            return;
        }
        if (!script && cmd.length >= 4 && cmd[0] == "?" && cmd[1] == "?") {
            cmd = cmd.slice(2)
            this.searchScrollBuffer(cmd);
            return;
        } else if (!script && cmd.length >= 2 && cmd.length < 4 && cmd[0] == "?" && cmd[1] == "?") {
            EvtScriptEmitPrint.fire({
                owner: "commandInput",
                message: "La ricerca deve avere almeno due lettere",
            })
            return;
        }

        this.EvtEmitCommandsAboutToArrive.fire(true)
        
        let cmds:string[] = [], ocmds:string[] = []
        this.prepareCommands(cmd, cmds, ocmds, script)
        
        for (let i = 0; i < cmds.length; i++) {
            const c = cmds[i];
            if (c && c[0] == "." && cmd.match(/\.[neswudoab0-9]+$/i)) {
                cmds[i] = createPath(c);
            }
        }

        let pcmds:string[] = Array.from(cmds), pocmds:string[] = Array.from(ocmds)
        let pi = 0

        for (let i = 0; i < cmds.length; i++) {
            this.EvtEmitPreparseCommands.fire({
                commands: cmds[i],
                callback: (p) => { 
                    for (const v of p) {
                        pcmds[pi]=v
                        pocmds[pi++]=ocmds[i]
                    }
                }
            })    
        }

        if (pcmds.length) {
            cmds = pcmds
            ocmds = pocmds
        }

        this.execCommands(cmds, ocmds, script);
        if (!script) {
            this.outputWin.scrollBottom(true)
            //this.EvtEmitScroll.fire(ScrollType.Bottom);
            this.$cmdInput.select();
        }

        if (!nohistory) {
            if (cmd.trim() === "") {
                return;
            }
            if (this.cmd_history.length > 0
                && cmd === this.cmd_history[this.cmd_history.length - 1]) {
                return;
            }

            if (cmd.length > 1) {
                this.cmd_history.push(cmd);
                this.cmd_history = this.cmd_history.slice(-20);
                this.saveHistory();
                this.cmd_index = -1;
            }
        }
    };

    private searchScrollBuffer(cmd: string) {
        cmd = cmd.trim()
        if (cmd.length < 2) {
            EvtScriptEmitPrint.fire({
                owner: "commandInput",
                message: "La ricerca deve avere almeno due lettere",
            })
            return;
        }
        function isInViewport(obj:JQuery, parent:JQuery) {

            var elementTop = $(obj).offset().top;
        
            var elementBottom = elementTop + $(obj).outerHeight() / 2;
        
            var viewportTop = $(parent).scrollTop();
        
            var viewportHalf = viewportTop + $(parent).height() / 2;
        
            return elementBottom > viewportTop && elementTop < viewportHalf;
        
        };

        if (!$(".scrollBackContainer").is(":visible")) {
            this.SplitScroll(true);
            this.searchLine = -1;
        }
        const lines = $("#scrollBack.outputText").children().toArray().reverse();
        $(lines).removeClass("search-hit");
        const lineIndex = lines.findIndex((v, i) => {
            return i > this.searchLine && $(v).text().toLowerCase().includes(cmd.toLowerCase());
        });
        if (lineIndex>=0) {
            this.searchLine = lineIndex
            lines[lineIndex].scrollIntoView({
                behavior: "auto",
                block: "start",
                inline: "start"
            });
            $(lines[lineIndex]).addClass("search-hit");
                
            setTimeout(() => {
                if (!isInViewport($(lines[lineIndex]),$('.scrollBack'))) {
                    lines[lineIndex].scrollIntoView({
                        behavior: "auto",
                        block: "start",
                        inline: "start"
                    });
                }
           },100);
        } else {
            if (this.searchLine == -1) {
                EvtScriptEmitPrint.fire({
                    owner: "commandInput",
                    message: "Termine non trovato nel scroll buffer."
                })
                this.SplitScroll(false);
            }
            this.searchLine = -1;
        }
        this.$cmdInput.select();
    }

    private onNumpad(key:string):boolean {
        const cmd = (<any>this.NumPad)[<any>key]
        if (cmd) {
            this.sendCmd(cmd, true, false);
            return true;
        }
        return false;
    }

    public SplitScrolBottom() {
        let elem = $(".scrollBack");
        elem.stop().animate({scrollTop:elem.prop("scrollHeight")}, 150);
        this.SplitScroll(false)
    };

    private _thrSplitScrollPageUp:Function = null;
    private _SplitScrollPageUp() {
        let elem = $(".scrollBack");
        const scrollH = parseInt(elem.prop('scrollTop'))-elem.height()
        elem.stop().animate({scrollTop:scrollH}, 150);
    }
    public SplitScrollPageUp() {
        if (!this._thrSplitScrollPageUp) {
            this._thrSplitScrollPageUp = throttle(this._SplitScrollPageUp, 150)
        }
        this._thrSplitScrollPageUp();
    }
    private _thrSplitScrollPageDown:Function = null;
    public _SplitScrollPageDown() {
        let elem = $(".scrollBack");
        if (elem.prop("scrollTop")+elem.innerHeight()+2 >= elem.prop("scrollHeight")) {
            this.SplitScroll(false)
            return
        }
        const scrollH = parseInt(elem.prop('scrollTop'))+elem.height()
        elem.stop().animate({scrollTop:scrollH}, 150);
    }
    public SplitScrollPageDown() {
        if (!this._thrSplitScrollPageDown) {
            this._thrSplitScrollPageDown = throttle(this._SplitScrollPageDown, 150)
        }
        this._thrSplitScrollPageDown();
    }
    public SplitScrollTop() {
        let elem = $(".scrollBack");
        elem.stop().animate({scrollTop:0}, 250);
    }

    private keydown(event: JQueryEventObject): boolean {
        const code = (<KeyboardEvent>event.originalEvent).key;
        const location = (<KeyboardEvent>event.originalEvent).location;
        if (location == 3 /* numpad todo keynames */) {
            const numpadKey = code in NumPadMap ? (<any>NumPadMap)[code] : null;
            if (numpadKey && this.onNumpad(numpadKey)) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            } else if (code == "Enter" && !event.shiftKey) {
                this.sendCmd(undefined, false, false);
                return false;
            }
        };
        switch (code) {
            case "PageUp":
                this.EvtEmitScroll.fire(ScrollType.PageUp)
                return false;
            case "PageDown":
                this.EvtEmitScroll.fire(ScrollType.PageDown)
                return false;
            case "Home":
                if (event.ctrlKey) {
                    this.EvtEmitScroll.fire(ScrollType.Top)
                    return false;
                }
                return true
            case "End":
                if (event.ctrlKey) {
                    this.EvtEmitScroll.fire(ScrollType.Bottom)
                    return false;
                }
                return true
            case "Escape": // esc
                this.SplitScroll(false)
                return true;
            case "F":
            case "f":
                if (event.ctrlKey && !event.altKey && !event.shiftKey) {
                    this.searchScrollBuffer(this.$cmdInput.val());
                    event.preventDefault()
                    event.stopPropagation()
                    return false;
                }
                return true;
                break;
            case "Enter": // enter
                if (event.shiftKey) {
                    return true;
                } else {
                    this.sendCmd(undefined, false, false);
                    return false;
                }
            case "ArrowUp": // up
                if (this.cmd_index === -1) {
                    this.cmd_entered = this.$cmdInput.val();

                    let newIndex = -1;
                    for (let index = this.cmd_history.length-1; index >= 0; index--) {
                        const element = this.cmd_history[index];
                        if (element.toUpperCase().indexOf(this.cmd_entered.toUpperCase())==0) {
                            newIndex = index;
                            break;
                        }
                    }

                    if (newIndex>-1) {
                        this.cmd_index = newIndex;
                    } else {
                        this.cmd_index = this.cmd_history.length - 1;
                    }
                } else {
                    let newIndex = -1;
                    for (let index = this.cmd_index-1; index >= 0; index--) {
                        const element = this.cmd_history[index];
                        if (element.toUpperCase().indexOf(this.cmd_entered.toUpperCase())==0) {
                            newIndex = index;
                            break;
                        }
                    }
                    if (newIndex>-1) {
                        this.cmd_index = newIndex;
                    } else {
                        this.cmd_index -= 1;
                    }
                    this.cmd_index = Math.max(this.cmd_index, 0);
                }
                this.$cmdInput.val(this.cmd_history[this.cmd_index]);
                this.inputChange();
                //this.$cmdInput.select();
                return false;
            case "ArrowDown": // down
                if (this.cmd_index === -1) {
                    break;
                }

                if (this.cmd_index === (this.cmd_history.length - 1)) {
                    // Already at latest, grab entered but unsent value
                    this.cmd_index = -1;
                    this.$cmdInput.val(this.cmd_entered);
                } else {
                    this.cmd_index += 1;
                    this.$cmdInput.val(this.cmd_history[this.cmd_index]);
                }
                this.$cmdInput.val(this.cmd_history[this.cmd_index]);
                this.inputChange();
                //this.$cmdInput.select();
                return false;
            default:
                this.cmd_index = -1;
                return true;
        }
        return false;
    }

    private lastVal = "";
    private inputChange(): number {
        let input = this.$cmdInput;
        const newVal = this.$cmdInput.val()||""
        if (this.lastVal.length > newVal.length) {
            (input[0] as HTMLElement).style.height = "0";
        } 
        this.lastVal = newVal;
        const nh = input[0].scrollHeight;
        setTimeout(()=>{
            const style = (input[0] as HTMLElement).style
            if (style.height != nh + "px") {
                //console.log("changing command input height")
                style.height = nh + "px"
            }
        },0);
        return nh;
    }

    private saveHistory(): void {
        localStorage.setItem("cmd_history", JSON.stringify(this.cmd_history));
    }

    private loadHistory(): void {
        let cmds = localStorage.getItem("cmd_history");
        if (cmds) {
            this.cmd_history = JSON.parse(cmds);
        }
    }
}
