import { EventHook } from "./event";

import {AliasManager} from "./aliasManager";
import { UserConfig } from "./userConfig";
import { isTrue } from "./util";

export class CommandInput {
    public EvtEmitScroll = new EventHook<boolean>();
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

    public execCommand(cmd: string, fromScript:boolean) {
        let cmds = [ cmd ];
        let ocmds = [ cmd ];  // originals to fetch the info who triggered the input for aliases
        if (this.chkCmdStack.checked) {
            ocmds = cmd.split(";");
            cmds = cmd.split(";");
        }
        for (let i = 0; i < cmds.length; i++) {
            if (cmds[i] && cmds[i].charAt(0) == '~') {
                this.EvtEmitCmd.fire({command:cmds[i].slice(1),fromScript:fromScript});
                continue;
            }
            let result = this.aliasManager.checkAlias(cmds[i]);
            if (result !== true && result !== undefined && result !== null) {
                let cmds: string[] = [];
                let lines: string[] = (<string>result).replace("\r", "").split("\n");
                for (let i = 0; i < lines.length; i++) {
                    cmds = cmds.concat(lines[i].split(";"));
                }
                this.EvtEmitAliasCmds.fire({orig: ocmds[i], commands: cmds});
            } else if (!result) {
                this.EvtEmitCmd.fire({command:cmds[i],fromScript:fromScript});
            }
        }
    }

    private sendCmd(): void {
        let cmd: string = this.$cmdInput.val();
        this.execCommand(cmd, false);
        this.EvtEmitScroll.fire(true);

        this.$cmdInput.select();

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
    };

    private keydown(event: KeyboardEvent): boolean {
        switch (event.which) {
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
                this.$cmdInput.select();
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
                this.$cmdInput.select();
                return false;
            case 97:
                this.$cmdInput.val("southwest");
                this.sendCmd();
                return false;
            case 98:
                this.$cmdInput.val("south");
                this.sendCmd()
                return false;
            case 99:
                this.$cmdInput.val("southeast");
                this.sendCmd();
                return false;
            case 100:
                this.$cmdInput.val("west");
                this.sendCmd();
                return false;
            case 101:
                this.$cmdInput.val("look");
                this.sendCmd();
                return false;
            case 102:
                this.$cmdInput.val("east");
                this.sendCmd();
                return false;
            case 103:
                this.$cmdInput.val("northwest");
                this.sendCmd();
                return false;
            case 104:
                this.$cmdInput.val("north");
                this.sendCmd();
                return false;
            case 105:
                this.$cmdInput.val("northeast");
                this.sendCmd();
                return false;
            case 107:
                this.$cmdInput.val("down");
                this.sendCmd();
                return false;
            case 109:
                this.$cmdInput.val("up");
                this.sendCmd();
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
