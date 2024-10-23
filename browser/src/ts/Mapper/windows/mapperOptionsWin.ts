import {ExitDir, Mapper, MapperOptions, Room, RoomExit} from "../../mapper"
import { circleNavigate, colorCssToRGB, colorToHex } from "../../util";

export class MapperOptionsWin {
    private $win: JQuery;
    private $applyButton: JQuery;
    private $cancelButton: JQuery;
    private $useGrid: JQuery;
    private $gridSize: JQuery;
    private $useLocal: JQuery;
    private $zoom: JQuery;
    private $foreColor: JQuery;
    private $backColor: JQuery;
    private $drawWalls: JQuery;
    private $drawRoomType: JQuery;

    constructor(public mapper:Mapper, private appliedCb: Function) {

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "MapperOptionsWindow";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Configurazione mapper</div>
        <!--content-->
        <div class="flex-window">
            <div class='jqxTabs'>
                <ul>
                    <li>Colori</li>
                    <li>Griglia</li>
                    <li>Preferenze</li>
                </ul>
                <div>
                    <div class="tab-content">
                        <table>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Colore:
                                </td>
                                <td>
                                    <input type="color" class="mapoptions-color" title="Il colore primario del mapper"> <span>(nero = usa predefinito)</span>
                                </td>
                            </tr>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Sfondo:
                                </td>
                                <td>
                                    <input type="color" class="mapoptions-backcolor" title="Il colore di sfondo del mapper"> <span>(nero = usa predefinito)</span>
                                </td>
                            </tr>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Tipi di stanza:
                                </td>
                                <td>
                                    <input type="checkbox" title="Se abilitato i tipi di room verrano disegnati" class="mapoptions-roomtype">
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div>
                    <div class="tab-content">
                        <table>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Usa griglia:
                                </td>
                                <td>
                                    <input type="checkbox" title="Se abilitato i spostamenti di stanze useranno la griglia" class="mapoptions-usegrid">
                                </td>
                            </tr>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Grandezza griglia:
                                </td>
                                <td>
                                    <input type="text" placeholder="[240 default]" class="mapotions-gridsize">
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div>
                    <div class="tab-content">
                        <table>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Preferisci locale:
                                </td>
                                <td>
                                    <input type="checkbox" title="Se abilitato il mapper carichera la mappa dai tuoi dati salvati in locale anziche da server" class="mapoptions-uselocal">
                                </td>
                            </tr>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Disegna muri:
                                </td>
                                <td>
                                    <input type="checkbox" title="Se abilitato il mapper disegnera' i muri attorno alle stanze al chiuso" class="mapoptions-drawwalls">
                                </td>
                            </tr>
                            <tr style="height:28px;">
                                <td style="text-align:right;padding-right:10px;">
                                    Zoom:
                                </td>
                                <td>
                                    <input type="text" placeholder="[240 default]" class="mapotions-zoom">
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
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
        this.$zoom = $(win.getElementsByClassName("mapotions-zoom")[0]);
        this.$useGrid = $(win.getElementsByClassName("mapoptions-usegrid")[0]);
        this.$gridSize = $(win.getElementsByClassName("mapotions-gridsize")[0]);
        this.$useLocal = $(win.getElementsByClassName("mapoptions-uselocal")[0]);
        this.$foreColor = $(win.getElementsByClassName("mapoptions-color")[0]);
        this.$backColor = $(win.getElementsByClassName("mapoptions-backcolor")[0]);
        this.$drawWalls = $(win.getElementsByClassName("mapoptions-drawwalls")[0]);
        this.$drawRoomType = $(win.getElementsByClassName("mapoptions-roomtype")[0]);
        
        const w = 320
        const h = 220
        const left = ($(window).width()-w)/2;
        const top = ($(window).height()-h)/2;
        (<any>this.$win).jqxWindow({width: w, height: h, minHeight: h, minWidth: w, position: { x: left, y: top }});
        (<any>$('.jqxTabs',this.$win)).jqxTabs({ height: '100%', width: '100%' });

        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

        circleNavigate(this.$win, this.$applyButton, undefined, this.$win);

    }


    private handleApplyButtonClick() {
        this.apply()
        this.hide();
    }

    load() {
        this.$zoom.val(this.mapper.getOptions().mapperScale)
        this.$gridSize.val(this.mapper.getOptions().gridSize)
        this.$useGrid.prop("checked", this.mapper.getOptions().useGrid)
        this.$useLocal.prop("checked", this.mapper.getOptions().preferLocalMap)
        this.$foreColor.val(this.mapper.getOptions().foregroundColor)
        this.$backColor.val(this.mapper.getOptions().backgroundColor)
        this.$drawWalls.prop("checked", this.mapper.getOptions().drawWalls)
        this.$drawRoomType.prop("checked", this.mapper.getOptions().drawRoomType)
    }
    apply() {
        this.mapper.getOptions().mapperScale = parseFloat(this.$zoom.val())
        this.mapper.getOptions().gridSize = parseInt(this.$gridSize.val())
        this.mapper.getOptions().useGrid = this.$useGrid.prop("checked")
        this.mapper.getOptions().preferLocalMap = this.$useLocal.prop("checked")
        this.mapper.getOptions().drawWalls = this.$drawWalls.prop("checked")
        this.mapper.getOptions().drawRoomType = this.$drawRoomType.prop("checked")
        let col = this.$foreColor.val()
        if (col == "black" ||
            col == "rgb(0,0,0)" ||
            col == "rgb(0, 0, 0)" ||
            col == "#000000") {
            col = null;
        };
        this.mapper.getOptions().foregroundColor = col
        col = this.$backColor.val()
        if (col == "black" ||
            col == "rgb(0,0,0)" ||
            col == "rgb(0, 0, 0)" ||
            col == "#000000") {
            col = null;
        };
        this.mapper.getOptions().backgroundColor = col
        this.mapper.saveOptions()
        this.appliedCb()
    }

    private handleCancelButtonClick() {
        this.hide();
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow('bringToFront');
        this.load()
    }

    private hide() {
        (<any>this.$win).jqxWindow("close");
    }
}
