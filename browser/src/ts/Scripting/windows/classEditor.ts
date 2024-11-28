import * as Util from "../../Core/util";
import { JsScript, Variable } from "../jsScript";
import { Class, ClassManager } from "../classManager";
import { Button, Messagebox } from "../../App/messagebox";
import { circleNavigate, exportClassFunc, importScriptsFunc } from "../../Core/util";
import { ProfileManager } from "../../App/profileManager";
import { TriggerManager } from "../triggerManager";
import { AliasManager } from "../aliasManager";
declare let CodeMirror: any;

export class ClassEditor {
    protected $win: JQuery;
    protected treeOptions:jqwidgets.TreeOptions = {
        checkboxes: false, keyboardNavigation: true, source: [],
        height: "100%", width: "100%",
        toggleMode: "click", animationShowDuration: 150,
    };
    protected $listBox: JQuery;
    protected $name: JQuery;
    protected $classInfo: JQuery;
    protected $classInfoPanel: JQuery;
    protected $value: JQuery;
    protected $newButton: JQuery;
    protected $showBase: JQuery;
    protected $deleteButton: JQuery;
    protected $importButton: JQuery;
    protected $exportButton: JQuery;
    protected $mainSplit: JQuery;
    protected $saveButton: JQuery;
    protected $cancelButton: JQuery;
    $filter: JQuery;
    list: string[];
    values:Class[];
    prevName: string;
    protected jqList: jqwidgets.jqxTree;

    /* these need to be overridden */
    protected getList(): Array<string> {
        this.list = [...this.classManager.classes.keys()];
        return this.list;
    }

    protected getItem(ind: number): Class {
        return this.values[ind];
    }

    protected saveItem(cls: Class): void {
        if (this.prevName != cls.name && this.classManager.classes.has(this.prevName)) {
            this.classManager.Delete(this.prevName);
        }
        this.classManager.classes.set(cls.name, cls);
        this.classManager.saveClasses();
    }
    protected deleteItem(cls: Class): void {
        this.classManager.Delete(cls.name);
        this.classManager.saveClasses();
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

    setProfileManager(profileManager:ProfileManager) {
        this.profileManager = profileManager
        if (profileManager) {
            profileManager.evtProfileChanged.handle(async c => {
                this.refresh()
                if (this.isOpen()) {
                    this.bringToFront()
                }
            })
        }
    }

    private isOpen() {
        return (<any>this.$win).jqxWindow("isOpen");
    }

    private bringToFront() {
        console.log("!!! Bring to front classes");
        (<any>this.$win).jqxWindow("bringToFront");
    }

    constructor(private classManager:ClassManager,
                private profileManager:ProfileManager,
                private trigManager:TriggerManager,
                private alManager:AliasManager,
                private script:JsScript) {
        this.setProfileManager(profileManager)
        const title: string = "Classi";
        let myDiv = document.createElement("div");
        myDiv.style.display = "none";
        document.body.appendChild(myDiv);
        this.$win = $(myDiv);
        myDiv.innerHTML = `
        <!--header-->
        <div>${title}</div>
        <!--content-->
        <div>
            <div class="winClass-mainSplit">
                <!--left panel-->
                <div class="left-pane">
                    <div class="buttons">
                    <div style="text-align:right;flex: 1;padding: 3px;background-color: #7095b178;padding-right: 10px;border-radius: 3px;">
                        <input style="display:block;padding: 0;margin-right: 0px;" class="winClass-filter" type="text" placeholder="<filtro>" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off"/>
                        <label style="display:block;opacity:0.50; margin-top: 1px;">preimpostate <input style="padding:0;margin:0;" type="checkbox" class="winClass-showbase"></label>
                    </div>
                    </div>
                    <div class="list">
                        <div class="winClass-listBox" tabindex="0"></div>
                    </div>
                    <div class="buttons">
                        <button title="Crea nuova" class="winClass-btnNew greenbutton">✚</button>
                        <button title="Elimina selezionata" class="winClass-btnDelete redbutton">&#10006;</button>
                        <button title="Importa un file contente classi esportate" class="winClass-btnImport">⬆️</button>
                    </div>
                </div>
                <!--right panel-->
                <div class="right-pane">
                    <div class="pane-header">
                        <div class="pane-optional">
                            <label>Nome: <input type="text" class="winClass-name fill-width" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" disabled></label>
                            <label>
                                Abilitata
                                <input type="checkbox" title="Se disabilitata trigger/alias nella classe sono disabilitati" class="winClass-chkEnabled" disabled />
                            </label>
                        </div>
                    </div>                    
                    <div class="pane-footer">
                        <button class="winClass-btnSave bluebutton" disabled title="Accetta">&#10004;</button>
                        <button class="winClass-btnCancel" disabled title="Annulla">&#10006;</button>
                    </div>
                    <div class="" style="text-align: center;flex: auto;">
                    </div>
                    <div class="winClass-class-info-panel" style="text-align: left;
                        flex: none;
                        border-radius: 10px;
                        margin: 5px;
                        background-color: rgb(192 196 230 / 80%);
                        position: relative;
                        opacity: 0.75;
                    ">
                        <span style="font-size: large;
                            position: absolute;
                            right: 5px; cursor: help;
                            top: 5px;" title="La lista di classi include anche le classi preimpostate.\nMa il contenuto mostrato include solo elementi privati.">ℹ️</span>
                        <span style="
                            position: absolute;
                            right: 10px;
                            bottom: 10px;
                            font-size: smaller;">
                            <a class="winClass-class-export" href="#">Esporta ...</a>
                        </span>
                        <span class="winClass-class-info" style="
                            white-space: pre;
                            color: #1b2972e6;
                            margin: 10px;
                            display: inline-block;
                            font-size: smaller;
                            margin-left: 10px;">
                        </span>
                    </div>
                </div>
            </div>
        </div>
        `;


        this.$mainSplit = $(myDiv.getElementsByClassName("winClass-mainSplit")[0]);
        this.$showBase = $(myDiv.getElementsByClassName("winClass-showbase")[0]);
        this.$newButton = $(myDiv.getElementsByClassName("winClass-btnNew")[0]);
        this.$deleteButton = $(myDiv.getElementsByClassName("winClass-btnDelete")[0]);
        this.$importButton = $(myDiv.getElementsByClassName("winClass-btnImport")[0]);
        this.$exportButton = $(myDiv.getElementsByClassName("winClass-class-export")[0]);
        this.$listBox = $(myDiv.getElementsByClassName("winClass-listBox")[0]);
        this.$name = $(myDiv.getElementsByClassName("winClass-name")[0]);
        this.$classInfo = $(myDiv.getElementsByClassName("winClass-class-info")[0]);
        this.$classInfoPanel = $(myDiv.getElementsByClassName("winClass-class-info-panel")[0]);
        this.$value = $(myDiv.getElementsByClassName("winClass-chkEnabled")[0]);
        this.$saveButton = $(myDiv.getElementsByClassName("winClass-btnSave")[0]);
        this.$cancelButton = $(myDiv.getElementsByClassName("winClass-btnCancel")[0]);
        this.$filter = $(myDiv.getElementsByClassName("winClass-filter")[0]);
        this.$filter.keyup((e)=> {
            this.ApplyFilter();
        });
        this.$classInfoPanel.hide()
        const win_w = $(window).innerWidth()-20;
        const win_h = $(window).innerHeight()-20;

        this.$showBase.on("change", () => {
            this.refresh()
        });
        (<any>this.$win).jqxWindow({width: Math.min(400, win_w), height: Math.min(300, win_h), showCollapseButton: true});

        classManager.changed.handle(()=>{
            if (this.isOpen()) this.refresh()
        });

        (<any>this.$mainSplit).jqxSplitter({
            width: "100%",
            height: "100%",
            orientation: "vertical",
            panels: [{size: "50%"}, {size: "50%"}]
        });
        
        (<any>this.$listBox).jqxTree(this.treeOptions);
        this.jqList = (<any>this.$listBox).jqxTree("getInstance");
        this.$listBox = $(myDiv.getElementsByClassName("winClass-listBox")[0]);

        circleNavigate(this.$filter, this.$cancelButton, this.$deleteButton, this.$win);

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
        this.$importButton.click(this.handleImportButtonClick.bind(this));
        this.$exportButton.click(this.handleExportButtonClick.bind(this));
        this.$deleteButton.click(this.handleDeleteButtonClick.bind(this));
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

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

    private select(item: jqwidgets.TreeItem) {
        this.$listBox.data("selected", item.value);
        this.jqList.selectItem(item);
        this.jqList.expandItem(item);
        this.scrollIntoView(item);
    }

    private ApplyFilter() {
        this.Filter(this.$filter.val());
    }

    private setEditorDisabled(state: boolean): void {
        this.$name.prop("disabled", state);
        this.$value.prop("disabled", state);
        this.$saveButton.prop("disabled", state);
        this.$cancelButton.prop("disabled", state);
        if (state) {
            $(".right-pane", this.$win).addClass("grayed-out")
        } else {
            $(".right-pane", this.$win).removeClass("grayed-out")
        }
        this.$classInfoPanel.hide()
        if (state) {
            this.$filter.focus();
        }
    }

    private selectNone(): void {
        this.$listBox.data("selected", null);
        this.jqList.selectItem(null);
    }

    private clearEditor(): void {
        this.$name.val("");
        this.$value.val("");
    }

    getTreeItem(v:Class) {
        let item = {
            label: (v.name || "[senza nome]"),
            expanded: false,
            value: v
        }
        return item;
    }

    private updateListBox() {
        let lst = this.getList()
        if (!this.$showBase.prop("checked")) {
            lst = lst.filter(c => !this.classManager.hasBaseClass(c))
        }
        this.list = lst;
        this.values = [...this.classManager.classes.values()].
            filter(c => lst.includes(c.name));

        this.jqList.clear();
        this.treeOptions.source = this.values.map(v => this.getTreeItem(v));
        this.jqList.setOptions(this.treeOptions);

        this.ApplyFilter();
    };

    private handleSaveButtonClick() {
        let v:Class = this.$listBox.data("selected");

        if (!this.$name.val()) {
            Messagebox.Show("Errore", "La classe deve avere un nome!");
            return;
        }

        if (!v) {
            v = {name: null, enabled: false};
        }

        v.name = this.$name.val();
        this.classManager.Toggle(v.name, this.$value.is(":checked"));
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

    private async handleImportButtonClick() {
        importScriptsFunc(this.profileManager.activeConfig)
    }

    private async handleExportButtonClick() {
        let v:Class = this.$listBox.data("selected");

        if (!this.$name.val()) {
            Messagebox.Show("Errore", "La classe deve avere un nome!");
            return;
        }
        exportClassFunc(this.profileManager.activeConfig, v.name)
    }

    private async handleDeleteButtonClick() {
        let v:Class = this.$listBox.data("selected");
        if (!v) return;

        let { alC, evC, trC, vrC, contenuto } = this.getClassContent(v);

        let cnt = alC + evC+ trC + vrC
        const q = await Messagebox.ShowTriple(
            "Cancella classe",
            "Sei sicuro di voler cancellare la classe?\n\n"+
            (cnt > 0 ? contenuto :
            "La classe sembra non avere contenuto."),
            "Solo classe", "Annulla", "Anche contenuto"
        )

        if (q.button == Button.Cancel) return

        this.deleteItem(v);

        if (q.button == Button.Else) {
            this.trigManager.deleteTriggersWithClass(v.name)
            this.alManager.deleteAliasesWithClass(v.name)
            this.script.delEventsWithClass(v.name)
            this.script.delVariablesWithClass(v.name)
        }

        this.clearEditor();
        this.selectNone();
        this.setEditorDisabled(true);
        this.updateListBox();
    }

    private getClassContent(v: Class) {
        let preimpo = this.classManager.hasBaseClass(v.name)
        let trC = [...this.trigManager.getTriggersOfClass(v.name)].length;
        let alC = [...this.alManager.getAliasesOfClass(v.name)].length;
        let evC = [...this.script.getEventsOfClass(v.name)].length;
        let vrC = [...this.script.getVariablesOfClass(v.name)].length;
        let contenuto = ("La classe " + (preimpo ? " e' preimpostata.\nEssa contiene:\n" : " contiene:\n") +
            " - " + trC + " trigger \n" +
            " - " + alC + " alias \n" +
            " - " + evC + " eventi \n" +
            " - " + vrC + " variabili \n"
        );
        return { alC, evC, trC, vrC, contenuto };
    }

    private handleListBoxChange() {
        let item = this.$listBox.data("selected");
        this.prevName = item.name;

        if (!item) {
            this.clearEditor();
            this.setEditorDisabled(true);
            return;
        }
        this.setEditorDisabled(false);
        let { alC, evC, trC, vrC, contenuto } = this.getClassContent(item);
        this.$classInfo.text(contenuto)
        this.$classInfoPanel.show()
        this.$name.val(item.name);
        this.$value.prop("checked", item.enabled).trigger("change");
    }

    public show() {
        this.refresh();

        (<any>this.$win).jqxWindow("open");
        this.bringToFront();
    }

    private refresh() {
        this.clearEditor();
        this.setEditorDisabled(true);
        this.updateListBox();
    }
}
