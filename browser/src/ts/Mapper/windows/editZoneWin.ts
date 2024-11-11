import { cloneDeep } from "lodash";
import {ExitDir, Room, RoomExit, Zone} from "../mapper"
import { circleNavigate, colorCssToRGB, colorToHex } from "../../Core/util";
import { MapperDrawing } from "../mapperDrawing";
import { Messagebox , Notification} from "../../App/messagebox";

export type zoneCallback = (zone:Zone | null) => void;

export class EditZoneWin {
    private $win: JQuery;
    private $applyButton: JQuery;
    private $cancelButton: JQuery;
    private $id: JQuery;
    private $name: JQuery;
    private $label: JQuery;
    private $desc: JQuery;
    private $backColor: JQuery;
    private $imgurl: JQuery;
    private $imgoffset: JQuery;
    private zone: Zone;

    constructor(private inZone: Zone, private callback: zoneCallback) {

        this.zone = 
        {
            id: 0,
            name: "",
            description: "",
            backColor: "",
            label: ""
        }

        this.zone.id = inZone?.id
        this.zone.name = inZone?.name
        this.zone.description = inZone?.description
        this.zone.label = inZone?.label
        this.zone.backColor = inZone?.backColor
        this.zone.image = inZone.image
        this.zone.imageOffset = {x: inZone.imageOffset?.x??0, y: inZone.imageOffset?.y??0}

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "editZoneWindow";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Modifica o crea zona</div>
        <!--content-->
        <div class="flex-window">
            <div class='jqxTabs'>
                <ul>
                    <li>Dati</li>
                    <li>Stile</li>
                </ul>
                <div>
                    <div class="tab-content">
                        <div style="flex:none;">
                            Nome
                        </div>
                        <div style="flex:none;display:flex;">
                            <input placeholder="[inserisci nome]" title="Il nomedella zona nel mud" class="zoneedit-name" style="flex:auto;" type="text">
                        </div>
                        <div style="flex:none;">
                            Descrizione
                        </div>
                        <div style="flex:auto;display:flex;">
                            <textarea title="Descrizione zona" class="zoneedit-desc" style="flex:auto;"></textarea>
                        </div>
                        <div style="flex:none;">
                            Nome abbreviato
                        </div>
                        <div style="flex:none;display:flex;flex-direction:row;">
                            <input placeholder="[nessuno]" title="Abbreviazione zone che viene disegnata sul mapper" class="zoneedit-short" style="flex:auto;" type="text">
                        </div>
                    </div>
                </div>
                <div>
                    <div class="tab-content">
                        <div style="flex:none;">
                            Colore sfondo
                        </div>
                        <div style="display:flex;flex-direction:row;padding:5px;">
                            <input type="color" class="zoneedit-color" title="Il colore di sfondo nel mapper">&nbsp;<span>(nero puro disabilita colore)</span>
                        </div>
                        <div style="flex:none;">
                            Immagine (URL)
                        </div>
                        <div style="display:flex;flex-direction:row;padding:5px;">
                            <input style="flex:1" type="text" class="zoneedit-image" title="L'immagine di sfondo della zona nel mapper (centrata a 0,0). Per immagini a piu livelli usare sintasse: lvl#url;lvl2#url2">
                        </div>
                        <div style="flex:none;">
                            Offset immagine (x,y)
                        </div>
                        <div style="display:flex;flex-direction:row;padding:5px;">
                            <input style="flex:1" type="text" class="zoneedit-offset" title="Quanto spostare l'immagine in coordinate room">
                        </div>
                        <div style="flex:auto;display:flex;flex-direction:row;">
                        </div>    
                    </div>
                </div>
            </div>
            <div class="window-buttonbar">
                <span class="nrzona">nr. zona: </span><span class="zoneedit-id"></span>
                <button class="redbutton exitbutton">Annulla</button>
                <button class="greenbutton applybutton">Applica</button>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$applyButton = $(win.getElementsByClassName("applybutton")[0]);
        this.$cancelButton = $(win.getElementsByClassName("exitbutton")[0]);
        this.$name = $(win.getElementsByClassName("zoneedit-name")[0]);
        this.$desc = $(win.getElementsByClassName("zoneedit-desc")[0]);
        this.$label = $(win.getElementsByClassName("zoneedit-short")[0]);
        this.$id = $(win.getElementsByClassName("zoneedit-id")[0]);
        this.$backColor = $(win.getElementsByClassName("zoneedit-color")[0]);
        this.$imgurl = $(win.getElementsByClassName("zoneedit-image")[0]);
        this.$imgoffset = $(win.getElementsByClassName("zoneedit-offset")[0]);
        
        const w = 360
        const h = 270
        const left = ($(window).width()-w)/2;
        const top = ($(window).height()-h)/2;
        (<any>this.$win).jqxWindow({isModal: true, width: w, height: h, minHeight: h, minWidth: w, position: { x: left, y: top }});
        (<any>$('.jqxTabs',this.$win)).jqxTabs({ height: '100%', width: '100%' });
        
        if (!inZone) {
            $(".nrzona", this.$win).hide()
        }

        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

        circleNavigate(this.$win, this.$applyButton, this.$applyButton, this.$win);

        this.startEditing()
        this.show()
    }

    setUiValue(e:JQuery, val:any) {
        if (val === null) {
            e.val("[N/A]")
            e.prop('checked', false)
            e.attr("disabled", "true")
        } else {
            if (e == this.$id) {
                e.text(val)
            } else {
                e.val(val)
            }
            if (!val) {
                e.prop('checked', false)
            } else {
                e.prop('checked', true)
            }
        }
    }

    disable(e:JQuery) {
        e.attr("disabled", "true")
    }

    enable(e:JQuery) {
        e.removeAttr("disabled")
    }

    private loadFields() {
        this.setUiValue(this.$id, this.zone.id);
        this.setUiValue(this.$name, this.zone.name);
        this.setUiValue(this.$desc, this.zone.description);
        this.setUiValue(this.$label, this.zone.label);
        this.setUiValue(this.$imgurl, this.zone.image ?? "");
        this.setUiValue(this.$imgoffset, this.zone.imageOffset ?
            this.zone.imageOffset.x + "," + this.zone.imageOffset.y : "");
        
        let rcol = this.zone.backColor?.toString()
        if (!rcol) {
            rcol = "#000000" 
        }
        this.setUiValue(this.$backColor, colorToHex(colorCssToRGB(rcol), false));
    }

    startEditing() {
        this.loadFields()
    }

    private setValue<T>(key: keyof T, value: any) {
        (this.zone as T)[key] = value;
    }

    applyEdits() {

        this.setValue<typeof this.zone>("name", this.$name.val())
        this.setValue<typeof this.zone>("description", this.$desc.val())
        this.setValue<typeof this.zone>("label", this.$label.val())
        this.setValue<typeof this.zone>("image", this.$imgurl.val())
        if (this.$imgoffset.val()) {
            let of = this.$imgoffset.val().split(",")
            if (of.length!=2) {
                Notification.Show("Offset non valido")
                this.setValue<typeof this.zone>("imageOffset", null)
            } else {
                let x = parseInt(of[0])
                let y = parseInt(of[1])
                if (isNaN(x) || isNaN(y)) {
                    Notification.Show("Offset non valido")
                    this.setValue<typeof this.zone>("imageOffset", null)
                } else {
                    this.setValue<typeof this.zone>("imageOffset", {
                        x: x,
                        y: y
                    })
                }
            }
        } else {
            this.setValue<typeof this.zone>("imageOffset", null)
        }
        this.setValue<typeof this.zone>("id", this.$id.text())

        let col = this.$backColor.val();
        if (col == "black" ||
            col == "rgb(0,0,0)" ||
            col == "rgb(0, 0, 0)" ||
            col == "#000000") {
            col = null;
        }
        this.setValue<typeof this.zone>("backColor", col);
    }

    private handleApplyButtonClick() {
        this.applyEdits()
        this.hide();
        this.callback(this.zone)
    }

    private handleCancelButtonClick() {
        this.hide();
        this.callback(null)
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow('bringToFront');
    }

    private hide() {
        (<any>this.$win).jqxWindow("close");
        (<any>this.$win).jqxWindow("destroy");
    }
}
