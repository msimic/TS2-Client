import * as Util from "../../Core/util";
import { JsScript, Variable } from "../jsScript";
import { Messagebox, messagebox } from "../../App/messagebox";
import { isTrue } from "../../Core/util";
import { isNumeric } from "jquery";
declare let CodeMirror: any;

export class VariablesEditor {
    protected $win: JQuery;
    protected treeOptions:jqwidgets.TreeOptions = {
        checkboxes: false, keyboardNavigation: true, source: [],
        height: "100%", width: "100%",
        toggleMode: "click", animationShowDuration: 150,
    };
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
    protected jqList: jqwidgets.jqxTree;

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
        if (str && str.length < 2) {
            str = "";
        }
        if (!str) {
            this.jqList.collapseAll()
        }

        const expand = (itm: jqwidgets.TreeItem) => {
            $(itm.element).show();
            if (itm.parentElement) {
                $(itm.parentElement).show();
                this.jqList.expandItem(itm.parentElement);
                expand(itm.parentElement)
            }
        };

        const rx = new RegExp(str, 'gi');
        let items = this.jqList.getItems()
        for (const itm of items) {
            if (str) {
                $(itm.element).hide()
            } else {
                $(itm.element).show()
            }
            if (itm.value && str) {
                const txt = (<Variable><any>itm.value).name;
                const visible = txt.match(rx) != null;
                if (!!visible) {
                    expand(itm);
                }
            }
        }
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
                        <input class="winVar-filter" type="text" placeholder="<filtro>" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off"/>
                    </div>
                    <div class="list">
                        <div class="winVar-listBox" tabindex="0"></div>
                    </div>
                    <div class="buttons">
                        <button title="Crea nuova" class="winVar-btnNew greenbutton">✚</button>
                        <button title="Elimina selezionata" class="winVar-btnDelete redbutton">&#10006;</button>
                    </div>
                </div>
                <!--right panel-->
                <div class="right-pane">
                    <div class="pane-header">
                        <div class="pane-optional">
                            <label>Nome: <input type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" class="winVar-name fill-width" disabled></label>
                            <label>Valore: <input type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" class="winVar-value fill-width" disabled placeholder="(valore)" title="Il valore della variabile. Se numerica verra convertita in numerico."></label>
                            <label>Classe: <input type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" class="winVar-className fill-width" disabled placeholder="(opzionale)" title="Se appartiene a una classe specifica"></label>
                        </div>
                    </div>                    
                    <div class="pane-footer">
                        <button class="winVar-btnSave bluebutton" title="Accetta" disabled>&#10004;</button>
                        <button class="winVar-btnCancel" disabled title="Annulla">&#10006;</button>
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

        (<any>this.$listBox).jqxTree(this.treeOptions);
        this.jqList = (<any>this.$listBox).jqxTree("getInstance");
        this.$listBox = $(myDiv.getElementsByClassName("winVar-listBox")[0]);

        $(this.$listBox).on("focus", (ev) => {
            setTimeout(() => {
                if (this.jqList.getSelectedItem()) this.scrollIntoView(this.jqList.getSelectedItem());
            }, 1);
        });

        $(this.$filter).on("keydown", (ev) => {
            if (ev.key == "Tab" && !ev.shiftKey) {
                ev.preventDefault()
                ev.stopPropagation();
                let item = this.jqList.getSelectedItem() || this.jqList.getItems()[0];
                if (item) {
                    (<any>this.$listBox).focus()
                    this.select(item)
                    this.handleListBoxChange()
                } else {
                    (<any>this.$listBox).focus()
                }
            }
        });
        (<any>this.$listBox).on('select', (event:any) =>
        {
            var args = event.args;
            var item = this.jqList.getItem(args.element);
            if (item) {
                this.select(item)
                this.handleListBoxChange()
                event.preventDefault();
            }
        });

        this.$newButton.click(this.handleNewButtonClick.bind(this));
        this.$deleteButton.click(this.handleDeleteButtonClick.bind(this));
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));
        Util.circleNavigate(this.$filter, this.$cancelButton, this.$deleteButton, this.$win);
        this.$win.on('open', (event) => {
            this.$win.focusable().focus()
        })
    }

    private scrollIntoView(ti:jqwidgets.TreeItem) {
        var $container = this.$listBox;      // Only scrolls the first matched container

        var pos = $(ti.element).position(), height = $(ti.element).outerHeight();
        var containerScrollTop = $container.scrollTop(), containerHeight = $container.height();
        var top = pos.top + containerScrollTop;     // position.top is relative to the scrollTop of the containing element

        var paddingPx = $(ti.element).height() + 5;      // padding keeps the target from being butted up against the top / bottom of the container after scroll

        if (top < containerScrollTop) {     // scroll up                
            $container.scrollTop(top - paddingPx);
        }
        else if (top + height > containerScrollTop + containerHeight) {     // scroll down
            $container.scrollTop(top + height - containerHeight + paddingPx);
        }
    }

    private ApplyFilter() {
        this.Filter(this.$filter.val());
    }

    private setEditorDisabled(state: boolean): void {
        this.$name.prop("disabled", state);
        this.$value.prop("disabled", state);
        this.$className.prop("disabled", state);
        this.$saveButton.prop("disabled", state);
        this.$cancelButton.prop("disabled", state);
        if (state) {
            this.$filter.focus();
        }
    }

    private selectNone(): void {
        this.$listBox.data("selected", null);
        this.jqList.selectItem(null);
    }

    private select(item: jqwidgets.TreeItem) {
        this.$listBox.data("selected", item.value);
        this.jqList.selectItem(item);
        this.jqList.expandItem(item);
        this.scrollIntoView(item);
    }

    private clearEditor(): void {
        this.$name.val("");
        this.$value.val("");
        this.$className.val("");
    }

    getTreeItem(v:Variable) {
        let item = {
            label: (v.name || "[senza nome]"),
            expanded: false,
            value: v
        }
        return item;
    }

    private updateListBox() {
        this.list = this.getList();
        this.values = this.script.getVariables();

        this.jqList.clear();
        this.treeOptions.source = this.values.map(v => this.getTreeItem(v));
        this.jqList.setOptions(this.treeOptions);

        this.ApplyFilter();
    };

    private handleSaveButtonClick() {
        let v:Variable = this.$listBox.data("selected");

        if (!this.$name.val()) {
            Messagebox.Show("Errore", "La variabile deve avere un nome!");
            return;
        }

        if (!v) {
            v = {name: null, value: null, class:""};
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
        let v = this.$listBox.data("selected");
        if (!v) return;

        this.deleteItem(v);

        this.clearEditor();
        this.selectNone();
        this.setEditorDisabled(true);
        this.updateListBox();
    }

    private handleListBoxChange() {
        let variable = this.$listBox.data("selected");

        if (!variable) {
            this.clearEditor();
            this.setEditorDisabled(true);
            return;
        }
        this.prevName = variable.name;
        this.setEditorDisabled(false);
        this.$name.val(variable.name);
        this.$value.val(variable.value);
        this.$className.val(variable.class);
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
