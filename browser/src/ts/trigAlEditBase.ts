import { Messagebox } from "./messagebox";
import * as Util from "./util";

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
}

export abstract class TrigAlEditBase {
    protected $win: JQuery;

    protected $listBox: JQuery;
    protected $pattern: JQuery;
    protected $id: JQuery;
    protected $className: JQuery;
    protected $enabledCheckbox: JQuery;
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
    $filter: JQuery;

    /* these need to be overridden */
    protected abstract getList(): Array<string>;
    protected abstract getItem(ind: number): TrigAlItem;
    protected abstract saveItem(ind: number, item:TrigAlItem): void;
    protected abstract deleteItem(ind: number): void;

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

    constructor(title: string) {
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
                        <label class="filter-label">Filtra:</label>
                        <input class="winEdit-filter" type="text" placeholder="<filtro>"/>
                    </div>
                    <div class="list">
                        <ul size="2" class="winEdit-listBox select"></ul>
                    </div>
                    <div class="buttons">
                        <button title="Crea nuovo" class="winEdit-btnNew greenbutton">Aggiungi</button>
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

        this.$mainSplit = $(myDiv.getElementsByClassName("winEdit-mainSplit")[0]);
        this.$newButton = $(myDiv.getElementsByClassName("winEdit-btnNew")[0]);
        this.$deleteButton = $(myDiv.getElementsByClassName("winEdit-btnDelete")[0]);
        this.$listBox = $(myDiv.getElementsByClassName("winEdit-listBox")[0]);
        this.$pattern = $(myDiv.getElementsByClassName("winEdit-pattern")[0]);
        this.$id = $(myDiv.getElementsByClassName("winEdit-id")[0]);
        this.$className = $(myDiv.getElementsByClassName("winEdit-className")[0]);
        this.$enabledCheckbox = $(myDiv.getElementsByClassName("winEdit-chkEnabled")[0]);
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
                extraKeys: {"Ctrl-Space": "autocomplete"},
            }
        );
        Util.addIntellisense(this.codeMirror);
        this.$codeMirrorWrapper = $(this.codeMirror.getWrapperElement());
        this.$codeMirrorWrapper.height("100%");
        this.$codeMirrorWrapper.hide();

        this.$listBox.click(this.itemClick.bind(this));
        this.$newButton.click(this.handleNewButtonClick.bind(this));
        this.$deleteButton.click(this.handleDeleteButtonClick.bind(this));
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));
        this.$scriptCheckbox.change(this.handleScriptCheckboxChange.bind(this));

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
        modified = modified || (this.$isPromptCheckbox.prop("checked") != item.is_prompt)
        modified = modified || (this.$enabledCheckbox.prop("checked") != item.enabled);
        modified = modified || (this.$regexCheckbox.prop("checked") != item.regex);
        modified = modified || (this.$scriptCheckbox.prop("checked") != item.is_script);
        return modified;
    }

    private ApplyFilter() {
        this.Filter(this.$filter.val());
    }

    private itemClick(e:MouseEvent) {
        var item = $(e.target);
        if (item.is("li")) {
            item.addClass('selected');
            item.siblings().removeClass('selected');
            const index = item.parent().children().index(item);
            this.$listBox.data("selectedIndex", index);
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
        this.$regexCheckbox.prop("checked", false);
        this.$scriptCheckbox.prop("checked", false);
        this.showTextInput();
    }

    private updateListBox() {
        let lst = this.getList();
        let html = "";
        for (let i = 0; i < lst.length; i++) {
            html += "<li>" + Util.rawToHtml(lst[i]) + "</option>";
        }
        this.$listBox.html(html);
        this.ApplyFilter();
    };

    private handleSaveButtonClick() {
        let ind = this.$listBox.data("selectedIndex");
        let is_script = this.$scriptCheckbox.is(":checked");

        let trg:TrigAlItem = {
            pattern: this.$pattern.val(),
            id: this.$id.val(),
            value: is_script ? this.codeMirror.getValue() : this.$textArea.val(),
            regex: this.$regexCheckbox.is(":checked"),
            is_script: is_script,
            class: this.$className.val(),
            enabled: this.$enabledCheckbox.is(":checked"),
            is_prompt: this.$isPromptCheckbox.is(":checked")
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
        this.$regexCheckbox.prop("checked", item.regex ? true : false);
        this.$scriptCheckbox.prop("checked", item.is_script ? true : false);
    }

    private handleScriptCheckboxChange() {
        let checked = this.$scriptCheckbox.prop("checked");
        if (checked) {
            this.showScriptInput();
        } else {
            this.showTextInput();
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
