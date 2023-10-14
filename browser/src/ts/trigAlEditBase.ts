import hotkeys from "hotkeys-js";
import { Button, messagebox, Messagebox } from "./messagebox";
import * as Util from "./util";
import { circleNavigate } from "./util";

declare let CodeMirror: any;

export interface TrigAlItem {
    pattern: string;
    value: string;
    id: string,
    class: string;
    regex: boolean;
    enabled: boolean;
    is_script: boolean;
    script?: any;
    is_prompt: boolean;
    shortcut?:string;
}

export interface copyData {
    item:TrigAlItem, source:string, isBase:boolean
}

export abstract class TrigAlEditBase {
    protected $win: JQuery;

    protected $listBox: JQuery;
    protected $pattern: JQuery;
    protected $id: JQuery;
    protected $className: JQuery;
    protected $enabledCheckbox: JQuery;
    protected $macroCheckbox: JQuery;
    protected $macroLabel: JQuery;
    protected $isPromptCheckbox: JQuery;
    protected $regexCheckbox: JQuery;
    protected $scriptCheckbox: JQuery;
    protected $textArea: JQuery;
    protected $scriptArea: JQuery;
    protected codeMirror: any;
    protected $codeMirrorWrapper: JQuery;
    protected $newButton: JQuery;
    protected $deleteButton: JQuery;
    protected $mainSplit: JQuery;
    protected $saveButton: JQuery;
    protected $cancelButton: JQuery;
    protected $filter: JQuery;
    protected $copyButton: JQuery;

    /* these need to be overridden */
    protected abstract getList(): Array<string>;
    protected abstract getItem(ind: number): TrigAlItem;
    protected abstract saveItem(ind: number, item:TrigAlItem): void;
    protected abstract deleteItem(ind: number): void;
    protected abstract copyToOther(ind: number): void;
    protected abstract supportsMacro(): boolean;

    protected abstract defaultPattern: string;
    protected abstract defaultValue: string;
    protected abstract defaultScript: string;

    protected Filter(str:string) {
        $("li", this.$listBox).each((i,e) => {
            const visible = !str || $(e).text().match(new RegExp(str, 'gi')) != null;
            if (visible) {
                $(e).show();
            }
            else {
                $(e).hide();
            }
        })
    }

    constructor(title: string, protected isBase:boolean) {
        let myDiv = document.createElement("div");
        myDiv.style.display = "none";
        document.body.appendChild(myDiv);
        this.$win = $(myDiv);
        myDiv.innerHTML = `
        <!--header-->
        <div>${title}</div>
        <!--content-->
        <div>
            <div class="winEdit-mainSplit">
                <!--left panel-->
                <div class="left-pane">
                    <div class="buttons">
                        <input class="winEdit-filter" type="text" placeholder="<filtro>"/>
                    </div>
                    <div class="list">
                        <ul size="2" class="winEdit-listBox select"></ul>
                    </div>
                    <div class="buttons">
                        <button title="Crea nuovo" class="winEdit-btnNew greenbutton">Aggiungi</button>
                        <button title="Copia in privato o preimpostato" class="winEdit-btnCopy">!</button>
                        <button title="Elimina selezionato" class="winEdit-btnDelete redbutton">Elimina</button>
                    </div>
                </div>
                <!--right panel-->
                <div class="right-pane">
                    <div class="pane-header">
                        <span>Modello</span>
                        <input type="text" class="winEdit-pattern" disabled><br>
                        <div class="pane-optional">
                            <label>ID: <input type="text" class="winEdit-id" disabled placeholder="(opzionale)" title="Per visualizzare meglio nella lista o per poter usare toggleTrigger(id, stato) o toggleAlias(id, stato) in script"></label>
                            <label>Classe: <input type="text" class="winEdit-className" disabled placeholder="(opzionale)" title="Se appartiene a una classe disablitata sara' inattivo (usare toggleClass(id, stato)"></label>
                        </div>
                        <div class="pane-options">
                            <label class="macroContainer">
                                Macro <span class="lblAliasShortcut"></span>
                                <input type="checkbox" title="Configura macro per tastiera (solo alias non regex)" class="winEdit-chkMacro" disabled />
                            </label>
                            <label>
                                Abilitato
                                <input type="checkbox" title="Se disabilitato non scatta" class="winEdit-chkEnabled" disabled />
                            </label>
                            <label>
                                Prompt
                                <input type="checkbox" title="Scatta anche se non arriva un capolinea" class="winEdit-chkIsPrompt" disabled />
                            </label>
                            <label>
                                Regex
                                <input type="checkbox" title="Il pattern e' una regular expression" class="winEdit-chkRegex" disabled />
                            </label>
                            <label>
                                Script
                                <input type="checkbox" title="Il trigger contiene una script javascript" class="winEdit-chkScript" disabled />
                            </label>
                        </div>
                    </div>                    
                    <div class="pane-content-title">
                        <span>Azioni:</span>
                    </div>
                    <div class="pane-content">
                        <textarea class="winEdit-textArea" disabled></textarea>
                        <textarea class="winEdit-scriptArea" disabled></textarea>
                    </div>
                    <div class="pane-footer">
                        <button class="winEdit-btnSave bluebutton" disabled>Salva</button>
                        <button class="winEdit-btnCancel" disabled>Annulla</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        if (!this.supportsMacro()) {
            $(myDiv.getElementsByClassName("macroContainer")[0]).hide();
        }
        this.$mainSplit = $(myDiv.getElementsByClassName("winEdit-mainSplit")[0]);
        this.$newButton = $(myDiv.getElementsByClassName("winEdit-btnNew")[0]);
        this.$copyButton = $(myDiv.getElementsByClassName("winEdit-btnCopy")[0]);
        this.$deleteButton = $(myDiv.getElementsByClassName("winEdit-btnDelete")[0]);
        this.$listBox = $(myDiv.getElementsByClassName("winEdit-listBox")[0]);
        this.$pattern = $(myDiv.getElementsByClassName("winEdit-pattern")[0]);
        this.$id = $(myDiv.getElementsByClassName("winEdit-id")[0]);
        this.$className = $(myDiv.getElementsByClassName("winEdit-className")[0]);
        this.$enabledCheckbox = $(myDiv.getElementsByClassName("winEdit-chkEnabled")[0]);
        this.$macroCheckbox = $(myDiv.getElementsByClassName("winEdit-chkMacro")[0]);
        this.$macroLabel = $(myDiv.getElementsByClassName("lblAliasShortcut")[0]);
        this.$regexCheckbox = $(myDiv.getElementsByClassName("winEdit-chkRegex")[0]);
        this.$isPromptCheckbox = $(myDiv.getElementsByClassName("winEdit-chkIsPrompt")[0]);
        this.$scriptCheckbox = $(myDiv.getElementsByClassName("winEdit-chkScript")[0]);
        this.$saveButton = $(myDiv.getElementsByClassName("winEdit-btnSave")[0]);
        this.$cancelButton = $(myDiv.getElementsByClassName("winEdit-btnCancel")[0]);
        this.$textArea = $(myDiv.getElementsByClassName("winEdit-textArea")[0]);
        this.$scriptArea = $(myDiv.getElementsByClassName("winEdit-scriptArea")[0]);
        this.$filter = $(myDiv.getElementsByClassName("winEdit-filter")[0]);
        this.$filter.keyup((e)=> {
            this.ApplyFilter();
        });

        const win_w = $(window).innerWidth()-20;
        const win_h = $(window).innerHeight()-20;

        (<any>this.$win).jqxWindow({width: Math.min(600, win_w), height: Math.min(400, win_h), showCollapseButton: true});

        this.$win.on('open', (event) => {
            this.$win.focusable().focus()
        })

        this.$win.on('close', (event) => {
            if (this.isDirty()) {
                Messagebox.ShowWithButtons("Salvataggio", `Sono stati rilevati cambiamenti.
Vuoi salvare prima di uscire?`, "Si", "No").then(mr => {
                if (mr.button == 1) {
                        this.handleSaveButtonClick();
                } else {
                        this.handleCancelButtonClick();
                        this.hide();
                }
                });
                this.show(true);
            }
        });

        (<any>this.$mainSplit).jqxSplitter({
            width: "100%",
            height: "100%",
            orientation: "vertical",
            panels: [{size: "25%"}, {size: "75%"}]
        });

        this.codeMirror = CodeMirror.fromTextArea(
            this.$scriptArea[0], {
                mode: {name: "javascript", globalVars: true},
                theme: "neat",
                autoRefresh: true, // https://github.com/codemirror/CodeMirror/issues/3098
                matchBrackets: true,
                lineNumbers: true,
                scrollbarStyle: "overlay",
                tabSize: 2,
                autoCloseBrackets: true,
                styleActiveLine: true,
                search: { bottom:true},
                extraKeys: {"Ctrl-Space": "autocomplete", "Alt-F": "findPersistent"},
            }
        );
        Util.addIntellisense(this.codeMirror);
        this.$codeMirrorWrapper = $(this.codeMirror.getWrapperElement());
        this.$codeMirrorWrapper.height("100%");
        this.$codeMirrorWrapper.hide();

        this.$listBox.click(this.itemClick.bind(this));
        this.$listBox.keyup(this.itemSelect.bind(this));
        this.$newButton.click(this.handleNewButtonClick.bind(this));
        this.$copyButton.click(this.handleCopyButtonClick.bind(this));
        this.$deleteButton.click(this.handleDeleteButtonClick.bind(this));
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));
        this.$scriptCheckbox.change(this.handleScriptCheckboxChange.bind(this));
        this.$macroCheckbox.change(this.handleMacroCheckboxChange.bind(this));
        circleNavigate(this.$filter, this.$cancelButton, this.$deleteButton, this.$win);

    }
    async handleCopyButtonClick(ev: any) {
        let ind = this.$listBox.data("selectedIndex");
        if (ind == undefined || ind < 0) return;
        if (this.isDirty()) {
            await Messagebox.Show("Errore","Devi prima salvare le modifiche!")
            return
        }
        const ans = await Messagebox.Question("Sei sicuro di voler copiare nel profilo " + (this.isBase ? "PRIVATO":"BASE") + "?\nQuesta azione potrebbe sovrascrivere quello esistente.")
        if (ans.button == Button.Ok) {
            this.copyToOther(ind);
        }
    }

    itemSelect(ev: KeyboardEvent) {
        if (ev.keyCode == 13 || ev.keyCode == 32) {
            const el = this.$listBox.find("LI:focus")
            this.selectItem(el)
            this.handleListBoxChange();
        }
    }

    private selectItem(item: JQuery) {
        item.addClass('selected');
        item.siblings().removeClass('selected');
        const index = item.parent().children().index(item);
        this.$listBox.data("selectedIndex", index);
    }

    protected isDirty():boolean {

        let ind = this.$listBox.data("selectedIndex");
        let item = this.getItem(ind);

        if (!item && !this.$cancelButton.prop("disabled")) {
            return true;
        }

        if (!item) return false;

        let modified:boolean = false;
        modified = modified || (this.$pattern.val() != item.pattern);
        modified = modified || (this.$id.val() != item.id);
        modified = modified || (this.$className.val() != item.class);
        if (this.$scriptCheckbox.prop("checked")) {
            modified = modified || (this.codeMirror.getValue() != item.value);
        } else {
            modified = modified || (this.$textArea.val() != item.value);
        }
        modified = modified || (item.is_prompt != undefined && this.$isPromptCheckbox.prop("checked") != item.is_prompt)
        modified = modified || (item.enabled != undefined && this.$enabledCheckbox.prop("checked") != item.enabled);
        modified = modified || (item.shortcut != undefined && this.$macroLabel.text() != item.shortcut);
        modified = modified || (item.regex != undefined && this.$regexCheckbox.prop("checked") != item.regex);
        modified = modified || (item.is_script != undefined && this.$scriptCheckbox.prop("checked") != item.is_script);
        return modified;
    }

    private ApplyFilter() {
        this.Filter(this.$filter.val());
    }

    private itemClick(e:MouseEvent) {
        var item = $(e.target);
        if (item.is("li")) {
            this.selectItem(item)
        } else {
            item.children().removeClass('selected');
            this.$listBox.data("selectedIndex", -1);
        }
        this.handleListBoxChange();
    }

    private setEditorDisabled(state: boolean): void {
        this.$pattern.prop("disabled", state);
        this.$id.prop("disabled", state);
        this.$className.prop("disabled", state);
        this.$enabledCheckbox.prop("disabled", state);
        this.$macroCheckbox.prop("disabled", state);
        this.$isPromptCheckbox.prop("disabled", state);
        this.$regexCheckbox.prop("disabled", state);
        this.$scriptCheckbox.prop("disabled", state);
        this.$textArea.prop("disabled", state);
        this.$codeMirrorWrapper.prop("disabled", state);
        this.$saveButton.prop("disabled", state);
        this.$cancelButton.prop("disabled", state);
        this.showTextInput();
    }

    private selectNone(): void {
        this.$listBox.data("selectedIndex", -1);
        this.$listBox.children().removeClass('selected');
    }

    private clearEditor(): void {
        this.$pattern.val("");
        this.$textArea.val("");
        this.$id.val("");
        this.$className.val("");
        this.codeMirror.setValue("");
        this.$enabledCheckbox.prop("checked", false);
        this.$macroCheckbox.prop("checked", false);
        this.$macroLabel.text("");
        this.$regexCheckbox.prop("checked", false);
        this.$scriptCheckbox.prop("checked", false);
        this.showTextInput();
    }

    private updateListBox() {
        let lst = this.getList();
        let html = "";
        for (let i = 0; i < lst.length; i++) {
            html += "<li tabindex='0'>" + Util.rawToHtml(lst[i]) + "</li>";
        }
        this.$listBox.html(html);
        this.ApplyFilter();
    };

    private handleSaveButtonClick() {
        let ind = this.$listBox.data("selectedIndex");
        let is_script = this.$scriptCheckbox.is(":checked");

        if (this.$macroCheckbox.is(":checked") && !this.$macroLabel.text()) {
            this.$macroCheckbox.prop("checked", false);
        }

        if (this.$regexCheckbox.is(":checked") && this.$macroCheckbox.is(":checked")) {
            Messagebox.Show("Errore", "Un alias regex non puo' essere usato come una macro.");
            return;
        }
        let trg:TrigAlItem = {
            pattern: this.$pattern.val(),
            id: this.$id.val(),
            value: is_script ? this.codeMirror.getValue() : this.$textArea.val(),
            regex: this.$regexCheckbox.is(":checked"),
            is_script: is_script,
            class: this.$className.val(),
            enabled: this.$enabledCheckbox.is(":checked"),
            is_prompt: this.$isPromptCheckbox.is(":checked"),
            shortcut: this.$macroLabel.text()
        };

        this.saveItem(
            ind,
            trg
        );

        this.selectNone();
        this.clearEditor();
        this.setEditorDisabled(true);
        this.updateListBox();
    }

    private handleCancelButtonClick() {
        this.clearEditor();
        this.selectNone();
        this.setEditorDisabled(true);
    }

    private handleNewButtonClick() {
        this.clearEditor();
        this.setEditorDisabled(false);
        this.selectNone();
        this.$enabledCheckbox.prop("checked", true);
        this.$pattern.val(this.defaultPattern || "Scrivi qui il modello (pattern)");
        this.$textArea.val(this.defaultValue || "Scrivi qui il contenuto");
        this.codeMirror.setValue(this.defaultScript || "// Scrivi qui il codice");
    }

    private handleDeleteButtonClick() {
        let ind = this.$listBox.data("selectedIndex");
        if (ind == undefined || ind < 0) return;

        this.deleteItem(ind);

        this.clearEditor();
        this.selectNone();
        this.setEditorDisabled(true);
        this.updateListBox();
    }

    private showScriptInput() {
        this.$textArea.hide();
        this.$codeMirrorWrapper.show();
        this.codeMirror.refresh();
    }

    private showTextInput() {
        this.$codeMirrorWrapper.hide();
        this.$textArea.show();
    }

    private handleListBoxChange() {
        let ind = this.$listBox.data("selectedIndex");
        let item = this.getItem(ind);

        if (!item) {
            this.clearEditor();
            this.showTextInput();
            this.setEditorDisabled(true);
            return;
        }
        this.setEditorDisabled(false);
        this.$pattern.val(item.pattern);
        this.$id.val(item.id);
        this.$className.val(item.class);
        if (item.is_script) {
            this.showScriptInput();
            this.codeMirror.setValue(item.value);
            this.$textArea.val("");
        } else {
            this.showTextInput();
            this.$textArea.val(item.value);
            this.codeMirror.setValue("");
        }
        this.$isPromptCheckbox.prop("checked", item.is_prompt ? true : false)
        this.$enabledCheckbox.prop("checked", item.enabled ? true : false);
        this.$macroCheckbox.prop("checked", item.shortcut && item.shortcut.length ? true : false);
        this.$macroLabel.text(item.shortcut||'');
        this.$regexCheckbox.prop("checked", item.regex ? true : false);
        this.$scriptCheckbox.prop("checked", item.is_script ? true : false);
        this.$pattern.focus()
    }

    private handleScriptCheckboxChange() {
        let checked = this.$scriptCheckbox.prop("checked");
        if (checked) {
            this.showScriptInput();
        } else {
            this.showTextInput();
        }
    }

    private handleMacroCheckboxChange() {
        let checked = this.$macroCheckbox.prop("checked");
        if (checked) {
            this.readShortcut();
        } else {
            this.$macroLabel.text("");
        }
    }

    async readShortcut() {
        function pkeys(keys:any[], key:any) {
            if (keys.indexOf(key) === -1) keys.push(key);
            return keys;
        }
        function pkeysStr(keysStr:any[], key:any) {
            if (keysStr.indexOf(key) === -1) keysStr.push(key);
            return keysStr;
        }
        hotkeys.deleteScope("macroInput");
        const keys:number[] = [];
        const keyStr:string[] = [];
        /*hotkeys.filter = function(event) {
            var target:any = event.target || event.srcElement;
            var tagName = target.tagName;
            return !(target.isContentEditable || tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA') || target.id == "cmdInput";
          };*/
          hotkeys.filter = function(event) { return true;};
          hotkeys('*', { keyup: true, scope: "macroInput"}, (evn) => {
              keys.splice(0, keys.length);
              keyStr.splice(0, keyStr.length);
          });
        hotkeys('*', "macroInput", (evn) => {
            evn.preventDefault();
            if (hotkeys.shift) {
                pkeys(keys, 16);
                pkeysStr(keyStr, 'shift');
            }
            let special = false;
            if (hotkeys.ctrl || hotkeys.control) {
                pkeys(keys, 17);
                pkeysStr(keyStr, 'ctrl');
                special = true;
            }
            if (hotkeys.alt) {
                pkeys(keys, 18);
                pkeysStr(keyStr, 'alt');
                special = true;
            }
            if (hotkeys.command) {
                pkeys(keys, 91);
                pkeysStr(keyStr, 'command');
                special = true;
            }
            if (evn.charCode) keyStr.push(String.fromCharCode(evn.charCode));
            if (keys.indexOf(evn.keyCode) === -1) keys.push(evn.keyCode);
            $("#message0").text(keyStr.join("+"));
        });
        hotkeys.setScope("macroInput");
        const res = await Messagebox.Show("Configurazione Macro", "Premi i tasti per attivare questo alias.");
        hotkeys.deleteScope("macroInput");
        hotkeys.setScope("macro");
        if (res.button == Button.Ok && keyStr && keyStr.length) {
            this.$macroLabel.text(keyStr.join("+"))
        } else {
            this.$macroLabel.text("");
            this.$macroCheckbox.prop("checked", false);
        }
    }

    public hide(noload:boolean=false) {
        (<any>this.$win).jqxWindow("close");
    }

    public show(noload:boolean=false) {
        if (!noload) {
            this.refresh();
        }

        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }

    public refresh() {
        this.clearEditor();
        this.setEditorDisabled(true);
        this.updateListBox();
    }
}
