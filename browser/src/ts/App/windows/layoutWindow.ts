import { Control, LayoutDefinition, LayoutManager, PanelPosition } from "../layoutManager";
import { Button, Messagebox } from "../messagebox";
import { ProfileManager } from "../profileManager";
import * as Util from "../../Core/util";
import { WindowDefinition, WindowManager } from "../windowManager";
import { EditPanelWindow } from "./editPanelWindow";
import { JsScript } from "../../Scripting/jsScript";

export class LayoutWindow {
    protected $win: JQuery;
    protected $leftTopWidth: JQuery;
    protected $leftTopExpand: JQuery;
    protected $leftTopColor: JQuery;
    protected $rightTopWidth: JQuery;
    protected $rightTopExpand: JQuery;
    protected $rightTopColor: JQuery;
    protected $leftBottomWidth: JQuery;
    protected $leftBottomExpand: JQuery;
    protected $leftBottomColor: JQuery;
    protected $rightBottomWidth: JQuery;
    protected $rightBottomExpand: JQuery;
    protected $rightBottomColor: JQuery;
    protected $bottomLeftHeight: JQuery;
    protected $bottomLeftExpand: JQuery;
    protected $bottomLeftColor: JQuery;
    protected $bottomRightHeight: JQuery;
    protected $bottomRightExpand: JQuery;
    protected $bottomRightColor: JQuery;
    protected $topLeftHeight: JQuery;
    protected $topLeftExpand: JQuery;
    protected $topLeftColor: JQuery;
    protected $topRightHeight: JQuery;
    protected $topRightExpand: JQuery;
    protected $topRightColor: JQuery;
    protected $layoutColor: JQuery;
    protected $layoutBackColor: JQuery;

    protected $saveButton: JQuery;
    protected $applyButton: JQuery;
    protected $cancelButton: JQuery;

    private _layout: LayoutDefinition;
    $importButton: JQuery;
    $downloadButton: JQuery;
    private _origLayout: LayoutDefinition;
    public get layout(): LayoutDefinition {
        return this._layout;
    }
    public set layout(value: LayoutDefinition) {
        this._layout = structuredClone(value);
        this._origLayout = structuredClone(value);
        const title = this.title + " (vers. layout v" + (value ? value.version : "0") + (value && value.customized ? " (personalizzato)" : "") + ")";
        (<any>this.$win).jqxWindow("setTitle", title)
    }
    panesElements: string[];

    constructor(private title: string, private script:JsScript, private profileManager:ProfileManager, private layoutManager:LayoutManager, private windowManager:WindowManager) {
        let myDiv = document.createElement("div");
        myDiv.style.display = "none";
        document.body.appendChild(myDiv);
        this.$win = $(myDiv);
        const panelColor = $("body").hasClass("dark") ? "rgba(177,177,177,0.5)" : "rgba(177,177,177,0.5)";
        const foreColor = $("body").hasClass("dark") ? "rgba(177,177,177,1)" : "rgba(177,177,177,1)";
        myDiv.innerHTML = `
        <!--header-->
        <div>${title}</div>
        <!--content-->
        <div>
            <div class="winLayout-mainSplit" style="height:100%">
                <!--left panel-->
                <div class="left-pane" style="width:0">
                </div>
                <!--right panel-->
                <div style="display:flex;flex-direction:column;flex: 1;">
                    <div style="display:flex;flex:1;">
                        <div class="right-pane">                 
                            <div class="pane-content" data-panel="column-left-top" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <div class="pane-content-title"></div>
                                <label>&nbsp;Larghezza: <input type="text" class="left-top-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="left-top-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="left-top-color" title="Il colore di sfondo del pannello"></span></label>
                                <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                            
                            <div class="pane-content" data-panel="column-left-bottom" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <div class="pane-content-title"></div>
                                <label>&nbsp;Larghezza: <input type="text" class="left-bottom-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="left-bottom-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="left-bottom-color" title="Il colore di sfondo del pannello"></span></label>
                                <span class="note">Il contenuto viene ordinato dal basso verso l'alto</span>
                                <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                        </div>
                        <div class="right-pane">                
                            <div class="pane-content" data-panel="row-top-left" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <label>&nbsp;Altezza: <input type="text" class="top-left-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="top-left-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="top-left-color" title="Il colore di sfondo del pannello"></span></label>
                                 <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                            <div class="pane-content" style="flex:3;background-color:black;align-content: center;text-align: right;">
                                Output del
                            </div>
                            <div class="pane-content" data-panel="row-bottom-left" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <label>&nbsp;Altezza: <input type="text" class="bottom-left-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="bottom-left-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="bottom-left-color" title="Il colore di sfondo del pannello"></span></label>
                                 <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                        </div>
                        <div class="right-pane">            
                            <div class="pane-content" data-panel="row-top-right" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <label>&nbsp;Altezza: <input type="text" class="top-right-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="top-right-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="top-right-color" title="Il colore di sfondo del pannello"></span></label>
                                 <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                            <div class="pane-content" style="flex:3;background-color:black;;align-content: center;white-space: pre;"> gioco ...</div>
                            <div class="pane-content" data-panel="row-bottom-right" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <label>&nbsp;Altezza: <input type="text" class="bottom-right-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="bottom-right-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="bottom-right-color" title="Il colore di sfondo del pannello"></span></label>
                                 <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                        </div>
                        <div class="right-pane"> 
                            <div class="pane-content" data-panel="column-right-top" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <label>&nbsp;Larghezza: <input type="text" class="right-top-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="right-top-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="right-top-color" title="Il colore di sfondo del pannello"></span></label>
                                 <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                            <div class="pane-content" data-panel="column-right-bottom" style="position: relative;margin:2px; border: 1px solid ${foreColor}; background-color: ${panelColor};">
                                <label>&nbsp;Larghezza: <input type="text" class="right-bottom-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                                <label>&nbsp;Dinamico: <input type="checkbox" class="right-bottom-expand" title="Se abilitato il pannello si espande dinamicamente al contenuto.\nLa grandezza impostata e' la grandezza massima concessa."></label>
                                <label>&nbsp;Colore: <span><input type="color" class="right-bottom-color" title="Il colore di sfondo del pannello"></span></label>
                                <span class="note">Il contenuto viene ordinato dal basso verso l'alto</span>
                                 <a href="#" style="font-weight:bold;text-decoration:underline;" class="align-bottom-right">Personalizza&nbsp;contenuto...</a>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;flex:none;flex-direction:column;position:relative;">
                        <label style="display:block;position:absolute;right:10px;top:3px;color:#1084be;"><i>N.B. Per disabilitare o abilitare un colore premi con il tasto destro<br>Se un colore e' disabilitato, verra' usato il colore predefinito del tema</i></label>
                        <label style="flex:auto;margin:3px;">&nbsp;Colore testo principale: <span><input type="color" class="layout-color" title="Il colore del testo del pannello"></span></label>
                        <label style="flex:auto;margin:3px;">&nbsp;Colore sfondo principale: <span><input type="color" class="layout-backcolor" title="Il colore del sfondo del pannello"></span></label> 
                    </div>
                    <div>
                        <div class="pane-footer" style="float:left;">
                            <button class="winLayout-btnUpdate yellowbutton">Aggiorna da preimpostato</button>
                            <button class="winLayout-btnRemColors yellowbutton">Usa colori tema</button>
                            <button class="winLayout-btnImport" title="Importa da file">📄</button>
                            <button class="winLayout-btnDownload" title="Esporta e scarica">💾</button>
                        </div>
                        <div class="pane-footer" style="float:right;">
                            <button class="winLayout-btnApply bluebutton">Applica</button>
                            <button class="winLayout-btnSave greenbutton">Accetta</button>
                            <button class="winLayout-btnCancel redbutton">Annulla</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        const ww = Math.min($(window).width()-20, 700);
        const wh = Math.min($(window).height()-20, 550);

        (<any>this.$win).jqxWindow({width: ww, height: wh, showCollapseButton: true});

        this.$leftTopWidth=$(".left-top-width", this.$win);
        this.$rightTopWidth=$(".right-top-width", this.$win);
        this.$leftBottomWidth=$(".left-bottom-width", this.$win);
        this.$rightBottomWidth=$(".right-bottom-width", this.$win);
        this.$bottomLeftHeight=$(".bottom-left-height", this.$win);
        this.$bottomRightHeight=$(".bottom-right-height", this.$win);
        this.$topLeftHeight=$(".top-left-height", this.$win);
        this.$topRightHeight=$(".top-right-height", this.$win);

        this.$leftTopExpand=$(".left-top-expand", this.$win);
        this.$rightTopExpand=$(".right-top-expand", this.$win);
        this.$leftBottomExpand=$(".left-bottom-expand", this.$win);
        this.$rightBottomExpand=$(".right-bottom-expand", this.$win);
        this.$bottomLeftExpand=$(".bottom-left-expand", this.$win);
        this.$bottomRightExpand=$(".bottom-right-expand", this.$win);
        this.$topLeftExpand=$(".top-left-expand", this.$win);
        this.$topRightExpand=$(".top-right-expand", this.$win);

        this.$leftTopColor=$(".left-top-color", this.$win);
        this.$rightTopColor=$(".right-top-color", this.$win);
        this.$leftBottomColor=$(".left-bottom-color", this.$win);
        this.$rightBottomColor=$(".right-bottom-color", this.$win);
        this.$bottomLeftColor=$(".bottom-left-color", this.$win);
        this.$bottomRightColor=$(".bottom-right-color", this.$win);
        this.$topLeftColor=$(".top-left-color", this.$win);
        this.$topRightColor=$(".top-right-color", this.$win);
        this.$layoutColor=$(".layout-color", this.$win);
        this.$layoutBackColor=$(".layout-backcolor", this.$win);

        this.$saveButton = $(".winLayout-btnSave", this.$win);
        this.$applyButton = $(".winLayout-btnApply", this.$win);
        this.$cancelButton = $(".winLayout-btnCancel", this.$win);
        this.$importButton = $(".winLayout-btnImport", this.$win);
        this.$downloadButton = $(".winLayout-btnDownload", this.$win);

        this.$importButton.on("click", (ev) => {
            this.ImportLayout()
        })

        this.$downloadButton.on("click", (ev) => {
            this.DownloadLayout()
        })

        this.$win.on('close', (event) => {
            if (this.isDirty()) {
                Messagebox.ShowWithButtons("Salvataggio", `Sono stati rilevati cambiamenti.
Vuoi salvare prima di uscire?`, "Si", "No").then(mr => {
                if (mr.button == 1) {
                        this.handleSaveButtonClick();
                }
                });
            }
        });

        this.panesElements = $(".pane-content[data-panel]").toArray().map((ei,el) => {
            let pane = "#"+$(el).data("panel")
            return pane
        })


        $(".pane-content[data-panel]").on("mouseenter", (ev) => {
            let pane = "#"+$(ev.currentTarget).data("panel")
            this.blink(pane, true)
        })

        $(".pane-content[data-panel]").on("mouseleave", (ev) => {
            let pane = "#"+$(ev.currentTarget).data("panel")
            this.blink(pane, false)
        })

        this.$win[0].addEventListener('contextmenu', function(event) {
            event.preventDefault();
        }, false);
        
        $("span input[type=color]", this.$win).parent().on("mousedown", (ev) => {
            if (ev.button != 0) {
                if ($("input",ev.target).attr("disabled")) {
                    this.enableElement($("input",ev.target))
                    ev.preventDefault()
                    ev.stopPropagation()                
                }
            }
        })
        $("input[type=color]", this.$win).on("mousedown", (ev) => {
            if (ev.button != 0) {
                if (!$(ev.target).attr("disabled")) {
                    this.disableELement($(ev.target))
                    ev.preventDefault()
                    ev.stopPropagation()
                }
            }
        })

        $(".winLayout-btnUpdate", this.$win).click(async ()=>{
            let prof = await this.layoutManager.updateLayoutOfCurrentProfile()
            if (prof && prof.layout) {
                this.layout = prof.layout
                this.load()
                this.handleApplyButtonClick(null, false)
            }
        });

        $(".winLayout-btnRemColors", this.$win).click(async ()=>{
            if (this.layout) {
                this.layout.background = null;
                this.layout.color = null;
                for (const pane of this.layout.panes) {
                    pane.background = null;
                }
                this.load()
                this.handleApplyButtonClick(null)
            }
        });

        $(".pane-content[data-panel] a").on("click", (ev) => {
            let pane = $(ev.currentTarget.parentElement).data("panel")
            this.editPanel(pane)
        })


        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

    }
    DownloadLayout() {
        if (this.isDirty()) {
            Messagebox.Show("Ehm..", "Serve prima salvare/applicare per poter scaricare")
            return
        }
        Util.downloadJsonToFile(this.layout, "layoutExport.json")
    }
    async ImportLayout() {
        if (this.isDirty()) {
            let r = await Messagebox.Question("Hai modifiche non salvate. Vuoi continuare?")
            if (r.button != Button.Ok) return
        }
        Util.importFromFile(d => {
            let l = JSON.parse(d)
            this.layout = l
            this.load()
        })

    }
    editPanel(pane: string) {
        let panel = this.layout.panes.find(p => p.id == pane)
        if (panel) {
            this.applyFields()
            let pw = new EditPanelWindow(this.script, this.layout, panel, this.profileManager)
            pw.show()
        }
    }
    blink(pane: string, blink: boolean) {
        for (const pn of this.panesElements) {
            $(pn).removeClass("blink")
            $(pn).removeClass("highlighted-pane")
        }
        if (pane) {
            if (blink) {
                $(pane).addClass("blink")
                $(pane).addClass("highlighted-pane")
            } else {
                $(pane).removeClass("blink")
                $(pane).removeClass("highlighted-pane")
            }
        }
    }

    private getPaneExpand(pos:PanelPosition) {
        let w = this.layout?.panes?.find(p => p.position == pos)?.autoexpand;
        if (w == undefined || !w) {
            return false
        } else {
            return w
        }
    }

    private setPaneExpand(pos:PanelPosition, w:boolean) {
        const sw:boolean = (w == undefined || w == null) ? false : w; 
        const pane = this.layout?.panes?.find(p => p.position == pos);
        if (pane) {
            pane.autoexpand = sw;
        }
    }

    private getTextColor() {
        let w = this.layout?.color;
        if (w == undefined || !w) {
            return null
        } else {
            w = Util.colorToHex(Util.colorCssToRGB(w), false)
            return w;
        }
    }

    private setTextColor(w:string) {
        const sw:string = (w == undefined || w == null || w == "") ? "" : w; 
        this.layout.color = sw;
    }

    private getBackColor() {
        let w = this.layout?.background;
        if (w == undefined || !w) {
            return null
        } else {
            w = Util.colorToHex(Util.colorCssToRGB(w), false)
            return w;
        }
    }

    private setBackColor(w:string) {
        const sw:string = (w == undefined || w == null || w == "") ? "" : w; 
        this.layout.background = sw;
    }

    private getPaneColor(pos:PanelPosition) {
        let w = this.layout?.panes?.find(p => p.position == pos)?.background;
        if (w == undefined || !w) {
            return ""
        } else {
            w = Util.colorToHex(Util.colorCssToRGB(w), false)
            return w;
        }
    }

    private setPaneColor(pos:PanelPosition, w:string) {
        const sw:string = (w == undefined || w == null || w == "") ? "" : w; 
        const pane = this.layout?.panes?.find(p => p.position == pos);
        if (pane) {
            pane.background = sw;
        }
    }

    private getPaneWidth(pos:PanelPosition) {
        let w = this.layout?.panes?.find(p => p.position == pos)?.width;
        if (w == undefined || !w) {
            return ""
        } else {
            return parseInt(w)
        }
    }

    private setPaneWidth(pos:PanelPosition, w:number) {
        const sw:string = (w == undefined || w == null || isNaN(w)) ? "" : w+"px"; 
        const pane = this.layout?.panes?.find(p => p.position == pos);
        if (pane) {
            pane.width = sw;
        }
    }

    private getPaneHeight(pos:PanelPosition) {
        let h = this.layout?.panes?.find(p => p.position == pos)?.height;
        if (h == undefined || !h) {
            return ""
        } else {
            return parseInt(h)
        }
    }

    private setPaneHeight(pos:PanelPosition, h:number) {
        const sh:string = (h == undefined || h == null || isNaN(h)) ? "" : h+"px"; 
        const pane = this.layout?.panes?.find(p => p.position == pos);
        if (pane) {
            pane.height = sh;
        }
    }

    protected isDirty():boolean {
        
        if (!this.layout) {
            return false;
        }

        let modified:boolean = false;
        modified = modified || (this.$leftTopWidth.val() != (this.getPaneWidth(PanelPosition.PaneLeftTop).toString()||""));
        modified = modified || (this.$rightTopWidth.val() != (this.getPaneWidth(PanelPosition.PaneRightTop).toString()||""));
        modified = modified || (this.$rightBottomWidth.val() != (this.getPaneWidth(PanelPosition.PaneRightBottom).toString()||""));
        modified = modified || (this.$leftBottomWidth.val() != (this.getPaneWidth(PanelPosition.PaneLeftBottom).toString()||""));
        
        modified = modified || (this.$topLeftHeight.val() != (this.getPaneHeight(PanelPosition.PaneTopLeft).toString()||""));
        modified = modified || (this.$topRightHeight.val() != (this.getPaneHeight(PanelPosition.PaneTopRight).toString()||""));
        modified = modified || (this.$bottomLeftHeight.val() != (this.getPaneHeight(PanelPosition.PaneBottomLeft).toString()||""));
        modified = modified || (this.$bottomRightHeight.val() != (this.getPaneHeight(PanelPosition.PaneBottomRight).toString()||""));
        
        modified = modified || (!this.$leftTopColor.attr("disabled") && this.$leftTopColor.val() != (this.getPaneColor(PanelPosition.PaneLeftTop).toString()||""));
        modified = modified || (!this.$rightTopColor.attr("disabled") && this.$rightTopColor.val() != (this.getPaneColor(PanelPosition.PaneRightTop).toString()||""));
        modified = modified || (!this.$rightBottomColor.attr("disabled") && this.$rightBottomColor.val() != (this.getPaneColor(PanelPosition.PaneRightBottom).toString()||""));
        modified = modified || (!this.$leftBottomColor.attr("disabled") && this.$leftBottomColor.val() != (this.getPaneColor(PanelPosition.PaneLeftBottom).toString()||""));
        modified = modified || (!this.$topLeftColor.attr("disabled") && this.$topLeftColor.val() != (this.getPaneColor(PanelPosition.PaneTopLeft).toString()||""));
        modified = modified || (!this.$topRightColor.attr("disabled") && this.$topRightColor.val() != (this.getPaneColor(PanelPosition.PaneTopRight).toString()||""));
        modified = modified || (!this.$bottomLeftColor.attr("disabled") && this.$bottomLeftColor.val() != (this.getPaneColor(PanelPosition.PaneBottomLeft).toString()||""));
        modified = modified || (!this.$bottomRightColor.attr("disabled") && this.$bottomRightColor.val() != (this.getPaneColor(PanelPosition.PaneBottomRight).toString()||""));
        
        modified = modified || (this.$leftTopExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneLeftTop)||false));
        modified = modified || (this.$rightTopExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneRightTop)||false));
        modified = modified || (this.$rightBottomExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneRightBottom)||false));
        modified = modified || (this.$leftBottomExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneLeftBottom)||false));
        modified = modified || (this.$topLeftExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneTopLeft)||false));
        modified = modified || (this.$topRightExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneTopRight)||false));
        modified = modified || (this.$bottomLeftExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneBottomLeft)||false));
        modified = modified || (this.$bottomRightExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneBottomRight)||false));
        
        modified = modified || (!this.$layoutColor.attr("disabled") && this.$layoutColor.val() != (this.getTextColor()||""));
        modified = modified || (!this.$layoutBackColor.attr("disabled") && this.$layoutBackColor.val() != (this.getBackColor()||""));
     
        modified = modified || this.layout.panes.length != this._origLayout.panes.length

        if (!modified) {
            for (let I = 0; I < this.layout.panes.length; I++) {
                const p1 = this.layout.panes[I];
                const p2 = this._origLayout.panes[I];
                if (p1 && !p2 || !p1 && p2) {
                    modified = true
                    break
                }
                if (p1 && p2 && JSON.stringify(p1) != JSON.stringify(p2)) {
                    modified = true
                    break;
                }
            }
        }
        return modified;
    }

    private load() {
        this.initUi(this.$leftTopWidth, this.getPaneWidth(PanelPosition.PaneLeftTop));
        this.initUi(this.$rightTopWidth, this.getPaneWidth(PanelPosition.PaneRightTop));
        this.initUi(this.$rightBottomWidth, this.getPaneWidth(PanelPosition.PaneRightBottom));
        this.initUi(this.$leftBottomWidth, this.getPaneWidth(PanelPosition.PaneLeftBottom));
        this.initUi(this.$topLeftHeight, this.getPaneHeight(PanelPosition.PaneTopLeft));
        this.initUi(this.$topRightHeight, this.getPaneHeight(PanelPosition.PaneTopRight));
        this.initUi(this.$bottomLeftHeight, this.getPaneHeight(PanelPosition.PaneBottomLeft));
        this.initUi(this.$bottomRightHeight, this.getPaneHeight(PanelPosition.PaneBottomRight));
        this.initUi(this.$leftTopExpand, this.getPaneExpand(PanelPosition.PaneLeftTop));
        this.initUi(this.$rightTopExpand, this.getPaneExpand(PanelPosition.PaneRightTop));
        this.initUi(this.$rightBottomExpand, this.getPaneExpand(PanelPosition.PaneRightBottom));
        this.initUi(this.$leftBottomExpand, this.getPaneExpand(PanelPosition.PaneLeftBottom));
        this.initUi(this.$topLeftExpand, this.getPaneExpand(PanelPosition.PaneTopLeft));
        this.initUi(this.$topRightExpand, this.getPaneExpand(PanelPosition.PaneTopRight));
        this.initUi(this.$bottomLeftExpand, this.getPaneExpand(PanelPosition.PaneBottomLeft));
        this.initUi(this.$bottomRightExpand, this.getPaneExpand(PanelPosition.PaneBottomRight));
        this.initUi(this.$leftTopColor, this.getPaneColor(PanelPosition.PaneLeftTop));
        this.initUi(this.$rightTopColor, this.getPaneColor(PanelPosition.PaneRightTop));
        this.initUi(this.$rightBottomColor, this.getPaneColor(PanelPosition.PaneRightBottom));
        this.initUi(this.$leftBottomColor, this.getPaneColor(PanelPosition.PaneLeftBottom));
        this.initUi(this.$topLeftColor, this.getPaneColor(PanelPosition.PaneTopLeft));
        this.initUi(this.$topRightColor, this.getPaneColor(PanelPosition.PaneTopRight));
        this.initUi(this.$bottomLeftColor, this.getPaneColor(PanelPosition.PaneBottomLeft));
        this.initUi(this.$bottomRightColor, this.getPaneColor(PanelPosition.PaneBottomRight));
        this.initUi(this.$layoutColor, this.getTextColor());
        this.initUi(this.$layoutBackColor, this.getBackColor());
        
    }
    initUi(ui: JQuery, val: any) {
        if (ui.attr("type")=="color") {
            if (!val) {
                this.disableELement(ui);
            } else {
                this.enableElement(ui)
                ui.val(val)
            }
        } else if (ui.attr("type")=="checkbox") {
            ui.prop("checked", val)
        } else {
            ui.val(val)
        }
    }

    enableElement(ui: JQuery) {
        ui.removeAttr("disabled")
        ui.css("pointerEvents", "all")
    }
    disableELement(ui: JQuery) {
        ui.attr("disabled", "disabled")
        ui.css("pointerEvents", "none")
    }

    private async handleSaveButtonClick() {
        await this.handleApplyButtonClick(null);
        this.layout = null;
        (<any>this.$win).jqxWindow("close")
    }

    private async handleApplyButtonClick(ev:any, customized:boolean = true) {

        this.applyFields();

        let ws:WindowDefinition[] = [];

        for (const w of this.windowManager.windows) {
            if (w[1].data.visible) {
                ws.push(w[1])
                await this.windowManager.destroyWindow(w[0], false)
            }
        }

        this.layout.customized = customized;
        Object.assign(this.layoutManager.layout, this.layout)
        let prof = this.profileManager.getProfile(this.profileManager.getCurrent())
        if (!prof.layout) {
            prof.layout = LayoutManager.emptyLayout()
        }
        Object.assign(prof.layout, this.layout)
        this.layoutManager.save();
        this.layoutManager.redockWindowsWithAnchor()
        this.layoutManager.load();
        this.layout = this.layoutManager.layout;
        this.load()

        for (const w of ws) {
            await this.windowManager.show(w.data.name)
        }
        
    }

    private applyFields() {
        this.setPaneWidth(PanelPosition.PaneLeftTop, parseInt(this.$leftTopWidth.val()));
        this.setPaneWidth(PanelPosition.PaneLeftBottom, parseInt(this.$leftBottomWidth.val()));
        this.setPaneWidth(PanelPosition.PaneRightTop, parseInt(this.$rightTopWidth.val()));
        this.setPaneWidth(PanelPosition.PaneRightBottom, parseInt(this.$rightBottomWidth.val()));
        this.setPaneHeight(PanelPosition.PaneTopLeft, parseInt(this.$topLeftHeight.val()));
        this.setPaneHeight(PanelPosition.PaneTopRight, parseInt(this.$topRightHeight.val()));
        this.setPaneHeight(PanelPosition.PaneBottomLeft, parseInt(this.$bottomLeftHeight.val()));
        this.setPaneHeight(PanelPosition.PaneBottomRight, parseInt(this.$bottomRightHeight.val()));

        this.setPaneColor(PanelPosition.PaneLeftTop, this.$leftTopColor.attr("disabled") ? null : (this.$leftTopColor.val()));
        this.setPaneColor(PanelPosition.PaneLeftBottom, this.$leftBottomColor.attr("disabled") ? null : (this.$leftBottomColor.val()));
        this.setPaneColor(PanelPosition.PaneRightTop, this.$rightTopColor.attr("disabled") ? null : (this.$rightTopColor.val()));
        this.setPaneColor(PanelPosition.PaneRightBottom, this.$rightBottomColor.attr("disabled") ? null : (this.$rightBottomColor.val()));
        this.setPaneColor(PanelPosition.PaneTopLeft, this.$topLeftColor.attr("disabled") ? null : (this.$topLeftColor.val()));
        this.setPaneColor(PanelPosition.PaneTopRight, this.$topRightColor.attr("disabled") ? null : (this.$topRightColor.val()));
        this.setPaneColor(PanelPosition.PaneBottomLeft, this.$bottomLeftColor.attr("disabled") ? null : (this.$bottomLeftColor.val()));
        this.setPaneColor(PanelPosition.PaneBottomRight, this.$bottomRightColor.attr("disabled") ? null : (this.$bottomRightColor.val()));

        this.setPaneExpand(PanelPosition.PaneLeftTop, (this.$leftTopExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneLeftBottom, (this.$leftBottomExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneRightTop, (this.$rightTopExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneRightBottom, (this.$rightBottomExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneTopLeft, (this.$topLeftExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneTopRight, (this.$topRightExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneBottomLeft, (this.$bottomLeftExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneBottomRight, (this.$bottomRightExpand.prop("checked")));

        this.setTextColor(this.$layoutColor.attr("disabled") ? null : (this.$layoutColor.val()));
        this.setBackColor(this.$layoutBackColor.attr("disabled") ? null : (this.$layoutBackColor.val()));
    }

    private handleCancelButtonClick() {
        this.load()
        this.hide();
    }

    public hide() {
        this.blink(null, false);
        (<any>this.$win).jqxWindow("close");
    }

    public async show() {

        if (!this.profileManager.getCurrent()) {
            Messagebox.Show("Errore","Impossibile modificare il layout del profilo base.");
            this.hide();
            return;
        }
        const prof = this.profileManager.getProfile(this.profileManager.getCurrent())

        if (!prof.useLayout) {
            const r = await Messagebox.ShowWithButtons("Errore","Hai scelto di non usare il layout per questo profilo.\nSe vuoi partire da un layout vuoto rispondi Si.\nAltrimenti sarebbe meglio abilitare la predisposizione schermo nel profilo.", "Si", "No");
            if (r.button == Button.Ok) {
                prof.useLayout = true;
                if (!prof.layout) {
                    prof.layout = {
                        version: 0,
                        customized: true,
                        color: "white",
                        background: "black",
                        panes: [{
                            "position": 1,
                            "id": "row-top-left",
                            "background": "transparent",
                            "height": "",
                            "autoexpand": false
                          },
                          {
                            "position": 2,
                            "id": "row-top-right",
                            "background": "transparent",
                            "height": "",
                            "autoexpand": false
                          },
                          {
                            "position": 3,
                            "id": "column-right-top",
                            "background": "transparent",
                            "width": "",
                            "autoexpand": false
                          },
                          {
                            "position": 4,
                            "id": "column-right-bottom",
                            "background": "transparent",
                            "width": "",
                            "autoexpand": false
                          },
                          {
                            "position": 5,
                            "id": "row-bottom-left",
                            "background": "transparent",
                            "height": "",
                            "autoexpand": false
                          },
                          {
                            "position": 6,
                            "id": "row-bottom-right",
                            "background": "transparent",
                            "height": "",
                            "autoexpand": false
                          },
                          {
                            "position": 7,
                            "id": "column-left-top",
                            "background": "transparent",
                            "width": "",
                            "autoexpand": false
                          },
                          {
                            "position": 8,
                            "id": "column-left-bottom",
                            "background": "transparent",
                            "width": "",
                            "autoexpand": false
                          }],
                        items: []
                    }
                }
            } else {
                this.hide();
                return;
            }
        }

        this.layout = this.layoutManager.getCurrent();

        this.load();

        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}
