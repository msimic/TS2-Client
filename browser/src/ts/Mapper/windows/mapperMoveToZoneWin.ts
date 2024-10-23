import {ExitDir, Zone, Mapper, MapperOptions, Room, RoomExit} from "../../mapper"
import { circleNavigate, colorCssToRGB, colorToHex } from "../../util";
type AcceptCallback = (z:Zone) => void;

export class MapperMoveToZoneWin {
    private $win: JQuery;
    private $applyButton: JQuery;
    private $cancelButton: JQuery;

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
                <table>
                    <tr style="height:28px;">
                        <td style="text-align:right;padding-right:10px;">
                            Zona:
                        </td>
                        <td>
                            <select id="mmzonelist"></select>
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
        this.$cancelButton = $(win.getElementsByClassName("exitbutton")[0]);
        
        const w = 320
        const h = 220
        const left = ($(window).width()-w)/2;
        const top = ($(window).height()-h)/2;
        (<any>this.$win).jqxWindow({width: w, height: h, minHeight: h, minWidth: w, position: { x: left, y: top }});
        (<any>$('.jqxTabs',this.$win)).jqxTabs({ height: '100%', width: '100%' });

        this.$zoneList = $("#mmzonelist", this.$win);
        <JQuery>((<any>this.$zoneList)).jqxDropDownList({autoItemsHeight: true,searchMode:'containsignorecase', width:'100%',filterable:true, itemHeight: 20, filterPlaceHolder:'Filtra per nome:',scrollBarSize:8});
        
        $("#mmzonelist", this.$win).on("select", (ev:any) => {
            var selection = ev.args.item.value
            if (selection) {
                (<any>$("#mmzonelist", this.$win)).jqxDropDownList('clearFilter');
                if (!this.mapper.loading)
                    this.mapper.setZoneById(parseInt(selection))
            }
        })

        $("#mmzonelist", this.$win).on("open", (ev:any) => {
            (<any>$("#mmzonelist", this.$win)).jqxDropDownList('clearFilter');
        })


        this.fillZones(this.mapper.getZones())
        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

        circleNavigate(this.$win, this.$applyButton, undefined, this.$win);

    }

    public fillZones(zones:Zone[]) {
        //let items = (<any>this.$zoneList).jqxDropDownList('getItems');
        
        (<any>this.$zoneList).jqxDropDownList('clear');

        if (zones && zones.length) $.each(zones, (i, item) => {
            (<any>this.$zoneList).jqxDropDownList("addItem", { 
                value: item.id.toString(),
                label : item.name + " (#" + item.id.toString() + ")"
            });
        });
    }


    private handleApplyButtonClick() {
        this.apply()
        this.hide();
    }

    load() {
        this.fillZones(this.mapper.getZones())
    }
    apply() {
        
        let z: Zone = {
            id: 0,
            name: "",
            description: "",
            label: ""
        }
        this.appliedCb(z)
        this.destroy();
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
