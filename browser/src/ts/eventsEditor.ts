import * as Util from "./util";
import { JsScript, ScriptEvent, ScripEventTypes, ScriptEventsIta } from "./jsScript";
import { Messagebox } from "./messagebox";
import { circleNavigate } from "./util";
import { Mudslinger } from "./client";
declare let CodeMirror: any;


interface TypeTreeItem extends jqwidgets.TreeItem {
    items: Array<jqwidgets.TreeItem>
}

export class EventsEditor {
    protected $win: JQuery;
    protected treeOptions:jqwidgets.TreeOptions = {
        checkboxes: false, keyboardNavigation: true, source: [],
        height: "100%", width: "100%",
        toggleMode: "dblclick", animationShowDuration: 150
    };
    protected jqList: jqwidgets.jqxTree;
    protected $listBox: JQuery;
    protected $type: JQuery;
    protected $condition: JQuery;
    protected $value: JQuery;
    protected $id: JQuery;
    protected $className: JQuery;
    protected $enabled: JQuery;
    protected $newButton: JQuery;
    protected $deleteButton: JQuery;
    protected $mainSplit: JQuery;
    protected $saveButton: JQuery;
    protected $cancelButton: JQuery;
    protected $filter: JQuery;
    protected list: string[];
    protected values:ScriptEvent[];
    protected prev: ScriptEvent;
    protected codeMirror: any;
    protected $codeMirrorWrapper: JQuery;
    protected $dummy: JQuery;

    /* these need to be overridden */
    protected getList(evList:ScriptEvent[]): Array<string> {
        this.list = evList.map(v=> v.id || (v.type + " (" + v.condition + ")"));
        return this.list;
    }

    protected getItem(ind: number): ScriptEvent {
        return this.values[ind];
    }

    protected saveItem(ev: ScriptEvent): void {
        
        if (this.isBase) {
            if (this.prev) {
                this.script.delBaseEvent(this.prev);
            }
            this.script.addBaseEvent(ev);
            this.script.saveBase();
        }    
        else {
            if (this.prev) {
                this.script.delEvent(this.prev);
            }
            this.script.addEvent(ev);
            this.script.save();
        }
        this.prev = ev;
    }
    protected deleteItem(ev: ScriptEvent): void {
        
        if (this.isBase) {
            this.script.delBaseEvent(ev);
            this.script.saveBase();
        }    
        else {
            this.script.delEvent(ev);
            this.script.save();
        }

        this.prev = null;
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
                const txt = (<any>itm.value).id + "" + (<any>itm.value).condition;
                const visible = txt.match(rx) != null;
                if (!!visible) {
                    expand(itm);
                }
            }
        }
    }

    constructor(private script:JsScript, private isBase:boolean) {
        const title: string = isBase ? "Eventi preimpostati" : "Eventi";
        let myDiv = document.createElement("div");
        myDiv.style.display = "none";
        document.body.appendChild(myDiv);
        this.$win = $(myDiv);
        myDiv.innerHTML = `
        <!--header-->
        <div>${title}</div>
        <!--content-->
        <div>
            <div class="winEvents-mainSplit">
                <!--left panel-->
                <div class="left-pane">
                    <div class="buttons">
                        <input class="winEvents-filter" type="text" placeholder="<filtro>" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off"/>
                    </div>
                    <div class="list">
                        <div class="winEvents-listBox" tabindex="0" style="overflow-y: auto;"></div>
                    </div>
                    <div class="buttons">
                        <button title="Crea nuovo" class="winEvents-btnNew greenbutton">✚</button>
                        <button title="Elimina selezionato" class="winEvents-btnDelete redbutton">&#10006;</button>
                    </div>
                </div>
                <!--right panel-->
                <div class="right-pane">
                    <div class="pane-header">
                        <div class="pane-optional">
                            <label>Tipo: <select placeholder="Seleziona tipo evento" id="win-events${isBase?'1':'2'}" size=1" class="winEvents-type"></select></label>
                            <label>Condizione: <input autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" type="text" class="winEvents-condition fill-width" disabled placeholder="(condizione)" title="La condizione richiesta affinche l'evento scatti (dipende dal tipo evento)."></label>
                            <label>ID: <input type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" class="winEvents-id" disabled placeholder="(opzionale)" title="L'ID per riferire in script. (toggleEvent)"></label>
                            <label>Classe: <input type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" class="winEvents-className" disabled placeholder="(opzionale)" title="Se appartiene a una classe specifica"></label>
                        </div>
                        <div class="pane-options">
                            <label>
                                Abilitato
                                <input type="checkbox" title="Se disabilitato non scatta" class="winEvents-chkEnabled" disabled />
                            </label>
                        </div>
                    </div>
                    <div class="pane-content-title">
                        <span>Azioni:</span>
                    </div>
                    <div class="pane-content">
                        <textarea class="winEvents-dummy" style="width: 100%;height: 100%;" disabled></textarea>
                        <textarea class="winEvents-scriptArea" disabled></textarea>
                    </div>               
                    <div class="pane-footer">
                        <button class="winEvents-btnSave bluebutton" disabled title="Accetta">&#10004;</button>
                        <button class="winEvents-btnCancel" disabled title="Annulla">&#10006;</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        this.$mainSplit = $(myDiv.getElementsByClassName("winEvents-mainSplit")[0]);
        this.$newButton = $(myDiv.getElementsByClassName("winEvents-btnNew")[0]);
        this.$deleteButton = $(myDiv.getElementsByClassName("winEvents-btnDelete")[0]);
        this.$listBox = $(myDiv.getElementsByClassName("winEvents-listBox")[0]);
        this.$type = $(myDiv.getElementsByClassName("winEvents-type")[0]);
        (<any>this.$type).jqxDropDownList({closeDelay:1, width: '100%', height:'24px',autoItemsHeight: true, placeHolder: "Seleziona tipo evento",autoDropDownHeight: true, scrollBarSize:8, source: [], displayMember: "label", valueMember: "value"});
        this.$type = $(myDiv.getElementsByClassName("winEvents-type")[0]);
        this.$value = $(myDiv.getElementsByClassName("winEvents-scriptArea")[0]);
        this.$dummy = $(myDiv.getElementsByClassName("winEvents-dummy")[0]);
        this.$condition = $(myDiv.getElementsByClassName("winEvents-condition")[0]);
        this.$id = $(myDiv.getElementsByClassName("winEvents-id")[0]);
        this.$enabled = $(myDiv.getElementsByClassName("winEvents-chkEnabled")[0]);
        this.$className = $(myDiv.getElementsByClassName("winEvents-className")[0]);
        this.$saveButton = $(myDiv.getElementsByClassName("winEvents-btnSave")[0]);
        this.$cancelButton = $(myDiv.getElementsByClassName("winEvents-btnCancel")[0]);
        this.$filter = $(myDiv.getElementsByClassName("winEvents-filter")[0]);
        this.$filter.keyup((e)=> {
            this.ApplyFilter();
        });

        const win_w = $(window).innerWidth()-20;
        const win_h = $(window).innerHeight()-20;

        (<any>this.$win).jqxWindow({width: Math.min(600, win_w), height: Math.min(500, win_h), showCollapseButton: true});
        script.eventChanged.handle(e => {
            if ((<any>this.$win).jqxWindow('isOpen')) this.refresh();
        });
        
        (<any>this.$mainSplit).jqxSplitter({
            width: "100%",
            height: "100%",
            orientation: "vertical",
            panels: [{size: "30%"}, {size: "70%"}]
        });

        this.codeMirror = CodeMirror.fromTextArea(
            this.$value[0], {
                mode: {name: "javascript", globalVars: true},
                theme: Mudslinger.GetCodeMirrorTheme(),
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
        this.$codeMirrorWrapper.css("height","100%");
        
        (<any>this.$listBox).jqxTree(this.treeOptions);
        this.jqList = (<any>this.$listBox).jqxTree("getInstance");
        this.$listBox = $(myDiv.getElementsByClassName("winEvents-listBox")[0]);

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
            this.select(item)
            this.handleListBoxChange()
        });

        this.$newButton.click(this.handleNewButtonClick.bind(this));
        this.$deleteButton.click(this.handleDeleteButtonClick.bind(this));
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));
        this.load(null);
        this.setEditorDisabled(true);
        circleNavigate(this.$filter, this.$cancelButton, this.$deleteButton, this.$win);
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
            if (top + height < containerHeight) {
                $container.scrollTop(top + height - containerHeight + paddingPx);
            } else {
                $container.scrollTop(top);
            }
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

    private load(val:string) {
        
        (<any>this.$type).jqxDropDownList('clear'); 
        const source = [
            //{ value: "", label:"[seleziona tipo evento]"},
        ];

        for (const enumMember in ScripEventTypes) {
            var isValueProperty = parseInt(enumMember, 10) >= 0
            if (isValueProperty) {
                let enumStr = ScripEventTypes[enumMember];
                source.push({value: enumStr, label:ScriptEventsIta.nameof(enumMember)});
            }
        }

        (<any>this.$type).jqxDropDownList({source:source});

        this.$type.change();
    }

    private setEditorDisabled(state: boolean): void {
        this.$type.prop("disabled", state);
        this.$value.prop("disabled", state);
        (<any>this.$type).jqxDropDownList({ disabled: state });
        this.$id.prop("disabled", state);
        this.$condition.prop("disabled", state);
        this.$enabled.prop("disabled", state).change();
        this.$className.prop("disabled", state);
        this.$saveButton.prop("disabled", state);
        this.$cancelButton.prop("disabled", state);
        this.$codeMirrorWrapper.prop("disabled", state);
        if (state) {
            this.$dummy.show();
            this.$codeMirrorWrapper.hide();
        } else {
            this.$dummy.hide();
            this.$codeMirrorWrapper.show();
        }
    }

    private selectNone(): void {
        this.$listBox.data("selected", null);
        this.$filter.focus();
        this.jqList.selectItem(null);
    }

    private clearEditor(): void {
        this.prev = null;
        this.$type.val("");
        this.load("");
        this.$value.val("");
        this.$type.change();
        this.$type.trigger("change");
        this.codeMirror.setValue("");
        this.$id.val("");
        this.$condition.val("");
        this.$enabled.prop("checked", true);
        this.$className.val("");
    }


    private updateListBox() {
        
        if (this.isBase) {
            this.values = this.script.getBaseEvents();
        } else {
            this.values = this.script.getEvents();
        }
        this.list = this.getList(this.values);

        let lst = this.values;

        this.jqList.clear();
        const itemMap = new Map<string, TypeTreeItem>();
        
        for (const enumMember in ScripEventTypes) {
            var isValueProperty = parseInt(enumMember, 10) >= 0
            if (isValueProperty) {
                let enumStr = ScripEventTypes[enumMember];
                itemMap.set(enumStr, {
                    label:ScriptEventsIta.nameof(enumMember),
                    value: enumStr,
                    items: []
                })
            }
        }

        for (let i = 0; i < lst.length; i++) {
            let arr = itemMap.get(lst[i].type).items;
            arr.push({
                label: lst[i].id || (lst[i].condition),
                value: <any>lst[i]
            });
        }

        let items = [];
        for (const [key, value] of itemMap) {
            items.push(value)
        }
        this.treeOptions.source = items;
        this.jqList.setOptions(this.treeOptions);
        for (const li of this.jqList.getItems()) {
            if ((<any>li).level==0 && !(<any>li).hasItems) $(li.element).addClass("jqx-disableselect");
        }
        this.ApplyFilter();
    };

    private handleSaveButtonClick() {
        let v:ScriptEvent = this.$listBox.data("selected");

        if (!this.$type.val()) {
            Messagebox.Show("Errore", "Devi selezionare il tipo evento!");
            return;
        }

        this.$value.val(this.codeMirror.getValue());
        if (!this.$value.val()) {
            Messagebox.Show("Errore", "Devi dare la script per l'evento!");
            return;
        }

        if (!v) {
            v = { type: null, condition: null, id: null, value: null, class: null, enabled: false};
        }

        v.type = this.$type.val();
        v.condition = this.$condition.val();
        v.id = this.$id.val();
        v.value = this.codeMirror.getValue() || this.$value.val();
        v.enabled = this.$enabled.is(":checked");
        v.class = this.$className.val();
        v.script = null;
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
        let item = this.$listBox.data("selected");
        this.prev = item;

        if (!item || !item.type) {
            this.clearEditor();
            this.setEditorDisabled(true);
            return;
        }
        this.setEditorDisabled(false);
        this.load(item.type);
        this.$type.val(item.type);
        this.$type.change();
        this.$type.trigger("change");
        this.$id.val(item.id);
        this.$className.val(item.class);
        this.$condition.val(item.condition);
        this.$enabled.prop("checked", item.enabled);
        this.$value.val(item.value);
        this.codeMirror.setValue(item.value);
        this.$codeMirrorWrapper.show();
        this.codeMirror.refresh();
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

