import { EventHook } from "./event";

import {AliasManager} from "./aliasManager";
import { UserConfig } from "./userConfig";
import { createPath, isTrue } from "./util";

export enum ScrollType {
    Bottom,
    Top,
    PageUp,
    PageDown
}

export class CommandInput {
    public EvtEmitScroll = new EventHook<ScrollType>();
    public EvtEmitCommandsAboutToArrive = new EventHook<boolean>();
    public EvtEmitPreparseCommands = new EventHook<{commands:string, callback:(parsed:string[])=>void}>();
    public EvtEmitCmd = new EventHook<{command:string,fromScript:boolean}>();
    public EvtEmitAliasCmds = new EventHook<{orig: string, commands: string[]}>();

    private cmd_history: string[] = [];
    private cmd_index: number = -1;
    private cmd_entered: string = "";

    private $cmdInput: JQuery;

    private chkCmdStack: HTMLInputElement;
    private chkCmdAliases: JQuery;
    private chkCmdTriggers: JQuery;

    constructor(private aliasManager: AliasManager, private config:UserConfig) {
        this.$cmdInput = $("#cmdInput");

        this.chkCmdStack = $("#chkCmdStack")[0] as HTMLInputElement;
        this.chkCmdAliases = $("#chkCmdAliases");
        this.chkCmdTriggers = $("#chkCmdTriggers");

        this.chkCmdAliases.prop('checked', isTrue(this.config.getDef("aliasesEnabled",true)));
        this.chkCmdTriggers.prop('checked', isTrue(this.config.getDef("triggersEnabled",true)));

        this.config.onSet("triggersEnabled", (v)=>{
            this.chkCmdTriggers.prop('checked', isTrue(v))
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

        this.$cmdInput.keydown((event: KeyboardEvent) => { return this.keydown(event); });
        this.$cmdInput.bind("input propertychange", () => { return this.inputChange(); });

        $(document).ready(() => {
            this.loadHistory();
            this.inputChange(); // Force a resize
        });
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

        this.EvtEmitCommandsAboutToArrive.fire(true)
        if (cmd==undefined) cmd = this.$cmdInput.val();

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

    private keydown(event: KeyboardEvent): boolean {
        switch (event.which) {
            case 33:
                this.EvtEmitScroll.fire(ScrollType.PageUp)
                return false;
            case 34:
                this.EvtEmitScroll.fire(ScrollType.PageDown)
                return false;
            case 35:
                if (event.ctrlKey) {
                    this.EvtEmitScroll.fire(ScrollType.Top)
                    return false;
                }
                return true
            case 36:
                if (event.ctrlKey) {
                    this.EvtEmitScroll.fire(ScrollType.Bottom)
                    return false;
                }
                return true
            case 13: // enter
                if (event.shiftKey) {
                    return true;
                } else {
                    this.sendCmd();
                    return false;
                }
            case 38: // up
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
                    this.cmd_index -= 1;
                    this.cmd_index = Math.max(this.cmd_index, 0);
                }
                this.$cmdInput.val(this.cmd_history[this.cmd_index]);
                this.inputChange();
                //this.$cmdInput.select();
                return false;
            case 40: // down
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
            case 97:
                this.sendCmd("southwest", true);
                return false;
            case 98:
                this.sendCmd("south", true)
                return false;
            case 99:
                this.sendCmd("southeast", true);
                return false;
            case 100:
                this.sendCmd("west", true);
                return false;
            case 101:
                this.sendCmd("look",true);
                return false;
            case 102:
                this.sendCmd("east", true);
                return false;
            case 103:
                this.sendCmd("northwest", true);
                return false;
            case 104:
                this.sendCmd("north", true);
                return false;
            case 105:
                this.sendCmd("northeast",true);
                return false;
            case 107:
                this.sendCmd("down",true);
                return false;
            case 109:
                this.sendCmd("up",true);
                return false;
            default:
                this.cmd_index = -1;
                return true;
        }
        return false;
    }

    private inputChange(): void {
        let input = this.$cmdInput;
        input.height("1px");
        let scrollHeight = Math.max(input[0].scrollHeight, 20);
        let new_height = scrollHeight;
        input.height(new_height + "px");
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
