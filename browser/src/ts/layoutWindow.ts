import { Control, LayoutDefinition, LayoutManager, PanelPosition } from "./layoutManager";
import { Messagebox } from "./messagebox";
import { ProfileManager } from "./profileManager";
import * as Util from "./util";
import { WindowDefinition, WindowManager } from "./windowManager";

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
    protected $cancelButton: JQuery;

    private layout:LayoutDefinition;

    constructor(title: string, private profileManager:ProfileManager, private layoutManager:LayoutManager, private windowManager:WindowManager) {
        let myDiv = document.createElement("div");
        myDiv.style.display = "none";
        document.body.appendChild(myDiv);
        this.$win = $(myDiv);
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
                        <div class="right-pane" style="border-right: 1px solid black;">
                            <div class="pane-header">
                            </div>                    
                            <div class="pane-content-title" style="background-color: rgb(21 106 167 / 77%);">
                                Sinistro in alto
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Larghezza: <input type="text" class="left-top-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Espandi: <input type="checkbox" class="left-top-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Colore: <input type="color" class="left-top-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                            <div class="pane-content-title" style="background-color: rgb(21 106 167 / 77%);">
                                Sinistro in basso
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Larghezza: <input type="text" class="left-bottom-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Espandi: <input type="checkbox" class="left-bottom-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Colore: <input type="color" class="left-bottom-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                        </div>
                        <div class="right-pane">
                            <div class="pane-header">
                            </div>                    
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Altezza: <input type="text" class="top-left-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Espandi: <input type="checkbox" class="top-left-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Colore: <input type="color" class="top-left-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                            <div class="pane-content-title" style="background-color:black;">
                                Centrale alto sx
                            </div>
                            <div class="pane-content" style="background-color:black;">
                            </div>
                            <div class="pane-content-title" style="background-color:black;">
                                Centrale basso sx
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Altezza: <input type="text" class="bottom-left-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Espandi: <input type="checkbox" class="bottom-left-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Colore: <input type="color" class="bottom-left-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                        </div>
                        <div class="right-pane">
                            <div class="pane-header">
                            </div>                    
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Altezza: <input type="text" class="top-right-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Espandi: <input type="checkbox" class="top-right-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Colore: <input type="color" class="top-right-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                            <div class="pane-content-title" style="background-color:black;">
                                Centrale alto dx
                            </div>
                            <div class="pane-content" style="background-color:black;">
                            </div>
                            <div class="pane-content-title" style="background-color:black;">
                                Centrale basso dx
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Altezza: <input type="text" class="bottom-right-height" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Espandi: <input type="checkbox" class="bottom-right-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%); flex: none;">
                                <label>&nbsp;Colore: <input type="color" class="bottom-right-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                        </div>
                        <div class="right-pane" style="border-left: 1px solid black;">
                            <div class="pane-header">
                            </div>                    
                            <div class="pane-content-title" style="background-color: rgb(21 106 167 / 77%);">
                                Destro in alto
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Larghezza: <input type="text" class="right-top-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Espandi: <input type="checkbox" class="right-top-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Colore: <input type="color" class="right-top-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                            <div class="pane-content-title" style="background-color: rgb(21 106 167 / 77%);">
                                Destro in basso
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Larghezza: <input type="text" class="right-bottom-width" title="La larghezza fissa che vuoi per il pannello, vuoto per un pannello che e' variabile"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Espandi: <input type="checkbox" class="right-bottom-expand" title="Se abilitato il pannello si espande fino alla larghezza, altrimenti e' fisso"></label>
                            </div>
                            <div class="pane-content" style="background-color: rgb(21 106 167 / 77%);">
                                <label>&nbsp;Colore: <input type="color" class="right-bottom-color" title="Il colore di sfondo del pannello"></label>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;flex:none;flex-direction:row;">
                        <label style="flex:auto;">&nbsp;Colore testo principale: <input type="color" class="layout-color" title="Il colore del testo del pannello"></label>
                        <label style="flex:auto;">&nbsp;Colore sfondo principale: <input type="color" class="layout-backcolor" title="Il colore del sfondo del pannello"></label> 
                    </div>
                    <div>
                        <div class="pane-footer" style="float:left;">
                            <button class="winLayout-btnUpdate yellowbutton">Aggiorna da preimpostato</button>
                        </div>
                        <div class="pane-footer" style="float:right;">
                            <button class="winLayout-btnSave bluebutton">Salva</button>
                            <button class="winLayout-btnCancel">Annulla</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        const ww = Math.min($(window).width()-20, 500);
        const wh = Math.min($(window).height()-20, 400);

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
        this.$cancelButton = $(".winLayout-btnCancel", this.$win);

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

        $(".winLayout-btnUpdate", this.$win).click(()=>{this.layoutManager.updateLayoutOfCurrentProfile()});
        this.$saveButton.click(this.handleSaveButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

    }

    private getPaneExpand(pos:PanelPosition) {
        let w = this.layout.panes.find(p => p.position == pos)?.autoexpand;
        if (w == undefined || !w) {
            return false
        } else {
            return w
        }
    }

    private setPaneExpand(pos:PanelPosition, w:boolean) {
        const sw:boolean = (w == undefined || w == null) ? false : w; 
        const pane = this.layout.panes.find(p => p.position == pos);
        if (pane) {
            pane.autoexpand = sw;
        }
    }

    private getTextColor() {
        let w = this.layout.color;
        if (w == undefined || !w) {
            return ""
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
        let w = this.layout.background;
        if (w == undefined || !w) {
            return ""
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
        let w = this.layout.panes.find(p => p.position == pos)?.background;
        if (w == undefined || !w) {
            return ""
        } else {
            w = Util.colorToHex(Util.colorCssToRGB(w), false)
            return w;
        }
    }

    private setPaneColor(pos:PanelPosition, w:string) {
        const sw:string = (w == undefined || w == null || w == "") ? "" : w; 
        const pane = this.layout.panes.find(p => p.position == pos);
        if (pane) {
            pane.background = sw;
        }
    }

    private getPaneWidth(pos:PanelPosition) {
        let w = this.layout.panes.find(p => p.position == pos)?.width;
        if (w == undefined || !w) {
            return ""
        } else {
            return parseInt(w)
        }
    }

    private setPaneWidth(pos:PanelPosition, w:number) {
        const sw:string = (w == undefined || w == null || isNaN(w)) ? "" : w+"px"; 
        const pane = this.layout.panes.find(p => p.position == pos);
        if (pane) {
            pane.width = sw;
        }
    }

    private getPaneHeight(pos:PanelPosition) {
        let h = this.layout.panes.find(p => p.position == pos)?.height;
        if (h == undefined || !h) {
            return ""
        } else {
            return parseInt(h)
        }
    }

    private setPaneHeight(pos:PanelPosition, h:number) {
        const sh:string = (h == undefined || h == null || isNaN(h)) ? "" : h+"px"; 
        const pane = this.layout.panes.find(p => p.position == pos);
        if (pane) {
            pane.height = sh;
        }
    }

    protected isDirty():boolean {
        
        if (!this.layout) {
            return false;
        }

        let modified:boolean = false;
        modified = modified || (this.$leftTopWidth.val() != (this.getPaneWidth(PanelPosition.PaneLeftTop)||""));
        modified = modified || (this.$rightTopWidth.val() != (this.getPaneWidth(PanelPosition.PaneRightTop)||""));
        modified = modified || (this.$rightBottomWidth.val() != (this.getPaneWidth(PanelPosition.PaneRightBottom)||""));
        modified = modified || (this.$leftBottomWidth.val() != (this.getPaneWidth(PanelPosition.PaneLeftBottom)||""));
        
        modified = modified || (this.$topLeftHeight.val() != (this.getPaneWidth(PanelPosition.PaneTopLeft)||""));
        modified = modified || (this.$topRightHeight.val() != (this.getPaneWidth(PanelPosition.PaneTopRight)||""));
        modified = modified || (this.$bottomLeftHeight.val() != (this.getPaneWidth(PanelPosition.PaneBottomLeft)||""));
        modified = modified || (this.$bottomRightHeight.val() != (this.getPaneWidth(PanelPosition.PaneBottomRight)||""));
        
        modified = modified || (this.$leftTopColor.val() != (this.getPaneColor(PanelPosition.PaneLeftTop)||""));
        modified = modified || (this.$rightTopColor.val() != (this.getPaneColor(PanelPosition.PaneRightTop)||""));
        modified = modified || (this.$rightBottomColor.val() != (this.getPaneColor(PanelPosition.PaneRightBottom)||""));
        modified = modified || (this.$leftBottomColor.val() != (this.getPaneColor(PanelPosition.PaneLeftBottom)||""));
        modified = modified || (this.$topLeftColor.val() != (this.getPaneColor(PanelPosition.PaneTopLeft)||""));
        modified = modified || (this.$topRightColor.val() != (this.getPaneColor(PanelPosition.PaneTopRight)||""));
        modified = modified || (this.$bottomLeftColor.val() != (this.getPaneColor(PanelPosition.PaneBottomLeft)||""));
        modified = modified || (this.$bottomRightColor.val() != (this.getPaneColor(PanelPosition.PaneBottomRight)||""));
        
        modified = modified || (this.$leftTopExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneLeftTop)||false));
        modified = modified || (this.$rightTopExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneRightTop)||false));
        modified = modified || (this.$rightBottomExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneRightBottom)||false));
        modified = modified || (this.$leftBottomExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneLeftBottom)||false));
        modified = modified || (this.$topLeftExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneTopLeft)||false));
        modified = modified || (this.$topRightExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneTopRight)||false));
        modified = modified || (this.$bottomLeftExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneBottomLeft)||false));
        modified = modified || (this.$bottomRightExpand.prop("checked") != (this.getPaneExpand(PanelPosition.PaneBottomRight)||false));
        
        modified = modified || (this.$layoutColor.val() != (this.getTextColor()||""));
        modified = modified || (this.$layoutBackColor.val() != (this.getBackColor()||""));
        
        return modified;
    }

    private load() {
        this.$leftTopWidth.val(this.getPaneWidth(PanelPosition.PaneLeftTop));
        this.$rightTopWidth.val(this.getPaneWidth(PanelPosition.PaneRightTop));
        this.$rightBottomWidth.val(this.getPaneWidth(PanelPosition.PaneRightBottom));
        this.$leftBottomWidth.val(this.getPaneWidth(PanelPosition.PaneLeftBottom));

        this.$topLeftHeight.val(this.getPaneHeight(PanelPosition.PaneTopLeft));
        this.$topRightHeight.val(this.getPaneHeight(PanelPosition.PaneTopRight));
        this.$bottomLeftHeight.val(this.getPaneHeight(PanelPosition.PaneBottomLeft));
        this.$bottomRightHeight.val(this.getPaneHeight(PanelPosition.PaneBottomRight));

        this.$leftTopExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneLeftTop));
        this.$rightTopExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneRightTop));
        this.$rightBottomExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneRightBottom));
        this.$leftBottomExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneLeftBottom));

        this.$topLeftExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneTopLeft));
        this.$topRightExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneTopRight));
        this.$bottomLeftExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneBottomLeft));
        this.$bottomRightExpand.prop("checked", this.getPaneExpand(PanelPosition.PaneBottomRight));

        this.$leftTopColor.val(this.getPaneColor(PanelPosition.PaneLeftTop));
        this.$rightTopColor.val(this.getPaneColor(PanelPosition.PaneRightTop));
        this.$rightBottomColor.val(this.getPaneColor(PanelPosition.PaneRightBottom));
        this.$leftBottomColor.val(this.getPaneColor(PanelPosition.PaneLeftBottom));

        this.$topLeftColor.val(this.getPaneColor(PanelPosition.PaneTopLeft));
        this.$topRightColor.val(this.getPaneColor(PanelPosition.PaneTopRight));
        this.$bottomLeftColor.val(this.getPaneColor(PanelPosition.PaneBottomLeft));
        this.$bottomRightColor.val(this.getPaneColor(PanelPosition.PaneBottomRight));

        this.$layoutColor.val(this.getTextColor());
        this.$layoutBackColor.val(this.getBackColor());
        
    }

    private async handleSaveButtonClick() {

        this.setPaneWidth(PanelPosition.PaneLeftTop, parseInt(this.$leftTopWidth.val()));
        this.setPaneWidth(PanelPosition.PaneLeftBottom, parseInt(this.$leftBottomWidth.val()));
        this.setPaneWidth(PanelPosition.PaneRightTop, parseInt(this.$rightTopWidth.val()));
        this.setPaneWidth(PanelPosition.PaneRightBottom, parseInt(this.$rightBottomWidth.val()));
        this.setPaneHeight(PanelPosition.PaneTopLeft, parseInt(this.$topLeftHeight.val()));
        this.setPaneHeight(PanelPosition.PaneTopRight, parseInt(this.$topRightHeight.val()));
        this.setPaneHeight(PanelPosition.PaneBottomLeft, parseInt(this.$bottomLeftHeight.val()));
        this.setPaneHeight(PanelPosition.PaneBottomRight, parseInt(this.$bottomRightHeight.val()));

        this.setPaneColor(PanelPosition.PaneLeftTop, (this.$leftTopColor.val()));
        this.setPaneColor(PanelPosition.PaneLeftBottom, (this.$leftBottomColor.val()));
        this.setPaneColor(PanelPosition.PaneRightTop, (this.$rightTopColor.val()));
        this.setPaneColor(PanelPosition.PaneRightBottom, (this.$rightBottomColor.val()));
        this.setPaneColor(PanelPosition.PaneTopLeft, (this.$topLeftColor.val()));
        this.setPaneColor(PanelPosition.PaneTopRight, (this.$topRightColor.val()));
        this.setPaneColor(PanelPosition.PaneBottomLeft, (this.$bottomLeftColor.val()));
        this.setPaneColor(PanelPosition.PaneBottomRight, (this.$bottomRightColor.val()));

        this.setPaneExpand(PanelPosition.PaneLeftTop, (this.$leftTopExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneLeftBottom, (this.$leftBottomExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneRightTop, (this.$rightTopExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneRightBottom, (this.$rightBottomExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneTopLeft, (this.$topLeftExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneTopRight, (this.$topRightExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneBottomLeft, (this.$bottomLeftExpand.prop("checked")));
        this.setPaneExpand(PanelPosition.PaneBottomRight, (this.$bottomRightExpand.prop("checked")));

        this.setTextColor((this.$layoutColor.val()));
        this.setBackColor((this.$layoutBackColor.val()));

        let ws:WindowDefinition[] = [];

        for (const w of this.windowManager.windows) {
            if (w[1].data.visible) {
                ws.push(w[1])
                await this.windowManager.destroyWindow(w[0], false)
            }
        }

        this.layout.customized = true;
        this.layoutManager.save();
        this.layoutManager.load();
        this.layout = this.layoutManager.layout;
        this.load()

        for (const w of ws) {
            await this.windowManager.show(w.data.name)
        }
        
        //(<any>this.$win).jqxWindow("close")
    }

    private handleCancelButtonClick() {
        this.load()
        this.hide();
    }

    public hide() {
        (<any>this.$win).jqxWindow("close");
    }

    public show() {

        if (!this.profileManager.getCurrent()) {
            Messagebox.Show("Errore","Impossibile modificare il layout del profilo base.");
            this.hide();
            return;
        }

        this.layout = this.layoutManager.getCurrent();

        this.load();

        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}
