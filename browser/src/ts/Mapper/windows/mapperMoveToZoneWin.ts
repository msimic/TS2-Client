import {ExitDir, Zone, Mapper, MapperOptions, Room, RoomExit} from "../../mapper"
import { createZoneLabel } from "../../mapperWindow";
import { circleNavigate, colorCssToRGB, colorToHex } from "../../util";
import { EditZoneWin } from "./editZoneWin";
import { Notification } from "../../messagebox";
type AcceptCallback = (z:Zone) => void;

export class MapperMoveToZoneWin {
    private $win: JQuery;
    private $applyButton: JQuery;
    private $addButton: JQuery;
    private $cancelButton: JQuery;
    private addedZones: Zone[] = [];
    private $zoneList: JQuery;

    constructor(public mapper:Mapper, private appliedCb: AcceptCallback) {

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "MapperMoveToZoneWindow";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Sposta stanze in zona</div>
        <!--content-->
        <div class="flex-window">
            <div>
                <table style="width:100%;">
                    <tr style="height:28px;">
                        <td style="text-align:right;padding-right:10px;width: 55px;">
                            Zona:
                        </td>
                        <td style="padding-right:10px;">
                            <select id="mmzonelist"></select>
                        </td>
                    </tr>
                    <tr style="height:28px;">
                        <td style="text-align:right;padding-right:10px;width: 55px;">
                            
                        </td>
                        <td style="text-align:left;padding-right:10px;">
                            <span>Oppure:</span> <a href="#" class="addbutton"><b>crea nuova zona</b></a>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="window-buttonbar">
                <button class="redbutton exitbutton">Annulla</button>
                <button class="greenbutton applybutton">Applica</button>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$applyButton = $(win.getElementsByClassName("applybutton")[0]);
        this.$addButton = $(win.getElementsByClassName("addbutton")[0]);
        this.$cancelButton = $(win.getElementsByClassName("exitbutton")[0]);
        
        const w = 320
        const h = 160;

        (<any>this.$win).jqxWindow({isModal: true, width: w, height: h, minHeight: h, minWidth: w});
        
        this.$zoneList = $("#mmzonelist", this.$win);
        <JQuery>((<any>this.$zoneList)).jqxDropDownList({placeHolder:"Seleziona la zona", autoItemsHeight: true,searchMode:'containsignorecase', width:'100%',filterable:true, itemHeight: 20, filterPlaceHolder:'Filtra per nome:',scrollBarSize:8});
        

        $("#mmzonelist", this.$win).on("open", (ev:any) => {
            (<any>$("#mmzonelist", this.$win)).jqxDropDownList('clearFilter');
        })


        this.fillZones(this.mapper.getZones())
        this.$addButton.click(this.createZone.bind(this));
        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

        circleNavigate(this.$win, this.$applyButton, undefined, this.$win);

    }

    createZone() {
        const zw = new EditZoneWin(null, (z) => {
            if (z && z.name && z.name.length > 2) {
                z.id = null
                this.addedZones.push(z)
                this.load()
                const zoneIndex = this.getAllZones().findIndex(zn => zn == z);
                (<any>this.$zoneList).jqxDropDownList('selectIndex', zoneIndex)
            } else if (z) {
                Notification.Show("Dati zona non validi. Il nome deve avere almeno tre caratteri.")
            }
        })
    }

    public fillZones(zones:Zone[]) {
        (<any>this.$zoneList).jqxDropDownList('clear');

        if (zones && zones.length) {
            const useLabels = this.mapper.getOptions().preferZoneAbbreviations;
            $.each(zones, (i, item) => {
                (<any>this.$zoneList).jqxDropDownList("addItem", { 
                    value: item.id?.toString(),
                    label: createZoneLabel(useLabels, true, item)
                });
            });
        };
    }

    private handleApplyButtonClick() {
        this.apply()
        this.hide();
    }

    load() {
        let zones = this.getAllZones()
        this.fillZones(zones)
    }
    private getAllZones() {
        return [...this.mapper.getZones(), ...this.addedZones];
    }

    apply() {
        this.saveAddedZones();
        const selIndex = (<any>this.$zoneList).jqxDropDownList('selectedIndex')
        const zones = this.getAllZones()
        if (selIndex>-1 && selIndex < zones.length) {
            this.appliedCb(zones[selIndex])
        } else {
            this.appliedCb(null)
        }

        this.destroy();
    }
    saveAddedZones() {
        for (const z of this.addedZones) {
            this.mapper.saveZone(z) 
        }
    }

    private handleCancelButtonClick() {
        this.destroy();
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow('bringToFront');
        this.load()
    }

    private hide() {
        (<any>this.$win).jqxWindow("close");
    }

    private destroy() {
        this.hide();
        (<any>this.$win).jqxWindow("destroy");
    }
}
