import { MapDatabase, Mapper, MapVersion, Room, Zone } from "./mapper";
import { Messagebox, MessageboxResult, messagebox } from "./messagebox";
import { isNumeric } from "jquery";
import { WindowManager } from "./windowManager";
import { EvtScriptEmitPrint } from "./jsScript";
import { MapperDrawing } from "./mapperDrawing";
import { ResizeSensor } from 'css-element-queries'
import { downloadJsonToFile, importFromFile } from './util'

export enum UpdateType { none = 0, draw = 1 }


class Room1 {
    public ID: string = null;
    public x: number = 0;
    public y: number = 0;
    public z: number = 0;
    public area: string = null;
    public zone: number = 0;
    public notes?: string;
    public background?: string;
    public env?: string;
    //public details?: RoomDetails;
    public indoors?: number;
    public exits?: any;
    public name?: string;
}

interface MouseData {
    x: number;
    y: number;
    button: number;
    state: boolean;
}

export class MapperWindow {
    private $win: JQuery;

    private $serverName: JQuery;
    private $serverRow: JQuery;
    private $name: JQuery;
    private $char: JQuery;
    private $pass: JQuery;
    private $serverList: JQuery;
    private $autoLogin: JQuery;
    private okButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    private reloadLayoutButton: JQuery;
    private windowManager: WindowManager;
    private ctx: CanvasRenderingContext2D;
    private $bottomMessage:JQuery;
    private $zoneList:JQuery;
    canvas: JQuery;
    drawing: MapperDrawing;
    private zones:Zone[] = []
    private zoneId:number = -1
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
        (this.$contextMenu as any).jqxMenu('open', (data.x) + 5 + scrollLeft, (data.y) + 5 + scrollTop);
        return false;
    }
    resizeSensor: ResizeSensor;

    constructor(private mapper:Mapper) {

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
                <div class="menuBar">
                    <ul class='custom'>
                        <li  class='custom' data-option-name="load">Dati
                            <ul  class='custom'>
                            <li  class='custom' data-option-type="mapper" data-option-name="reload">Ricarica mappa</li>
                            <li  class='custom electron' data-option-type="mapper" data-option-name="reloadweb">Ricarica mappa dal sito</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="exportzone">Scarica zona corrente</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="importzone">Carica zona o zone</li>
                            </ul>
                        </li>
                        <li  class='custom'>Azioni
                            <ul  class='custom'>
                            <li  class='custom' data-option-type="mapper" data-option-name="pathfind">Vai a num. locazione</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="search">Cerca locazione</li>
                            <li  class='custom' data-option-type="mapper" data-option-name="sync">Sincronizza mappa</li>
                            </ul>
                        </li>
                    </ul>
                    <div id="mappertoolbar">
                        <button title="Livello inferiore" class="maptoolbarbutton" data-option-type="mapper" data-option-name="leveldown">&#9660;</button>
                        <span id="level">Lv. 0</span>
                        <button title="Livello superiore" class="maptoolbarbutton" data-option-type="mapper" data-option-name="levelup">&#9650;</button>
                        <button title="Sincronizza mappa" class="maptoolbarbutton" data-option-type="mapper" data-option-name="sync">&#128269;</button>
                        <button title="Abbassa zoom (mouse scroll down)" class="maptoolbarbutton" data-option-type="mapper" data-option-name="zoomout">-</button>
                        <span id="zoom">Zoom 100%</span>
                        <button title="Ingrandisci (mouse scroll up)" class="maptoolbarbutton" data-option-type="mapper" data-option-name="zoomin">+</button></div>
                </div>
                <div id="zonemessage">
                    <select id="zonelist" required></select>
                </div>
            </div>
            <div class="midrow"><canvas tabindex="999" id="mapcanvas"></canvas></div>
            <div class="bottomrow"><span id="mapmessage"></span></div>
            <div id='mapperContextMenu' style="display:none">
                <ul>
                <li  class='custom' data-option-type="mapper" data-option-name="vai">Vai</li>
                <li  class='custom' data-option-type="mapper" data-option-name="set">Posiziona</li>
                <li  class='custom' data-option-type="mapper" data-option-name="edit">Modifica</li>
                </ul>
            </div>
        </div>
        `;

        
        this.$win = $(win);

        <JQuery>((<any>$(".menuBar",this.$win)).jqxMenu());
        this.$bottomMessage = $("#mapmessage", this.$win);
        this.$zoneList = $("#zonelist", this.$win);
        this.$zoom = $("#zoom", this.$win);
        this.$level = $("#level", this.$win);
     

        this.$zoneList.on("change", ev => {
            var selection = this.$zoneList.find("option:selected").val()
            if (selection) {
                this.mapper.setZoneById(parseInt(selection))
            }
        })

        this.canvas = <JQuery>((<any>$("#mapcanvas",this.$win)));

        const ctx = (<HTMLCanvasElement>this.canvas[0]).getContext('2d');
        this.ctx = ctx;
        (<any>this.ctx).mozImageSmoothingEnabled = false;
        (<any>this.ctx).webkitImageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;
        
        var w = (<any>this.$win).jqxWindow({width: 450, height: 290, showCollapseButton: true, isModal: false});
        this.$contextMenu = <JQuery>((<any>$("#mapperContextMenu"))).jqxMenu({ width: '100px', height: null, autoOpenPopup: false, mode: 'popup'});
           
        var self = this;
        w.on('open', function (evt:any) {
            if (self.drawing) {
                self.drawing.zoomChanged.release(self.onZoomChange)
                self.drawing.showContext.release(self.showContextMenu)
                self.drawing.levelChanged.release(self.onLevelChange)
                self.drawing.destroy()
                delete self.drawing;  
            }
            self.attachMapperHandlers(mapper);
            self.detachMenu()
            self.attachMenu()
            self.drawing = new MapperDrawing(self.mapper, <HTMLCanvasElement>self.canvas[0], self.ctx);
            self.drawing.zoomChanged.handle(self.onZoomChange)
            self.drawing.levelChanged.handle(self.onLevelChange)
            self.drawing.showContext.handle(self.showContextMenu)
            self.onZoomChange(self.drawing.scale)
            if ((<any>window).ipcRenderer) {
                self.loadSite.bind(self)();
            } else {
                self.load.bind(self)();
            }
            
        });

        w.on('close', function (evt:any) {
            self.detachMapperHandlers(self.mapper)
            self.detachMenu()
            if (self.drawing) {
                self.drawing.destroy()
                delete self.drawing;  
                self.drawing = null;
            }
        });
        w.on('destroy', function() {
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
    }
    onLevelChange = (lv: number) => {
        this.$level.text("Lv. "+lv)
    }


    private attachMapperHandlers(mapper: Mapper) {
        mapper.emitMessage.handle(this.onEmitMapperMessage);
        mapper.emitSearch.handle(this.onEmitMapperSearch);
        mapper.zoneChanged.handle(this.onEmitMapperZoneChanged);
        mapper.roomChanged.handle(this.onEmitMapperRoomChanged);
    }

    private detachMapperHandlers(mapper: Mapper) {
        mapper.emitMessage.release(this.onEmitMapperMessage);
        mapper.emitSearch.release(this.onEmitMapperSearch);
        mapper.zoneChanged.release(this.onEmitMapperZoneChanged);
        mapper.roomChanged.release(this.onEmitMapperRoomChanged);
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
            (this.$contextMenu as any).jqxMenu('close')
            switch (name) {
                case "reload":
                    this.load();
                    break;
                case "reloadweb":
                    this.loadSite();
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
                default:
                    break;
            }
        });
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
        Messagebox.ShowMultiInput("Campi di ricerca locazione", ["Nome:", "Descrizione"], ["",""]).then(r => {
            this.mapper.search(r.results[0], r.results[1])
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

    public load() {
        let version: MapVersion = null;
        this.mapper.loadVersion().then(v => {
            version = v;
            let vn = Math.random()
            if (v.version != 0) {
                vn = v.version
            }
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

        
        /*const image = new Image(); // Using optional size for image
        image.onload = () => {
            const w = (<HTMLCanvasElement>this.canvas[0]).width;
            const h = (<HTMLCanvasElement>this.canvas[0]).height;
            this.ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, w, h);
        }; // Draw when image has loaded

        image.src = "https://www.temporasanguinis.it/mappa_small.jpg";
        */

    }

    public loadSite() {
        let version: MapVersion = null;
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
        if (mess == null || this.$zoneList.children().length < 2) {
            this.$zoneList.empty()

            if (mess) this.$zoneList.append($('<option disabled selected hidden>', {
                value: null,
                text: mess
            }));

            if (this.zones && this.zones.length) $.each(this.zones, (i, item) => {
                this.$zoneList.append($('<option>', { 
                    value: item.id,
                    text : "[" + item.id + "] " + item.name 
                }));
            });
        } else {
            this.$zoneList.find("option").first().text(mess||"?")
        }
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
