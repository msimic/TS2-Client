import { Console } from "console";
import { EventHook } from "../Core/event";
import { to_screen_coordinate } from "../Core/isometric";
import { ExitDir, ExitType, Mapper, Room, RoomExit, LabelPos, RoomType, ExitDir2LabelPos, ReverseExitDir, MapperOptions } from "./mapper";
import { Button, Messagebox, Notification } from "../App/messagebox";
import { colorCssToRGB } from "../Core/util";
interface MouseData {
    x: number;
    y: number;
    button: number;
    state: boolean;
}

export interface Point {
    x: number;
    y: number;
    z?: number;
}
interface Rect {
    x:number;
    y:number;
    x2:number;
    y2:number;
    w:number;
    h:number;
}

function preloadImage(src:string):HTMLImageElement {
    const img = new Image();
    img.src = src;
    return img;    
}
export type ExitDataPos = {
    x:number,
    y:number,
    xInner:number,
    yInner:number,
    xMid:number,
    yMid:number,
    marker:boolean
}

export interface DrawData {
    room: Room,
    rect: Rect,
    rectInner: Rect,
    exitData: Map<ExitDir, ExitDataPos>
}

export interface LabelData {
    room: Room,
    pos:LabelPos,
    rx: number,
    ry: number,
    text:string,
    color:string,
    scale:boolean
}

export const RoomTypeImages = new Map<number, HTMLImageElement>();
RoomTypeImages.set(0, preloadImage("images/roomtype/inside.png"))
RoomTypeImages.set(1, preloadImage("images/roomtype/forest.png"))
RoomTypeImages.set(2, preloadImage("images/roomtype/field.png"))
RoomTypeImages.set(3, preloadImage("images/roomtype/water.png"))
RoomTypeImages.set(4, preloadImage("images/roomtype/mountain.png"))
RoomTypeImages.set(5, preloadImage("images/roomtype/underground.png"))
RoomTypeImages.set(6, preloadImage("images/roomtype/street.png"))
RoomTypeImages.set(7, preloadImage("images/roomtype/town-square.png"))
RoomTypeImages.set(8, preloadImage("images/roomtype/death.png"))
RoomTypeImages.set(9, preloadImage("images/roomtype/air.png"))
RoomTypeImages.set(10, preloadImage("images/roomtype/path.png")) //
RoomTypeImages.set(11, preloadImage("images/roomtype/hills.png"))
RoomTypeImages.set(12, preloadImage("images/roomtype/city.png"))
RoomTypeImages.set(13, preloadImage("images/roomtype/shop.png")) //
RoomTypeImages.set(14, preloadImage("images/roomtype/underwater.png"))
RoomTypeImages.set(15, preloadImage("images/roomtype/desert.png"))

export const RoomTypeNames = new Map<number, string>();
RoomTypeNames.set(0, ("All'interno"))
RoomTypeNames.set(1, ("Foresta"))
RoomTypeNames.set(2, ("Campo o radura"))
RoomTypeNames.set(3, ("Fiume o mare"))
RoomTypeNames.set(4, ("Montagna"))
RoomTypeNames.set(5, ("Sottoterra"))
RoomTypeNames.set(6, ("Strada"))
RoomTypeNames.set(7, ("Piazza"))
RoomTypeNames.set(8, ("Trappola mortale"))
RoomTypeNames.set(9, ("In aria"))
RoomTypeNames.set(10, ("Sentiero")) //
RoomTypeNames.set(11, ("Colline"))
RoomTypeNames.set(12, ("Citta'"))
RoomTypeNames.set(13, ("Commerciante")) //
RoomTypeNames.set(14, ("Sott'acqua"))
RoomTypeNames.set(15, ("Deserto"))

CanvasRenderingContext2D.prototype.fillRoundedRect = function (this:CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    this.fill();
};
CanvasRenderingContext2D.prototype.strokeRoundedRect = function (this:CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    this.stroke();
};
export enum EditMode {
    Drag,
    Select,
    CreateLink,
    CreateRoom
}

export class MapperDrawing {
    private _zoneId: number;
    public get zoneId(): number {
        return this._zoneId;
    }
    public set zoneId(value: number) {
        this._zoneId = value;
    }
    contextMenuOpen: boolean;
    public customZoneColor():string {
        if (this.zoneId) {
            return this.mapper.idToZone.get(this.zoneId)?.backColor||null;
        }
        return null
    }
    mouseLinkData: { room: Room; dir: ExitDir, point:Point };
    mouseLinkDataStart: { room: Room; dir: ExitDir, point:Point };
    mouseLinkDataEnd: { room: Room; dir: ExitDir, point:Point };
    private _selectedExit: RoomExit;
    private static readonly _defaultRoomFillColorLight = "rgb(220,220,220)";
    private static readonly _defaultRoomFillColorDark = "rgb(155,155,155)";
    public static get defaultRoomFillColor() {
        return $("body").hasClass("dark") ? MapperDrawing._defaultRoomFillColorDark : MapperDrawing._defaultRoomFillColorLight;
    }
    drawWalls: boolean;
    drawAdjacentLevel: boolean;
    drawRoomType: boolean;
    themeDark: boolean = $("body").hasClass("dark");
    isDarkBackground: boolean = false;
    defaultLightBackground: string = "#C5BFB1";
    defaultDarkBackground: string = "#156aa7";
    defaultLightForeground: string = "black";
    defaultDarkForeground: string = "white";
    isCustomBackground: boolean;
    isCustomForeground: boolean;

    private _backColor: string;
    public get backColor(): string {
        return this._backColor;
    }
    public set backColor(value: string) {
        this._backColor = value;
        if (value) {
            const c = colorCssToRGB(this.backColor)
            if (!c) {
                this.isDarkBackground = false;
            } else {
                let luminance = 0.2126 * c.r/255.0 + 0.7152 * c.g/255.0 + 0.0722 * c.b/255.0
                this.isDarkBackground = luminance < 0.5
            }
        } else {
            this.isDarkBackground = false
        }
    }
    foreColor: string;

    public get selectedExit(): RoomExit {
        return this._selectedExit;
    }
    public set selectedExit(value: RoomExit) {
        this._selectedExit = value;
        this.$drawCache = {};
        if (value != null) this.selectedRooms = new Map()
        this.selected = null
    }
    private _selectedReverseExit: RoomExit;
    public get selectedReverseExit(): RoomExit {
        return this._selectedReverseExit;
    }
    public set selectedReverseExit(value: RoomExit) {
        this._selectedReverseExit = value;
        this.$drawCache = {};
        this.selectedRooms = new Map()
        this.selected = null
    }
    public get selectedColorStatic(): string {
        return "rgba(0,0,222,1.0)";
    }
    public get selectedColor(): string {
        let alpha = .10+.90*(Math.sin(this._drawTime/10) + 1) / 2
        return `rgba(0,0,222,${alpha})`;
    }
    cancelAllActions() {
        this.MouseDrag.state = false;
        this.drag = false;
        this.selecting = false
        this.movedRoom = null
        this.editMode = EditMode.Drag
        this.allowMove = false;
        this.selectedExit = null;
        this.selectedReverseExit = null;
        this.setCanvasCursor();
    }
    private _rooms: Room[] = [];
    public font:string = null;
    public fontSize?:number = null;
    
    showOffset: boolean;
    addToSelection: boolean;
    private _mapmode: boolean;
    public get mapmode(): boolean {
        return this._mapmode;
    }
    public set mapmode(value: boolean) {
        this._mapmode = value;
        if (!value) {
            this.cancelAllActions()
        }
        this.setCanvasCursor();
    }
    movedRoom: Room;
    movedRoomOffset:Point = { x: 0, y: 0, z:0};
    createRoomPos:Point = null;
    gridSize: number = 240;
    public get rooms(): Room[] {
        return this._rooms;
    }
    public set rooms(value: Room[]) {
        this._rooms = value;
    }
    private _level: number;
    contextRoom: Room;
    public get level(): number {
        return this._level;
    }
    public set level(value: number) {
        this._level = value;
        this.levelChanged.fire(value)
    }
    private MousePrev: MouseData;
    private Mouse: MouseData;
    private MouseDown: MouseData;
    private MouseDrag: MouseData = { x: 0, y: 0, button: 0, state: false };
    private drag: boolean = false;
    private _editMode: EditMode = EditMode.Drag;
    public get editMode(): EditMode {
        return this._editMode;
    }
    public set editMode(value: EditMode) {
        this._editMode = value;
        this.setCanvasCursor();
    }
    private selecting: boolean = false;
    private selectionBox = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };
    private _hover: Room;
    public get hover(): Room {
        return this._hover;
    }
    public set hover(value: Room) {
        console.log("hover: " + value)
        this._hover = value;
    }
    mouseInside = false;
    lastKey: any;
    refresh() {
        this.rooms = this.mapper.getZoneRooms(this.zoneId || (this.active || this.rooms[0])?.zone_id)
        this.rooms = this.rooms || []
        this.$drawCache = {}
        this.$wallsCache = {}
        this.readOptions()
        this.forcePaint = true
    }
    private readOptions() {
        this.backColor = this.mapperOptions.backgroundColor
        this.foreColor = this.mapperOptions.foregroundColor
        this.isCustomBackground = this.backColor != null
        this.isCustomForeground = this.foreColor != null
        
        this.drawWalls = this.mapperOptions.drawWalls
        this.drawAdjacentLevel = this.mapperOptions.drawAdjacentLevel
        this.drawRoomType = this.mapperOptions.drawRoomType
        this.gridSize = this.mapperOptions.useGrid ? this.mapperOptions.gridSize : 1
        const savedScale = this.mapperOptions.mapperScale;
        this._scale = savedScale ? (savedScale) : 1.5;
    }
    clear() {
        //this.zoneId = null
        this.active = null;
        this.current = null;
        this.selected = null;
        this.selectedRooms.clear();
        this.rooms = []
        this.$drawCache = {}
        this.$wallsCache = {}
        this.forcePaint = true
    }
    setActiveRoom(room: Room) {
        const prevZone = this.active ? this.active.zone_id : -1;
        this.active = room;
        this.current = room;
        if (!this.mapmode) this.selected = room;
        if (room) {
            this.level = room.z;
            if (room.zone_id && (!this.rooms || prevZone != room.zone_id || this.rooms.length <= 1)) {
                console.log("map drawing changing zone")
                this.rooms = this.mapper.getZoneRooms(this.active.zone_id)
                this.$drawCache = {}
                this.$wallsCache = {}
            }
            else if (!room.zone_id) {
                this.rooms = [this.active];
            }
        }
        this.focusActiveRoom()
        this.forcePaint = true
    }
    wallColor = '#AAAAAA'//'#ACADAC';
    rendererId: number;
    stop:boolean;
    forcePaint:boolean;
    private _showLegend = false;
    public get showLegend() {
        return this._showLegend;
    }
    public set showLegend(value) {
        this._showLegend = value;
    }
    private ready = true;
    private _scale: number = 1.5;
    public get scale(): number {
        return this._scale;
    }
    public set scale(value: number) {
        this._scale = value;
        this.createRoomPos = null;
        this.zoomChanged.fire(this._scale)
    }
    x_scroll: number = 0;
    y_scroll: number = 0;
    private _active: Room = null;
    public get active(): Room {
        return this._active;
    }
    public set active(value: Room) {
        this._active = value;
        this.hover = null
    }
    $focused: boolean = true;
    private _allowMove = false;
    public get allowMove() {
        return this._allowMove;
    }
    public set allowMove(value) {
        this._allowMove = value;
        this.setCanvasCursor();
    }
    private _selected: Room = null;
    public get selected(): Room {
        return this._selected;
    }
    public set selected(value: Room) {
        if (this._selected && !this.addToSelection) {
            this._selectedRooms.clear()
        }
        this._selected = value;
        if (this._selected && this._selected.id)
            this._selectedRooms.set(this._selected.id, this._selected)
        
        this.mapper.setSelected(this._selected)
    }
    private _selectedRooms = new Map<number, Room>();
    public get selectedRooms() {
        return this._selectedRooms;
    }
    public set selectedRooms(value) {
        this._selectedRooms = value;
    }

    markers = new Map<number,number>();
    $drawCache: any;
    $wallsCache: any;
    current: Room = null;
    parent:JQuery;
    public zoomChanged = new EventHook<number>();
    public levelChanged = new EventHook<number>();
    public showContext = new EventHook<{x: number, y:number}>();
    private _drawTime:number = 0;

    constructor(private mapper:Mapper, private mapperOptions:MapperOptions, private canvas:HTMLCanvasElement, private ctx:CanvasRenderingContext2D) {
        this.parent = $(canvas.parentElement);
        this.refresh()
        this.setSize();
        this.attachCanvasEvents();
        this.rendererId = window.requestAnimationFrame(this.renderFrame.bind(this));
    }

    setSize() {
        const ph = this.parent.innerHeight()
        const pw = this.parent.innerWidth()
        const sW = $(this.canvas).width();
        const sH = $(this.canvas).height();
        if (sW != pw || sH != ph) {
            $(this.canvas).width("unset");
            $(this.canvas).height("unset");
            $(this.canvas).width(pw);
            $(this.canvas).height(ph);
        }
        if (this.canvas.height != ph*2) {
            this.canvas.height = ph*2;
        }
        if (this.canvas.width != pw*2) {
            this.canvas.width = pw*2;
        }
        (this.draw(this.canvas, this.ctx, false, null))
    }

    setScale(scale:number) {
        // Restrict scale
        scale = Math.min(Math.max(.5, scale), 4);
        this.scale = scale;
        this.$drawCache = {};
        this.$wallsCache = {};
        if (this.active) {
            //this.focusActiveRoom()
        }
    }
    public setFocus(value:boolean) {
        if (this.$focused === value) return;
        this.$focused = value;
        if (value) {
            this.canvas.focus()
        }
    }

    pointClicked(event:JQueryMouseEventObject):Room {
        if (event.isDefaultPrevented()) return null;
        this._showLegend = false; 
        const x = this.Mouse.x;
        const y = this.Mouse.y;
        const room = this.findActiveRoomByCoords(x, y);

        if (event.ctrlKey && room) {
            if (this.selectedRooms.get(room.id)) {
                this.selectedRooms.delete(room.id)
            } else {
                this.selectedRooms.set(room.id, room)
            }
            return room
        }

        this.selectedExit = null;
        this.selectedReverseExit = null;
        if (!room) return null;

        let rRect = this.roomDrawRect(room, this.canvas);
        const dir = this.getSector(rRect, {x: x*2, y: y*2})
        if (this.mapmode && dir != ExitDir.Other && room.exits[dir]) {
            this.selectedExit = room.exits[dir]
            if (this.selectedExit && this.selectedExit.to_room) {
                let otherRoom = this.rooms.find(r => r.id == this.selectedExit.to_room);
                if (otherRoom) {
                    let otherExit = otherRoom.exits[this.selectedExit.to_dir];
                    if (otherExit) {
                        this.selectedReverseExit = otherExit; 
                    }
                }
            }
            return null;
        }
        if (this.selected && room && room.id === this.selected.id)
            return this.selected;

        if (event.ctrlKey) {
            this.addToSelection = true;
        }
        this.selected = room;
        this.addToSelection = false;
        return this.selected;
    }

    private getSector(rectangle:Rect, point:{x:number,y:number}):ExitDir {
        const rectWidth = rectangle.w;
        const rectHeight = rectangle.h;
        const sectorWidth = rectWidth / 3;
        const sectorHeight = rectHeight / 3;
    
        const pointX = point.x - rectangle.x;
        const pointY = point.y - rectangle.y;
    
        const sectorColumn = Math.min(2,Math.floor(pointX / sectorWidth));
        const sectorRow = Math.min(2,Math.floor(pointY / sectorHeight));
    
        // Convert the sector coordinates to a single index (0 to 8)
        const sectorIndex = sectorRow * 3 + sectorColumn;
        const dirs = [
            ExitDir.NorthWest,
            ExitDir.North,
            ExitDir.NorthEast,
            ExitDir.West,
            ExitDir.Other,
            ExitDir.East,
            ExitDir.SouthWest,
            ExitDir.South,
            ExitDir.SouthEast,
        ];

        return dirs[sectorIndex];
    }

    attachCanvasEvents() {
        $(this.canvas).mousemove((event) => {
            this.MousePrev = this.Mouse;
            this.Mouse = this.getMapMousePos(event);
            if (this.editMode == EditMode.CreateRoom) {
                const x = Math.floor(this.Mouse.x / 1 / this.scale);
                const y = Math.floor(this.Mouse.y / 1 / this.scale);
                if (x > 0 || x < 0 || y < 0 || y > 0) {
                    this.createRoomPos = {x: x * 2, y: y * 2}
                } else {
                    this.createRoomPos = null;
                }
                this.setCanvasCursor();
            } else if (this.editMode == EditMode.CreateLink) {
                let x = Math.floor(this.Mouse.x);
                let y = Math.floor(this.Mouse.y);
                const hover = this.findActiveRoomByCoords(x, y)
                if (hover) {
                    let rRect = this.roomDrawRect(hover, this.canvas);
                    x*=2;
                    y*=2;
                    const dir = this.getSector(rRect, {x: x, y: y})
                    if (dir && dir != ExitDir.Other) {
                        this.mouseLinkData = {
                            room: hover,
                            dir: dir,
                            point: {x: x, y: y}
                        }
                    } else {
                        this.mouseLinkData = {
                            room: hover,
                            dir: ExitDir.Other,
                            point: {x: x, y: y}
                        }
                    }
                } else if (this.mouseLinkDataStart?.room) {
                    this.mouseLinkData = {
                        room: null,
                        dir: ExitDir.Other,
                        point: {x: x*2, y: y*2}
                    }
                } else {
                    this.mouseLinkData = {
                        room: null,
                        dir: ExitDir.Other,
                        point: {x: x*2, y: y*2}
                    }
                }
            }
            else if (this.drag) {
                this.MouseDrag.x += this.MousePrev.x - this.Mouse.x;
                this.MouseDrag.y += this.MousePrev.y - this.Mouse.y;
                const x = Math.floor(this.MouseDrag.x / 1 / this.scale);
                const y = Math.floor(this.MouseDrag.y / 1 / this.scale);
                if (x > 0 || x < 0 || y < 0 || y > 0) {
                    if (!this.movedRoom) {
                        this.MouseDrag.x -= x * 1 * this.scale;
                        this.MouseDrag.y -= y * 1 * this.scale;
                        this.scrollBy(x*2, y*2);
                        if (event.shiftKey) {
                            this.showOffset = true;
                        } else {
                            this.showOffset = false;
                        }
                    } else {
                        this.movedRoomOffset.x = x*2
                        this.movedRoomOffset.y = y*2
                    }
                }
                this.setCanvasCursor();
            } else if (this.selecting) {
                const x = Math.floor(this.Mouse.x);
                const y = Math.floor(this.Mouse.y);
                this.selectionBox.w = x*2 - this.selectionBox.x;
                this.selectionBox.h = y*2 - this.selectionBox.y;
                this.setCanvasCursor();
            }
            else if (!this.contextMenuOpen) {
                const x = this.Mouse.x;
                const y = this.Mouse.y;
                const rCoord = {x: x * 2, y: y * 2}
                this.transformCanvasToRoomCoordinate(rCoord, this.x_scroll, this.y_scroll, this.canvas)
                const hover = this.findActiveRoomByCoords(x, y)
                this.hover = hover;
                if (!hover && event.altKey) {
                    this.hover = <Room>{
                        id: 0,
                        name: `${x|0},${y|0} / ${rCoord.x|0},${rCoord.y|0}`
                    }
                }
                this.setCanvasCursor();
            }
            event.preventDefault();
        });
        $(this.canvas).mousedown((event) => {
            this.mouseLinkDataStart = {
                dir: ExitDir.Other,
                room: null,
                point: {x:0, y:0}
            }
            this.mouseLinkDataEnd = {
                dir: ExitDir.Other,
                room: null,
                point: {x:0, y:0}
            }
            if (this.editMode == EditMode.CreateLink && this.mouseLinkData?.room && this.mouseLinkData?.dir != ExitDir.Other) {
                this.mouseLinkDataStart = this.mouseLinkData
            }
            event.button <= 1 && (this.hover = null);
            this.Mouse = this.getMapMousePos(event);
            this.MouseDown = this.getMapMousePos(event);
            this.movedRoom = null;
            this.movedRoomOffset.x = this.movedRoomOffset.y = 0
            this.MouseDrag.x = 0
            this.MouseDrag.y = 0
            this.MouseDrag.state = true;
            this.drag = this._editMode != EditMode.Drag ? false : this.MouseDown.button === 0 && !event.shiftKey;
            this.selecting = this._editMode == EditMode.Select || (this.MouseDown.button === 0 && event.shiftKey);
            const x = Math.floor(this.MouseDown.x);
            const y = Math.floor(this.MouseDown.y);
            const hover = this.findActiveRoomByCoords(x, y)
            this.movedRoom = this.allowMove && hover && this.selectedRooms.has(hover.id) ? hover : null;
            if (event.button > 1 && hover && !this.selectedRooms.has(hover.id)) {
                this.selectedRooms.clear()
                this.selected = hover
            }
            this.setCanvasCursor();
            this.selectionBox = {
                x: x*2,
                y: y*2,
                w: 0,
                h: 0
            }
        });

        $(this.canvas).mouseup(async (event) => {
            if (this.editMode == EditMode.CreateLink && this.mouseLinkData?.room) {
                this.mouseLinkDataEnd = this.mouseLinkData
            }
            if (this.editMode == EditMode.CreateLink && this.mouseLinkDataStart?.room && this.mouseLinkDataEnd?.room) {
                if (this.mouseLinkDataStart.room.exits[this.mouseLinkDataStart.dir]) {
                    const r = await Messagebox.Question(`Uscita '${this.mouseLinkDataStart.dir}' gia' esistente. Sovrascrivi?\n\rP.S. Il link di ritorno se esiste diverra' one-way.`)
                    if (r.button != Button.Ok) return;
                }
                if (!this.mouseLinkDataEnd.room.exits[this.mouseLinkDataEnd.dir]) {
                    this.createLink(this.mouseLinkDataStart, this.mouseLinkDataEnd, false);
                    event.preventDefault();
                    event.stopPropagation();
                } else if (this.mouseLinkDataEnd.room.exits[this.mouseLinkDataEnd.dir]) {
                    this.createLink(this.mouseLinkDataStart, this.mouseLinkDataEnd, true);
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
            this.mouseLinkDataStart = {room: null, dir: ExitDir.Other, point: {x: 0, y: 0}}
            this.mouseLinkDataEnd = {room: null, dir: ExitDir.Other, point: {x: 0, y: 0}}
            this.mouseLinkData = {room: null, dir: ExitDir.Other, point: {x: 0, y: 0}}
            event.button <= 1 && (this.hover = null);
            this.Mouse = this.getMapMousePos(event);
            this.MouseDrag.state = false;
            if (!this.MouseDown)
                this.MouseDown = this.getMapMousePos(event);

            let didDrag = this.drag && !areEqualMousePos(this.MouseDown, this.Mouse)
            if (!didDrag && !this.selecting && this.Mouse.button === 0 && Math.floor(this.Mouse.x / 32 / this.scale) === Math.floor(this.MouseDown.x / 32 / this.scale) && Math.floor(this.Mouse.y / 32 / this.scale) === Math.floor(this.MouseDown.y / 32 / this.scale)) {
                this.pointClicked(event);
            }

            if (this.editMode == EditMode.CreateRoom) {
                this.editMode = EditMode.Drag
                event.preventDefault();
                event.stopPropagation();
                this.createRoom(this.createRoomPos)
                this.createRoomPos = null;
            }

            if (this.movedRoom && didDrag) {
                this.moveRooms([...this.selectedRooms.values()], this.movedRoomOffset)
            }

            if (didDrag || this.selecting) {
                event.preventDefault();
                event.stopPropagation();
            }

            this.drag = false;
            this.showOffset = false;
            this.movedRoom = null;
            this.movedRoomOffset.x = this.movedRoomOffset.y = 0
            if (this.selecting && this.selectionBox.w && this.selectionBox.h) {
                let rooms:Room[] = this.getRoomsInSelectionBox();
                if (event.ctrlKey && this.selectedRooms.size > 0) {
                    let rk: number;
                    let keys = [...this.selectedRooms.keys()];
                    for (let i = 0; i < keys.length; i++) {
                        if (!rooms.find(r => r.id == keys[i])) {
                            const rm = this.selectedRooms.get(keys[i])
                            if (rm) rooms.push(rm)
                        }
                    }
                }
                this.selectedExit = null;
                this.selectedReverseExit = null;
                this.selectedRooms = new Map(rooms.map((r) => [r.id, r]))

                Notification.Show(this.selectedRooms.size + " stanze selezionate")
            }
            this.selecting = false;
            
            this.setCanvasCursor();
        });
        $(this.canvas).mouseenter((event) => {
            //this.hover = null;
            this.mouseInside = true;
            this.Mouse = this.getMapMousePos(event);
        });
        $(this.canvas).mouseleave((event) => {
            if (!this.contextMenuOpen)
                this.hover = null;
            this.mouseInside = false;
            this.Mouse = this.getMapMousePos(event);
            if (this.drag) {
                this.drag = false;
                this.setCanvasCursor();
            }
        });
        $(this.canvas).bind('contextmenu', (event) => {
            event.preventDefault();
            const m = this.getMapMousePos(event);
            this.contextRoom = this.findActiveRoomByCoords(m.x, m.y);
            this.showContext.fire({x: m.x, y: m.y})
            return false;
        });
        $(this.canvas).click((event) => {
            this.hover = null;
            event.preventDefault();
            this.MouseDrag.state = false;
            this.drag = false;
            this.pointClicked(event);
            this.setCanvasCursor();
        });
        $(this.canvas).dblclick((event) => {
            this.hover = null;
            this.Mouse = this.getMapMousePos(event);
            this.MouseDown = this.getMapMousePos(event);
            //this.MouseDrag.state = true;
            //this.drag = true;
            const room = this.pointClicked(event);
            event.preventDefault();
            if (room)
            this.mapper.walkToId(room.id)
            this.setCanvasCursor();
        });
        this.canvas.onselectstart = () => { return false; };
        this.canvas.addEventListener('focus', (e) => {
            this.setFocus(true);
        });
        this.canvas.addEventListener('blur', (e) => {
            this.setFocus(false);
        });
        this.canvas.addEventListener('wheel', (e) => {
            this.hover = null;
            e.preventDefault();

            let scale = this.scale;
            scale += e.deltaY * -0.0002;
            this.setScale(scale)
        });
        this.canvas.addEventListener('keyup', (e) => {
            this.lastKey = null;
        });
        
    }
    createRoom(createRoomPos: Point) {
        if (!this.zoneId) {
            Notification.Show("Non sei in nessuna zona")
            return;
        }
        const zone = this.zoneId
        const p = {x: 0, y: 0, z: 0}
        this.transformCanvasToRoomCoordinate(p, this.x_scroll + createRoomPos.x, this.y_scroll + createRoomPos.y, this.canvas)
        p.x = Math.trunc(this.closestMultiple(p.x, this.gridSize))
        p.y = Math.trunc(this.closestMultiple(p.y, this.gridSize))
        p.z = Math.trunc(this.level)
        let old = this.active
        this.mapper.createRoomAt(zone, p)
        if (old) {
            this.setActive(old)
            this.focusActiveRoom()
        }
    }

    createLink(mouseLinkDataStart: { room: Room; dir: ExitDir; point: Point; }, mouseLinkDataEnd: { room: Room; dir: ExitDir; point: Point; }, oneway: boolean) {
        console.log("Connect %d to %d from %s to %s",
                    this.mouseLinkDataStart.room.id,
                    this.mouseLinkDataEnd.room.id,
                    this.mouseLinkDataStart.dir,
                    this.mouseLinkDataEnd.dir)
        mouseLinkDataStart.room.exits[mouseLinkDataStart.dir] = {
            type: ExitType.Normal,
            to_room: this.mouseLinkDataEnd.room.id,
            to_dir: this.mouseLinkDataEnd.dir
        }
        if (!oneway) mouseLinkDataEnd.room.exits[mouseLinkDataEnd.dir] = {
            type: ExitType.Normal,
            to_room: this.mouseLinkDataStart.room.id,
            to_dir: this.mouseLinkDataStart.dir
        }
        this.refresh()
    }
    public setCanvasCursor() {
        if (this.allowMove && this.editMode != EditMode.CreateLink && this.Mouse && this.findActiveRoomByCoords(this.Mouse.x, this.Mouse.y)) {
            $(this.canvas).css('cursor', 'move');
        } else if (this.editMode == EditMode.Drag) {
            if (this.Mouse && this.findActiveRoomByCoords(this.Mouse.x, this.Mouse.y)) {
                $(this.canvas).css('cursor', 'pointer');
            } else {
                $(this.canvas).css('cursor', 'grab');
            }
        } else if (this.editMode == EditMode.Select) {
            $(this.canvas).css('cursor', 'crosshair');
        } else if (this.editMode == EditMode.CreateLink) {
            $(this.canvas).css('cursor', 'copy');
        } else if (this.editMode == EditMode.CreateRoom) {
            $(this.canvas).css('cursor', 'crosshair');
        } else {
            $(this.canvas).css('cursor', 'grab');
        }
    }

    moveRooms(rooms: Room[], movedRoomOffset: Point, useGrid:boolean=true) {
        this.movedRoomOffset = movedRoomOffset
        let lastLevel = -1
        for (const room of rooms) {
            const {x, y} = this.calculateMovedRoomPos(room.x, room.y, useGrid)
            room.x = x
            room.y = y
            room.z += movedRoomOffset.z
            lastLevel = room.z
        }
        this.level = lastLevel
        this.levelChanged.fire(this.level)
    }
    getRoomsInSelectionBox(): Room[] {
        let rms = this.rooms.filter(r => r.z == this.level && this.isInSelectionBox(r))
        return rms;
    }
    isInSelectionBox(r: Room): boolean {
        let rect = this.roomInnerDrawRect(r, this.canvas)
        let sbX = Math.min(this.selectionBox.x, this.selectionBox.x + this.selectionBox.w)
        let sbY = Math.min(this.selectionBox.y, this.selectionBox.y + this.selectionBox.h)
        let sbW = Math.abs(this.selectionBox.w)
        let sbH = Math.abs(this.selectionBox.h)
        return this.PointInRect(rect.x + rect.w/2, rect.y + rect.h / 2, sbX, sbX + sbW, sbY, sbY+sbH)
    }

    
    public focusCurrentRoom() {
        if (this.current && this.current.id) {
            this.setActive(this.current);
            //this.emit('active-room-changed', copy(this.active));
        }
        this.focusActiveRoom();
    }

    public focusActiveRoom() {
        if (!this.active) return;
        //console.log("Room xy: ", this.active.x/8 , this.active.y/8)
        this.scrollTo((this.active.x/7.5)+16, (this.active.y/7.5)+16);
    }
    public setActive(room:Room) {
        this.active = room;
        //this.emit('active-room-changed', copy(this.active));
    }

    destroy() {
        this.stop = true;
    }

    renderFrame(time: DOMHighResTimeStamp): void {

        if (this.stop) return;
        var ctx = this.ctx;

        if (!this.backColor || !this.foreColor)
            this.assignThemeColors();

        if (!this.mouseInside && !this.forcePaint && (time|0) % 16 > 3) {
            window.requestAnimationFrame(this.renderFrame.bind(this));
            return
        }
        this.forcePaint = false;

        try {
            if (this.canvas && this.canvas.width) {
                //this.setSize();
                this.draw(this.canvas, ctx, false, null)
            }
        } catch (ex) {
            //console.log(ex)
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = "rgb(200,0,0)"
            ctx.fillRect(0,0,this.canvas.width,this.canvas.height)
            ctx.fillStyle = "yellow"
            ctx.strokeStyle = "yellow"
            const fontSize = 18
            ctx.font = `bold ${fontSize}pt monospace`;
            let msg:string = ex.stack||ex.message
            msg = msg.replace("\r\n", "\n")
            msg = msg.replace("\n\r", "\n")
            msg = msg.replace("\r", "\n")
            let y = 0;
            for (const m of msg.split("\n")) {
                ctx.fillText(m, 10,10+(y+=fontSize+fontSize/4))
            }
        }
        if (!this.stop) window.requestAnimationFrame(this.renderFrame.bind(this));
    }

    public setLevel(level: number) {
        if (level !== this.level) {
            this.level = level;
        }
    }

    public getMapMousePos(evt:JQueryMouseEventObject): MouseData {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top,
            button: evt.button,
            state: false
        };
    }

    public scrollBy(x: number, y: number) {
        this.x_scroll += x;
        this.y_scroll += y;
    }

    public scrollTo(x: number, y: number) {

        this.x_scroll = x;
        this.y_scroll = y;

    }

    roomDrawRect(room:Room, canvas:HTMLCanvasElement) : Rect {
        if (!room) return null;
        const x = this.x_scroll ;
        const y = this.y_scroll ;
        let ox = (canvas.width/2) //- 16/this.scale;
        let oy = (canvas.height/2) //- 16/ this.scale;

        if (canvas.width % 2 != 0)
            ox += 0.5;
        if (canvas.height % 2 != 0)
            oy  += 0.5;

        let rX = (room.x /7.5  - x) * this.scale + ox;
        let rY = (room.y/7.5   - y) * this.scale + oy;
        return {
            x: (rX)|0,
            y: (rY)|0,
            x2: (rX + 32*this.scale)|0,
            y2: (rY + 32*this.scale)|0,
            w: (32*this.scale)|0,
            h: (32*this.scale)|0,
        };
    }

    transformPointToCanvas(point:Point, offsetX:number, offsetY:number, canvas:HTMLCanvasElement) {
        let ox = (canvas.width/2) //- 16/this.scale;
        let oy = (canvas.height/2) //- 16/ this.scale;

        if (canvas.width % 2 != 0)
            ox += 0.5;
        if (canvas.height % 2 != 0)
            oy  += 0.5;

        const rX = (point.x /7.5  - offsetX) * this.scale + ox;
        const rY = (point.y/7.5   - offsetY) * this.scale + oy;
        point.x = rX
        point.y = rY
    }

    transformCanvasToRoomCoordinate(point:Point, offsetX:number, offsetY:number, canvas:HTMLCanvasElement) {
        let ox = (canvas.width/2) //- 16/this.scale;
        let oy = (canvas.height/2) //- 16/ this.scale;

        if (canvas.width % 2 != 0)
            ox += 0.5;
        if (canvas.height % 2 != 0)
            oy  += 0.5;

        //const rX = (point.x /7.5  - offsetX) * this.scale + ox;
        //const rY = (point.y/7.5   - offsetY) * this.scale + oy;

        const rX = 7.5 * (offsetX + (point.x - ox)/this.scale)
        const rY = 7.5 * (offsetY + (point.y - oy)/this.scale) 

        point.x = Math.round(rX)
        point.y = Math.round(rY)
    }

    roomInnerDrawRect(room:Room, canvas:HTMLCanvasElement) : Rect {
        if (!room) return null;
        const x = this.x_scroll ;
        const y = this.y_scroll ;
        let ox = (canvas.width/2) //- 16/this.scale;
        let oy = (canvas.height/2) //- 16/ this.scale;

        if (canvas.width % 2 != 0)
            ox += 0.5;
        if (canvas.height % 2 != 0)
            oy  += 0.5;

        let rX = (room.x /7.5  - x) * this.scale + ox;
        let rY = (room.y/7.5   - y) * this.scale + oy;
        return {
            x: (rX+ 8*this.scale)|0,
            y: (rY+ 8*this.scale)|0,
            x2: (rX + 8*this.scale+ 16*this.scale)|0,
            y2: (rY + 8*this.scale+ 16*this.scale)|0,
            w: (16*this.scale)|0,
            h: (16*this.scale)|0,
        };
    }

    public findActiveRoomByCoords(rx: number, ry: number) {

        const x = rx*2;
        const y= ry*2;

        let zoneId = this.active?.zone_id || (this.rooms?.length ? this.rooms[0]?.zone_id : -1);

        const rows = zoneId < 0 || !this.mapper.zoneRooms.get(zoneId) ? null : this.mapper.zoneRooms.get(zoneId).filter(room => {
            if (room.z != this.level) return false;
            let rRect = this.roomDrawRect(room, this.canvas);
            return this.PointInRect(x,y,rRect.x,rRect.x2, rRect.y, rRect.y2)
        })


        if (rows && rows.length > 0)
            return rows[0];
        return null;
    }
    
    private calculateCardinalDirection(A:Point, B:Point) {
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const angle = Math.atan2(dy, dx);
        //const cardinalDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const cardinalDirections = [0, 1, 2, 3, 4, 5, 6, 7];
    
        // Convert angle to positive value in radians
        const positiveAngle = (angle + 2 * Math.PI) % (2 * Math.PI);
    
        // Determine the closest cardinal direction
        const index = Math.floor((positiveAngle + Math.PI / 8) / (Math.PI / 4)) % 8;
        return cardinalDirections[index];
    }

    private drawData = new Map<number, DrawData>();
    private drawDataBelow = new Map<number, DrawData>();
    private drawDataAbove = new Map<number, DrawData>();
    public draw(canvas?: HTMLCanvasElement, context?: CanvasRenderingContext2D, forExport?: boolean, callback?:Function) {
        if (!this.ready) {
            setTimeout(() => { this.draw(canvas, context, forExport, callback); }, 10);
            return;
        }
        this._drawTime++;
            
        if (!canvas)
            canvas = this.canvas;
        if (!context)
            context = this.ctx;
        if (!forExport) forExport = false;
        
        if (!canvas || !context) return;

        let darkTheme = this.themeDark;
        if (this._drawTime % 100 && darkTheme != (this.themeDark = $("body").hasClass("dark"))) {
            // theme change
            this.assignThemeColors();
        }

        context.font = `${this.fontSize || 14}pt ${this.font || 'Tahoma, Arial, Helvetica, sans-serif'}`;
        context.lineWidth = (0.6 * this.scale)|0;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = (this.customZoneColor() || this.backColor || '#C5BFB1');
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.mapmode) {
            this.DrawGrid(context, forExport, this.scale)
        }
        
        const drawData = this.drawData
        const drawDataBelow = this.drawDataBelow
        const drawDataAbove = this.drawDataAbove
        drawData.clear()
        drawDataBelow.clear()
        drawDataAbove.clear()

        if (this.rooms) for (let i = 0; i < this.rooms.length; i++) {
            let room = this.rooms[i]
            if (this.drawAdjacentLevel && room.z == this.level-1) {
                let rdr = this.roomInnerDrawRect(room, canvas)
                drawDataBelow.set(room.id, {
                    room: room,
                    rect: rdr,
                    rectInner: rdr,
                    exitData: this.createExitData(room, rdr)
                });
            }
            else if (this.drawAdjacentLevel && room.z == this.level+1) {
                let rdr = this.roomInnerDrawRect(room, canvas)
                drawDataAbove.set(room.id, {
                    room: room,
                    rect: rdr,
                    rectInner: rdr,
                    exitData: this.createExitData(room, rdr)
                });
            }
            else if (room.z == this.level) {
                let rdr = this.roomDrawRect(room, canvas)
                let rdr2 = this.roomInnerDrawRect(room, canvas)
                drawData.set(room.id,{
                    room: room,
                    rect: rdr,
                    rectInner: rdr2,
                    exitData: this.createExitData(room, rdr)
                });
            }
        }

        const prevComposite = context.globalCompositeOperation;
        context.globalCompositeOperation = !this.isDarkBackground ? 'lighten' : 'darken';
            
        const aboveColor = !this.isDarkBackground ? "#EEEEEE" : '#333333'
        if (this.drawAdjacentLevel) for (const data of drawDataAbove.values()) {
            this.DrawRect(context, data.rect, data.rect.w/5, -data.rect.h/5, data.room, aboveColor, null, this.scale);
        }
        context.globalCompositeOperation = this.isDarkBackground ? 'lighten' : 'darken';
        
        if (this.drawAdjacentLevel) for (const data of drawDataBelow.values()) {
            this.DrawRect(context, data.rect, -data.rect.w/5, data.rect.h/5, data.room, "#333333", "#888888", this.scale);
        }
        context.globalCompositeOperation = prevComposite

        let strokeColor = 'rgba(127, 127, 127, 0.8)'
        let drawLabels = false;
        
        if (this.drawAdjacentLevel) for (const data of drawDataBelow.values()) {
            this.calculateLabelsAndDrawLinks(context, data, drawData, drawDataBelow, drawDataAbove, strokeColor, drawLabels, -data.rect.w/5, data.rect.h/5)    
        }

        
        strokeColor = this.foreColor || 'black'
        drawLabels = true;
        
        let allLabels:LabelData[] = [];

        for (const data of drawData.values()) {
            this.DrawWalls(context, data.rect, data.room, forExport, this.scale);
        }
        for (const data of drawData.values()) {
            allLabels = allLabels.concat(this.calculateLabelsAndDrawLinks(context, data, drawData, drawDataBelow, drawDataAbove, strokeColor, drawLabels, 0, 0))  
        }
        for (const data of drawData.values()) {
            this.DrawRoom(context, data.rect, data.room, forExport, this.scale);
        }

        for (const l of allLabels) {
            this.drawLabel(context, l.pos, l.room, l.rx, l.ry, l.text, l.color, l.scale);
        }

        this.DrawLegend(context, 1, 1, 0);
        //this.translate(context, -0.5, this._scale);
        if (this.hover) {
            this.drawHoverInfo(context);
        }

        if (this.showOffset) {
            context.fillText(`${this.x_scroll|0}, ${this.y_scroll|0}`, 20, 20)
        }

        context.setLineDash([])
        if (this.movedRoom) for (const data of drawData.values()) {
            this.DrawMovedRoom(context, data.rect, data.room, forExport, this.scale);
        }

        if (this.editMode == EditMode.CreateRoom) {
            this.DrawRoomCreation(context, forExport, this.scale)
        }

        if ((!this.mouseLinkDataStart || !this.mouseLinkDataStart.room) && this.mouseLinkData?.room && this.mouseLinkData.dir) {
            const start = this.mouseLinkData
            this.drawInnerToOuterExitLine(context, start);
        } else if (this.mouseLinkDataStart && this.mouseLinkDataStart.room) {
            const start = this.mouseLinkDataStart
            const end = this.mouseLinkData;
            if (start.room) this.drawInnerToOuterExitLine(context, start);
            let rdr = this.roomDrawRect(start.room, canvas)
            let rdr2 = this.roomInnerDrawRect(start.room, canvas)
            const roomData = {
                room: start.room,
                rect: rdr,
                rectInner: rdr2,
                exitData: this.createExitData(start.room, rdr)
            };
            let dRdr = end.room ? this.roomDrawRect(end.room, canvas) : null
            let dRdr2 = end.room ? this.roomInnerDrawRect(end.room, canvas) : null
            const destRoomData = {
                room: end.room,
                rect: dRdr,
                rectInner: dRdr2,
                exitData: end.room ? this.createExitData(end.room, dRdr) : null
            };
            const steps:Point[] = [ ];
            let recursive = false;
            let offsX = 0;
            let offsY = 0;
            let color = "gray"
            let entranceDir: ExitDir = ExitDir.Other;
            let destPosX = 0, destPosY = 0, startPosX = 0, startPosY = 0
            let exitData = roomData.exitData.get(start.dir)
            startPosX = (roomData.rect.x + exitData.xInner + offsX)|0
            startPosY = (roomData.rect.y + exitData.yInner + offsY)|0
            let destExitData = destRoomData.exitData ? destRoomData.exitData.get(end.dir) : null
            if (end.room == roomData.room && exitData) {
                recursive = true
                destPosX = (roomData.rect.x + exitData.xInner + offsX)|0
                destPosY = (roomData.rect.y + exitData.yInner + offsY)|0
                color = "darkgreen"
            } else if (destRoomData && destExitData) {
                steps.push({
                    x: (destRoomData.rect.x + destExitData.x + offsX)|0,
                    y: (destRoomData.rect.y + destExitData.y + offsY)|0,
                })
                steps.push({
                    x: (destRoomData.rect.x + destExitData.xInner + offsX)|0,
                    y: (destRoomData.rect.y + destExitData.yInner + offsY)|0,
                })
                destPosX = (destRoomData.rect.x + destExitData.xInner + offsX)|0
                destPosY = (destRoomData.rect.y + destExitData.yInner + offsY)|0
                entranceDir = ReverseExitDir.get(end.dir)
                color = "darkgreen"
            } else if (destRoomData && destRoomData.room == null) {
                steps.push({
                    x: (end.point.x + offsX)|0,
                    y: (end.point.y + offsY)|0,
                })
                destPosX = (steps[0].x + offsX)|0
                destPosY = (steps[0].y + offsY)|0
                color = "gray"
            }
            if (color == "gray") context.setLineDash([4, 4]);
            this.drawLink(context, roomData.rect, steps, exitData, color, offsX, offsY);
            context.setLineDash([]);
            if (entranceDir == ExitDir.Other && destRoomData.room == null) {
                const angle = this.calculateCardinalDirection({x:startPosX, y:startPosY}, {x:destPosX, y:destPosY});
                entranceDir = [ExitDir.East,ExitDir.SouthEast,ExitDir.South,ExitDir.SouthWest,ExitDir.West,ExitDir.NorthWest,ExitDir.North,ExitDir.NorthEast][angle];
            }
            if (!recursive) {
                if (entranceDir == ExitDir.Other) {
                    this.drawCircle(context, destPosX, destPosY, 3, this.scale, color)
                } else {
                    this.drawTriangle(context, entranceDir, destPosX, destPosY, 4, this.scale, color)
                }
            } else
                this.drawCircle(context, destPosX, destPosY, 3, this.scale, color)
                        
        }

        if (!forExport && this.selecting && this.selectionBox.w  && this.selectionBox.h) {
            let oldStroke = context.getLineDash(); 
            let oldStrokeColor = context.strokeStyle
            let cycle = Math.floor(this._drawTime / 20) % 6;
            cycle = [0,1,2,3,2,1][cycle]
            context.strokeStyle = 'black';
            context.setLineDash([6-(cycle), 3+(cycle)]);
            context.strokeRect(this.selectionBox.x, this.selectionBox.y, this.selectionBox.w, this.selectionBox.h);
            context.setLineDash(oldStroke);
            context.strokeStyle = oldStrokeColor
        }

        if (callback) callback();

        
    }
    private async assignThemeColors() {
        const panelback = $("#window-dock-Mapper").parent().css("backgroundColor")
        const panelFore = $("#window-dock-Mapper").parent().css("color")
        if (!this.isCustomBackground && panelback) {
            if (this.themeDark) {
                this.defaultDarkBackground = panelback
                this.defaultDarkForeground = "white"
            } else if (panelFore) {
                this.defaultLightBackground = panelFore
                this.defaultLightForeground = "black"
            }
        }

        if (!this.isCustomBackground)
            this.backColor = this.themeDark ? this.defaultDarkBackground : this.defaultLightBackground;
        if (!this.isCustomForeground)
            this.foreColor = this.themeDark ? this.defaultDarkForeground : this.defaultLightForeground;
    }

    DrawGrid(context: CanvasRenderingContext2D, forExport: boolean, scale: number) {
        let spacing = this.gridSize
        let canvas = this.canvas

        if (this.gridSize < 32) return;
        const prevComposite = context.globalCompositeOperation;
        context.globalCompositeOperation = "xor" //this.isDarkBackground ? 'lighten' : 'darken';
        
        context.beginPath(); // Start a new path
        const point = {x:0, y:0}

        const offsetX = this.x_scroll ;
        const offsetY = this.y_scroll ;
        const offset = {x:offsetX, y:offsetY}
        const viewportTL = {x:0, y:0}
        const viewportBR = {x:canvas.width, y:canvas.height}
        this.transformCanvasToRoomCoordinate(viewportTL, offsetX, offsetY, canvas)
        this.transformCanvasToRoomCoordinate(viewportBR, offsetX, offsetY, canvas)
        this.transformPointToCanvas(offset, 0, 0, canvas)
            
        // Draw vertical lines
        for (let x = viewportTL.x; x <= viewportBR.x + spacing; x += spacing) {
            point.x = this.closestMultiple(x, this.gridSize)
            point.y = 0
            this.transformPointToCanvas(point, offsetX, offsetY, canvas)
            context.moveTo(point.x, 0);
            context.lineTo(point.x, canvas.height);
        }

        // Draw horizontal lines
        for (let y = viewportTL.y; y <= viewportBR.y + spacing; y += spacing) {
            point.x = 0
            point.y = this.closestMultiple(y, this.gridSize)
            this.transformPointToCanvas(point, offsetX, offsetY, canvas)
            context.moveTo(0, point.y);
            context.lineTo(canvas.width, point.y);
        }

        context.strokeStyle = '#aaa'; // Set the line color
        const prevlw = context.lineWidth
        context.lineWidth = Math.max(1, Math.floor(1 * scale))
        context.stroke(); // Apply the lines to the canvas
        context.closePath()
        context.lineWidth = prevlw
        context.globalCompositeOperation = prevComposite
    }

    private drawHoverInfo(context: CanvasRenderingContext2D) {
        if (this._showLegend) return;
        context.save();
        context.font = `bold ${this.fontSize || 14}pt ${this.font || 'Tahoma, Arial, Helvetica, sans-serif'}`;
        const text1 = this.hover.name;
        let text2 = `#${this.hover.id || "Pos:"}`;
        if (this.hover.x != undefined) {
            text2 += ` x:${this.hover.x}, y:${this.hover.y}`;
        } else {
            text2 += "Map";
        }
        let w = context.measureText(text1).width;
        context.font = `${(this.fontSize || 14)-2}pt ${this.font || 'Tahoma, Arial, Helvetica, sans-serif'}`;
        let w2 = context.measureText(text2).width;
        if (w < w2)
            w = w2;
        w += 10;
        context.beginPath();
        let x = this.Mouse.x * 2 + 32;
        let y = this.Mouse.y * 2 + 48;
        if (x + w > this.canvas.width) {
            x -= w;
            x -= 64;
        }
        if (y + 50 > this.canvas.height) {
            y -= 50;
            y -= 64;
        }
        if (x < 0) {
            x = 5
        }
        if (y < 0) {
            y = 5
        }
        context.fillStyle = 'rgba(255,255,255,0.75)';
        context.fillRect(x, y, w, 50);
        context.rect(x + 5, y + 5, w - 10, 50 - 10);
        context.clip();
        context.fillStyle = 'black';
        context.font =  `bold ${this.fontSize || 14}pt ${this.font || 'Tahoma, Arial, Helvetica, sans-serif'}`;
        context.fillText(text1, x + 5, y + 20);
        context.font = `${(this.fontSize || 14)-2}pt ${this.font || 'Tahoma, Arial, Helvetica, sans-serif'}`;
        context.fillText(text2, x + 5, y + 40);
        context.closePath();
        context.restore();
    }
    private drawInnerToOuterExitLine(context:CanvasRenderingContext2D, start: { room: Room; dir: ExitDir; point: Point; }) {
        let outer = this.roomDrawRect(start.room, this.canvas);
        let exitData = this.createExitData(start.room, outer);
        let exit = exitData.get(start.dir);
        let offsX = 0;
        let offsY = 0;
        let endPosX = (outer.x + exit.xInner) | 0;
        let endPosY = (outer.y + exit.yInner) | 0;
        const steps: Point[] = [];
        steps.push({
            x: (endPosX + offsX) | 0,
            y: (endPosY + offsY) | 0,
        });
        const oldL = context.lineWidth
        context.lineWidth = (3 * this.scale)
        this.drawLink(context, outer, steps, exit, "white", offsX, offsY);
        context.lineWidth = (1 * this.scale)
        this.drawLink(context, outer, steps, exit, "black", offsX, offsY);
        context.lineWidth = oldL
    }
    calculateLabelsAndDrawLinks(context:CanvasRenderingContext2D, roomData:DrawData, drawData:Map<number,DrawData>, drawDataBelow:Map<number,DrawData>, drawDataAbove:Map<number,DrawData>, strokeColor:string, drawLabels:boolean, offsX:number, offsY:number) : LabelData[] {
        const ret:LabelData[] = []

        if (drawLabels && roomData.room.shortName && roomData.room.labelDir != undefined) {
            ret.push({
                pos: roomData.room.labelDir,
                room: roomData.room,
                rx: roomData.rect.x,
                ry: roomData.rect.y,
                text: roomData.room.shortName,
                color:strokeColor,
                scale: false
            })
            //this.drawLabel(context, roomData.room.labelDir, roomData.room, roomData.rect.x, roomData.rect.y, roomData.room.shortName, strokeColor, false)
        }
        for (const roomExit of Object.keys(roomData.room.exits)) {
            let ex = roomData.room.exits[<ExitDir>roomExit] as RoomExit;
            if (ex.nodraw) continue;
            if (ex.to_room) {
                let entranceDir = <ExitDir>roomExit
                let marker = false;
                let recursive = false;
                let reox = 0, reoy = 0;
                const exitData = roomData.exitData.get(<ExitDir>roomExit)
                if (exitData) {
                    marker = exitData.marker;
                    reox = exitData.x + offsX
                    reoy = exitData.y + offsY
                }

                const destRoom = this.mapper.getRoomById(ex.to_room)

                let destDrawData = null;
                if (destRoom) {
                    destDrawData = drawData.get(destRoom.id) || drawDataBelow.get(destRoom.id) || drawDataAbove.get(destRoom.id)
                }

                if (<ExitDir>roomExit == ExitDir.Other && ex.to_dir
                    && ex.to_dir == ExitDir.Other
                    && destRoom) {
                    const se = roomData.exitData.get(ExitDir.SouthEast)
                    const drawPos = {
                        x: se.xInner + (se.x - se.xInner)/2,
                        y: se.yInner + (se.y - se.yInner)/2
                    }
                    this.drawTriangle(context, ExitDir.South, roomData.rect.x + offsX + drawPos.x,  roomData.rect.y + offsY + drawPos.y, 4, this.scale, strokeColor)
                    this.drawTriangle(context, ExitDir.North,  roomData.rect.x + offsX + drawPos.x,  roomData.rect.y + offsY + drawPos.y, 4, this.scale, strokeColor)
                    continue;
                }
                if (destRoom && ex.to_dir && destRoom.exits[ex.to_dir] && destRoom.exits[ex.to_dir].to_room == roomData.room.id && destRoom != roomData.room && roomData.room.exits[destRoom.exits[ex.to_dir].to_dir] && roomData.room.exits[destRoom.exits[ex.to_dir].to_dir].to_room == destRoom.id) {
                    // ce room destinazione con uscita di destinazione (TWO WAY)
                    if (drawLabels && destRoom.zone_id != roomData.room.zone_id) {
                        // altra zona
                        if (marker) this.drawMarker(context, roomData.rect.x+reox, roomData.rect.y+reoy, 2, strokeColor, this.scale)
                        if (ex.label) {
                            const pos = ExitDir2LabelPos.get(roomExit as ExitDir);
                            if (pos != undefined) {
                                ret.push({
                                    pos: pos,
                                    room: roomData.room,
                                    rx: roomData.rect.x,
                                    ry: roomData.rect.y,
                                    text: ex.label,
                                    color:strokeColor,
                                    scale: false
                                })
                                //this.drawLabel(context, pos, roomData.room, roomData.rect.x, roomData.rect.y, ex.label, strokeColor, false)
                            }
                        } else {
                            const zn = this.mapper.getRoomZone(destRoom.id)
                            const pos = ExitDir2LabelPos.get(roomExit as ExitDir);
                            if (pos != undefined) {
                                if (zn.label) {
                                    ret.push({
                                        pos: pos,
                                        room: roomData.room,
                                        rx: roomData.rect.x,
                                        ry: roomData.rect.y,
                                        text: zn.label,
                                        color:strokeColor,
                                        scale: false
                                    })
                                    //this.drawLabel(context, pos, roomData.room, roomData.rect.x, roomData.rect.y, zn.label, strokeColor, false)
                                } else {
                                    ret.push({
                                        pos: pos,
                                        room: roomData.room,
                                        rx: roomData.rect.x,
                                        ry: roomData.rect.y,
                                        text: zn.name,
                                        color:strokeColor,
                                        scale: false
                                    })
                                    //this.drawLabel(context, pos, roomData.room, roomData.rect.x, roomData.rect.y, zn.name, strokeColor, false)
                                }
                            }
                        }
                    } else {
                        // disegna link da - a
                        if (!destDrawData) continue;
                        let destExitData = destDrawData.exitData.get(ex.to_dir)
                        if (!destExitData && roomData.room.z == destRoom.z) {
                            destExitData = destDrawData.exitData.get(ReverseExitDir.get(<ExitDir>roomExit))
                        } else if (!destExitData) {
                            // todo other Z
                            destExitData = exitData
                        }
                        if (!destExitData) continue;
                        const steps:Point[] = [
                            {
                                x: (destDrawData.rect.x + destExitData.x + offsX)|0,
                                y: (destDrawData.rect.y + destExitData.y + offsY)|0,
                            }
                        ];
                        if (destRoom == roomData.room) {
                            recursive = true
                        }
                        let clr = strokeColor
                        if ((this.selectedExit && this.selectedExit == ex) ||
                            (this.selectedReverseExit && this.selectedReverseExit == ex)) {
                            clr = this.selectedColor;
                        }
                        if (!recursive) this.drawLink(context, roomData.rect, steps, exitData, roomData.room.z != destDrawData.room.z ? "gray" : clr, offsX, offsY);
                    }
                } else if (destRoom && ex.to_dir && ex.to_dir != ExitDir.Other && (roomData.room == destRoom || !destRoom.exits[ex.to_dir] || destRoom.exits[ex.to_dir].to_room != roomData.room.id || destRoom.exits[ex.to_dir].to_dir != roomExit)) {
                    // one way
                    let destPosX=(roomData.rect.x+reox+offsX)|0,destPosy=(roomData.rect.y+reoy+offsY)|0;
                    if (drawLabels && destRoom.zone_id != roomData.room.zone_id) {
                        // altra zona
                        if (marker) this.drawMarker(context, roomData.rect.x+reox, roomData.rect.y+reoy, 2, strokeColor, this.scale)
                        if (ex.label) {
                            const pos = ExitDir2LabelPos.get(roomExit as ExitDir);
                            if (pos != undefined) {
                                ret.push({
                                    pos: pos,
                                    room: roomData.room,
                                    rx: roomData.rect.x,
                                    ry: roomData.rect.y,
                                    text: ex.label,
                                    color:strokeColor,
                                    scale: false
                                })
                                //this.drawLabel(context, pos, roomData.room, roomData.rect.x, roomData.rect.y, ex.label, strokeColor, false)
                            }
                        } else {
                            const zn = this.mapper.getRoomZone(destRoom.id)
                            const pos = ExitDir2LabelPos.get(roomExit as ExitDir);
                            if (pos != undefined) {
                                if (zn.label) {
                                    ret.push({
                                        pos: pos,
                                        room: roomData.room,
                                        rx: roomData.rect.x,
                                        ry: roomData.rect.y,
                                        text: zn.label,
                                        color:strokeColor,
                                        scale: false
                                    })
                                    //this.drawLabel(context, pos, roomData.room, roomData.rect.x, roomData.rect.y, zn.label, strokeColor, false)
                                } else {
                                    ret.push({
                                        pos: pos,
                                        room: roomData.room,
                                        rx: roomData.rect.x,
                                        ry: roomData.rect.y,
                                        text: zn.name,
                                        color:strokeColor,
                                        scale: false
                                    })
                                    //this.drawLabel(context, pos, roomData.room, roomData.rect.x, roomData.rect.y, zn.name, strokeColor, false)
                                }
                            }
                        }
                    } else {
                        // disegna link da - a
                        if (!destDrawData) continue;
                        const destExitData = destDrawData.exitData.get(ex.to_dir)
                        if (destExitData) {
                            destPosX = (destDrawData.rect.x + destExitData.x + offsX)|0
                            destPosy = (destDrawData.rect.y + destExitData.y + offsY)|0
                            entranceDir = ReverseExitDir.get(ex.to_dir as ExitDir);
                        }
                        /*if (destExitData && this.PointInRect(destDrawData.rect.x + destExitData.x, destDrawData.rect.y + destExitData.y, roomData.rect.x, roomData.rect.x2, roomData.rect.y, roomData.rect.y2))
                        { // TODO OVERLAP - but not when close
                            destPosX=roomData.rect.x+reox+offsX,destPosy=roomData.rect.y+reoy+offsY;
                            if (destRoom == roomData.room) {
                                recursive = true
                            }
                        } else */{
                            const steps:Point[] = [ ];
 
                            if (destRoom == roomData.room && exitData) {
                                recursive = true
                                destPosX = (roomData.rect.x + exitData.xMid + offsX)|0
                                destPosy = (roomData.rect.y + exitData.yMid + offsY)|0
                            } else if (destExitData) {
                                steps.push({
                                    x: (destDrawData.rect.x + destExitData.x + offsX)|0,
                                    y: (destDrawData.rect.y + destExitData.y + offsY)|0,
                                })
                                steps.push({
                                    x: (destDrawData.rect.x + destExitData.xInner + offsX)|0,
                                    y: (destDrawData.rect.y + destExitData.yInner + offsY)|0,
                                })
                                destPosX = (destDrawData.rect.x + destExitData.xMid + offsX)|0
                                destPosy = (destDrawData.rect.y + destExitData.yMid + offsY)|0
                            }
                            let clr = strokeColor
                            if ((this.selectedExit && this.selectedExit == ex) ||
                                (this.selectedReverseExit && this.selectedReverseExit == ex)) {
                                clr = this.selectedColor
                            }
                            if (!recursive) this.drawLink(context, roomData.rect, steps, exitData, roomData.room.z != destDrawData.room.z ? "gray" : clr, offsX, offsY);
                        }
                    }
                    
                    if (marker) { // freccetta per one way
                        let clr = strokeColor
                        if ((this.selectedExit && this.selectedExit == ex) ||
                            (this.selectedReverseExit && this.selectedReverseExit == ex)) {
                            clr = this.selectedColor
                        }
                        switch (<ExitDir>roomExit) {
                            case ExitDir.North:
                            case ExitDir.NorthEast:
                                if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : clr)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, clr)
                                break;
                            case ExitDir.East:
                            case ExitDir.SouthEast:
                                    if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : clr)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, clr)
                                break;
                            case ExitDir.South:
                            case ExitDir.SouthWest:
                                    if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : clr)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, clr)
                                break;
                            case ExitDir.West:
                            case ExitDir.NorthWest:
                                    if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : clr)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, clr)
                                break;
                            default:
                                break;
                        }
                    }
                } else if (destRoom == roomData.room && exitData) {
                    recursive = true
                    const destPosX = roomData.rect.x + exitData.xInner + offsX
                    const destPosy = roomData.rect.y + exitData.yInner + offsY
                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, strokeColor)
                }
            }
        }

        return ret;
    }

    drawLink(ctx:CanvasRenderingContext2D, start:Rect, steps:Point[], exitData: ExitDataPos, color:string, offsX:number, offsY:number) {
        if (!exitData) return;
        let newY = .5+((start.y + exitData.y + offsY)|0)
        let newX = .5+((start.x + exitData.x + offsX)|0)
        let diagonal = false;
        if (steps.length) {
            const nextY = .5+(steps[0].y|0)+ offsY;
            const nextX = .5+(steps[0].x|0)+ offsX;
            
            if (nextX == newX && nextY == newY ||
                (Math.abs(nextX-newX)+Math.abs(nextY-newY)) < 4) {
                // ends on same point
                return;
            }

            diagonal = Math.abs(nextX-newX)>3 && Math.abs(nextY-newY) > 3;
        }

        const lw = ctx.lineWidth
        ctx.save()
        ctx.beginPath();
        ctx.lineWidth = lw+1
        ctx.strokeStyle = color; //"black"; //diagonal ? ctx.strokeStyle : "rgba(222,222,222,0.5)"

        ctx.moveTo(newX, newY)
        for (const st of steps) {
            ctx.lineTo(.5+(st.x|0), .5+(st.y|0))            
        }
        ctx.stroke()

        if (true) {
            ctx.restore();
            return;
        }
        ctx.beginPath();
        ctx.strokeStyle = color

        let offsetX = 0;
        let offsetY = 0;
        if (steps[0]) {
            if (.5+(steps[0].y|0) == newY) {
                offsetX = 2
            }
            if (.5+(steps[0].x|0) == newX) {
                offsetY = 2
            }
        }
        ctx.moveTo(newX-2+offsetX, newY-2+offsetY)
        for (const st of steps) {
            ctx.lineTo(.5+(st.x|0)-2+offsetX, .5+(st.y|0)-2+offsetY)            
        }
        ctx.stroke()
        ctx.beginPath();
        ctx.strokeStyle = color
        offsetX = -offsetX;
        offsetY = -offsetY;

        ctx.moveTo(newX+2+offsetX, newY+2+offsetY)
        for (const st of steps) {
            ctx.lineTo(.5+(st.x|0)+2+offsetX, .5+(st.y|0)+2+offsetY)            
        }
        ctx.stroke()
        ctx.restore()
    }

    createExitData(room:Room, rect:Rect): Map<ExitDir, ExitDataPos> {
        if (!room) return null;
        const ret = new Map<ExitDir, ExitDataPos>()
        const ratio = 4
        for (const re of Object.keys(ExitDir).map(k => (ExitDir as any)[k])) {
            let ex = room.exits[<ExitDir>re] as RoomExit;
            let reox = 0, reoy = 0, reox2 = 0, reoy2 = 0;
            switch (<ExitDir>re) {
                case ExitDir.Other:
                    reox = rect.w/2;
                    reoy = rect.h/2;
                    reox2 = reox;
                    reoy2 = reoy;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.North:
                    reox = rect.w/2;
                    reoy = 0;
                    reox2 = reox;
                    reoy2 = rect.h/ratio;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.NorthEast:
                    reox = rect.w;
                    reoy = 0;
                    reox2 = reox-rect.w/ratio;
                    reoy2 = rect.h/ratio;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.East:
                    reox = rect.w;
                    reoy = rect.h/2;
                    reox2 = reox-rect.w/ratio;
                    reoy2 = rect.h/2;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.SouthEast:
                    reox = rect.w;
                    reoy = rect.h;
                    reox2 = reox-rect.w/ratio;
                    reoy2 = reoy-rect.h/ratio;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.South:
                    reox = rect.w/2;
                    reoy = rect.h;
                    reox2 = reox;
                    reoy2 = reoy-rect.h/ratio;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.SouthWest:
                    reox = 0;
                    reoy = rect.h;
                    reox2 = rect.w/ratio;
                    reoy2 = reoy-rect.h/ratio;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.West:
                    reox = 0;
                    reoy = rect.h/2;
                    reox2 = rect.w/ratio;
                    reoy2 = reoy;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.NorthWest:
                    reox = 0;
                    reoy = 0;
                    reox2 = rect.w/ratio;
                    reoy2 = rect.h/ratio;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        xMid: 0,
                        yMid: 0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                default:
                    break;
            }
        }
        for (const v of ret.values()) {
            const midX = (v.x + v.xInner) / 2;
            const midY = (v.y + v.yInner) / 2;
            v.xMid = midX
            v.yMid = midY
        }
        return ret;
    }

    DrawRect(ctx: CanvasRenderingContext2D, rect: Rect, ox:number, oy:number, room: Room, stroke: string, fill: string, scale: number) {
        ctx.fillStyle = fill || 'transparent';
        ctx.strokeStyle = stroke || 'transparent';
        ctx.fillRect(rect.x+ox, rect.y+oy,rect.w, rect.h);
        ctx.strokeRect(rect.x+ox, rect.y+oy,rect.w, rect.h);
    }

    public drawCircle(ctx:CanvasRenderingContext2D, cx:number, cy:number, radius:number, scale:number, color:string='black') {
        ctx.beginPath();
        ctx.arc(cx, cy, radius*scale, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.lineWidth = (0.6 * scale)|0;
        ctx.strokeStyle = color
        ctx.stroke();
    }

    public drawTriangle(ctx:CanvasRenderingContext2D, dir:ExitDir, cx:number, cy:number, radius:number, scale:number, color:string='black') {

        ctx.beginPath();

        let ym = 0;
        let xm = 0;
        let initialRotate = 0;

        switch (dir) {
            case ExitDir.North:
            case ExitDir.NorthEast:
            case ExitDir.NorthWest:
                if (dir == ExitDir.NorthEast) initialRotate = 45;
                if (dir == ExitDir.NorthWest) initialRotate = -45;
                ym = -1;
                break;
            case ExitDir.South:
            case ExitDir.SouthEast:
            case ExitDir.SouthWest:
                if (dir == ExitDir.SouthEast) initialRotate = -45;
                if (dir == ExitDir.SouthWest) initialRotate = 45;
                ym = 1;
            break;
            case ExitDir.East:
                xm = 1;
                break;
            case ExitDir.West:
                xm = -1;
                break;                    
            default:
                break;
        }

        let p1 = {
            x: xm * radius*scale,
            y: ym * radius*scale
        }

        if (initialRotate) {
            const rot = initialRotate * (Math.PI/180)
            const tmp = {
                x: (p1.x * Math.cos(rot) - p1.y * Math.sin(rot) ),
                y: (p1.x * Math.sin(rot) + p1.y * Math.cos(rot) )
            }
            p1 = tmp;
        }

        const p2 = {
            x: (p1.x * Math.cos(2.0944) - p1.y * Math.sin(2.0944) ),
            y: (p1.x * Math.sin(2.0944) + p1.y * Math.cos(2.0944) )
        }

        const p3 = {
            x: (p1.x * Math.cos(4.18879) - p1.y * Math.sin(4.18879) ),
            y: (p1.x * Math.sin(4.18879) + p1.y * Math.cos(4.18879) )
        }

        p1.x += cx;
        p1.y += cy;
        p2.x += cx;
        p2.y += cy;
        p3.x += cx;
        p3.y += cy;

        const minX = Math.min(Math.min(p1.x, p2.x), p3.x)
        const minY = Math.min(Math.min(p1.y, p2.y), p3.y)
        
        ctx.moveTo((p1.x)|0, (p1.y)|0);
        ctx.lineTo((p2.x)|0, (p2.y)|0);
        ctx.lineTo((p3.x)|0, (p3.y)|0);
        ctx.closePath();
        ctx.fillStyle = color
        ctx.fill();
        
    }
    
    public DrawLegend(ctx:CanvasRenderingContext2D, x:number, y:number, nc:number) {
        if (!this._showLegend) return;
        ctx.strokeStyle = 'black';
        const rows = 6;
        const colWidth = 230;
        let h = rows * 70 + 35
        const w = Math.ceil(RoomTypeNames.size / rows);

        if (!nc) {
            ctx.fillStyle = '#eae4d6';
            //ctx.clearRect(x + 30, y + 35, 130, 145);

            ctx.fillRoundedRect(x + 50, y + 5, 115, 30, 5);
            ctx.strokeRoundedRect(x + 50, y + 5, 115, 30, 5)

            ctx.fillRoundedRect(x + 30, y + 35, colWidth*w, h, 5);
            ctx.strokeRoundedRect(x + 30, y + 35, colWidth*w, h, 5)

            ctx.font = 'bold 14pt Arial';
            ctx.fillStyle = 'black';
            ctx.fillText("Leggenda:", x + 60, y + 27);
        }

        ctx.fillStyle = 'black';
        ctx.font = 'bold 12pt Arial';

        for (let index = 0; index < RoomTypeNames.size; index++) {
            const xoffset = Math.floor(index / rows) * colWidth;
            const roomTypeName = RoomTypeNames.get(index);
            ctx.drawImage(RoomTypeImages.get(index), x + 50 + xoffset, y + 50 + index%rows * 70)
            ctx.fillText(roomTypeName, x + 120 + xoffset, y + 90 + index%rows * 70);
        }

    }

    private translate(ctx:CanvasRenderingContext2D, amt:number, scale:number) {
        //if (scale >= 2) return;
        const o = amt - amt * scale;
        ctx.translate(amt * scale + o, amt * scale + o);
    }

    roomHash(room:Room) {
        let otherTp = false;
        let prefix = ""
        if (room.exits.other) {
            otherTp = !!(room.exits.other.name||"").toLowerCase().match("teleport")
        }
        if (room.id == this.selectedExit?.to_room) {
            prefix += "selEx-"
        }
        if (room.id == this.selectedReverseExit?.to_room) {
            prefix += "selRevEx-"
        }
        return prefix + this.isIndoor(room) + "," + otherTp + "," + room.type + "," + room.teleport + ',' + (room.color) + ',' + Object.keys(room.exits).filter(re => room.exits[<ExitDir>re].to_room != room.id).map(v => v + room.exits[<ExitDir>v].type + (this.selectedExit==room.exits[<ExitDir>v]?"se":"nse") + (this.selectedReverseExit==room.exits[<ExitDir>v]?"sre":"nsre")).join()
    }

    wallsHash(room:Room) {
        return this.isIndoor(room) + "," + room.type + ',' + Object.keys(room.exits).filter(e => this.exitLeadsSomewhere(room.exits[<ExitDir>e], room)).join()
    }

    public DrawWalls(ctx:CanvasRenderingContext2D, rect:Rect, room:Room, forExport:boolean, scale?:number) {
        const x = rect.x
        const y = rect.y
        if (!this.$wallsCache)
            this.$wallsCache = {};
        
        if (!this.$drawCache)
            this.$drawCache = {};

        if (!scale) scale = this.scale;

        const roomKey = this.roomHash(room);

        this.cacheRoom(roomKey, scale, room);

        if (this.drawWalls) {
            const prevComposite = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = this.isDarkBackground ? 'lighten' : 'darken';
            const wallsKey = this.wallsHash(room);

            const wall = this.cacheWalls(wallsKey, scale, room);

            if (wall) {
                ctx.drawImage(wall, (x), (y), Math.ceil(32 * scale), Math.ceil(32 * scale));

                //ctx.drawImage(wall, x+.5 | 0, y+.5 | 0 );
            }
            ctx.globalCompositeOperation = prevComposite
        }
    }

    private closestMultiple(numToRound:number, multiple:number)
    {
        let quotient = Math.floor(numToRound / multiple);
        return quotient * multiple;

        if (multiple == 0)
            return numToRound;

        const remainder = Math.abs(numToRound) % multiple;
        if (remainder == 0)
            return numToRound;

        if (numToRound < 0)
            return -(Math.abs(numToRound) - remainder);
        else
            return numToRound + multiple - remainder;
    }

    public DrawRoom(ctx:CanvasRenderingContext2D, rect:Rect, room:Room, forExport:boolean, scale?:number) {
        const {x, y} = {x: rect.x, y: rect.y}; //to_screen_coordinate(rect.x, rect.y);

        const key = this.roomHash(room);
        const lineSelectionMulti = 6;
        
        if (!this.$drawCache[key]) return;

        if (!scale) scale = this.scale;

        ctx.drawImage(this.$drawCache[key], (x), (y), Math.ceil(32 * scale), Math.ceil(32 * scale));

        this.DrawDoor(ctx,  (x + 12 * scale)|0, (y + 1 * scale)|0, (8 * scale)|0, (2 * scale)|0, room.exits.n);
        this.DrawDoor(ctx,  (x + 30 * scale)|0, (y + 12 * scale)|0, (2 * scale)|0, (8 * scale)|0, room.exits.e);
        this.DrawDoor(ctx,  (x + 1 * scale)|0, (y + 12 * scale)|0, (2 * scale)|0, (8 * scale)|0, room.exits.w);
        this.DrawDoor(ctx,  (x + 12 * scale)|0, (y + 30 * scale)|0, (8 * scale)|0, (2 * scale)|0, room.exits.s);
        this.DrawDDoor(ctx, (x)|0, (y)|0, (5 * scale)|0, (5 * scale)|0, room.exits.nw);
        this.DrawDDoor(ctx, (x + 32 * scale)|0, (y)|0, (-5 * scale)|0, (5 * scale)|0, room.exits.ne);
        this.DrawDDoor(ctx, (x + 32 * scale)|0, (y + 32 * scale)|0, (-5 * scale)|0, (-5 * scale)|0, room.exits.se);
        this.DrawDDoor(ctx, (x)|0, (y + 32 * scale)|0, (5 * scale)|0, (-5 * scale)|0, room.exits.sw);

        let inSelection = false
        if (this.selecting && this.selectionBox.w  && this.selectionBox.h) {
            let sbX = Math.min(this.selectionBox.x, this.selectionBox.x + this.selectionBox.w)
            let sbY = Math.min(this.selectionBox.y, this.selectionBox.y + this.selectionBox.h)
            let sbW = Math.abs(this.selectionBox.w)
            let sbH = Math.abs(this.selectionBox.h)
            
            inSelection = this.PointInRect(rect.x+rect.w/2, rect.y+rect.h/2, sbX, sbX + sbW, sbY, sbY + sbH);   
        }

        const tm = Math.floor(this._drawTime/2) % 60
        let c = Math.floor(lineSelectionMulti * (tm > 30 ? 60-tm : tm)); //this.lineSelectionAlpha + (Math.floor(this._drawTime/10) % 60 > 30 ? 30 - Math.floor(this._drawTime/10) % 60 : Math.floor(this._drawTime/10) % 60);
            
        if (!forExport && this.selectedRooms.size > 0 && this.selectedRooms.has(room.id)) {
            if (this.$focused) {
                ctx.fillStyle = 'rgba(235, 255, 65, 0.75)';
                ctx.strokeStyle = 'gray';
            }
            else {
                ctx.fillStyle = 'rgba(142, 142, 185, 0.5)';
                ctx.strokeStyle = 'rgba(142, 142, 255, 0.5)';
            }
            const oldLw = ctx.lineWidth
            if (inSelection) {
                ctx.fillStyle = 'rgba(135, 155, 235, 0.75)';
            }
            ctx.strokeStyle = `rgb(${c},${c},${c})`
            ctx.lineWidth = (2 * 1)|0
            ctx.fillRoundedRect((x+6* scale)|0, (y+6* scale)|0, (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
            ctx.strokeRoundedRect((x+6* scale)|0, (y+6* scale)|0, (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
            ctx.lineWidth = oldLw
        } else if (!forExport && inSelection) {
            ctx.fillStyle = 'rgba(135, 155, 235, 0.75)'; 
            ctx.fillRoundedRect((x+6* scale)|0, (y+6* scale)|0, (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
            const oldLw = ctx.lineWidth
            ctx.lineWidth = (2 * 1)|0
            ctx.strokeStyle = `rgb(${c},${c},${c})`
            ctx.strokeRoundedRect((x+6* scale)|0, (y+6* scale)|0, (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
            ctx.lineWidth = oldLw
        }
        if (this.markers.get(room.id) == 2)
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'green', scale);
        else if (this.markers.get(room.id) == 3)
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'blue', scale);
        else if (this.markers.get(room.id))
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'yellow', scale);
        if (!forExport && this.current && room.id == this.current.id) {
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, `rgb(0,${50+c},${230-c})`, scale);
            //console.log("active ", rect.x, rect.y, rect.w, rect.h, room.id)
        }
    }

    public DrawMovedRoom(ctx:CanvasRenderingContext2D, rect:Rect, room:Room, forExport:boolean, scale?:number) {
        let {x, y} = {x: room.x, y: room.y}; //to_screen_coordinate(rect.x, rect.y);
        if (!scale) scale = this.scale;

        const oldLw = ctx.lineWidth

        if (!forExport && this.selectedRooms.size > 0 && this.movedRoom && this.selectedRooms.has(room.id)) {
            if (Math.abs(this.MouseDrag.x+this.MouseDrag.y)>0) {
                ({ x, y } = this.calculateMovedRoomDrawPosition(x, y, scale));
                ctx.lineWidth = 2
                ctx.strokeStyle = "black"
                ctx.fillStyle = 'rgba(135, 165, 250, 0.85)';
                ctx.fillRoundedRect(((x+6* scale)|0), ((y+6* scale)|0), (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
                ctx.strokeRoundedRect(((x+6* scale)|0), ((y+6* scale)|0), (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
            }
        } 
        ctx.lineWidth = oldLw
    }

    private calculateMovedRoomDrawPosition(x: number, y: number, scale: number) {
        ({ x, y } = this.calculateMovedRoomPos(x, y));
        x /= 7.5;
        y /= 7.5;
        x -= this.x_scroll;
        y -= this.y_scroll;
        x *= scale;
        y *= scale;
        x += this.canvas.width / 2;
        y += this.canvas.height / 2;
        x = Math.floor(x)
        y = Math.floor(y)
        return { x, y };
    }

    private calculateMovedRoomPos(x: number, y: number, useGrid:boolean = true) {
        x -= 7.5 * this.movedRoomOffset.x;
        y -= 7.5 * this.movedRoomOffset.y;
        x = this.closestMultiple(x + Math.floor((useGrid ? this.gridSize : 1) / 2), (useGrid ? this.gridSize : 1));
        y = this.closestMultiple(y + Math.floor((useGrid ? this.gridSize : 1) / 2), (useGrid ? this.gridSize : 1));
        x = Math.floor(x)
        y = Math.floor(y)
        return { x, y };
    }

    public DrawRoomCreation(ctx:CanvasRenderingContext2D, forExport:boolean, scale?:number) {
        if (!scale) scale = this.scale;

        const oldLw = ctx.lineWidth

        if (!forExport) {
            if (this.editMode == EditMode.CreateRoom && this.createRoomPos) {
                const p = {x: 0, y: 0}
                this.transformCanvasToRoomCoordinate(p, this.x_scroll + this.createRoomPos.x, this.y_scroll + this.createRoomPos.y, this.canvas)
                p.x = this.closestMultiple(p.x, this.gridSize)
                p.y = this.closestMultiple(p.y, this.gridSize)
                const roomX = p.x
                const roomY = p.y
                p.x += 6*7.5
                p.y += 6*7.5
                this.transformPointToCanvas(p, this.x_scroll, this.y_scroll, this.canvas)
                ctx.lineWidth = 2
                ctx.strokeStyle = "black"
                ctx.fillStyle = 'rgba(135, 165, 250, 0.85)';
                ctx.fillRoundedRect(p.x, p.y, (20 * scale)|0, (20 * scale)|0, (7 * scale)|0);
                ctx.strokeRoundedRect(p.x, p.y, (20 * scale)|0, (20 * scale)|0, (7 * scale)|0);
                this.drawText(ctx, 16+this.Mouse.x*2, 32+this.Mouse.y*2, "black", `${(roomX)}/${(roomY)}`)
            }
        } 
        ctx.lineWidth = oldLw
    }

    drawText(ctx: CanvasRenderingContext2D, x: number, y: number, fillStyle: string, text:string) {
        ctx.fillStyle = fillStyle
        //this.translate(ctx, .5, 1)
        ctx.fillText(text, x, y)
        //this.translate(ctx, -.5, 1)
    }

    drawLabel(ctx: CanvasRenderingContext2D, pos:LabelPos, room:Room, rx: number, ry: number, text:string, color:string='black', scale:boolean = false) {
        if (pos == LabelPos.Hidden) return;
        const metric = ctx.measureText(text)
        const textWidth = metric.width;
        let shiftX = 0;
        let shiftY = 0;
        const textHeight = 8;
        let centerX = false;
        let alignRight = false;
        let lx = 0, ly = 0;
        switch (pos) {
            case LabelPos.North:
                lx = rx + 16 * this.scale;
                ly = ry;
                shiftY = -8;
                shiftX = 0;
                centerX = true;
                break;
            case LabelPos.NorthEast:
                lx = rx + 32 * this.scale;
                ly = ry;
                shiftY = -1;
                shiftX = 1;
                break;
            case LabelPos.East:
                lx = rx + 32 * this.scale;
                ly = ry + 16 * this.scale;
                shiftY = 0;
                shiftX = 5;
                break;
            case LabelPos.SouthEast:
                lx = rx + 32 * this.scale;
                ly = ry + 32 * this.scale;
                shiftY = 1;
                shiftX = 1;
                break;
            case LabelPos.South:
                lx = rx + 16 * this.scale;
                ly = ry + 34 * this.scale;
                centerX = true;
                shiftY = 8;
                shiftX = 0;
                break;
            case LabelPos.Down:
            case LabelPos.SouthWest:
                lx = rx + 0 * this.scale;
                ly = ry + 32 * this.scale;
                alignRight = true
                shiftY = 1;
                shiftX = -1;
                break;
            case LabelPos.West:
                lx = rx + 0 * this.scale;
                ly = ry + 16 * this.scale;
                alignRight = true
                shiftY = 0;
                shiftX = -5;
                break;
            case LabelPos.NorthWest:
            case LabelPos.Up:
                lx = rx + 0 * this.scale;
                ly = ry + 0 * this.scale;
                alignRight = true
                shiftY = -1;
                shiftX = -1;
                break;   
            case LabelPos.Center:
                lx = rx + 17 * this.scale;
                ly = ry + 17 * this.scale;
                centerX = true;
                break;                             
            default:
                break;
        }
        ly += textHeight/2.0;
        if (centerX) {
            lx -= textWidth/2.0;
        }
        else if (alignRight) {
            lx -= textWidth;
        }

        lx += shiftX * this.scale;
        ly += shiftY * this.scale;

        lx = lx|0
        ly = ly|0
        this.drawText(ctx, lx, ly, color, text)
    }
    
    isIndoor(room:Room) {
        return room.type == undefined ||
         room.type == RoomType.Inside ||
         room.type == RoomType.Underground ||
         room.type == RoomType.Underwater;
    }

    getFillColor(room:Room) {
        if (room.color && room.color != "rgb(255,255,255)") {
            return room.color;
        } else {
            return MapperDrawing.defaultRoomFillColor;
        }
        return null;
    }

    private cacheRoom(key: string, scale: number, room: Room) {
        if (!this.$drawCache[key]) {
            this.$drawCache[key] = document.createElement('canvas');
            this.$drawCache[key].classList.add('map-canvas');
            this.$drawCache[key].height = Math.ceil(32 * scale)|0;
            this.$drawCache[key].width = Math.ceil(32 * scale)|0;
            const tx = this.$drawCache[key].getContext('2d') as CanvasRenderingContext2D;
            this.translate(tx, 0.5, scale);
            tx.beginPath();
            let fill = false;
            tx.fillStyle = this.getFillColor(room);
            fill = tx.fillStyle != null;
            let fillWalls = false
            
            tx.strokeStyle = 'black';
            tx.lineWidth = (0.6 * scale)|0;
            if (true || !this.isIndoor(room)) {
                let img:HTMLImageElement = null;
                img = RoomTypeImages.get(room.type || 0)
                fillWalls = false
                tx.save()
                if (this.drawRoomType && img) {
                    tx.globalAlpha = 0.7;
                    tx.drawImage(img, 0, 0, (32 * scale), (32 * scale))
                }
                //tx.arc(16 * scale, 16 * scale, 8 * scale, 0, Math.PI * 2, false);
                const radius = (4 * scale)|0;
                const width = (16 * scale)|0;
                const height = (16 * scale)|0;
                const x = (8 * scale)|0;
                const y = (8 * scale)|0;
                tx.moveTo(x + radius, y);
                tx.lineTo(x + width - radius, y);
                tx.quadraticCurveTo(x + width, y, x + width, y + radius);
                tx.lineTo(x + width, y + height - radius);
                tx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                tx.lineTo(x + radius, y + height);
                tx.quadraticCurveTo(x, y + height, x, y + height - radius);
                tx.lineTo(x, y + radius);
                tx.quadraticCurveTo(x, y, x + radius, y);

                if (fill)
                    tx.fill();

                tx.restore()

                tx.stroke();                

            }
            else {
                if (fill)
                    tx.fillRect((8 * scale)|0, (8 * scale)|0, (16 * scale)|0, (16 * scale)|0);
                tx.strokeRect((8 * scale)|0, (8 * scale)|0, (16 * scale)|0, (16 * scale)|0);
            }
            tx.closePath();
            tx.strokeStyle = this.foreColor || 'black';
            tx.beginPath();
            tx.fillStyle = '#ACADAC';
            if (room.exits.n && room.exits.n.to_room != room.id) {
                if (room.exits.n == this.selectedExit ||
                    room.exits.n == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                tx.moveTo(((15 * scale)|0), ((0 * scale)|0));
                tx.lineTo(((15 * scale)|0), ((8 * scale)|0));
                tx.moveTo(((16 * scale)|0), ((0 * scale)|0));
                tx.lineTo(((16 * scale)|0), ((8 * scale)|0));
                tx.moveTo(((17 * scale)|0), ((0 * scale)|0));
                tx.lineTo(((17 * scale)|0), ((8 * scale)|0));
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls)
                tx.fillRect(9 * scale, 0 * scale, 14 * scale, 4 * scale);

            if (room.exits.nw && room.exits.nw.to_room != room.id) {
                if (room.exits.nw == this.selectedExit ||
                    room.exits.nw == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                if (!this.isIndoor(room)) {
                    tx.moveTo(0 * scale, 0 * scale);
                    tx.lineTo(10 * scale, 10 * scale);
                }
                else {
                    tx.moveTo(0 * scale, 0 * scale);
                    tx.lineTo(8 * scale, 8 * scale);
                }
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls) {
                tx.fillRect(2 * scale, 0 * scale, 2 * scale, 2 * scale);
                tx.fillRect(0 * scale, 2 * scale, 4 * scale, 2 * scale);
                if (!room.exits.n)
                    tx.fillRect(4 * scale, 0 * scale, 5 * scale, 4 * scale);
                if (!room.exits.w)
                    tx.fillRect(0 * scale, 4 * scale, 4 * scale, 5 * scale);
            }

            if (room.exits.ne && room.exits.ne.to_room != room.id) {
                if (room.exits.ne == this.selectedExit ||
                    room.exits.ne == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                if (!this.isIndoor(room)) {
                    tx.moveTo(32 * scale, 0 * scale);
                    tx.lineTo(22 * scale, 10 * scale);
                }
                else {
                    tx.moveTo(32 * scale, 0 * scale);
                    tx.lineTo(24 * scale, 8 * scale);
                }
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls) {
                tx.fillRect(28 * scale, 0 * scale, 2 * scale, 2 * scale);
                tx.fillRect(28 * scale, 2 * scale, 4 * scale, 2 * scale);
                tx.clearRect(30 * scale, 0 * scale, 2 * scale, 2 * scale);
                if (!room.exits.n)
                    tx.fillRect(23 * scale, 0 * scale, 5 * scale, 4 * scale);
                if (!room.exits.e)
                    tx.fillRect(28 * scale, 4 * scale, 4 * scale, 5 * scale);
            }

            if (room.exits.e && room.exits.e.to_room != room.id) {
                if (room.exits.e == this.selectedExit ||
                    room.exits.e == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                tx.moveTo((24 * scale)|0, (15 * scale)|0);
                tx.lineTo((32 * scale)|0, (15 * scale)|0);
                tx.moveTo((24 * scale)|0, (16 * scale)|0);
                tx.lineTo((32 * scale)|0, (16 * scale)|0);
                tx.moveTo((24 * scale)|0, (17 * scale)|0);
                tx.lineTo((32 * scale)|0, (17 * scale)|0);
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls)
                tx.fillRect(28 * scale, 9 * scale, 4 * scale, 14 * scale);

            if (room.exits.w && room.exits.w.to_room != room.id) {
                if (room.exits.w == this.selectedExit ||
                    room.exits.w == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                tx.moveTo((0 * scale)|0, (15 * scale)|0);
                tx.lineTo((8 * scale)|0, (15 * scale)|0);
                tx.moveTo((0 * scale)|0, (16 * scale)|0);
                tx.lineTo((8 * scale)|0, (16 * scale)|0);
                tx.moveTo((0 * scale)|0, (17 * scale)|0);
                tx.lineTo((8 * scale)|0, (17 * scale)|0);
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls)
                tx.fillRect(0 * scale, 9 * scale, 4 * scale, 14 * scale);

            if (room.exits.s && room.exits.s.to_room != room.id) {
                if (room.exits.s == this.selectedExit ||
                    room.exits.s == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                tx.moveTo(((15 * scale)|0), ((24 * scale)|0));
                tx.lineTo(((15 * scale)|0), ((32 * scale)|0));
                tx.moveTo(((16 * scale)|0), ((24 * scale)|0));
                tx.lineTo(((16 * scale)|0), ((32 * scale)|0));
                tx.moveTo(((17 * scale)|0), ((24 * scale)|0));
                tx.lineTo(((17 * scale)|0), ((32 * scale)|0));
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls)
                tx.fillRect(9 * scale, 28 * scale, 14 * scale, 4 * scale);

            if (room.exits.se && room.exits.se.to_room != room.id) {
                if (room.exits.se == this.selectedExit ||
                    room.exits.se == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                if (!this.isIndoor(room)) {
                    tx.moveTo(32 * scale, 32 * scale);
                    tx.lineTo(22 * scale, 22 * scale);
                }
                else {
                    tx.moveTo(32 * scale, 32 * scale);
                    tx.lineTo(24 * scale, 24 * scale);
                }
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls) {
                tx.fillRect(28 * scale, 28 * scale, 4 * scale, 2 * scale);
                tx.fillRect(28 * scale, 30 * scale, 2 * scale, 2 * scale);
                if (!room.exits.s)
                    tx.fillRect(23 * scale, 28 * scale, 5 * scale, 4 * scale);
                if (!room.exits.e)
                    tx.fillRect(28 * scale, 23 * scale, 4 * scale, 5 * scale);
            }

            if (room.exits.sw && room.exits.sw.to_room != room.id) {
                if (room.exits.sw == this.selectedExit ||
                    room.exits.sw == this.selectedReverseExit) {
                    tx.strokeStyle = this.selectedColorStatic
                    tx.lineWidth = (2 * scale)|0;
                }
                if (!this.isIndoor(room)) {
                    tx.moveTo(0 * scale, 32 * scale);
                    tx.lineTo(10 * scale, 22 * scale);
                }
                else {
                    tx.moveTo(0 * scale, 32 * scale);
                    tx.lineTo(8 * scale, 24 * scale);
                }
                tx.closePath();
                tx.stroke();
                tx.beginPath()
                tx.lineWidth = (0.6 * scale)|0;
                tx.strokeStyle = this.foreColor || 'black';
            }
            else if (fillWalls) {
                tx.fillRect(0 * scale, 28 * scale, 4 * scale, 2 * scale);
                tx.fillRect(2 * scale, 30 * scale, 2 * scale, 2 * scale);
                if (!room.exits.s)
                    tx.fillRect(4 * scale, 28 * scale, 5 * scale, 4 * scale);
                if (!room.exits.w)
                    tx.fillRect(0 * scale, 23 * scale, 4 * scale, 5 * scale);
            }

            tx.closePath();
            tx.stroke();
            tx.fillStyle = this.foreColor || 'black';
            tx.strokeStyle = this.foreColor || 'black';
            if (room.exits.u) {
                tx.beginPath();
                const ofs = tx.fillStyle
                tx.fillStyle = this.backColor || "#CCCCCC"
                tx.fillRoundedRect(0, 4* scale, 8*scale, 8*scale, 3*scale)
                tx.closePath();
                tx.fillStyle = ofs;

                tx.beginPath();
                tx.moveTo((1 * scale)|0, (9 * scale)|0);
                tx.lineTo((7 * scale)|0, (9 * scale)|0);
                tx.lineTo((4 * scale)|0, (6 * scale)|0);
                tx.closePath();
                tx.fill();
            }
            if (room.exits.d) {
                tx.beginPath();
                const ofs = tx.fillStyle
                tx.fillStyle = this.backColor || "#CCCCCC"
                tx.fillRoundedRect(0, 20* scale, 8*scale, 8*scale, 3*scale)
                tx.closePath();
                tx.fillStyle = ofs;

                tx.beginPath();
                tx.moveTo((1 * scale)|0, (23 * scale)|0);
                tx.lineTo((7 * scale)|0, (23 * scale)|0);
                tx.lineTo((4 * scale)|0, (26 * scale)|0);
                tx.closePath();
                tx.fill();
            }
            if (room.exits.other && !(room.exits.other.name||"").toLowerCase().match("teleport")) {
                tx.beginPath();
                const ofs = tx.fillStyle
                tx.fillStyle = this.backColor || "#CCCCCC"
                tx.fillRoundedRect(24* scale, 5* scale, 7*scale, 7*scale, 3*scale)
                tx.closePath();
                tx.fillStyle = ofs;

                tx.beginPath();
                tx.moveTo((26 * scale)|0, (6  * scale)|0);
                tx.lineTo((29 * scale)|0, (9  * scale)|0);
                tx.lineTo((26 * scale)|0, (12 * scale)|0);
                tx.closePath();
                tx.fill();

            }
            if (room.exits.special) {
                tx.beginPath();
                tx.moveTo((29 * scale)|0, (19 * scale)|0);
                tx.lineTo((26 * scale)|0, (22 * scale)|0);
                tx.lineTo((29 * scale)|0, (25 * scale)|0);
                tx.closePath();
                tx.fill();
            } 
            if (room.teleport) {
                tx.beginPath();
                tx.moveTo((13 * scale)|0, (19 * scale)|0);
                tx.lineTo((19 * scale)|0, (19 * scale)|0);
                tx.lineTo((16 * scale)|0, (16 * scale)|0);
                tx.closePath();
                tx.fill();
                tx.beginPath();
                tx.moveTo((13 * scale)|0, (13 * scale)|0);
                tx.lineTo((19 * scale)|0, (13 * scale)|0);
                tx.lineTo((16 * scale)|0, (16 * scale)|0);
                tx.closePath();
                tx.fill();
            }
            tx.setTransform(1, 0, 0, 1, 0, 0);
            this.translate(tx, -0.5, scale);
        }
    }

    private cacheWalls(key: string, scale: number, room: Room) : HTMLCanvasElement {
        if (!this.isIndoor(room)) return null;
        let fillWalls = this.drawWalls
        if (!this.$wallsCache[key] && fillWalls) {
            this.$wallsCache[key] = document.createElement('canvas');
            this.$wallsCache[key].classList.add('map-canvas');
            this.$wallsCache[key].height = Math.ceil(32 * scale)|0;
            this.$wallsCache[key].width = Math.ceil(32 * scale)|0;
            const tx = this.$wallsCache[key].getContext('2d') as CanvasRenderingContext2D;
            tx.globalAlpha = this.isDarkBackground ? .40 : 1.0
            this.translate(tx, 0.5, scale);
            tx.beginPath();
            
            tx.strokeStyle = this.foreColor || 'black';
            tx.lineWidth = (0.6 * scale)|0;
            
            tx.fillStyle = this.wallColor;

            if (!this.exitLeadsSomewhere(room.exits.n, room) &&  fillWalls)
                tx.fillRect(9 * scale, 0 * scale, 14 * scale, 4 * scale);

            if (!this.exitLeadsSomewhere(room.exits.nw, room) &&  fillWalls) {
                tx.fillRect(2 * scale, 0 * scale, 2 * scale, 2 * scale);
                tx.fillRect(0 * scale, 2 * scale, 4 * scale, 2 * scale);
                if (!this.exitLeadsSomewhere(room.exits.n, room))
                    tx.fillRect(4 * scale, 0 * scale, 5 * scale, 4 * scale);
                if (!this.exitLeadsSomewhere(room.exits.w, room))
                    tx.fillRect(0 * scale, 4 * scale, 4 * scale, 5 * scale);
            }

            if (!this.exitLeadsSomewhere(room.exits.ne, room) &&  fillWalls) {
                tx.fillRect(28 * scale, 0 * scale, 2 * scale, 2 * scale);
                tx.fillRect(28 * scale, 2 * scale, 4 * scale, 2 * scale);
                tx.clearRect(30 * scale, 0 * scale, 2 * scale, 2 * scale);
                if (!this.exitLeadsSomewhere(room.exits.n, room))
                    tx.fillRect(23 * scale, 0 * scale, 5 * scale, 4 * scale);
                if (!this.exitLeadsSomewhere(room.exits.e, room))
                    tx.fillRect(28 * scale, 4 * scale, 4 * scale, 5 * scale);
            }

            if (!this.exitLeadsSomewhere(room.exits.e, room) &&  fillWalls)
                tx.fillRect(28 * scale, 9 * scale, 4 * scale, 14 * scale);
            
            if (!this.exitLeadsSomewhere(room.exits.w, room) &&  fillWalls)
                tx.fillRect(0 * scale, 9 * scale, 4 * scale, 14 * scale);
            
            if (!this.exitLeadsSomewhere(room.exits.s, room) &&  fillWalls)
                tx.fillRect(9 * scale, 28 * scale, 14 * scale, 4 * scale);
            
            if (!this.exitLeadsSomewhere(room.exits.se, room) && fillWalls) {
                tx.fillRect(28 * scale, 28 * scale, 4 * scale, 2 * scale);
                tx.fillRect(28 * scale, 30 * scale, 2 * scale, 2 * scale);
                if (!this.exitLeadsSomewhere(room.exits.s, room))
                    tx.fillRect(23 * scale, 28 * scale, 5 * scale, 4 * scale);
                if (!this.exitLeadsSomewhere(room.exits.e, room))
                    tx.fillRect(28 * scale, 23 * scale, 4 * scale, 5 * scale);
            }

            if (!this.exitLeadsSomewhere(room.exits.sw, room) && fillWalls) {
                tx.fillRect(0 * scale, 28 * scale, 4 * scale, 2 * scale);
                tx.fillRect(2 * scale, 30 * scale, 2 * scale, 2 * scale);
                if (!this.exitLeadsSomewhere(room.exits.s, room))
                    tx.fillRect(4 * scale, 28 * scale, 5 * scale, 4 * scale);
                if (!this.exitLeadsSomewhere(room.exits.w, room))
                    tx.fillRect(0 * scale, 23 * scale, 4 * scale, 5 * scale);
            }

            tx.closePath();
            tx.stroke();
            tx.setTransform(1, 0, 0, 1, 0, 0);

            this.translate(tx, -0.5, scale);
        }

        return this.$wallsCache[key];
    }

    exitLeadsSomewhere(re: RoomExit, room:Room) : boolean {
        return re && re.to_room != room.id;
    }

    public drawMarker(ctx:CanvasRenderingContext2D, x:number, y:number, size:number, color:string, scale:number) {
        if (!color) color = 'yellow';
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = color || 'black';
        ctx.arc((x), (y), (size * scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    public DrawDoor(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, exit:RoomExit) {
        if (!exit || exit.type == ExitType.Normal) return;
        ctx.beginPath();
        ctx.clearRect(x, y, w, h);

        if (exit.type != ExitType.Locked) {
            ctx.fillStyle = this.backColor || 'white';
            ctx.strokeStyle = this.foreColor || 'black';
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        } else {
            ctx.fillStyle = this.foreColor || 'black';
            ctx.strokeStyle = this.foreColor || 'black';
            ctx.fillRect(x, y, w, h);
        }
        //ctx.strokeRect(x, y, w, h);
        ctx.closePath();
    }

    public DrawDDoor(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, exit:RoomExit) {
        if (!exit || exit.type == ExitType.Normal) return;
        ctx.beginPath();
        ctx.fillStyle = this.foreColor || 'black';
        ctx.strokeStyle = this.foreColor || 'black';
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.closePath();
    }

    public PointInRect(x:number, y:number, x1:number, x2:number, y1:number, y2:number) {
        if ((x1 <= x && x <= x2) && (y1 <= y && y <= y2))
            return true;
        return false;
    }

}

function areEqualMousePos(MouseDown: MouseData, Mouse: MouseData) {
    return Math.abs(MouseDown.x - Mouse.x) + Math.abs(MouseDown.y - Mouse.y) < 2
}
