import { cloneDeep } from "lodash";
import {ExitDir, Room, RoomExit} from "../mapper"
import { circleNavigate, colorCssToRGB, colorToHex } from "../../Core/util";
import { MapperDrawing } from "../mapperDrawing";
import { Messagebox } from "../../App/messagebox";

export class EditRoomWin {
    private $win: JQuery;
    private $applyButton: JQuery;
    private $cancelButton: JQuery;
    private $name: JQuery;
    private $short: JQuery;
    private $desc: JQuery;
    private rooms:Room[];
    private room:Room = { id: 0, zone_id: 0, name: "", color: "", x: 0, y: 0, z: 0, exits: {}};
    private $numrooms: JQuery;
    private $cost: JQuery;
    private $vnum: JQuery;
    private $posX: JQuery;
    private $posY: JQuery;
    private $posZ: JQuery;
    private $color: JQuery;
    private $teleport: JQuery;
    private $labelPos: JQuery;
    private $roomType: JQuery;

    private $exitType: JQuery;
    private $exitdestDirType: JQuery;
    private $roomeditexitname: JQuery;
    private $roomeditexitparam: JQuery;
    private $roomeditexitlabel: JQuery;
    private $roomeditexittoroom: JQuery;
    private $roomeditexithidden: JQuery;

    private _selectedExit: RoomExit;
    public get selectedExit(): RoomExit {
        return this._selectedExit;
    }
    public set selectedExit(value: RoomExit) {
        this._selectedExit = value;
        if (value) {
            $(".deleteExitButton", this.$win).show()
            $(".createExitButton", this.$win).hide()
            $(".exitproperties", this.$win).show()
        } else {
            $(".deleteExitButton", this.$win).hide()
            $(".createExitButton", this.$win).show()
            $(".exitproperties", this.$win).hide()
        }
        this.colorExits()
    }

    private colorExits() {
        $(".dir-table td", this.$win).each((i,e) => {
            let key = $(e).data("exit") as ExitDir;
            if (this.room.exits[key]) {
                $(e).addClass("active")
            } else {
                $(e).removeClass("active")
            }
            if (this.selectedExitName == key) {
                $(e).addClass("selected")
            } else {
                $(e).removeClass("selected")
            }
        })
    }

    private _selectedExitName: ExitDir;
    public get selectedExitName(): ExitDir {
        return this._selectedExitName;
    }
    public set selectedExitName(value: ExitDir) {
        if (this._selectedExitName && this.selectedExit) {
            this.applyExitFields(this.selectedExit);
        }
        this._selectedExitName = value;
        if (value) {
            $(".exitselected", this.$win).show();
            $(".noexitselected", this.$win).hide();
        } else {
            $(".exitselected", this.$win).hide();
            $(".noexitselected", this.$win).show();
        }
    }

    constructor() {

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "editRoomWindow";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Modifica stanze</div>
        <!--content-->
        <div class="flex-window">
            <div class='jqxTabs'>
                <ul>
                    <li>Dati testuali</li>
                    <li>Uscite</li>
                    <li>Proprieta'</li>
                </ul>
                <div>
                    <div class="tab-content">
                        <div style="flex:none;">
                            Nome
                        </div>
                        <div style="flex:none;display:flex;">
                            <input placeholder="[inserisci nome]" title="Il nome/titolo della stanza nel mud" class="roomedit-name" style="flex:auto;" type="text">
                        </div>
                        <div style="flex:none;">
                            Descrizione
                        </div>
                        <div style="flex:auto;display:flex;">
                            <textarea placeholder="[inserisci descrizione]" class="roomedit-desc"></textarea>
                        </div>
                        <div style="flex:none;">
                            Etichetta/Abbreviazione
                        </div>
                        <div style="flex:none;display:flex;flex-direction:row;">
                            <div style="flex:auto;display:flex;">
                                <input placeholder="[nessuna]" title="opzionale, se in quadre verra usato dal vai" class="roomedit-short" style="flex:auto;" type="text">
                            </div>
                            <div style="flex:auto;display:flex;">
                                <select title="Posizione per disegnare sul mapper" class="roomedit-labeldir" style="flex:auto;">
                                    <option value="">[pos. predefinita]</option>
                                    <option value="0">Nord</option>
                                    <option value="1">Nord-est</option>
                                    <option value="2">Est</option>
                                    <option value="3">Sud-est</option>
                                    <option value="4">Sud</option>
                                    <option value="5">Sud-ovest</option>
                                    <option value="6">Ovest</option>
                                    <option value="7">Nord-ovest</option>
                                    <option value="8">Alto</option>
                                    <option value="9">Basso</option>
                                    <option value="10">Centrale</option>
                                    <option value="11">Nascosta</option>
                                </select>
                            </div>
                        </div>
                        
                    </div>
                </div>
                <div>
                    <div class="tab-content">
                        <div class="onlymultiedit"><p>Non disponibile per modifiche multiple</p></div>
                        <div class="split-horizontally nomultiedit">
                            <div style="flex:none;padding:5px;">
                                <table class="dir-table">
                                    <tr><td data-exit="nw" title="Nord ovest">NW</td><td data-exit="n" title="Nord">N</td><td data-exit="ne" title="Nord est">NE</td></tr>
                                    <tr><td data-exit="w" title="Ovest">W</td><td data-exit="special" title="Speciale: se un comando la fa traversare">[sp]</td><td data-exit="e" title="Est">E</td></tr>
                                    <tr><td data-exit="sw" title="Sud ovest">SW</td><td data-exit="s" title="Sud">S</td><td data-exit="se" title="Sud est">SE</td></tr>
                                    <tr><td data-exit="u" title="Alto (up)">U</td><td data-exit="d" title="Basso (down)">D</td><td data-exit="other" title="Altro tipo (es. teleport)">[tp]</td></tr>
                                </table>
                                <br>
                                <button class="redbutton deleteExitButton">Elimina uscita</button>
                            </div>
                            <div style="padding:5px;">
                                <p class="noexitselected">Seleziona un'uscita per crearla, modificarla o eliminarla.</p>
                                <div class="exitselected">
                                    <a href="#" class="createExitButton">Crea questa uscita</a>
                                    <div class="exitproperties">
                                        <table>
                                        <tr><td style="text-align:right;padding-right:5px">Tipo</td><td>
                                            <select title="Tipo stanza" class="roomedit-exittype" style="flex:auto;">
                                                <option value="0">Normale</option> 
                                                <option value="1">Porta da aprire</option>
                                                <option value="2">Porta chiusa a chiave</option>
                                            </select>
                                        </td></tr>
                                        <tr><td style="text-align:right;padding-right:5px">Apertura</td><td>
                                            <input placeholder="Parametri apertura" title="Nome uscita o comandi per aprire l'uscita' separati da virgola\nUsato solo per porte" class="roomedit-exitparam" style="flex:auto;" type="text">
                                        </td></tr>
                                        <tr><td style="text-align:right;padding-right:5px">Speciale</td><td>
                                            <input placeholder="Comando speciale" title="Comando o comandi speciali per seguire l'uscita\nUsato solo nel pathing automatico per aggiungere comandi da dare prima di essere entrati nella locazione sucessiva\nPer direzioni il mapper non dara nemmeno la direzione, ma eseguira' il comando speciale.\nUsato comunemente per direzioni di tipo speciale (es. ent stagno)" class="roomedit-exitname" style="flex:auto;" type="text">
                                        </td></tr>
                                        <tr><td style="text-align:right;padding-right:5px">Etichetta</td><td>
                                            <input placeholder="Etichetta" title="Verra' disegnata sulla mappa" class="roomedit-exitlabel" style="flex:auto;" type="text">
                                        </td></tr>
                                        <tr><td style="text-align:right;padding-right:5px">Destinazione</td><td>
                                            <div style="display:flex;flex-direction:row;">
                                            <input class="roomedit-exittoroom" title="Numero stanza alla quale porta l'uscita" style="width:72px;" type="number">
                                            <select title="Direzione di destinazione" class="roomedit-exitdestdir" style="display:inline-block;">
                                                <option value="n">Nord</option> 
                                                <option value="ne">Nord est</option>
                                                <option value="e">Est</option>
                                                <option value="se">Sud est</option>
                                                <option value="s">Sud</option>
                                                <option value="sw">Sud ovest</option>
                                                <option value="w">Ovest</option>
                                                <option value="nw">Nord ovest</option>
                                                <option value="u">Alto</option>
                                                <option value="d">Basso</option>
                                                <option value="other">TP / Altro</option>
                                                <option value="special">Speciale</option>
                                            </select>
                                            </div>
                                        </td></tr>
                                        <tr><td style="text-align:right;padding-right:5px">Nascondi</td><td>
                                            <input type="checkbox" title="Se abilitato non verra' disegnata" class="roomedit-exithidden">
                                        </td></tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="tab-content">
                        <div style="flex:none;">
                            <table>
                                <tr style="height:28px;">
                                    <td style="text-align:right;padding-right:10px;">
                                        Tipo:
                                    </td>
                                    <td>
                                        <select title="Tipo stanza" class="roomedit-type" style="flex:auto;">
                                            <option value="">[predefinito]</option> 
                                            <option value="0">Inside</option> 
                                            <option value="1">Forest</option>
                                            <option value="2">Field</option>
                                            <option value="3">Water</option>
                                            <option value="4">Mountain</option>
                                            <option value="5">Underground</option>
                                            <option value="6">Street</option>
                                            <option value="7">Crossroad</option>
                                            <option value="8">DT</option>
                                            <option value="9">Air</option>
                                            <option value="10">Path</option>
                                            <option value="11">Hills</option>
                                            <option value="12">City</option>
                                            <option value="13">Mercant</option>
                                            <option value="14">Underwater</option>
                                            <option value="15">Desert</option>   
                                        </select>
                                    </td>
                                </tr>
                                <tr style="height:28px;">
                                    <td style="text-align:right;padding-right:10px;">
                                        Vnum:
                                    </td>
                                    <td>
                                        <input class="roomedit-vnum" title="Il numero virtuale della room nel gioco" style="width:100px;" type="number">
                                    </td>
                                </tr>
                                <tr style="height:28px;">
                                    <td style="text-align:right;padding-right:10px;">
                                        Coordinate:
                                    </td>
                                    <td>
                                        <span class="coordinate-label">X:</span><input class="coordinate-value roomedit-x" style="width:50px;" type="number">
                                        <span class="coordinate-label">Y:</span><input class="coordinate-value roomedit-y" style="width:50px;" type="number">
                                        <span class="coordinate-label">Z:</span><input class="coordinate-value roomedit-z" style="width:50px;" type="number">
                                    </td>
                                </tr>
                                <tr style="height:28px;">
                                    <td style="text-align:right;padding-right:10px;">
                                        Costo mov:
                                    </td>
                                    <td>
                                        <input class="roomedit-cost" title="Per il calcolo delle path. Se il costo e' alto il mapper cerchera' di trovare un'altra via." style="width:250px;" type="number">
                                    </td>
                                </tr>
                                <tr style="height:28px;">
                                    <td style="text-align:right;padding-right:10px;">
                                        Colore:
                                    </td>
                                    <td>
                                        <input type="color" class="roomedit-color" title="Il colore di sfondo nel mapper"> <span>(nero puro disabilita colore)</span>
                                    </td>
                                </tr>
                                <tr style="height:28px;">
                                    <td style="text-align:right;padding-right:10px;">
                                        Teleport:
                                    </td>
                                    <td>
                                        <input type="checkbox" title="Indica se la stanza e' una teleport.\nPer stanze teleport aggiungi un'uscita di altro tipo (tp).\nAltrimenti il mapper non potra' creare path alla destinazione." class="roomedit-teleport"> <span>(ricordati dell' uscita "tp")</span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="window-buttonbar">
                <span class="roomedit-selectionData"></span>
                <button class="redbutton exitbutton">Annulla</button>
                <button class="greenbutton applybutton">Applica</button>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$applyButton = $(win.getElementsByClassName("applybutton")[0]);
        this.$cancelButton = $(win.getElementsByClassName("exitbutton")[0]);
        this.$numrooms = $(win.getElementsByClassName("roomedit-selectionData")[0]);
        this.$name = $(win.getElementsByClassName("roomedit-name")[0]);
        this.$short = $(win.getElementsByClassName("roomedit-short")[0]);
        this.$desc = $(win.getElementsByClassName("roomedit-desc")[0]);
        this.$cost = $(win.getElementsByClassName("roomedit-cost")[0]);
        this.$posX = $(win.getElementsByClassName("roomedit-x")[0]);
        this.$posY = $(win.getElementsByClassName("roomedit-y")[0]);
        this.$posZ = $(win.getElementsByClassName("roomedit-z")[0]);
        this.$vnum = $(win.getElementsByClassName("roomedit-vnum")[0]);
        this.$color = $(win.getElementsByClassName("roomedit-color")[0]);
        this.$teleport = $(win.getElementsByClassName("roomedit-teleport")[0]);
        this.$labelPos = $(win.getElementsByClassName("roomedit-labeldir")[0]);
        this.$roomType = $(win.getElementsByClassName("roomedit-type")[0]);
        (<any>this.$cost).jqxNumberInput({ decimalDigits: 0, min:0, inputMode: 'simple', width:"250px", spinButtons: true, spinButtonsStep: 1 });
        (<any>this.$labelPos).jqxDropDownList({autoItemsHeight: true,width:'100px',filterable:false, itemHeight: 20,scrollBarSize:8});
        (<any>this.$roomType).jqxDropDownList({autoItemsHeight: true,width:'250px',filterable:false, itemHeight: 20,scrollBarSize:8});
        
        this.$exitdestDirType = $(win.getElementsByClassName("roomedit-exitdestdir")[0]);
        this.$exitType = $(win.getElementsByClassName("roomedit-exittype")[0]);
        (<any>this.$exitType).jqxDropDownList({placeHolder: "Seleziona tipo", autoItemsHeight: true,width:'173px',filterable:false, itemHeight: 20,scrollBarSize:8});
        (<any>this.$exitdestDirType).jqxDropDownList({placeHolder: "Seleziona dir.",autoItemsHeight: true,width:'90px',filterable:false, itemHeight: 20,scrollBarSize:8});
        this.$roomeditexitname = $(win.getElementsByClassName("roomedit-exitname")[0]);
        this.$roomeditexitparam = $(win.getElementsByClassName("roomedit-exitparam")[0]);
        this.$roomeditexitlabel = $(win.getElementsByClassName("roomedit-exitlabel")[0]);
        this.$roomeditexittoroom = $(win.getElementsByClassName("roomedit-exittoroom")[0]);
        this.$roomeditexithidden = $(win.getElementsByClassName("roomedit-exithidden")[0]);

        const w = 520
        const h = 360
        const left = ($(window).width()-w)/2;
        const top = ($(window).height()-h)/2;
        (<any>this.$win).jqxWindow({width: w, height: h, minHeight: h, minWidth: w, position: { x: left, y: top }});
        (<any>$('.jqxTabs',this.$win)).jqxTabs({ height: '100%', width: '100%' });
        $(".exitselected", this.$win).hide();
        
        this.$applyButton.click(this.handleApplyButtonClick.bind(this));
        this.$cancelButton.click(this.handleCancelButtonClick.bind(this));

        circleNavigate(this.$win, this.$applyButton, null, this.$win);

        $(".dir-table td", this.$win).click((ev) => this.exitClick(ev))
        $(".deleteExitButton", this.$win).click((ev) => this.deleteExit(ev))
        $(".createExitButton", this.$win).click((ev) => this.createExit(this.selectedExitName))

    }

    applyExitFields(selectedExit: RoomExit) {
        let exType = parseInt(this.$exitType.val()||0)
        let exDirType = this.$exitdestDirType.val()
        let exName = this.$roomeditexitname.val() 
        let exParam = this.$roomeditexitparam.val()
        let exLabel = this.$roomeditexitlabel.val()
        let exToRoom = parseInt(this.$roomeditexittoroom.val())
        let exHidden = this.$roomeditexithidden.prop('checked')
        selectedExit.type = exType;
        selectedExit.to_dir = exDirType;
        selectedExit.name = exName;
        selectedExit.param = exParam;
        selectedExit.label = exLabel;
        selectedExit.to_room = exToRoom;
        selectedExit.nodraw = exHidden;
    }

    deleteExit(ev: JQueryEventObject): any {
        if (this.selectedExitName) {
            delete this.room.exits[this.selectedExitName as ExitDir];
            this.selectExit(null)
        }
    }

    exitClick(ev: JQueryMouseEventObject) {
        let ex = $(ev.target).data("exit");
        let roomExit:RoomExit = this.room.exits[ex as ExitDir]
        this.selectExit(ex, roomExit);
    }

    private createExit(ex: ExitDir) {
        if (!this.room.exits[ex as ExitDir]) {
            let roomExit = {} as RoomExit;
            this.room.exits[ex as ExitDir] = roomExit;
        }
        this.colorExits()
        this.selectExit(ex, this.room.exits[ex as ExitDir])
        return this.room.exits[ex as ExitDir];
    }

    private selectExit(ex:ExitDir, roomExit?: RoomExit) {
        this.selectedExitName = ex;
        this.selectedExit = roomExit;
        if (!roomExit) {
            this.$exitType.val("")
            this.$exitdestDirType.val("")
            this.$roomeditexitname.val("") 
            this.$roomeditexitparam.val("")
            this.$roomeditexitlabel.val("")
            this.$roomeditexittoroom.val("")
            this.$roomeditexithidden.prop('checked', false)
        } else {
            (<any>this.$exitType).jqxDropDownList('selectIndex', roomExit.type ? roomExit.type : 0 ); 
            let dirs = ["n","ne","e","se","s","sw","w","nw","u","d","other","special"];
            let dirI = roomExit.to_dir ? dirs.indexOf(roomExit.to_dir) : 0;
            (<any>this.$exitdestDirType).jqxDropDownList('selectIndex', dirI ); 
            this.$roomeditexitname.val(roomExit.name) 
            this.$roomeditexitparam.val(roomExit.param)
            this.$roomeditexitlabel.val(roomExit.label)
            this.$roomeditexittoroom.val(roomExit.to_room)
            this.$roomeditexithidden.prop('checked', roomExit.nodraw?true:false)
        }
    }

    private handleKeyUp(event:KeyboardEvent) {
        const k = (event.key || event.keyCode);
        if (k == "Enter" || k == 13) {
            this.handleApplyButtonClick();
        }
    }

    public editRooms(rooms: Iterable<Room>) {
        this.rooms = [...rooms];
        this.startEditing()
        this.show()
    }

    setUiValue(e:JQuery, val:any) {
        if (val === null) {
            e.val("[N/A]")
            e.prop('checked', false)
            e.attr("disabled", "true")
        } else {
            if (e == this.$cost) {
                (<any>e).jqxNumberInput("val", val);
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

    toggleUI(enabled?:boolean) {
        let ui = [this.$name,
        this.$desc,
        this.$short,
        this.$labelPos,
        this.$cost,
        this.$vnum,
        this.$color,
        this.$teleport,
        this.$roomType,
        this.$posX,
        this.$posY,
        this.$posZ];

        for (const c of ui) {
            c.val("")
            if (!enabled)
                this.disable(c)
            else
                this.enable(c)
        }
    }

    setUi() {
        this.colorExits()
        this.selectExit(null);
        if (this.rooms.length == 0) {
            this.toggleUI()
            return
        } else if (this.multiEdit()) {
            this.toggleUI(true)
            this.setUiValue(this.$name, null)
            this.setUiValue(this.$short, null)
            this.setUiValue(this.$desc, null)
            this.setUiValue(this.$vnum, null)
            this.setUiValue(this.$posX, null)
            this.setUiValue(this.$posY, null)
            this.setUiValue(this.$posZ, null)
            let tp = this.$teleport[0] as HTMLInputElement;
            tp.indeterminate = true;
        } else {
            this.toggleUI(true)
        }

        this.loadFields();

        this.$numrooms.text(this.rooms.length>1 ? `(${this.rooms.length}) selezionate` : "Id stanza: " + this.room.id)
        if (this.multiEdit()) {
            $(".nomultiedit", this.$win).hide();
            $(".onlymultiedit", this.$win).show();
        } else {
            $(".nomultiedit", this.$win).show();
            $(".onlymultiedit", this.$win).hide();
        }
    }

    private loadFields() {
        this.setUiValue(this.$name, this.multiEdit() ? null : this.room.name);
        this.setUiValue(this.$desc, this.multiEdit() ? null : this.room.description);
        this.setUiValue(this.$short, this.multiEdit() ? null : this.room.shortName);
        
        this.setUiValue(this.$cost, this.multiEdit() ? "" : this.room.cost || 1);
        this.setUiValue(this.$vnum, this.multiEdit() ? null : this.room.vnum?.toString());
        let rcol = this.room.color?.toString()
        if (!rcol || rcol == "rgb(255,255,255)") {
            rcol = MapperDrawing.defaultRoomFillColor
        }
        this.setUiValue(this.$color, colorToHex(colorCssToRGB(rcol), false));
        this.setUiValue(this.$teleport, this.room.teleport ? "true" : "");

        (<any>this.$roomType).jqxDropDownList("val", this.multiEdit() ? "" : this.room.type?.toString());
        (<any>this.$labelPos).jqxDropDownList("val", this.multiEdit() ? "" : this.room.labelDir?.toString());

        this.setUiValue(this.$posX, this.multiEdit() ? null : this.room.x?.toString());
        this.setUiValue(this.$posY, this.multiEdit() ? null : this.room.y?.toString());
        this.setUiValue(this.$posZ, this.multiEdit() ? null : this.room.z?.toString());
    }

    private multiEdit() {
        return this.rooms.length > 1;
    }

    startEditing() {
        const r = this.rooms[0];
        const clone = structuredClone(r)
        this.room = clone;
        this.setUi()
    }

    private allEqual<T>(key: keyof T, value: any) {
        for (const r of this.rooms) {
            if ((r as T)[key] != value) {
                return false
            }
        }
        return true
    }

    private setValue<T>(key: keyof T, value: any) {
        for (const r of this.rooms) {
            if (value === null) {
                delete (r as T)[key]; 
            } else {
                (r as T)[key] = value;
            }
        }
    }

    applyEdits() {
        try {
            this.selectedExitName = null
            this.selectedExit = null
            if (!this.multiEdit()) {
                let vnum = this.$vnum.val() != "" ? parseInt(this.$vnum.val()) : null;
                let x = parseInt(this.$posX.val())
                let y = parseInt(this.$posY.val())
                let z = parseInt(this.$posZ.val())

                for (const key of Object.keys(this.room.exits)) {
                    let ex = this.room.exits[key as ExitDir]
                    if (ex.type < 1 && ex.param) {
                        throw `Uscita '${key}' ha comandi di apertura ma non e' una porta`
                    }
                }
                
                if (isNaN(vnum)) throw "Vnum non valido"
                if (isNaN(x)) throw "X non valido"
                if (isNaN(y)) throw "Y non valido"
                if (isNaN(z)) throw "Z non valido"

                this.setValue<typeof this.room>("name", this.$name.val())
                this.setValue<typeof this.room>("description", this.$desc.val())
                this.setValue<typeof this.room>("shortName", this.$short.val())

                this.setValue<typeof this.room>("vnum", vnum)

                this.setValue<typeof this.room>("x", x)
                this.setValue<typeof this.room>("y", y)
                this.setValue<typeof this.room>("z", z)

                this.selectedExitName = null;
                this.setValue<typeof this.room>("exits", structuredClone(this.room.exits))

            }

            let tp = this.$teleport[0] as HTMLInputElement;
            
            let cost = (<any>this.$cost).jqxNumberInput("val");
            if (cost != "") {
                if ((!this.multiEdit() && !(cost == 1 && !this.room.cost)) ||
                    (this.multiEdit() && !this.allEqual("cost", cost)))
                {
                    this.setValue<typeof this.room>("cost", parseInt(cost));
                }
            }
            let col = this.$color.val();
            if (col == "black" ||
                col == "rgb(0,0,0)" ||
                col == "rgb(0, 0, 0)" ||
                col == "#000000") {
                col = null;
            }
            this.setValue<typeof this.room>("color", col);
            if (!tp.indeterminate) {
                this.setValue<typeof this.room>("teleport", this.$teleport.prop('checked')==true);
            }
            if (this.$labelPos.val() != "") {
                this.setValue<typeof this.room>("labelDir", this.$labelPos.val() ? parseInt(this.$labelPos.val()) : null);
            }
            if (this.$roomType.val() != "") {
                this.setValue<typeof this.room>("type", this.$roomType.val() ? parseInt(this.$roomType.val()) : null);
            }
            return true
        } catch (er) {
            Messagebox.Show("Errore nei valori", er)
            return false
        }
    }

    private handleApplyButtonClick() {
        if (this.applyEdits())
            this.hide();
    }

    private handleCancelButtonClick() {
        this.hide();
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow('bringToFront');
    }

    private hide() {
        (<any>this.$labelPos).jqxDropDownList("destroy");
        (<any>this.$roomType).jqxDropDownList("destroy");
        (<any>this.$exitType).jqxDropDownList("destroy");
        (<any>this.$exitdestDirType).jqxDropDownList("destroy");
        (<any>this.$win).jqxWindow("close");
        (<any>this.$win).jqxWindow("destroy");
    }
}
