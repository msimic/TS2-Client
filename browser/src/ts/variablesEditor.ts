import * as Util from "./util";
import { JsScript, Variable } from "./jsScript";
import { Messagebox, messagebox } from "./messagebox";
import { isTrue } from "./util";
import { isNumeric } from "jquery";
declare let CodeMirror: any;

export class VariablesEditor {
    protected $win: JQuery;

    protected $listBox: JQuery;
    protected $name: JQuery;
    protected $value: JQuery;
    protected $className: JQuery;
    protected $newButton: JQuery;
    protected $deleteButton: JQuery;
    protected $mainSplit: JQuery;
    protected $saveButton: JQuery;
    protected $cancelButton: JQuery;
    $filter: JQuery;
    list: string[];
    values:Variable[];
    prevName: string;

    /* these need to be overridden */
    protected getList(): Array<string> {
        this.list = this.script.getVariables().map(v=>v.name);
        return this.list;
    }

    protected getItem(ind: number): Variable {
        return this.values[ind];
    }

    protected saveItem(variable: Variable): void {
        if (this.prevName != variable.name) {
            const v = this.script.getVariables().find(v => v.name == this.prevName);
            if (v) this.script.delVariable(v);
        }
        this.script.setVariable(variable);
        this.script.save();
    }
    protected deleteItem(variable: Variable): void {
        this.script.delVariable(variable);
        this.script.save();
    }

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

    constructor(private script:JsScript) {
        const title: string = "Variabili";
        /*script.variableChanged.handle(v => {
            this.refresh()
        })*/
        let myDiv = document.createElement("div");
        myDiv.style.display = "none";
        document.body.appendChild(myDiv);
        this.$win = $(myDiv);
        myDiv.innerHTML = `
        <!--header-->
        <div>${title}</div>
        <!--content-->
        <div>
            <div class="winVar-mainSplit">
                <!--left panel-->
                <div class="left-pane">
                    <div class="buttons">
                        <input class="winVar-filter" type="text" placeholder="<filtro>"/>
                    </div>
                    <div class="list">
                        <ul size="2" class="winVar-listBox select" style="height: 100%;box-sizing: border-box;"></ul>
                    </div>
                    <div class="buttons">
                        <button title="Crea nuova" class="winVar-btnNew greenbutton">Aggiungi</button>
                        <button title="Elimina selezionata" class="winVar-btnDelete redbutton">Elimina</button>
                    </div>
                </div>
                <!--right panel-->
                <div class="right-pane">
                    <div class="pane-header">
                        <div class="pane-optional">
                            <label>Nome: <input type="text" class="winVar-name fill-width" disabled></label>
                            <label>Valore: <input type="text" class="winVar-value fill-width" disabled placeholder="(valore)" title="Il valore della variabile. Se numerica verra convertita in numerico."></label>
                            <label>Classe: <input type="text" class="winVar-className fill-width" disabled placeholder="(opzionale)" title="Se appartiene a una classe specifica"></label>
                        </div>
                    </div>                    
                    <div class="pane-footer">
                        <button class="winVar-btnSave bluebutton" disabled>Salva</button>
                        <button class="winVar-btnCancel" disabled>Annulla</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        this.$mainSplit = $(myDiv.getElementsByClassName("winVar-mainSplit")[0]);
        this.$newButton = $(myDiv.getElementsByClassName("winVar-btnNew")[0]);
        this.$deleteButton = $(myDiv.getElementsByClassName("winVar-btnDelete")[0]);
        this.$listBox = $(myDiv.getElementsByClassName("winVar-listBox")[0]);
        this.$name = $(myDiv.getElementsByClassName("winVar-name")[0]);
        this.$value = $(myDiv.getElementsByClassName("winVar-value")[0]);
        this.$className = $(myDiv.getElementsByClassName("winVar-className")[0]);
        this.$saveButton = $(myDiv.getElementsByClassName("winVar-btnSave")[0]);
        this.$cancelButton = $(myDiv.getElementsByClassName("winVar-btnCancel")[0]);
        this.$filter = $(myDiv.getElementsByClassName("winVar-filter")[0]);
        this.$filter.keyup((e)=> {
            this.ApplyFilter();
        });

        const win_w = $(window).innerWidth()-20;
        const win_h = $(window).innerHeight()-20;

        (<any>this.$win).jqxWindow({width: Math.min(400, win_w), height: Math.min(300, win_h), showCollapseButton: true});

        (<any>this.$mainSplit).jqxSplitter({
            width: "100%",
            height: "100%",
            orientation: "vertical",
            panels: [{size: "50%"}, {size: "50%"}]
        });

        this.$listBox.click(this.itemClick.bind(this));
        this.$listBox.keyup(this.itemSelect.bind(this));
        this.$newButton.click(this.handleNewButtonClick.bind(this));
        this.$deleteButton.click(this.handleDeleteButtonClick.bind(this));
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));
        Util.circleNavigate(this.$filter, this.$cancelButton, this.$deleteButton, this.$win);
        this.$win.on('open', (event) => {
            this.$win.focusable().focus()
        })
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
        this.$name.prop("disabled", state);
        this.$value.prop("disabled", state);
        this.$className.prop("disabled", state);
        this.$saveButton.prop("disabled", state);
        this.$cancelButton.prop("disabled", state);
    }

    private selectNone(): void {
        this.$listBox.data("selectedIndex", -1);
        this.$listBox.children().removeClass('selected');
    }

    private clearEditor(): void {
        this.$name.val("");
        this.$value.val("");
        this.$className.val("");
    }

    private updateListBox() {
        this.list = this.getList();
        this.values = this.script.getVariables();
        let html = "";
        for (let i = 0; i < this.list.length; i++) {
            html += "<li tabindex='0'>" + Util.rawToHtml(this.list[i]) + "</li>";
        }
        this.$listBox.html(html);
        this.ApplyFilter();
    };

    private handleSaveButtonClick() {
        let ind = this.$listBox.data("selectedIndex");
        let v:Variable;

        if (!this.$name.val()) {
            Messagebox.Show("Errore", "La variabile deve avere un nome!");
            return;
        }

        if (ind == -1) {
            v = {name: null, value: null, class:""};
        } else {
            v = this.getItem(ind);
        }

        v.name = this.$name.val();
        v.value = (this.$value.val() == "true" || this.$value.val() == "false") ? isTrue(this.$value.val()) : (isNumeric(this.$value.val()) ? Number(this.$value.val()) : this.$value.val());
        v.class = this.$className.val();
        this.saveItem(v);

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
    }

    private handleDeleteButtonClick() {
        let ind = this.$listBox.data("selectedIndex");
        if (ind == undefined || ind < 0) return;

        this.deleteItem(this.getItem(ind));

        this.clearEditor();
        this.selectNone();
        this.setEditorDisabled(true);
        this.updateListBox();
    }

    private handleListBoxChange() {
        let ind = this.$listBox.data("selectedIndex");
        let item = this.getItem(ind);
        this.prevName = item.name;

        if (!item) {
            this.clearEditor();
            this.setEditorDisabled(true);
            return;
        }
        this.setEditorDisabled(false);
        this.$name.val(item.name);
        this.$value.val(item.value);
        this.$className.val(item.class);
    }

    public show() {
        this.refresh();

        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }

    private refresh() {
        this.clearEditor();
        this.setEditorDisabled(true);
        this.updateListBox();
    }
}
