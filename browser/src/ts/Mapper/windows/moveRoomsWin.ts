import { cloneDeep } from "lodash";
import {ExitDir, Room, RoomExit, Zone} from "../../mapper"
import { circleNavigate, colorCssToRGB, colorToHex } from "../../util";
import { MapperDrawing } from "../../mapperDrawing";
import { Messagebox } from "../../messagebox";
import { MapperWindow } from "../../mapperWindow";

export class MoveRoomsWin {
    private $win: JQuery;
    private $applyButton: JQuery;
    private $cancelButton: JQuery;
    private $moveLeft: JQuery;
    private $moveRight: JQuery;
    private $moveSouth: JQuery;
    private $moveNorth: JQuery;
    private $moveUp: JQuery;
    private $moveDown: JQuery;
    private $useGrid: JQuery;

    constructor(private mwin:MapperWindow, private rooms: Room[], private callback: Function) {

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "moveRoomsWindow";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Sposta stanze (${rooms.length} selezionate)</div>
        <!--content-->
        <div class="flex-window">
            <div>
                <div class="" style="text-align:center;">
                    <table style="width: 120px;flex: none;margin-left: auto;margin-right: auto;">
                        <tr>
                            <td style="">
                            </td>
                            <td style="">
                                <button class="moveroombutton north">🡹</button>
                            </td>
                            <td style="">
                            </td>
                            <td style="">
                                <button class="moveroombutton moveroomupdownbutton up">▲</button>
                            </td>
                        </tr>
                        <tr>
                            <td style="">
                                <button class="moveroombutton west">🡸</button>
                            </td>
                            <td style="">
                            
                            </td>
                            <td style="">
                                <button class="moveroombutton east">🡺</button>
                            </td>
                            <td style="">
                            </td>
                        </tr>
                        <tr>
                            <td style="">
                            </td>
                            <td style="">
                                <button class="moveroombutton south">🡻</button>
                            </td>
                            <td style="">
                            </td>
                            <td style="">
                                <button class="moveroombutton moveroomupdownbutton down">▼</button>
                            </td>
                        </tr>
                    </table>
                    <label>Usa griglia: <input type="checkbox" title="Se abilitato le ogni spostamento andra per come assegnata la griglia, altrimenti di 1px" class="moveroom-usegrid"></label><br>
                    <span class="mvMessage"></span>
                </div>
            </div>
            <div class="window-buttonbar">
                <button class="greenbutton applybutton">OK</button>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$applyButton = $(win.getElementsByClassName("applybutton")[0]);
        this.$cancelButton = $(win.getElementsByClassName("exitbutton")[0]);
        this.$moveNorth = $(win.getElementsByClassName("moveroombutton north")[0]);
        this.$moveRight= $(win.getElementsByClassName("moveroombutton east")[0]);
        this.$moveSouth = $(win.getElementsByClassName("moveroombutton south")[0]);
        this.$moveLeft = $(win.getElementsByClassName("moveroombutton west")[0]);
        this.$moveUp = $(win.getElementsByClassName("moveroombutton up")[0]);
        this.$moveDown = $(win.getElementsByClassName("moveroombutton down")[0]);
        this.$useGrid = $(win.getElementsByClassName("moveroom-usegrid")[0]);
        
        const w = 260
        const h = 270
        const left = ($(window).width()-w)/2;
        const top = ($(window).height()-h)/2;
        (<any>this.$win).jqxWindow({isModal: true, width: w, height: h, minHeight: h, minWidth: w, position: { x: left, y: top }});
        
        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        
        circleNavigate(this.$win, this.$applyButton, this.$applyButton, this.$win);
        this.$useGrid.prop("checked", true)
        $(".mvMessage", this.$win).html(`<span>Per muovere le stanze puoi anche usare i tasti direzionali e PgUp/PgDown nel mapper.</span>`)
        this.show()

        this.$moveNorth.on("click", () => {
            let grid = this.$useGrid.prop("checked")
            this.reselect(this.rooms);
            this.mwin.moveRoomsOnAxis("y", true, grid)
        })
        this.$moveRight.on("click", () => {
            let grid = this.$useGrid.prop("checked")
            this.reselect(this.rooms);
            this.mwin.moveRoomsOnAxis("x", false, grid)
        })
        this.$moveSouth.on("click", () => {
            let grid = this.$useGrid.prop("checked")
            this.reselect(this.rooms);
            this.mwin.moveRoomsOnAxis("y", false, grid)
        })
        this.$moveLeft.on("click", () => {
            let grid = this.$useGrid.prop("checked")
            this.mwin.moveRoomsOnAxis("x", true, grid)
        })
        this.$moveUp.on("click", () => {
            let grid = this.$useGrid.prop("checked")
            this.reselect(this.rooms);
            this.mwin.moveRoomsOnAxis("z", true, grid)
        })
        this.$moveDown.on("click", () => {
            let grid = this.$useGrid.prop("checked")
            this.reselect(this.rooms);
            this.mwin.moveRoomsOnAxis("z", false, grid)
        })
    }
    reselect(rooms: Room[]) {
        this.mwin.drawing.selectedRooms.clear()
        for (const r of rooms) {
            this.mwin.drawing.selectedRooms.set(r.id, r)
        }
    }

    private handleApplyButtonClick() {
        this.hide();
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
