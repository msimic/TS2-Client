import { Favorite, MapDatabase, Mapper, MapVersion, Room, Zone } from "./mapper";
import { Messagebox, MessageboxResult, messagebox, Button } from "./messagebox";
import { isNumeric } from "jquery";
import { WindowManager } from "./windowManager";
import { EvtScriptEmitPrint } from "./jsScript";
import { MapperDrawing } from "./mapperDrawing";
import { ResizeSensor } from 'css-element-queries'
import { downloadJsonToFile, importFromFile, padStart } from './util'
import { NewLineKind } from "typescript";

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

export class MapperWindow {
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
        this.zoneId = d.id
        this.zones = [...this.mapper.idToZone.values()]
        this.zoneMessage(d.zone ? d.zone.name : "Zona sconosciuta")
    }

    onEmitMapperRoomChanged = (d:any) => {
        this.zoneId = d.room ? d.room.zone_id : -1
        this.message(this.mapper.getRoomName(d.room))
        if (!d.room) {
            this.zoneMessage("Zona sconosciuta")
        } else {
            this.zoneMessage(this.mapper.getRoomZone(d.room.id).name)
        }
        if (this.drawing) this.drawing.setActiveRoom(d.room);
    }

    onZoomChange = (zoom: number) => {
        const zmp = ((100 - 0) * (zoom - 0.5) / (4 - 0.5)) + 0;
        this.$zoom.text("Zoom " + zmp.toFixed(0) + "%")
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
        (this.$contextMenu as any).jqxMenu('open', (data.x) + 5 + scrollLeft, (data.y) + 5 + scrollTop);
        return false;
    }
    resizeSensor: ResizeSensor;

    constructor(private mapper:Mapper,private windowManager: WindowManager) {

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "win-Mapper";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Mapper</div>
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
                            <li  class='custom' data-option-type="mapper" data-option-name="exportzone">Scarica zona corrente</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="importzone">Carica zona o zone</li>
                            </ul>
                        </li>
                        <li id="azioni" class='custom'>Azioni
                            <ul  class='custom'>
                            <li  class='custom' data-option-type="mapper" data-option-name="pathfind">Vai a num. locazione</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="search">Cerca locazione</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="sync">Sincronizza mappa</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="export">Esporta immagine</li>
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
            <div class="midrow"><canvas tabindex="999" id="mapcanvas"></canvas></div>
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

        const mnu:any = <JQuery>(<any>$("#mapperMenubar",this.$win)).jqxMenu({autoOpen: false, clickToOpen: true, theme:"mapper"});

        $("#mapperMenubar").on('itemclick', (event: any) => {
            document.getSelection().removeAllRanges();
            if ($((<any>event).args).find(".jqx-icon-arrow-left").length || $((<any>event).args).find(".jqx-icon-arrow-right").length || $((<any>event).target).closest(".jqx-menu-popup").length==0)
                return;
            this.closeMenues(mnu);
        });
        
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
        
        var w = (<any>this.$win).jqxWindow({width: 450, height: 290, showCollapseButton: true, isModal: false});
        this.$contextMenu = <JQuery>((<any>$("#mapperContextMenu"))).jqxMenu({ animationShowDelay: 0, animationShowDuration : 0, width: '100px', height: null, autoOpenPopup: false, mode: 'popup'});
        
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
            self.drawing = new MapperDrawing(self.mapper, <HTMLCanvasElement>self.canvas[0], self.ctx);
            self.drawing.zoomChanged.handle(self.onZoomChange)
            self.drawing.levelChanged.handle(self.onLevelChange)
            self.drawing.showContext.handle(self.showContextMenu)
            self.setMapFont()
            self.onZoomChange(self.drawing.scale)
            if ((<any>window).ipcRenderer) {
                self.loadSite.bind(self)();
            } else {
                self.load.bind(self)();
            }
            self.refreshFavorites();
        });

        w.on('close', function (evt:any) {
            self.detachHandlers(self.mapper, self.windowManager)
            self.detachMenu()
            if (self.drawing) {
                self.drawing.destroy()
                delete self.drawing;  
                self.drawing = null;
            }
        });
        w.on('destroy', function() {
            self.detachHandlers(self.mapper, self.windowManager)
            self.detachMenu()
            if (self.drawing) {
                self.drawing.destroy()
                delete self.drawing;  
                self.drawing = null;
            }
            delete self.ctx;
            delete self.canvas;
        });
/*
        var ce = (self.canvas[0] as HTMLCanvasElement);
        w.on('resized', function (evt:any) {
            ce.height = self.canvas.height();
            ce.width = self.canvas.width();
            ce.style.width = self.canvas.width()+"px";
            ce.style.height = self.canvas.height()+"px";

        });*/
        var ce = (self.canvas[0] as HTMLCanvasElement);
        var setSize = function () {
            if (self.drawing) self.drawing.setSize()
        }

        this.resizeSensor = new ResizeSensor(jQuery('.midrow', w)[0], function(){ 
            setSize()
        });

        (<any>this.$win).jqxWindow("close");
        (<any>$(w))[0].sizeChanged = setSize;
        
        this.attachMenu();
        this.setMapFont()
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
    }

    onEmitWindowsChanged = (windows: string[]) => {
        if (this.drawing && windows.indexOf("Mapper")>-1) {
            this.setMapFont()
        }
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
            if (!event.target || (event.target.tagName != "LI" && event.target.tagName != "BUTTON")) return;
            if ($((<any>event).target).closest(".jqx-menu-popup").length!=0) this.closeMenues($("#mapperMenubar",this.$win));
            (this.$contextMenu as any).jqxMenu('close')
            switch (name) {
                case "mapmode":
                    this.toggleMapMode();
                    break;
                case "reload":
                    this.load(false);
                    break;
                case "info":
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
nel canale #mappe del Discord di Tempora Sanguinis.`, "display: block;unicode-bidi: embed;font-family: monospace;white-space: pre;")
                    break;
                case "reloadweb":
                    this.loadSite();
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
                    if (this.drawing.contextRoom) this.mapper.setRoomById(this.drawing.contextRoom.id)
                    break;
                case "edit":
                    if (this.drawing.contextRoom) this.editRoom((this.drawing.contextRoom))
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
                default:
                    break;
            }
        });
    }
    refreshFavorites() {
        const fv = this.mapper.getFavorites()
        console.log("refresh favorites " + (fv||[]).length)
        this.addFavoritesToMenu(fv)
    }
    toggleMapMode() {
        this.mapper.mapmode = !this.mapper.mapmode;
        if (this.mapper.mapmode)
            this.message("Modalita Mapping ABILITATA")
        else
            this.message("Modalita Mapping DISABILITATA")
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
        this.drawing.hscroll = hscroll
        this.drawing.vscroll = vscroll

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
    editRoom(room: Room) {
        Messagebox.ShowInput("Edit Room",
                   "Modifica la room",
                   JSON.stringify(room, null, 2), true).then(r=>{
            if (r.button == 1 && r.result) {
            const newRoom = JSON.parse(r.result)
            this.mapper.setRoomData(room.id, newRoom)
            }
        })
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
        this.mapper.useLocal = useLocal
                    
        this.mapper.loadVersion().then(v => {
            version = v;
            let vn = Math.random()
            if (v.version != 0) {
                vn = v.version
            }
            if (this.mapper.useLocal)
                return this.mapper.loadLocalDb()
            else
                return this.mapper.load('mapperData.json?v='+vn)
        }).then(mDb => {
            if (!version) {
                version = mDb.version;
            }
            if (!version) {
                this.message(`Caricato mappe - versione sconosciuta`)
            } else 
                this.message(`Caricato mappe v${version.version} ${version.date?"("+version.date+")":''} ${version.message?"["+version.message+"]":''}`)
        });

    }

    public loadSite() {
        let version: MapVersion = null;
        this.mapper.useLocal = false
        this.mapper.loadVersion().then(v => {
            version = v;
            let vn = Math.random()
            if (v.version != 0) {
                vn = v.version
            }
            return this.mapper.load('https://temporasanguinis.it/client/mapperData.json?v='+vn)
        }).then(mDb => {
            if (!version) {
                version = mDb.version;
            }
            if (!version) {
                this.message(`Caricato mappe - versione sconosciuta`)
            } else 
                this.message(`Caricato mappe v${version.version} ${version.date?"("+version.date+")":''} ${version.message?"["+version.message+"]":''}`)
        });

        
        /*const image = new Image(); // Using optional size for image
        image.onload = () => {
            const w = (<HTMLCanvasElement>this.canvas[0]).width;
            const h = (<HTMLCanvasElement>this.canvas[0]).height;
            this.ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, w, h);
        }; // Draw when image has loaded

        image.src = "https://www.temporasanguinis.it/mappa_small.jpg";
        */

    }

    public message(mess:string) {
        this.$bottomMessage.text(mess);
    }
    public zoneMessage(mess:string) {
        let items = (<any>this.$zoneList).jqxDropDownList('getItems');
        let newIndex:number;
        if (mess == null || !items || !items.length) {
            (<any>this.$zoneList).jqxDropDownList('clear');

            /*if (mess) this.$zoneList.append($('<option disabled selected hidden>', {
                value: null,
                text: mess
            }));*/

            const zones = this.zones && this.zones.length ? [...this.zones].sort(this.zoneSort) : null
            if (zones) {
                newIndex = zones.findIndex((z) => z.name == mess)
            }
            if (zones && zones.length) $.each(zones, (i, item) => {
                (<any>this.$zoneList).jqxDropDownList("addItem", { 
                    value: item.id.toString(),
                    label : item.name + " (#" + item.id.toString() + ")"
                });
            });
            //(<any>this.$zoneList).jqxDropDownList('loadFromSelect', 'zonelist_jqxDropDownList');
           (<any>this.$zoneList).jqxDropDownList('selectIndex', newIndex > -1 ? newIndex : 0 ); 
        } else {
            /*this.$zoneList.find("option").first().text(mess||"?")*/
            /*const items = (<any>this.$zoneList).jqxDropDownList('getItems');
            if (items) {
                const sel = !this.zoneId ? null : items.filter((i:any) => i.value == this.zoneId.toString());
                if (sel && sel.length && (<any>this.$zoneList).jqxDropDownList('selectedIndex')!=sel[0].index) {
                    (<any>this.$zoneList).jqxDropDownList('selectIndex', sel[0].index );
                }
            }*/
            //newIndex = items.findIndex((i:any) => i.name == mess)
            //(<any>this.$zoneList).jqxDropDownList('selectIndex', newIndex > -1 ? newIndex : 0 ); 
            //(<any>this.$zoneList).jqxDropDownList('val', this.zoneId);
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
        this.resizeSensor.detach();
        (<any>this.$win).jqxWindow("destroy");
    }

    public hide() {
        (<any>this.$win).jqxWindow("close");
    }
}
