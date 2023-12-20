import { EventHook } from "./event";

import {AliasManager} from "./aliasManager";
import { UserConfig } from "./userConfig";
import { createPath, isTrue, throttle } from "./util";
import { JsScript } from "./jsScript";

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
    "+": NumPadConfigDef.NumpadMultiply,
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
    NumpadSubtract: "immufire",
    NumpadAdd: "cambiaarma",
    NumpadMultiply: "immuele",
    NumpadDivide: "immucold",
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
    public EvtEmitAliasCmds = new EventHook<{orig: string, commands: string[]}>();
    public NumPad:typeof NumPadConfigDef = defNumpad;
    private cmd_history: string[] = [];
    private cmd_index: number = -1;
    private cmd_entered: string = "";

    private $cmdInput: JQuery;

    private chkCmdStack: HTMLInputElement;
    private chkCmdAliases: JQuery;
    private chkCmdTriggers: JQuery;

    constructor(private aliasManager: AliasManager, private jsScript: JsScript,private config:UserConfig) {
        this.$cmdInput = $("#cmdInput");

        this.chkCmdStack = $("#chkCmdStack")[0] as HTMLInputElement;
        this.chkCmdAliases = $("#chkCmdAliases");
        this.chkCmdTriggers = $("#chkCmdTriggers");

        this.chkCmdAliases.prop('checked', isTrue(this.config.getDef("aliasesEnabled",true)));
        this.chkCmdTriggers.prop('checked', isTrue(this.config.getDef("triggersEnabled",true)));

        const readNumpad = ()=> {
            if (this.config.getDef("numpad",false)!=false) {
                const npd = this.config.get("numpad")
                this.NumPad = typeof npd === "string" ? JSON.parse(npd) : npd;
            }
        }
        this.config.onSet("triggersEnabled", (v)=>{
            this.chkCmdTriggers.prop('checked', isTrue(v))
        });

        this.config.onSet("numpad", (v)=>{
            readNumpad();
        });

        this.config.onSet("aliasesEnabled", (v)=>{
            this.chkCmdAliases.prop('checked', isTrue(v))
        });

        this.chkCmdAliases.on('change', () => {
            this.config.set("aliasesEnabled", this.chkCmdAliases.is(":checked"));
        })

        this.chkCmdTriggers.on('change', () => {
            this.config.set("triggersEnabled", this.chkCmdTriggers.is(":checked"));
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
            return;
        }
        let result = this.aliasManager.checkAlias(cmd, fromScript);
        if (result !== true && result !== undefined && result !== null) {
            let cmds: string[] = [];
            let lines: string[] = (<string>result).replace("\r", "").split("\n");
            for (let i = 0; i < lines.length; i++) {
                cmds = cmds.concat(lines[i].split(";"));
            }
            this.EvtEmitAliasCmds.fire({orig: ocmd, commands: cmds});
        } else if (!result) {
            this.EvtEmitCmd.fire({command:cmd,fromScript:fromScript});
        } else if (result === true) {
            this.EvtEmitAliasCmds.fire({orig:cmd,commands:[]});
        }

    }

    public prepareCommands(cmd:string,cmds:string[],ocmds:string[]) {
        cmds.splice(0,cmds.length)
        ocmds.splice(0,cmds.length)
        if (this.chkCmdStack.checked) {
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

    public sendCmd(cmd: string = undefined, nohistory:boolean=false, script:boolean=false): void {

        if (cmd==undefined) cmd = this.$cmdInput.val();

        if (cmd[0] == ">" && cmd.length > 1) {
            cmd = cmd.slice(1)
            let script = this.jsScript.makeScript("Script", cmd, "");
            if (script) { script(); };
            return;
        }

        this.EvtEmitCommandsAboutToArrive.fire(true)
        
        let cmds:string[] = [], ocmds:string[] = []
        this.prepareCommands(cmd, cmds, ocmds)
        
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
            this.EvtEmitScroll.fire(ScrollType.Bottom);
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

    private onNumpad(key:string):boolean {
        const cmd = (<any>this.NumPad)[<any>key]
        if (cmd) {
            this.sendCmd(cmd, true, false);
            return true;
        }
        return false;
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
