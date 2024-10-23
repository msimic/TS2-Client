import { ExitDir, Favorite, MapDatabase, Mapper, MapVersion, Room, RoomExit, Zone } from "./mapper";
import { Messagebox, MessageboxResult, messagebox, Button, Notification } from "./messagebox";
import { isNumeric } from "jquery";
import { IBaseWindow, WindowManager } from "./windowManager";
import { EvtScriptEmitPrint } from "./jsScript";
import { EditMode, MapperDrawing } from "./mapperDrawing";
import { ResizeSensor } from 'css-element-queries'
import { downloadJsonToFile, importFromFile, padStart } from './util'
import { NewLineKind } from "typescript";
import { EditRoomWin } from './mapper/windows/editRoomWin'
import { MapperOptionsWin } from './mapper/windows/mapperOptionsWin'
import { off } from "process";
import { Point } from "./mapperDrawing"
import { MapperMoveToZoneWin } from "./Mapper/windows/mapperMoveToZoneWin"

export enum UpdateType { none = 0, draw = 1 }

interface ClipboardItem {
    readonly types: string[];
    readonly presentationStyle: "unspecified" | "inline" | "attachment";
    getType(): Promise<Blob>;
  }
  
  interface ClipboardItemData {
    [mimeType: string]: Blob | string | Promise<Blob | string>;
  }
  
  declare var ClipboardItem: {
    prototype: ClipboardItem;
    new (itemData: ClipboardItemData): ClipboardItem;
  };

export class MapperWindow implements IBaseWindow {
    optionsWindow: MapperOptionsWin;
    editMode: EditMode = EditMode.Drag;
    allowMove: boolean = false;
    setMapFont() {
        const mdef = this.windowManager.windows.get("Mapper")
        if (!mdef || !mdef.data) return;
        this.drawing.font = mdef.data.font
        this.drawing.fontSize = mdef.data.fontSize
    }

    private $win: JQuery;
    private ctx: CanvasRenderingContext2D;
    private $bottomMessage:JQuery;
    private $zoneList:JQuery;
    private $menu:JQuery;
    canvas: JQuery;
    drawing: MapperDrawing;
    private zones:Zone[] = []
    private _zoneId: number = -1;
    public get zoneId(): number {
        return this._zoneId;
    }
    public set zoneId(value: number) {
        this._zoneId = value;
        const sel = !this.zoneId ? null : (<any>this.$zoneList).jqxDropDownList('getItemByValue', this.zoneId.toString());
        if (sel && (<any>this.$zoneList).jqxDropDownList('selectedIndex')!=sel.index) {
            (<any>this.$zoneList).jqxDropDownList('selectIndex', sel.index );
        }
    }
    $zoom: JQuery;
    $level: JQuery;
    $contextMenu: JQuery;

    onEmitMapperMessage = (d:any) => {
        return this.message(d)
    }

    onEmitMapperSearch = (d:any) => {
        //return this.searchNameDesc(d, "")
    }

    onEmitMapperZoneChanged = (d:any) => {
        this.zoneId = d?.id
        this.zones = [...this.mapper.idToZone.values()]
        this.zoneMessage(d?.zone?.name||"Zona sconosciuta")
        if (this.drawing) this.drawing.refresh();
    }

    onEmitMapperRoomChanged = (d:any) => {
        this.zoneId = d.room ? d.room.zone_id : -1
        this.message(this.mapper.getRoomName(d.room))
        if (!d.room || this.zoneId < 0) {
            this.zoneMessage("Zona sconosciuta")
        } else {
            this.zoneMessage(this.mapper.getRoomZone(d.room.id)?.name||"Zona sconosciuta")
        }
        if (this.drawing) this.drawing.setActiveRoom(d.room);
    }

    onZoomChange = (zoom: number) => {
        const zmp = ((100 - 0) * (zoom - 0.5) / (4 - 0.5)) + 0;
        this.$zoom.text("Zoom " + zmp.toFixed(0) + "%")
        this.mapper.getOptions().mapperScale = this.drawing.scale;
        this.mapper.saveOptions();
    }

    showContextMenu = (data:{x:number,y:number}) => {
        var scrollTop = $(window).scrollTop();
        var scrollLeft = $(window).scrollLeft();
        scrollLeft += this.canvas.offset().left;
        scrollTop += this.canvas.offset().top;
        const fav = !this.drawing.contextRoom ? null : this.mapper.getFavorites().find(f => f.roomId == this.drawing.contextRoom.id)
        if (fav) {
            $("[data-option-name='addfavorite']", this.$contextMenu).addClass("disabled");
            $("[data-option-name='removefavorite']", this.$contextMenu).removeClass("disabled");
        } else {
            $("[data-option-name='removefavorite']", this.$contextMenu).addClass("disabled");
            $("[data-option-name='addfavorite']", this.$contextMenu).removeClass("disabled");
        }
        if (this.mapper.mapmode || this.drawing.mapmode) {
            $("[data-option-name='edit']", this.$contextMenu).removeClass("disabled");
        } else {
            $("[data-option-name='edit']", this.$contextMenu).addClass("disabled");
        }
        (this.$contextMenu as any).jqxMenu('open', (data.x) + 5 + scrollLeft, (data.y) + 5 + scrollTop);
        return false;
    }
    resizeSensor: ResizeObserver;
    windowTitle = "Mapper";

    constructor(private mapper:Mapper,private windowManager: WindowManager) {
        this.optionsWindow = new MapperOptionsWin(mapper, () => {
            if (this.drawing) {
                this.drawing.refresh()
            }
        });
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "win-Mapper";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>${this.windowTitle}</div>
        <!--content-->
        <div id="win-Mapper" class="expand">
            <div class="toprow">
                <div id="mapperMenubar" class="menuBar">
                    <ul class='custom'>
                        <li id="dati" class='custom' data-option-type="mapper" data-option-name="load">Dati
                            <ul  class='custom'>
                            <li  class='custom' data-option-type="mapper" data-option-name="mapmode">Modalita' mappaggio</li>
                            <li type='separator'></li>
                            <li  class='custom' data-option-type="mapper" data-option-name="reload">Ricarica mappa</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="reloadLocal">Carica da locale</li>
                            <li  class='custom electron' data-option-type="mapper" data-option-name="reloadweb">Ricarica mappa dal sito</li>
                            <li type='separator'></li>
                            <li  class='custom' data-option-type="mapper" data-option-name="exportall">Scarica la mappa</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="exportzone">Scarica zona corrente</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="importzone">Carica zona o zone</li>
                            </ul>
                        </li>
                        <li id="azioni" class='custom'>Azioni
                            <ul  class='custom'>
                            <li  class='custom' data-option-type="mapper" data-option-name="pathfind">Vai a num. locazione</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="search">Cerca locazione</li>
                            <li type='separator'></li>
                            <li  class='custom' data-option-type="mapper" data-option-name="sync">Sincronizza mappa</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="export">Esporta immagine</li>
                            <li type='separator'></li>
                            <li  class='custom' data-option-type="mapper" data-option-name="mapperroom">Modifica stanza</li>
                            </ul>
                        </li>
                        <li id="mapperaltro" class='custom'>Altro
                            <ul  class='custom'>
                                <li id="favorites" class='custom'>Favoriti
                                    <ul  class='custom' id="mapFavorites">
                                        <li class='custom jqx-item jqx-menu-item jqx-rc-all' role='menuitem'>&lt;nesuno&gt;</li> 
                                    </ul>
                                </li>
                                <li  class='custom' data-option-type="mapper" data-option-name="info">Informazioni</li>
                                <li  class='custom' data-option-type="mapper" data-option-name="legend">Leggenda</li>
                                <li type='separator'></li>
                                <li  class='custom' data-option-type="mapper" data-option-name="mapversion">Versione DB</li>
                                <li type='separator'></li>
                                <li  class='custom' data-option-type="mapper" data-option-name="impostazioni">Impostazioni</li>
                            </ul>
                        </li>
                    </ul>
                    <div id="mappertoolbar">
                        <button title="Livello inferiore" class="maptoolbarbutton" data-option-type="mapper" data-option-name="leveldown">&#9660;</button>
                        <span id="level">Lv. 0</span>
                        <button title="Livello superiore" class="maptoolbarbutton" data-option-type="mapper" data-option-name="levelup">&#9650;</button>
                        <!--<button title="Sincronizza mappa" class="maptoolbarbutton" data-option-type="mapper" data-option-name="sync">&#128269;</button>-->
                        <button title="Abbassa zoom (mouse scroll down)" class="maptoolbarbutton" data-option-type="mapper" data-option-name="zoomout">-</button>
                        <span id="zoom">Zoom 100%</span>
                        <button title="Ingrandisci (mouse scroll up)" class="maptoolbarbutton" data-option-type="mapper" data-option-name="zoomin">+</button></div>
                </div>
                <div id="zonemessage">
                    <select id="zonelist"></select>
                </div>
            </div>
            <div class="mapperworkarea midrow">
                <div class="mappertoolbox draggable">
                    <div class="mappertoolbox-header">
                        <div class="mappertoolbox-title draghandle">Tools
                            <div title="Espandi" class="attrezziexpand draggable-expand" style="display:none;pointer-events:none;">▾</div>
                            <div title="Collassa" class="attrezzicollapse draggable-collapse" style="display:inline-block;pointer-events:none;">▴</div>
                        </div> 
                    </div>
                    <div class="mapperworkarea-toolboxbuttons draggable-content">
                        <span style="">Mouse</span>
                        <button title="Sposta visuale o selezione singola" class="maptoolboxbutton selected" data-option-type="mapper" data-option-name="toolbox-pan">🤚</button>
                        <button title="Selezione rettangolare (Shift[+Ctrl])" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-select">⛶</button>
                        <button title="Consenti movimento stanze" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-move">✣</button>
                        <button title="Crea uscita" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-createlink">↦</button>
                        <span style="margin-top:3px;">Azioni</span>
                        <button title="Aggiungi nuova stanza" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-add">➕</button>
                        <button title="Cancella selezionate" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-delete">❌</button>
                        <button title="Muovi selezionate" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-movewindow">↔️</button>
                        <button title="Sposta selezionate in altra zona" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-movetozone">✂️</button>
                        <button title="Modifica proprieta' delle stanze selezionate" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-editrooms">🔧</button>
                        <span style="margin-top:3px;">Zone</span>
                        <button title="Crea nuova zona" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-newzone">🏘️</button>
                        <button title="Cancella zona corrente" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-deletezone">🗑️</button>
                        <button title="Modifica proprieta' della zona" class="maptoolboxbutton" data-option-type="mapper" data-option-name="toolbox-editzone">⚙️</button>
                    </div>
                </div>
                <div class="midrow"><canvas tabindex="999" id="mapcanvas"></canvas></div>
            </div>
            <div class="bottomrow"><span id="mapmessage"></span></div>
            <div id='mapperContextMenu' style="display:none">
                <ul style="overflow:visible;">
                <li  class='custom' data-option-type="mapper" data-option-name="addfavorite">Aggiungi a favoriti</li>
                <li  class='custom' data-option-type="mapper" data-option-name="removefavorite">Rimuovi da favoriti</li>
                <li type='separator'></li>
                <li  class='custom' data-option-type="mapper" data-option-name="vai">Vai</li>
                <li  class='custom' data-option-type="mapper" data-option-name="set">Posiziona</li>
                <li type='separator'></li>
                <li  class='custom' data-option-type="mapper" data-option-name="edit">Modifica</li>
                </ul>
            </div>
        </div>
        `;

        
        this.$win = $(win);
        var userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.indexOf(' electron/') > -1) {
            $(".electron", this.$win).css({"display": "inline-block"}).show();
        } else {
            $(".electron", this.$win).remove();
        }

        const mnu:any = <JQuery>(<any>$("#mapperMenubar",this.$win)).jqxMenu({autoOpen: false, clickToOpen: true});
        this.$menu = mnu;
        $("#mapperMenubar", this.$win).on('itemclick', (event: any) => {
            document.getSelection().removeAllRanges();
            if ($((<any>event).args).find(".jqx-icon-arrow-left").length || $((<any>event).args).find(".jqx-icon-arrow-right").length || $((<any>event).target).closest(".jqx-menu-popup").length==0)
                return;
            this.closeMenues(mnu);
        });

        if (this.mapper.mapmode) this.showMapToolbar()
        
        this.$bottomMessage = $("#mapmessage", this.$win);
        this.$zoneList = $("#zonelist", this.$win);
        <JQuery>((<any>this.$zoneList)).jqxDropDownList({autoItemsHeight: true,searchMode:'containsignorecase', width:'100%',filterable:true, itemHeight: 20, filterPlaceHolder:'Filtra per nome:',scrollBarSize:8});
        mnu.jqxMenu('setItemOpenDirection', 'favorites', 'left', 'up');
        this.$zoom = $("#zoom", this.$win);
        this.$level = $("#level", this.$win);

        $("#zonelist", this.$win).on("select", (ev:any) => {
            var selection = ev.args.item.value
            if (selection) {
                (<any>$("#zonelist", this.$win)).jqxDropDownList('clearFilter');
                if (!this.mapper.loading)
                    this.mapper.setZoneById(parseInt(selection))
            }
        })

        $("#zonelist", this.$win).on("open", (ev:any) => {
            (<any>$("#zonelist", this.$win)).jqxDropDownList('clearFilter');
        })

        this.canvas = <JQuery>((<any>$("#mapcanvas",this.$win)));

        const ctx = (<HTMLCanvasElement>this.canvas[0]).getContext('2d');
        this.ctx = ctx;
        (<any>this.ctx).mozImageSmoothingEnabled = false;
        (<any>this.ctx).webkitImageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;
        
        const ww = Math.min($(window).width()-20, 400);
        const wh = Math.min($(window).height()-20, 300);

        (<any>this.$win).jqxWindow({width: ww, height: wh, showCollapseButton: true, isModal: false});
        const w = (<any>this.$win);
        this.$contextMenu = <JQuery>((<any>$("#mapperContextMenu", this.$win))).jqxMenu({ animationShowDelay: 0, animationShowDuration : 0, width: '100px', height: null, autoOpenPopup: false, mode: 'popup'});
        
        this.refreshFavorites();
        var self = this;
        w.on('open', function (evt:any) {
            if (self.drawing) {
                self.drawing.zoomChanged.release(self.onZoomChange)
                self.drawing.showContext.release(self.showContextMenu)
                self.drawing.levelChanged.release(self.onLevelChange)
                self.drawing.destroy()
                delete self.drawing;  
            }
            self.attachHandlers(mapper, self.windowManager);
            self.detachMenu()
            self.attachMenu()
            self.drawing = new MapperDrawing(self.mapper, self.mapper.getOptions(), <HTMLCanvasElement>self.canvas[0], self.ctx);
            self.drawing.gridSize = mapper.getOptions().useGrid ? mapper.getOptions().gridSize : 1;
            self.drawing.scale = mapper.getOptions().mapperScale;
            self.drawing.allowMove = self.allowMove
            self.drawing.editMode = self.editMode
            self.drawing.mapmode = self.mapper.mapmode
            self.drawing.setFocus(true);
            self.canvas.focus()
            self.drawing.zoomChanged.handle(self.onZoomChange)
            self.drawing.levelChanged.handle(self.onLevelChange)
            self.drawing.showContext.handle(self.showContextMenu)
            self.setMapFont()
            self.onZoomChange(self.drawing.scale)
            if (!self.mapper.getDB() || !self.mapper.getDB().version || self.mapper.useLocal != self.mapper.getOptions().preferLocalMap) {
                if ((<any>window).ipcRenderer) {
                    self.loadSite.bind(self)(false);
                } else {
                    self.load.bind(self)(self.mapper.getOptions().preferLocalMap);
                }
            } else {
                if (self.mapper.getDB() && self.mapper.getDB().version && self.mapper.useLocal == self.mapper.getOptions().preferLocalMap) {
                    if (!self.mapper.current) self.onEmitMapperZoneChanged(self.mapper.idToZone.get(0));
                    const old = self.mapper.current
                    self.mapper.setRoomById(-1)
                    if (old) self.mapper.setRoomById(old.id || 0)
                    let version = self.mapper.getDB().version
                    self.refreshFavorites();
                    (<any>self.$win).jqxWindow("setTitle", self.windowTitle + (self.mapper.getOptions().preferLocalMap ? " (da locale v." + (version?.version||0) + ")" : " (pubblico v." + (version?.version||0) + ")"));
                    return;
                }
            }
            self.handleDraggingToolbox(self.$win)
        });

        this.canvas[0].addEventListener('keydown', (e:KeyboardEvent) => {
            if (!self.drawing) return;
            self.drawing.lastKey  = {
                key: e.key,
                alt: e.altKey,
                ctrl: e.ctrlKey,
                meta: e.metaKey,
                shift: e.shiftKey,
              };
            if (!self.drawing.$focused) return;
            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    e.stopPropagation();
                    self.drawing.cancelAllActions();
                    self.allowMove = self.drawing.allowMove
                    self.editMode = self.drawing.editMode
                    self.setToolboxButtonStates();
                    break;
                case "ArrowUp": //up
                    e.preventDefault();
                    if (this.drawing.allowMove) {
                        this.moveRoomsOnAxis("y", true, this.mapper.getOptions().useGrid);
                    } else
                        self.drawing.scrollBy(0, -1);
                    break;
                case "ArrowDown": //down
                    e.preventDefault();
                    if (this.drawing.allowMove) {
                        this.moveRoomsOnAxis("y", false, this.mapper.getOptions().useGrid);
                    } else
                        self.drawing.scrollBy(0, 1);
                    break;
                case "ArrowLeft": //left
                    e.preventDefault();
                    if (this.drawing.allowMove) {
                        this.moveRoomsOnAxis("x", true, this.mapper.getOptions().useGrid);
                    } else
                        self.drawing.scrollBy(-1, 0);
                    break;
                case "ArrowRight": //right
                    e.preventDefault();
                    if (this.drawing.allowMove) {
                        this.moveRoomsOnAxis("x", false, this.mapper.getOptions().useGrid);
                    } else
                        self.drawing.scrollBy(1, 0);
                    break;
                case "Delete":
                case "Backspace": //delete
                    e.preventDefault();
                    if (this.drawing.allowMove) this.deleteSelection();
                    break;
                case "Numpad1": //num1
                    e.preventDefault();
                    self.drawing.scrollBy(-1, 1);
                    break;
                case "Numpad2": //num2
                    e.preventDefault();
                    self.drawing.scrollBy(0, 1);
                    break;
                case "Numpad3": //num3
                    e.preventDefault();
                    self.drawing.scrollBy(1, 1);
                    break;
                case "Numpad4": //num4
                    e.preventDefault();
                    self.drawing.scrollBy(-1, 0);
                    break;
                case "Numpad5": //num5
                    e.preventDefault();
                    self.drawing.focusCurrentRoom();
                    break;
                case "Numpad6": //num6
                    e.preventDefault();
                    self.drawing.scrollBy(1, 0);
                    break;
                case "Numpad7": //num7
                    e.preventDefault();
                    self.drawing.scrollBy(-1, -1);
                    break;
                case "Numpad8": //num8
                    e.preventDefault();
                    self.drawing.scrollBy(0, -1);
                    break;
                case "Numpad9": //num9
                    e.preventDefault();
                    self.drawing.scrollBy(1, -1);
                    break;
                case "+": //+
                case "PageUp": //-
                    e.preventDefault();
                    if (this.drawing.allowMove) {
                        this.moveRoomsOnAxis("z", true, this.mapper.getOptions().useGrid);
                    } else
                        self.drawing.setLevel((self.drawing.level||0) + 1);
                    break;
                case "-": //-
                case "PageDown": //-
                    e.preventDefault();
                    if (this.drawing.allowMove) {
                        this.moveRoomsOnAxis("z", false, this.mapper.getOptions().useGrid);
                    } else
                        self.drawing.setLevel((self.drawing.level||0) - 1);
                    break;
                case "Slash": // /
                    e.preventDefault();
                    //this.setZone(this.active.zone - 1);
                    break;
                case "Multiply": // *
                    e.preventDefault();
                    //this.setZone(this.active.zone + 1);
                    break;
            }
        });

        w.on('close', function (evt:any) {
            self.detachHandlers(self.mapper, self.windowManager)
            self.detachMenu()
            if (self.drawing) {
                self.drawing.zoomChanged.release(self.onZoomChange)
                self.drawing.showContext.release(self.showContextMenu)
                self.drawing.levelChanged.release(self.onLevelChange)
                self.drawing.destroy()
                delete self.drawing;  
                self.drawing = null;
            }
        });

        w.on('docked', (evt:boolean) => {
            if (this.mapper.mapmode)
                this.showMapToolbar()
            else
                this.hideMapToolbar()
            if(evt) this.handleDraggingToolbox(w)
        });

        var setSize = function () {
            if (self.drawing) self.drawing.setSize()
        }

        this.resizeSensor = new ResizeObserver(function(){ 
            setSize()
        });
        this.resizeSensor.observe(jQuery('.mapperworkarea .midrow', w)[0]);

        (<any>this.$win).jqxWindow("close");
        (<any>$(w))[0].sizeChanged = setSize;
        
        this.attachMenu();
        this.setMapFont()
    }
    private moveRoomsOnAxis(axis:string, positive:boolean, useGrid: boolean) {
        let offs:Point = {
            x: 0,
            y: 0,
            z: 0
        };
        let delta = useGrid ? Math.floor(this.drawing.gridSize / 7.5) : 1
        if (axis == "z") delta = 1

        if (!positive)
            delta *= -1

        offs[axis as keyof(Point)] = delta;
        this.drawing.moveRooms([...this.drawing.selectedRooms.values()], offs);
    }

    write(text: string, buffer: string): void {
        this.$bottomMessage.text(text);
    }
    writeLine(text: string, buffer: string): void {
        this.$bottomMessage.text(text);
    }
    getLines(): string[] {
        return [this.$bottomMessage.text()];
    }
    cls() {
        this.$bottomMessage.text("")
    }
    private handleDraggingToolbox(w:JQuery) {
        this.detachToolbox();
        var $dragging:JQuery = null;
        let self = this;
        var mouseData = {
            offsetTop: 0,
            offsetLeft: 0,
            moved: false
        };

        $(w).on("mousemove", function(e) {
            if ($dragging) {
                mouseData.moved = true;
                $dragging.offset({
                    top: e.pageY -  mouseData.offsetTop,
                    left: e.pageX - mouseData.offsetLeft
                });
            }
        });

        $(w).on("mousedown", function (e) {
            if (e.button != 0) return;
            if ($(e.target).is(".draghandle") && $(e.target).parents(".draggable").length) {
                $dragging = $(e.target).parents(".draggable").first();

                mouseData.offsetLeft = e.offsetX + $(e.target).offset().left - $dragging.offset().left;
                mouseData.offsetTop =  e.offsetY + $(e.target).offset().top - $dragging.offset().top;
                
            } else if ($(e.target).is(".draggable")) {
                $dragging = $(e.target);
                mouseData.offsetLeft = e.offsetX;
                mouseData.offsetTop =  e.offsetY;
            }
        });

        $(w).on("mouseup", function (e) {
            if ($dragging && !mouseData.moved && $(".draggable-content", $dragging).length) {
                if ($(".draggable-content", $dragging).is(":visible")) {
                    $(".draggable-content", $dragging).hide()
                    $(".draggable-expand", $dragging).css('display', 'inline-block')
                    $(".draggable-collapse", $dragging).hide()
                } else {
                    $(".draggable-content", $dragging).show()
                    $(".draggable-expand", $dragging).hide()
                    $(".draggable-collapse", $dragging).css('display', 'inline-block')
                }
            }
            if (mouseData.moved) {
                const left = parseInt($(".mappertoolbox", self.$win).css("left")||"0");
                const top = parseInt($(".mappertoolbox", self.$win).css("top")||"0")
                self.mapper.getOptions().toolboxX = left
                self.mapper.getOptions().toolboxY = top
                self.mapper.saveOptions()
            }
            mouseData.moved = false;
            $dragging = null;
            mouseData.offsetLeft = 0
            mouseData.offsetTop = 0
        });
    }
    private destroyMenu(mnu:any) {
        try {
            mnu.jqxMenu('destroy')
        } catch {
            console.log("Cannto destroy mapper menu")
        }
        try {
            (<any>$("#mapperContextMenu")).jqxMenu('destroy')
        } catch {
            console.log("Cannto destroy mapper context menu")
        }
        $("[data-option-type=mapper]").parents(".jqx-menu-popup").remove()
        if ($("#favorites").length > 0) {
            console.log("jqxMenu.destroy() failed")
        }
    }

    private closeMenues(mnu: any) {
        mnu.jqxMenu('closeItem', "dati");
        mnu.jqxMenu('closeItem', "azioni");
        mnu.jqxMenu('closeItem', "mapperaltro");
    }

    getFontSize():number {
        const w = this.windowManager.windows.get("Mapper")
        if (!w) return NaN;
        return w.data.fontSize
    }

    onLevelChange = (lv: number) => {
        this.$level.text("Lv. "+lv)
    }


    private attachHandlers(mapper: Mapper, windowManager:WindowManager) {
        mapper.emitMessage.handle(this.onEmitMapperMessage);
        mapper.emitSearch.handle(this.onEmitMapperSearch);
        mapper.zoneChanged.handle(this.onEmitMapperZoneChanged);
        mapper.roomChanged.handle(this.onEmitMapperRoomChanged);
        mapper.favoritesChanged.handle(this.favoritesChanged);
        windowManager.EvtEmitWindowsChanged.handle(this.onEmitWindowsChanged);
        this.handleDraggingToolbox(this.$win)
    }
    private favoritesChanged = (favoritesChanged: any) => {
        this.refreshFavorites();
    }

    private detachHandlers(mapper: Mapper, windowManager:WindowManager) {
        mapper.emitMessage.release(this.onEmitMapperMessage);
        mapper.emitSearch.release(this.onEmitMapperSearch);
        mapper.zoneChanged.release(this.onEmitMapperZoneChanged);
        mapper.roomChanged.release(this.onEmitMapperRoomChanged);
        mapper.favoritesChanged.release(this.favoritesChanged);
        
        windowManager.EvtEmitWindowsChanged.release(this.onEmitWindowsChanged);
        this.detachToolbox();
    }

    onEmitWindowsChanged = (windows: string[]) => {
        if (this.drawing && windows.indexOf("Mapper")>-1) {
            this.setMapFont()
        }
    }

    private detachToolbox() {
        $(this.$win).off("mousemove");
        $(this.$win).off("mousedown");
        $(this.$win).off("mouseup");
    }

    private detachMenuOption(name:string, element:Element, checkbox:Element) {
        if (element) $(element).off("click");
        if (checkbox) $(checkbox).off("change");
    }

    private detachMenu() {
        $("[data-option-type=mapper]").filter("[data-option-name]").each((i, e) => {
            const name = $(e)[0].getAttribute("data-option-name");
            const chk = $(e).find("input[type='checkbox']")[0];
            this.detachMenuOption(name, e, chk);
        });
    }

    private attachMenu() {
        $("[data-option-type=mapper]").filter("[data-option-name]").each((i, e) => {
            const name = $(e)[0].getAttribute("data-option-name");
            const chk = $(e).find("input[type='checkbox']")[0];
            this.attachMenuOption(name, e, chk);
        });
    }

    private attachMenuOption(name:string, element:Element, checkbox:Element) {
        $(element).click((event: JQueryEventObject) => {
            if (!event.target || (event.target.tagName != "LI" && event.target.tagName != "BUTTON")) return false;
            if ($((<any>event).target).closest(".jqx-menu-popup").length!=0) this.closeMenues($("#mapperMenubar",this.$win));
            (this.$contextMenu as any).jqxMenu('close')
            switch (name) {
                case "mapmode":
                    this.toggleMapMode();
                    break;
                case "mapversion":
                    this.showMapVersions();
                    break;
                case "reload":
                    this.load(false);
                    break;
                case "info":
                    this.showInfo();
                    break;
                case "reloadweb":
                    this.loadSite(true);
                    break;
                case "reloadLocal":
                    this.load(true);
                    break;
                case "pathfind":
                    this.findpath();
                    break;
                case "exportzone":
                    this.exportZone();
                    break;
                case "importzone":
                    this.importZone();
                    break;
                case "exportall":
                    this.exportAll();
                    break;
                case "search":
                    this.search();
                    break;
                case "zoomout":
                    this.drawing.setScale(this.drawing.scale - this.drawing.scale/10);
                    break;
                case "zoomin":
                    this.drawing.setScale(this.drawing.scale + this.drawing.scale/10);
                    break;
                case "leveldown":
                    this.drawing.setLevel(this.drawing.level-1)
                    break;
                case "levelup":
                    this.drawing.setLevel(this.drawing.level+1)
                    break;
                case "export":
                    this.exportImage()
                    break;
                case "sync":
                    const r = this.mapper.syncToRoom();
                    if (r) this.mapper.setRoomById(r.id)
                    break;
                case "vai":
                    if (this.drawing.contextRoom) this.mapper.walkToId(this.drawing.contextRoom.id)
                    break;
                case "set":
                    if (this.drawing.contextRoom) {
                        this.mapper.setRoomById(this.drawing.contextRoom.id)
                        this.mapper.previous = null;
                    }
                    break;
                case "mapperroom":
                case "edit":
                    {
                        if (this.mapper.mapmode) {
                            if (this.drawing.selectedRooms.size > 1)
                                this.editRoom([...this.drawing.selectedRooms.values()])
                            else if (this.drawing.contextRoom)
                                this.editRoom([this.drawing.contextRoom]);
                            else if (this.drawing.selected)
                                this.editRoom([this.drawing.selected])
                        }
                    }
                    break;
                case "addfavorite":
                    if (this.drawing.contextRoom && !$(element).hasClass("disabled")) this.addFavorite((this.drawing.contextRoom))
                    break;
                case "removefavorite":
                    if (this.drawing.contextRoom && !$(element).hasClass("disabled")) this.removeFavorite((this.drawing.contextRoom))
                    break;
                case "legend":
                    this.drawing.showLegend=!!!this.drawing.showLegend;
                    break;
                case "impostazioni":
                    this.optionsWindow.show()
                    break;
                case "toolbox-pan":
                case "toolbox-select":
                case "toolbox-move":
                case "toolbox-createlink":
                case "toolbox-add":
                case "toolbox-delete":
                case "toolbox-movewindow":
                case "toolbox-movetozone":
                case "toolbox-editrooms":
                case "toolbox-newzone":
                case "toolbox-deletezone":
                case "toolbox-editzone":
                    event.preventDefault();
                    this.handleToolboxItem(name);
                    return false;
                default:
                    break;
            }
            return true;
        });
    }
    async showMapVersions() {
        const lv = await this.mapper.getLocalDbVersion()
        const ov = await this.mapper.getOnlineVersion()
        const r = Messagebox.Question(`Il Database Mappe online:\n\r
\n\r
Versione: ${ov.version||0}\n\r
Messaggio: ${ov.message||"??"}\n\r
Data: ${ov.date||"??"}\n\r
\n\r
Vuoi vedere o modificare il DB locale?`)
        if ((await r).button == Button.Ok) {
            let r2 = await Messagebox.ShowMultiInput(
                "Versione DB Mappe locali",
                ["Versione", "Messaggio", "Data"],
                [lv.version, lv.message, lv.date]
            )
            if (r2.button == Button.Ok) {
                let vr = r2.results[0]
                let vmes = r2.results[1]
                let vdt = r2.results[2]
                if (!(parseInt(vr)>=0 && parseInt(vr)<Infinity)) {
                    Notification.Show("Numero versione errato (non numero positivo)")
                    return
                }
                if (!vmes) {
                    Notification.Show("Il messaggio vuoto non e' supportato")
                    return
                }
                if (!vdt) {
                    Notification.Show("La data vuota non e' supportata")
                    return
                }
                lv.version = parseInt(vr)
                lv.message = vmes
                lv.date = vdt
                this.mapper.saveLocalDbVersion(lv) 
                Notification.Show("Versione Db mappe locale aggiornata")
            }
        }
    }
    private showInfo() {
        Messagebox.Show("Informazioni",
            `L'Autore delle mappe "Traxter" ed i suoi contributori, cedono in esclusiva ed in
via definitiva a TemporaSanguinis.it, che accetta, tutti i diritti (inclusivi ed
esclusivi) di pubblicazione e utilizzazione economica, a mezzo stampa o con ogni
altro tipo di supporto e comunque in ogni forma e modo, originale e/o derivato,
vantati dallo stesso sull' Opera. In particolare, la cessione comprende in via
esemplificativa e non esclusiva:

  a) il diritto del Cessionario di pubblicare l'Opera in qualsiasi forma e modo,
     compreso Internet;
  b) il diritto di tradurre l'Opera in qualsiasi lingua diversa dall'Italiano;
  c) il diritto di adattare ed elaborare l'Opera, o parte della stessa, per la
     pubblicazione a titolo esemplificativo e non esclusivo a mezzo, stampa, via
     filo e/o satellite, per l'utilizzazione su supporti sonori e/o strumenti
     audiovisivi di ogni tipo, su supporti elettronici, magnetici, o su strumenti
     analoghi o similari a quelli sopra indicati, nonché all'interno di banche dati,
     o per mezzo di Internet, ed ancora per finalità meramente pubblicitarie o di
     promozione sia dell'Opera che di sue singole parti;
 d) diritti di diffondere l'Opera, distribuirla e commercializzarla con i mezzi di
    cui alle lettere precedenti, o con ogni altro mezzo disponibile;
 e) la facoltà di trasferire a terzi i diritti di cui alle lettere precedenti.

Nota: Per eventuali errori o richieste rivolgetevi
nel canale #mappe del Discord di Tempora Sanguinis.`, "display: block;unicode-bidi: embed;");
    }

    private handleToolboxItem(name: string) {
        
        if (name == "toolbox-editrooms") {
            if (this.drawing.selectedRooms.size > 1)
                this.editRoom([...this.drawing.selectedRooms.values()])
            else if (this.drawing.selected)
                this.editRoom([this.drawing.selected])
            else
            this.message("Nessuna stanza selezionata")
        } else if (name == "toolbox-move") {
            this.allowMove = !this.allowMove
            this.drawing.allowMove = this.allowMove
            if (this.editMode != EditMode.Drag) {
                this.editMode = EditMode.Drag
            }
            this.drawing.editMode = this.editMode
            this.message("Spostamento stanze " + (this.drawing.allowMove ? "PERMESSO" : "BLOCCATO"))
        } else if (name == "toolbox-pan") {
            this.drawing.editMode = this.editMode = EditMode.Drag
            this.message("Trascinare con il mouse ora spostera' l'origine per la visuale della mappa")
        } else if (name == "toolbox-select") {
            this.drawing.editMode = this.editMode = EditMode.Select
            this.drawing.allowMove = this.allowMove = false
            this.message("Trascinare con il mouse ora selezionera' le stanze (shortcut Shift)")
        } else if (name == "toolbox-createlink") {
            this.drawing.editMode = this.editMode = EditMode.CreateLink
            this.drawing.allowMove = this.allowMove = false 
            this.message("Crea l'uscita trascinando con il mouse da stanza a stanza")
        } else if (name == "toolbox-add") {
            this.drawing.editMode = this.editMode = EditMode.CreateRoom
            this.drawing.allowMove = this.allowMove = false 
            this.message("Seleziona la posizione per creare la stanza")
        } else if (name == "toolbox-delete") {
            this.deleteSelection();
        } else if (name == "toolbox-movewindow") {
            this.showMoveRoomsWindow();
        } else if (name == "toolbox-movetozone") {
            this.showMoveToZoneWindow()
        } else if (name == "toolbox-newzone") {
            this.showZoneWindow()
        } else if (name == "toolbox-deletezone") {
            this.deleteZone()
        } else if (name == "toolbox-editzone") {
            this.showZoneWindow()
        }


        this.setToolboxButtonStates();
    }
    deleteZone() {
        Notification.Show("Todo")
    }
    showZoneWindow() {
        Notification.Show("Todo")
    }
    showMoveToZoneWindow() {
        let mzw = new MapperMoveToZoneWin(this.mapper, (z) => {

        });
        mzw.show()
    }
    showMoveRoomsWindow() {
        Notification.Show("Todo")
    }
    private async deleteSelection() {
        if (this.drawing.selectedRooms.size > 1 || this.drawing.selected || this.drawing.selectedExit) {
            let r = await Messagebox.Question("Sicuro di voler cancellare?")
            if (r.button != Button.Ok) return;
            if (this.drawing.selectedExit) {
                let exits: RoomExit[] = [];
                exits.push(this.drawing.selectedExit);
                if (this.drawing.selectedReverseExit) {
                    exits.push(this.drawing.selectedReverseExit);
                }
                this.deleteExits(exits);
            } else if (this.drawing.selectedRooms.size) {
                this.deleteRooms([...this.drawing.selectedRooms.values()]);
            }
        } else {
            Messagebox.Show("Attenzione", "Nessuna stanza o uscita selezionata");
        }
    }

    deleteRooms(rooms: Room[]) {
        this.mapper.deleteRooms(rooms)
    }
    deleteExits(exits: RoomExit[]) {
        function hasExit(r: Room, ex: RoomExit): ExitDir {
            for (const key in r.exits) {
                if (r.exits[key as ExitDir] == ex) {
                    return key as ExitDir
                }
            }
            return null
        }
        this.drawing.selectedExit
        for (const ex of exits) {
            let room = this.drawing.rooms.find(r => hasExit(r, ex))
            if (!room) continue
            let dir = hasExit(room, ex)
            if (!dir) continue
            this.mapper.deleteRoomExit(room, dir)
        }
    }

    private setToolboxButtonStates() {
        $(".mapperworkarea-toolboxbuttons button", this.$win).removeClass("selected");
        $(".mapperworkarea-toolboxbuttons button", this.$win).removeClass("enabled");
        
        if (this.allowMove) {
            $(".mapperworkarea-toolboxbuttons button[data-option-name='toolbox-move']", this.$win).addClass("enabled");
        } else if (this.editMode == EditMode.CreateLink) {
            $(".mapperworkarea-toolboxbuttons button[data-option-name='toolbox-createlink']", this.$win).addClass("enabled");
        }
        if (this.editMode == EditMode.Drag) {
            $(".mapperworkarea-toolboxbuttons button[data-option-name='toolbox-pan']", this.$win).addClass("selected");
        } else if (this.editMode == EditMode.Select) {
            $(".mapperworkarea-toolboxbuttons button[data-option-name='toolbox-select']", this.$win).addClass("selected");
        }
        this.drawing.setFocus(true);
    }

    refreshFavorites() {
        const fv = this.mapper.getFavorites()
        console.log("refresh favorites " + (fv||[]).length)
        this.addFavoritesToMenu(fv)
    }
    async toggleMapMode() {
        // todo avvertimenti
        if (!this.mapper.mapmode && !this.mapper.useLocal) {
            const lv = await this.mapper.getLocalDbVersion()
            const ov = await this.mapper.getOnlineVersion()
            if (ov && lv && lv.version > ov.version) {
                const r = await Messagebox.Question(
`ATTENZIONE!!!\n\r
Stai tentando di modificare il DB mappe pubblico.\n\r
Il tuo DB locale ha versione piu' alta di quello pubblico\n\r
Uscendo dalla modalita' mapping potresti sovrascrivere le tue modifiche locali!\n\r
\n\r
Versione pubblica: ${ov.version}\n\r
Versione locale: ${lv.version}\n\r
\n\r
Sei SICURO di voler continuare?`
                )
                if (r.button != Button.Ok) {
                    return
                }
            }
        }
        if (this.mapper.mapmode && !this.mapper.useLocal) {
            const lv = await this.mapper.getLocalDbVersion()
            const ov = await this.mapper.getOnlineVersion()
            if (ov && lv && lv.version > ov.version) {
                const r = await Messagebox.Question(
`ATTENZIONE!!!\n\r
Stai chiudendo modifiche del DB pubblico.\n\r
Il tuo DB locale ha versione piu' alta di quello pubblico\n\r
Continuando sovrascriverai le tue modifiche locali!\n\r
\n\r
Versione pubblica: ${ov.version}\n\r
Versione locale: ${lv.version}\n\r
\n\r
Sei SICURO di voler salvare?\n\r
Rispondendo negativamente uscirai dalla modalita' mapping senza salvare.`
                )
                if (r.button != Button.Ok) {
                    this.mapper.mapmode = false
                    this.message("Modalita Mapping DISABILITATA")
                    this.hideMapToolbar();
                    (<any>this.$win).jqxWindow("setTitle", this.windowTitle + (this.mapper.useLocal ? " (da locale v." + (this.mapper.getDB()?.version?.version||0) + ")" : " (pubblico v." + (this.mapper.getDB()?.version?.version||0) + ")"));        
                    return
                }
            }
        }
        this.mapper.mapmode = !this.mapper.mapmode;
        this.drawing.mapmode = this.mapper.mapmode
        if (this.mapper.mapmode) {
            this.message("Modalita Mapping ABILITATA");
            (<any>$(this.$win)).jqxWindow('setTitle', 'Mapper (modalita\' mapping)');
            this.handleDraggingToolbox(this.$win);
            this.showMapToolbar();

        }
        else {
            this.message("Modalita Mapping DISABILITATA")
            this.hideMapToolbar();
            (<any>this.$win).jqxWindow("setTitle", this.windowTitle + (this.mapper.useLocal ? " (da locale v." + (this.mapper.getDB()?.version?.version||0) + ")" : " (pubblico v." + (this.mapper.getDB()?.version?.version||0) + ")"));
        }
    }
    private hideMapToolbar() {
        $(".mappertoolbox", this.$win).hide();
    }

    private showMapToolbar() {
        $(".mappertoolbox", this.$win).css("left", this.mapper.getOptions().toolboxX || 0);
        $(".mappertoolbox", this.$win).css("top", this.mapper.getOptions().toolboxY || 0);
        $(".mappertoolbox", this.$win).show();
    }

    addFavoritesToMenu(favs: Favorite[]) {
        const favUl = $("#mapFavorites");
        favUl.empty();
        if (favs.length == 0) {
            favUl.append("<li class='custom jqx-item jqx-menu-item jqx-rc-all' role='menuitem'>&lt;nessuno&gt;</li>");
            return;
        }
        for (const fv of favs) {
            let li = $("<li class='custom jqx-item jqx-menu-item jqx-rc-all' role='menuitem'>" + fv.key + "</li>");
            li.on("click", () => {
                this.closeMenues($("#mapperMenubar",this.$win))
                this.mapper.walkToId(fv.roomId)
            });
            favUl.append(li);
        }
    }

    removeFavorite(r: Room) {
        this.mapper.removeFavorite(r.id);
        this.refreshFavorites()
    }
    async addFavorite(r: Room) {
        if (!r) return;
        if (r.shortName && r.shortName.startsWith("[") && r.shortName.endsWith("]")) {
            r.shortName = r.shortName.slice(1, r.shortName.length -1);
        }
        const fvi = await Messagebox.ShowMultiInput("Crea favorito", ["Nome (per vai, opzionale)", "Colore (opzionale)"], [r.shortName, r.color])
        if (fvi.button != Button.Ok) return;

        this.mapper.addFavorite({
            roomId: r.id,
            key: fvi.results[0]||r.name,
            color: fvi.results[1]
        });
        this.refreshFavorites()
    }
    exportImage() {
        const zone = this.mapper.getRoomZone(this.mapper.roomId)
        let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
        if (!this.drawing.rooms || !this.drawing.rooms.length) {
            Messagebox.Show("Errore","Non ci sono room nel mapper.")
            return
        }
        for (let i = 0; i < this.drawing.rooms.length; i++) {
            let room = this.drawing.rooms[i]
            if (room.z == this.drawing.level-1) {
                if (room.x > maxX) maxX = room.x;
                if (room.x < minX) minX = room.x;
                if (room.y > maxY) maxY = room.y;
                if (room.y < minY) minY = room.y;
            }
            else if (room.z == this.drawing.level+1) {
                if (room.x > maxX) maxX = room.x;
                if (room.x < minX) minX = room.x;
                if (room.y > maxY) maxY = room.y;
                if (room.y < minY) minY = room.y;                
            }
            else if (room.z == this.drawing.level) {
                if (room.x > maxX) maxX = room.x;
                if (room.x < minX) minX = room.x;
                if (room.y > maxY) maxY = room.y;
                if (room.y < minY) minY = room.y;
            }
        }
        var c = document.createElement("canvas")
        const roomSize = 32*this.drawing.scale

        const borderRooms = 2;
        const w = (1+2*borderRooms)*roomSize+(((maxX-minX)/7.5)*this.drawing.scale)|0
        const h = (1+2*borderRooms)*roomSize+(((maxY-minY)/7.5)*this.drawing.scale)|0
        

        const roomsWide = w / roomSize
        const roomsTall = h / roomSize
        

        const mx = (minX/7.5) - borderRooms*32 + w/2/this.drawing.scale
        const my = (minY/7.5) - borderRooms*32 + h/2/this.drawing.scale

        if (h < 10 || h > 10000 || w < 10 || h > 10000) {
            Messagebox.Show("Errore", "Grandezza immagine non valida per export")
            return;
        }

        const vscroll = mx //(mx/16*this.drawing.scale)|0
        const hscroll = my //(my/16*this.drawing.scale)|0

        c.width = w
        c.height = h
        this.drawing.y_scroll = hscroll
        this.drawing.x_scroll = vscroll

        const ctx = c.getContext("2d")
        this.drawing.draw(c, ctx, true, () => {
            var imageURI = c.toDataURL("image/png");
            let link = document.createElement("a");
            link.setAttribute("href", imageURI);

            link.setAttribute("download", `${zone?zone.name:"[Zona sconosciuta]"}_Mappa_liv${this.drawing.level}.png`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(imageURI);
            c.toBlob((blob) => {
                if ((<any>navigator.clipboard).write) (<any>navigator.clipboard).write([
                    new ClipboardItem({ "image/png": blob })
                ]);
              }, "image/png");
        })
    }
    editRoom(rooms: Room[]) {
        const w = new EditRoomWin()
        w.editRooms(rooms)
        return
        /*Messagebox.ShowInput("Edit Room",
                   "Modifica la room",
                   JSON.stringify(room, null, 2), true).then(r=>{
            if (r.button == 1 && r.result) {
            const newRoom = JSON.parse(r.result)
            this.mapper.setRoomData(room.id, newRoom)
            }
        })*/
    }

    search() {
        Messagebox.ShowMultiInput("Campi di ricerca locazione", ["Nome", "Descrizione"], ["",""]).then(r => {
            if (r.button == Button.Ok) this.mapper.search(r.results[0], r.results[1])
        })
    }

    findpath() {
        if (!this.drawing.selected) {
            Messagebox.Show("Errore", "Non c'e' locazione iniziale per iniziare il percorso")
            return;
        }
        Messagebox.ShowInput("Vai a #num", "Inserisci il numero della locazione", this.drawing.selected ? this.drawing.selected.id.toString() : "?").then(r => {
            if (r.button == 1) {
                const id1 = this.drawing.selected.id;
                const id2 = parseInt(r.result);
                
                const walk = this.mapper.calculateWalk(id1, id2, -1);
                if (!walk.end) {
                    Messagebox.Show("Ouch", "Non trovo il percorso")
                } else if (!walk.steps || walk.steps.length < 1) {
                    Messagebox.Show("Uhm", "Sembra che non c'e' ragione di muoversi...")
                } else {
                    this.mapper.safeWalk(walk);
                }
            }
        })
    }

    setWindowManager(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }

    public Instance() : any {
        return this.$win;
    }

    private exportZone() {
        if (!this.mapper || !this.mapper.current) {
            Messagebox.Show("Errore", "Mapper non inizializzato o non si trova in nessuna zona")
            return;
        }
        const data = this.mapper.exportZone(this.mapper.current.zone_id)
        downloadJsonToFile(data, "mapperZoneExport.json")
    }

    private exportAll() {
        if (!this.mapper || !this.mapper.current) {
            Messagebox.Show("Errore", "Mapper non inizializzato o non si trova in nessuna zona")
            return;
        }
        const data = this.mapper.exportAll()
        downloadJsonToFile(data, "mapperExport.json")
    }

    private importZone() {
        if (!this.mapper) {
            Messagebox.Show("Errore", "Mapper non inizializzato")
            return;
        }
        importFromFile(d => {
            if (d) {
                var db = JSON.parse(d) as MapDatabase
                this.mapper.importMapDb(db)
            }
        })
    }

    public load(useLocal:boolean) {
        let version: MapVersion = null;
        (<any>this.$win).jqxWindow("setTitle", this.windowTitle + (useLocal ? " (da locale)" : " (pubblico)"));

        this.mapper.useLocal = useLocal
                    
        this.mapper.loadVersion(false).then(v => {
            version = v;
            let vn = Math.random()
            if (v.version != 0) {
                vn = v.version
            }
            if (this.mapper.useLocal)
                return this.mapper.loadLocalDb()
            else
                return this.mapper.load('mapperData.json?v='+vn, v)
        }).then(mDb => {
            if (!version) {
                version = mDb.version;
            }
            if (!version) {
                this.message(`Caricato mappe - versione sconosciuta`)
            } else 
                this.message(`Caricato mappe v${version.version} ${version.date?"("+version.date+")":''} ${version.message?"["+version.message+"]":''}`)
            
            if (!this.mapper.current) this.onEmitMapperZoneChanged(this.mapper.idToZone.get(0));
            this.refreshFavorites();
            (<any>this.$win).jqxWindow("setTitle", this.windowTitle + (useLocal ? " (da locale v." + (version?.version||0) + ")" : " (pubblico v." + (version?.version||0) + ")"));
        
        });

    }

    public loadSite(force:boolean) {
        (<any>this.$win).jqxWindow("setTitle", this.windowTitle + " (pubblico)");
        
        let version: MapVersion = null;
        this.mapper.useLocal = false
        this.mapper.loadVersion(true).then(v => {
            version = v;
            let vn = Math.random()
            if (v.version != 0) {
                vn = v.version
            }
            const localVer = this.mapper.getVersion()
            const remoteVer = v.version
            console.log(`mapperWindow loadSite remote ${remoteVer} local ${localVer}`)
            if (!force && remoteVer <= localVer) {
                version = null;
                console.log("Keep using builtin map since newer")
                return this.mapper.getDB()
            }
            console.log("Load map from site")
            return this.mapper.load('https://temporasanguinis.it/client/mapperData.json?v='+vn, v)
        }).then(mDb => {
            if (!version) {
                version = mDb.version;
            }
            if (!version) {
                this.message(`Caricato mappe - versione sconosciuta`)
            } else 
                this.message(`Caricato mappe v${version.version} ${version.date?"("+version.date+")":''} ${version.message?"["+version.message+"]":''}`)
            
            if (!this.mapper.current) this.onEmitMapperZoneChanged(this.mapper.idToZone.get(0));
            this.refreshFavorites();
            (<any>this.$win).jqxWindow("setTitle", this.windowTitle + (" (pubblico v." + (version?.version||0) + ")"));
        
        });
    }

    public message(mess:string) {
        this.$bottomMessage.text(mess);
    }
    public zoneMessage(mess:string) {
        let items = (<any>this.$zoneList).jqxDropDownList('getItems');
        let newIndex:number;
        if (mess == null || !items || !items.length) {
            (<any>this.$zoneList).jqxDropDownList('clear');

            const zones = this.zones && this.zones.length ? [...this.zones].sort(this.zoneSort) : null
            if (zones && mess) {
                newIndex = zones.findIndex((z) => z.name == mess)
            }
            if (zones && zones.length) $.each(zones, (i, item) => {
                (<any>this.$zoneList).jqxDropDownList("addItem", { 
                    value: item.id.toString(),
                    label : item.name + " (#" + item.id.toString() + ")"
                });
            });

           if (mess && newIndex>-1) (<any>this.$zoneList).jqxDropDownList('selectIndex', newIndex > -1 ? newIndex : 0 ); 
        }
    }

    zoneSort(z1:Zone, z2:Zone):number {
        let a = z1.name
        let b = z2.name
        a = a.replace(/^il |lo |la |le |l\' |i /i, "").trim()
        b = b.replace(/^il |lo |la |le |l\' |i /i, "").trim()
        return a.localeCompare(b);
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow('bringToFront');
    }

    public destroy() {
        this.detachHandlers(this.mapper, this.windowManager)
        this.detachMenu();
        this.destroyMenu(this.$menu);
        if (this.drawing) {
            this.drawing.destroy()
            delete this.drawing;  
            this.drawing = null;
        }
        delete this.ctx;
        delete this.canvas;
        this.resizeSensor.disconnect();
        (<any>this.$win).jqxWindow("destroy");
    }

    public hide() {
        (<any>this.$win).jqxWindow("close");
    }
}


