import { EventHook } from "./event";
import { to_screen_coordinate } from "./isometric";
import { ExitDir, ExitType, Mapper, Room, RoomExit, LabelPos, RoomType, ExitDir2LabelPos, ReverseExitDir } from "./mapper";
interface MouseData {
    x: number;
    y: number;
    button: number;
    state: boolean;
}

interface Point {
    x: number;
    y: number;
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
export class MapperDrawing {
    private _rooms: Room[] = [];
    public font:string = null;
    public fontSize?:number = null;
    
    showOffset: boolean;
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
    hover: Room;
    mouseInside = false;
    lastKey: any;
    setActiveRoom(room: Room) {
        const prevZone = this.active ? this.active.zone_id : -1;
        this.active = room;
        this.current = room;
        this.selected = room;
        if (room) {
            this.level = room.z;
            if (room.zone_id && (prevZone != room.zone_id || this.rooms.length <= 1)) {
                console.log("map drawing changing zone")
                this.rooms = this.mapper.getZoneRooms(this.active.zone_id)
                this.$drawCache = []
                this.$wallsCache = []
            }
            else if (!room.zone_id) {
                this.rooms = [this.active];
            }
        }
        this.focusActiveRoom()
        this.forcePaint = true
    }
    wallColor = '#B0ABA2'//'#ACADAC';
    rendererId: number;
    stop:boolean;
    forcePaint:boolean;
    private _fillWalls: boolean = true;
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
        localStorage.setItem("mapperScale", value.toString())
        this.zoomChanged.fire(this._scale)
    }
    vscroll: number = 0;
    hscroll: number = 0;
    active: Room = null;
    $focused: boolean = true;
    private _selected: Room = null;
    public get selected(): Room {
        return this._selected;
    }
    public set selected(value: Room) {
        this._selected = value;
        this.mapper.setSelected(this._selected)
    }
    markers = new Map<number,number>();
    $drawCache: any;
    $wallsCache: any;
    current: Room = null;
    parent:JQuery;
    public zoomChanged = new EventHook<number>();
    public levelChanged = new EventHook<number>();
    public showContext = new EventHook<{x: number, y:number}>();

    constructor(private mapper:Mapper, private canvas:HTMLCanvasElement, private ctx:CanvasRenderingContext2D) {
        this.parent = $(canvas.parentElement);
        const savedScale = localStorage.getItem("mapperScale")
        this._scale = savedScale ? parseFloat(savedScale) : 1.5;
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
            console.log("setting size jq")
            $(this.canvas).width("unset");
            $(this.canvas).height("unset");
            $(this.canvas).width(pw);
            $(this.canvas).height(ph);
        }
        if (this.canvas.height != ph*2) {
            this.canvas.height = ph*2;
            console.log("setting he")
        }
        if (this.canvas.width != pw*2) {
            this.canvas.width = pw*2;
            console.log("setting size wi")
        }
    }

    setScale(scale:number) {
        // Restrict scale
        scale = Math.min(Math.max(.5, scale), 4);
        this.scale = scale;
        this.$drawCache = {};
        this.$wallsCache = {};
        if (this.active) {
            this.focusActiveRoom()
        }
    }
    private setFocus(value:boolean) {
        if (this.$focused === value) return;
        this.$focused = value;
    }

    pointClicked():Room {
        this._showLegend = false; 
        const x = this.Mouse.x;
        const y = this.Mouse.y;
        const room = this.findActiveRoomByCoords(x, y);
        if (!room) return null;
        if (this.selected && room && room.id === this.selected.id)
            return this.selected;

        this.selected = room;
        return this.selected;
    }

    attachCanvasEvents() {
        $(this.canvas).mousemove((event) => {
            this.MousePrev = this.Mouse;
            this.Mouse = this.getMapMousePos(event);
            if (this.drag) {
                this.MouseDrag.x += this.MousePrev.x - this.Mouse.x;
                this.MouseDrag.y += this.MousePrev.y - this.Mouse.y;
                const x = Math.floor(this.MouseDrag.x / 1 / this.scale);
                const y = Math.floor(this.MouseDrag.y / 1 / this.scale);
                if (x > 0 || x < 0 || y < 0 || y > 0) {
                    const hover = this.findActiveRoomByCoords(this.Mouse.x, this.Mouse.y)
                    if (hover && event.ctrlKey) {
                        this.MouseDrag.x -= x * 1 * this.scale;
                        this.MouseDrag.y -= y * 1 * this.scale;
                        hover.x += x*2;
                        hover.y += y*2;
                    } else {
                        this.MouseDrag.x -= x * 1 * this.scale;
                        this.MouseDrag.y -= y * 1 * this.scale;
                        this.scrollBy(x*2, y*2);
                        if (event.shiftKey) {
                            this.showOffset = true;
                        } else {
                            this.showOffset = false;
                        }
                        $(this.canvas).css('cursor', 'move');
                    }
                }
            }
            else {
                const x = this.Mouse.x;
                const y = this.Mouse.y;
                const hover = this.findActiveRoomByCoords(x, y)
                this.hover = hover;
                if (!hover && event.altKey) {
                    this.hover = <Room>{
                        id: 0,
                        name: `${x|0},${y|0}`
                    }
                }
            }
            event.preventDefault();
        });
        $(this.canvas).mousedown((event) => {
            this.hover = null;
            this.Mouse = this.getMapMousePos(event);
            this.MouseDown = this.getMapMousePos(event);
            this.MouseDrag.state = true;
            this.drag = this.MouseDown.button === 0;
        });

        $(this.canvas).mouseup((event) => {
            this.hover = null;
            this.Mouse = this.getMapMousePos(event);
            this.MouseDrag.state = false;
            this.drag = false;
            if (!this.MouseDown)
                this.MouseDown = this.getMapMousePos(event);
            if (this.Mouse.button === 0 && Math.floor(this.Mouse.x / 32 / this.scale) === Math.floor(this.MouseDown.x / 32 / this.scale) && Math.floor(this.Mouse.y / 32 / this.scale) === Math.floor(this.MouseDown.y / 32 / this.scale)) {
                this.pointClicked();
            }

            $(this.canvas).css('cursor', 'default');
        });
        $(this.canvas).mouseenter((event) => {
            this.hover = null;
            this.mouseInside = true;
            this.Mouse = this.getMapMousePos(event);
        });
        $(this.canvas).mouseleave((event) => {
            this.hover = null;
            this.mouseInside = false;
            this.Mouse = this.getMapMousePos(event);
            if (this.drag) {
                this.drag = false;
                $(this.canvas).css('cursor', 'default');
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
            this.pointClicked();
            $(this.canvas).css('cursor', 'default');
        });
        $(this.canvas).dblclick((event) => {
            this.hover = null;
            event.preventDefault();
            this.Mouse = this.getMapMousePos(event);
            this.MouseDown = this.getMapMousePos(event);
            //this.MouseDrag.state = true;
            //this.drag = true;
            const room = this.pointClicked();
            if (room)
            this.mapper.walkToId(room.id)
            //$(this.canvas).css('cursor', 'move');
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
        this.canvas.addEventListener('keydown', (e) => {
            this.lastKey  = {
                key: e.key,
                alt: e.altKey,
                ctrl: e.ctrlKey,
                meta: e.metaKey,
                shift: e.shiftKey,
              };
            if (!this.$focused) return;
            switch (e.which) {
                case 27:
                    e.preventDefault();
                    this.MouseDrag.state = false;
                    this.drag = false;
                    $(this.canvas).css('cursor', 'default');
                    break;
                case 38: //up
                    e.preventDefault();
                    this.scrollBy(0, -1);
                    break;
                case 40: //down
                    e.preventDefault();
                    this.scrollBy(0, 1);
                    break;
                case 37: //left
                    e.preventDefault();
                    this.scrollBy(-1, 0);
                    break;
                case 39: //right
                    e.preventDefault();
                    this.scrollBy(1, 0);
                    break;
                case 110:
                case 46: //delete
                    e.preventDefault();
                    //this.clearSelectedRoom();
                    break;
                case 97: //num1
                    e.preventDefault();
                    this.scrollBy(-1, 1);
                    break;
                case 98: //num2
                    e.preventDefault();
                    this.scrollBy(0, 1);
                    break;
                case 99: //num3
                    e.preventDefault();
                    this.scrollBy(1, 1);
                    break;
                case 100: //num4
                    e.preventDefault();
                    this.scrollBy(-1, 0);
                    break;
                case 101: //num5
                    e.preventDefault();
                    this.focusCurrentRoom();
                    break;
                case 102: //num6
                    e.preventDefault();
                    this.scrollBy(1, 0);
                    break;
                case 103: //num7
                    e.preventDefault();
                    this.scrollBy(-1, -1);
                    break;
                case 104: //num8
                    e.preventDefault();
                    this.scrollBy(0, -1);
                    break;
                case 105: //num9
                    e.preventDefault();
                    this.scrollBy(1, -1);
                    break;
                case 107: //+
                    e.preventDefault();
                    this.setLevel(this.active.z + 1);
                    break;
                case 109: //-
                    e.preventDefault();
                    this.setLevel(this.active.z - 1);
                    break;
                case 111: // /
                    e.preventDefault();
                    //this.setZone(this.active.zone - 1);
                    break;
                case 106: // *
                    e.preventDefault();
                    //this.setZone(this.active.zone + 1);
                    break;
            }
        });
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
        this.vscroll += x;
        this.hscroll += y;
    }

    public scrollTo(x: number, y: number) {
        /*$({ n: this.vscroll }).animate({ n: x}, {
            duration: 1000,
            step: function(now:number, fx:any) {
                this.vscroll = now;
                console.log("Scroll x: ", this.vscroll)
            }
        });*/
        this.vscroll = x;
        this.hscroll = y;
        //console.log("Scroll xy: ", this.vscroll,this.hscroll)
    }

    roomDrawRect(room:Room, canvas:HTMLCanvasElement) : Rect {
        const x = this.vscroll ;
        const y = this.hscroll ;
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
    roomInnerDrawRect(room:Room, canvas:HTMLCanvasElement) : Rect {
        const x = this.vscroll ;
        const y = this.hscroll ;
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

        let zoneId = this.active?.zone_id || this.rooms[0]?.zone_id

        const rows = !zoneId || !this.mapper.zoneRooms.get(zoneId) ? null : this.mapper.zoneRooms.get(zoneId).filter(room => {
            if (room.z != this.level) return false;
            let rRect = this.roomDrawRect(room, this.canvas);
            return this.PointInRect(x,y,rRect.x,rRect.x2, rRect.y, rRect.y2)
        })


        if (rows && rows.length > 0)
            return rows[0];
        return null;
    }
    
    public draw(canvas?: HTMLCanvasElement, context?: CanvasRenderingContext2D, forExport?: boolean, callback?:Function) {
        if (!this.ready) {
            setTimeout(() => { this.draw(canvas, context, forExport, callback); }, 10);
            return;
        }
        if (!canvas)
            canvas = this.canvas;
        if (!context)
            context = this.ctx;
        if (!forExport) forExport = false;
        //cant get map canvas bail
        if (!canvas || !context) return;
        //this.translate(context, 0.5, this._scale);
        const x = this.vscroll ;
        const y = this.hscroll ;
        //console.log("Draw x y ", x, y)
        let ox = (canvas.width/2) - 32/this.scale;
        let oy = (canvas.height/2) - 32/ this.scale;
        let rows;

        if (canvas.width % 2 != 0)
            ox += 0.5;
        if (canvas.height % 2 != 0)
            oy  += 0.5;

        context.font = `${this.fontSize || 14}pt ${this.font || 'Tahoma, Arial, Helvetica, sans-serif'}`;
        context.lineWidth = (0.6 * this.scale)|0;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#C5BFB1';
        context.fillRect(0, 0, canvas.width, canvas.height);
        /*
        if (forExport) {
            context.fillRect(0, 0, canvas.width, canvas.height);
        }*/

        const drawData = new Map<number, DrawData>();
        const drawDataBelow = new Map<number, DrawData>();
        const drawDataAbove = new Map<number, DrawData>();

        for (let i = 0; i < this.rooms.length; i++) {
            let room = this.rooms[i]
            if (room.z == this.level-1) {
                let rdr = this.roomInnerDrawRect(room, canvas)
                drawDataBelow.set(room.id, {
                    room: room,
                    rect: rdr,
                    rectInner: rdr,
                    exitData: this.createExitData(room, rdr)
                });
            }
            else if (room.z == this.level+1) {
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

        for (const data of drawDataAbove.values()) {
            this.DrawRect(context, data.rect, data.rect.w/5, -data.rect.h/5, data.room, 'rgba(255, 255, 255, 0.8)', null, this.scale);
        }
        for (const data of drawDataBelow.values()) {
            this.DrawRect(context, data.rect, -data.rect.w/5, data.rect.h/5, data.room, 'rgba(127, 127, 127, 0.8)', 'rgba(127,127,127,0.3)', this.scale);
        }

        let strokeColor = 'rgba(127, 127, 127, 0.8)'
        let drawLabels = false;
        
        for (const data of drawDataBelow.values()) {
            this.calculateLabelsAndDrawLinks(context, data, drawData, drawDataBelow, drawDataAbove, strokeColor, drawLabels, -data.rect.w/5, data.rect.h/5)    
        }

        
        strokeColor = 'black'
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
            context.fillText(`${this.vscroll|0}, ${this.hscroll|0}`, 20, 20)
        }
        if (callback) callback();
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
                    this.drawTriangle(context, ExitDir.South, roomData.rect.x + offsX + se.xInner,  roomData.rect.y + offsY + se.yInner, 4, this.scale, strokeColor)
                    this.drawTriangle(context, ExitDir.North,  roomData.rect.x + offsX + se.xInner,  roomData.rect.y + offsY + se.yInner, 4, this.scale, strokeColor)
                    continue;
                }
                if (destRoom && ex.to_dir && destRoom.exits[ex.to_dir] && destRoom.exits[ex.to_dir].to_room == roomData.room.id && destRoom != roomData.room) {
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
                        if (!recursive) this.drawLink(context, roomData.rect, steps, exitData, roomData.room.z != destDrawData.room.z ? "gray" : strokeColor, offsX, offsY);
                    }
                } else if (destRoom && ex.to_dir && ex.to_dir != ExitDir.Other && (roomData.room == destRoom || !destRoom.exits[ex.to_dir] || destRoom.exits[ex.to_dir].to_room != roomData.room.id)) {
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
 
                            if (destRoom == roomData.room) {
                                recursive = true
                                destPosX = (roomData.rect.x + exitData.xInner + offsX)|0
                                destPosy = (roomData.rect.y + exitData.yInner + offsY)|0
                            } else if (destExitData) {
                                steps.push({
                                    x: (destDrawData.rect.x + destExitData.x + offsX)|0,
                                    y: (destDrawData.rect.y + destExitData.y + offsY)|0,
                                })
                                steps.push({
                                    x: (destDrawData.rect.x + destExitData.xInner + offsX)|0,
                                    y: (destDrawData.rect.y + destExitData.yInner + offsY)|0,
                                })
                                destPosX = (destDrawData.rect.x + destExitData.xInner + offsX)|0
                                destPosy = (destDrawData.rect.y + destExitData.yInner + offsY)|0
                            }
                            if (!recursive) this.drawLink(context, roomData.rect, steps, exitData, roomData.room.z != destDrawData.room.z ? "gray" : strokeColor, offsX, offsY);
                        }
                    }
                    
                    if (marker) { // freccetta per one way
                        switch (<ExitDir>roomExit) {
                            case ExitDir.North:
                                if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : strokeColor)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, strokeColor)
                                break;
                            case ExitDir.East:
                                if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : strokeColor)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, strokeColor)
                                break;
                            case ExitDir.South:
                                if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : strokeColor)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, strokeColor)
                                break;
                            case ExitDir.West:
                                if (!recursive)
                                    this.drawTriangle(context, entranceDir, destPosX, destPosy, 4, this.scale, destDrawData && roomData.room.z != destDrawData.room.z ? "gray" : strokeColor)
                                else
                                    this.drawCircle(context, destPosX, destPosy, 3, this.scale, strokeColor)
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

         
        ctx.save()
        ctx.beginPath();
        ctx.strokeStyle = color; //"black"; //diagonal ? ctx.strokeStyle : "rgba(222,222,222,0.5)"

        ctx.moveTo(newX, newY)
        for (const st of steps) {
            ctx.lineTo(.5+(st.x|0), .5+(st.y|0))            
        }
        ctx.stroke()

        if (diagonal) {
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
        const ret = new Map<ExitDir, ExitDataPos>()

        for (const re of Object.keys(ExitDir).map(k => (ExitDir as any)[k])) {
            let ex = room.exits[<ExitDir>re] as RoomExit;
            let reox = 0, reoy = 0, reox2 = 0, reoy2 = 0;
            switch (<ExitDir>re) {
                case ExitDir.North:
                    reox = rect.w/2;
                    reoy = 0;
                    reox2 = reox;
                    reoy2 = rect.h/7;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.NorthEast:
                    reox = rect.w;
                    reoy = 0;
                    reox2 = reox-rect.w/7;
                    reoy2 = rect.h/7;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.East:
                    reox = rect.w;
                    reoy = rect.h/2;
                    reox2 = reox-rect.w/7;
                    reoy2 = rect.h/2;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.SouthEast:
                    reox = rect.w;
                    reoy = rect.h;
                    reox2 = reox-rect.w/7;
                    reoy2 = reoy-rect.h/7;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.South:
                    reox = rect.w/2;
                    reoy = rect.h;
                    reox2 = reox;
                    reoy2 = reoy-rect.h/7;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.SouthWest:
                    reox = 0;
                    reoy = rect.h;
                    reox2 = rect.w/7;
                    reoy2 = reoy-rect.h/7;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.West:
                    reox = 0;
                    reoy = rect.h/2;
                    reox2 = rect.w/7;
                    reoy2 = reoy;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                case ExitDir.NorthWest:
                    reox = 0;
                    reoy = 0;
                    reox2 = rect.w/7;
                    reoy2 = rect.h/7;
                    ret.set(<ExitDir>re, {
                        x: reox|0,
                        y: reoy|0,
                        xInner: reox2|0,
                        yInner: reoy2|0,
                        marker: !!(ex && ex.to_room)
                    })
                    break;
                default:
                    break;
            }
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
        if (room.exits.other) {
            otherTp = !!(room.exits.other.name||"").toLowerCase().match("teleport")
        }
        return this.isIndoor(room) + "," + otherTp + "," + room.type + "," + room.teleport + ',' + (room.color) + ',' + Object.keys(room.exits).filter(re => room.exits[<ExitDir>re].to_room != room.id).map(v => v + room.exits[<ExitDir>v].type).join()
    }

    wallsHash(room:Room) {
        return this.isIndoor(room) + "," + room.type + ',' + Object.keys(room.exits).filter(e => this.isRealExit(room.exits[<ExitDir>e], room)).join()
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

        const wallsKey = this.wallsHash(room);

        this.cacheWalls(wallsKey, scale, room);



        if (this.$wallsCache[wallsKey]) ctx.drawImage(this.$wallsCache[wallsKey], x | 0, y | 0);
        
    }

    public DrawRoom(ctx:CanvasRenderingContext2D, rect:Rect, room:Room, forExport:boolean, scale?:number) {
        const {x, y} = {x: rect.x, y: rect.y}; //to_screen_coordinate(rect.x, rect.y);

        const key = this.roomHash(room);

        if (!this.$drawCache[key]) return;

        if (!scale) scale = this.scale;

        ctx.drawImage(this.$drawCache[key], x | 0, y | 0);

        this.DrawDoor(ctx,  (x + 12 * scale)|0, (y + 1 * scale)|0, (8 * scale)|0, (2 * scale)|0, room.exits.n);
        this.DrawDoor(ctx,  (x + 30 * scale)|0, (y + 12 * scale)|0, (2 * scale)|0, (8 * scale)|0, room.exits.e);
        this.DrawDoor(ctx,  (x + 1 * scale)|0, (y + 12 * scale)|0, (2 * scale)|0, (8 * scale)|0, room.exits.w);
        this.DrawDoor(ctx,  (x + 12 * scale)|0, (y + 30 * scale)|0, (8 * scale)|0, (2 * scale)|0, room.exits.s);
        this.DrawDDoor(ctx, (x)|0, (y)|0, (5 * scale)|0, (5 * scale)|0, room.exits.nw);
        this.DrawDDoor(ctx, (x + 32 * scale)|0, (y)|0, (-5 * scale)|0, (5 * scale)|0, room.exits.ne);
        this.DrawDDoor(ctx, (x + 32 * scale)|0, (y + 32 * scale)|0, (-5 * scale)|0, (-5 * scale)|0, room.exits.se);
        this.DrawDDoor(ctx, (x)|0, (y + 32 * scale)|0, (5 * scale)|0, (-5 * scale)|0, room.exits.sw);

        if (!forExport && this.selected && this.selected.id === room.id) {
            if (this.$focused) {
                ctx.fillStyle = 'rgba(235, 255, 65, 0.75)';
                ctx.strokeStyle = 'gray';
            }
            else {
                ctx.fillStyle = 'rgba(142, 142, 185, 0.5)';
                ctx.strokeStyle = 'rgba(142, 142, 255, 0.5)';
            }
            ctx.fillRoundedRect((x+6* scale)|0, (y+6* scale)|0, (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
            ctx.strokeRoundedRect((x+6* scale)|0, (y+6* scale)|0, (20.5 * scale)|0, (20.5 * scale)|0, (7 * scale)|0);
        }
        if (this.markers.get(room.id) == 2)
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'green', scale);
        else if (this.markers.get(room.id) == 3)
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'blue', scale);
        else if (this.markers.get(room.id))
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'yellow', scale);
        if (!forExport && this.current && room.id == this.current.id) {
            this.drawMarker(ctx, x+16*scale, y+16*scale, 4, 'red', scale);
            //console.log("active ", rect.x, rect.y, rect.w, rect.h, room.id)
        }
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
        this.drawText(ctx, lx, ly, 'black', text)
    }
    
    isIndoor(room:Room) {
        return room.type == undefined ||
         room.type == RoomType.Inside ||
         room.type == RoomType.Underground ||
         room.type == RoomType.Underwater;
    }

    getFillColor(room:Room) {
        if (room.color) {
            return room.color == "rgb(255,255,255)" ? "rgb(220,220,220)" : room.color;
        } else if (room.type != RoomType.Inside) {
            return  '#966F33';
        }
        return null;
    }

    private cacheRoom(key: string, scale: number, room: Room) {
        if (!this.$drawCache[key]) {
            this.$drawCache[key] = document.createElement('canvas');
            this.$drawCache[key].classList.add('map-canvas');
            this.$drawCache[key].height = (32 * scale)|0;
            this.$drawCache[key].width = (32 * scale)|0;
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
                if (img) {
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

            tx.beginPath();
            tx.fillStyle = '#ACADAC';
            if (room.exits.n && room.exits.n.to_room != room.id) {
                tx.moveTo(((15 * scale)|0), ((0 * scale)|0));
                tx.lineTo(((15 * scale)|0), ((8 * scale)|0));
                tx.moveTo(((16 * scale)|0), ((0 * scale)|0));
                tx.lineTo(((16 * scale)|0), ((8 * scale)|0));
                tx.moveTo(((17 * scale)|0), ((0 * scale)|0));
                tx.lineTo(((17 * scale)|0), ((8 * scale)|0));
            }
            else if (fillWalls)
                tx.fillRect(9 * scale, 0 * scale, 14 * scale, 4 * scale);

            if (room.exits.nw && room.exits.nw.to_room != room.id) {
                if (!this.isIndoor(room)) {
                    tx.moveTo(0 * scale, 0 * scale);
                    tx.lineTo(10 * scale, 10 * scale);
                }
                else {
                    tx.moveTo(0 * scale, 0 * scale);
                    tx.lineTo(8 * scale, 8 * scale);
                }
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
                if (!this.isIndoor(room)) {
                    tx.moveTo(32 * scale, 0 * scale);
                    tx.lineTo(22 * scale, 10 * scale);
                }
                else {
                    tx.moveTo(32 * scale, 0 * scale);
                    tx.lineTo(24 * scale, 8 * scale);
                }
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
                tx.moveTo((24 * scale)|0, (15 * scale)|0);
                tx.lineTo((32 * scale)|0, (15 * scale)|0);
                tx.moveTo((24 * scale)|0, (16 * scale)|0);
                tx.lineTo((32 * scale)|0, (16 * scale)|0);
                tx.moveTo((24 * scale)|0, (17 * scale)|0);
                tx.lineTo((32 * scale)|0, (17 * scale)|0);
            }
            else if (fillWalls)
                tx.fillRect(28 * scale, 9 * scale, 4 * scale, 14 * scale);

            if (room.exits.w && room.exits.w.to_room != room.id) {
                tx.moveTo((0 * scale)|0, (15 * scale)|0);
                tx.lineTo((8 * scale)|0, (15 * scale)|0);
                tx.moveTo((0 * scale)|0, (16 * scale)|0);
                tx.lineTo((8 * scale)|0, (16 * scale)|0);
                tx.moveTo((0 * scale)|0, (17 * scale)|0);
                tx.lineTo((8 * scale)|0, (17 * scale)|0);
            }
            else if (fillWalls)
                tx.fillRect(0 * scale, 9 * scale, 4 * scale, 14 * scale);

            if (room.exits.s && room.exits.s.to_room != room.id) {
                tx.moveTo(((15 * scale)|0), ((24 * scale)|0));
                tx.lineTo(((15 * scale)|0), ((32 * scale)|0));
                tx.moveTo(((16 * scale)|0), ((24 * scale)|0));
                tx.lineTo(((16 * scale)|0), ((32 * scale)|0));
                tx.moveTo(((17 * scale)|0), ((24 * scale)|0));
                tx.lineTo(((17 * scale)|0), ((32 * scale)|0));
            }
            else if (fillWalls)
                tx.fillRect(9 * scale, 28 * scale, 14 * scale, 4 * scale);

            if (room.exits.se && room.exits.se.to_room != room.id) {
                if (!this.isIndoor(room)) {
                    tx.moveTo(32 * scale, 32 * scale);
                    tx.lineTo(22 * scale, 22 * scale);
                }
                else {
                    tx.moveTo(32 * scale, 32 * scale);
                    tx.lineTo(24 * scale, 24 * scale);
                }
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
                if (!this.isIndoor(room)) {
                    tx.moveTo(0 * scale, 32 * scale);
                    tx.lineTo(10 * scale, 22 * scale);
                }
                else {
                    tx.moveTo(0 * scale, 32 * scale);
                    tx.lineTo(8 * scale, 24 * scale);
                }
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
            tx.fillStyle = 'black';
            tx.strokeStyle = 'black';
            if (room.exits.u) {
                tx.beginPath();
                const ofs = tx.fillStyle
                tx.fillStyle = "#CCCCCC"
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
                tx.fillStyle = "#CCCCCC"
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
                tx.fillStyle = "#CCCCCC"
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

    private cacheWalls(key: string, scale: number, room: Room) {
        if (!this.isIndoor(room)) return;

        if (!this.$wallsCache[key]) {
            this.$wallsCache[key] = document.createElement('canvas');
            this.$wallsCache[key].classList.add('map-canvas');
            this.$wallsCache[key].height = (32 * scale)|0;
            this.$wallsCache[key].width = (32 * scale)|0;
            const tx = this.$wallsCache[key].getContext('2d') as CanvasRenderingContext2D;
            this.translate(tx, 0.5, scale);
            tx.beginPath();
   
            let fillWalls = this._fillWalls
            
            tx.strokeStyle = 'black';
            tx.lineWidth = (0.6 * scale)|0;
            
            tx.fillStyle = this.wallColor;

            if (!this.isRealExit(room.exits.n, room) &&  fillWalls)
                tx.fillRect(9 * scale, 0 * scale, 14 * scale, 4 * scale);

            if (!this.isRealExit(room.exits.nw, room) &&  fillWalls) {
                tx.fillRect(2 * scale, 0 * scale, 2 * scale, 2 * scale);
                tx.fillRect(0 * scale, 2 * scale, 4 * scale, 2 * scale);
                if (!this.isRealExit(room.exits.n, room))
                    tx.fillRect(4 * scale, 0 * scale, 5 * scale, 4 * scale);
                if (!this.isRealExit(room.exits.w, room))
                    tx.fillRect(0 * scale, 4 * scale, 4 * scale, 5 * scale);
            }

            if (!this.isRealExit(room.exits.ne, room) &&  fillWalls) {
                tx.fillRect(28 * scale, 0 * scale, 2 * scale, 2 * scale);
                tx.fillRect(28 * scale, 2 * scale, 4 * scale, 2 * scale);
                tx.clearRect(30 * scale, 0 * scale, 2 * scale, 2 * scale);
                if (!this.isRealExit(room.exits.n, room))
                    tx.fillRect(23 * scale, 0 * scale, 5 * scale, 4 * scale);
                if (!this.isRealExit(room.exits.e, room))
                    tx.fillRect(28 * scale, 4 * scale, 4 * scale, 5 * scale);
            }

            if (!this.isRealExit(room.exits.e, room) &&  fillWalls)
                tx.fillRect(28 * scale, 9 * scale, 4 * scale, 14 * scale);
            
            if (!this.isRealExit(room.exits.w, room) &&  fillWalls)
                tx.fillRect(0 * scale, 9 * scale, 4 * scale, 14 * scale);
            
            if (!this.isRealExit(room.exits.s, room) &&  fillWalls)
                tx.fillRect(9 * scale, 28 * scale, 14 * scale, 4 * scale);
            
            if (!this.isRealExit(room.exits.se, room) && fillWalls) {
                tx.fillRect(28 * scale, 28 * scale, 4 * scale, 2 * scale);
                tx.fillRect(28 * scale, 30 * scale, 2 * scale, 2 * scale);
                if (!this.isRealExit(room.exits.s, room))
                    tx.fillRect(23 * scale, 28 * scale, 5 * scale, 4 * scale);
                if (!this.isRealExit(room.exits.e, room))
                    tx.fillRect(28 * scale, 23 * scale, 4 * scale, 5 * scale);
            }

            if (!this.isRealExit(room.exits.sw, room) && fillWalls) {
                tx.fillRect(0 * scale, 28 * scale, 4 * scale, 2 * scale);
                tx.fillRect(2 * scale, 30 * scale, 2 * scale, 2 * scale);
                if (!this.isRealExit(room.exits.s, room))
                    tx.fillRect(4 * scale, 28 * scale, 5 * scale, 4 * scale);
                if (!this.isRealExit(room.exits.w, room))
                    tx.fillRect(0 * scale, 23 * scale, 4 * scale, 5 * scale);
            }

            tx.closePath();
            tx.stroke();
            tx.setTransform(1, 0, 0, 1, 0, 0);

            this.translate(tx, -0.5, scale);
        }
    }

    isRealExit(re: RoomExit, room:Room) : boolean {
        return re && re.to_room != room.id;
    }

    public drawMarker(ctx:CanvasRenderingContext2D, x:number, y:number, size:number, color:string, scale:number) {
        if (!color) color = 'yellow';
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = 'black';
        ctx.arc((x), (y), (size * scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    public DrawDoor(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, exit:RoomExit) {
        if (!exit || exit.type == ExitType.Normal) return;
        ctx.beginPath();
        ctx.clearRect(x, y, w, h);

        if (exit.type != ExitType.Locked) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        } else {
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'black';
            ctx.fillRect(x, y, w, h);
        }
        //ctx.strokeRect(x, y, w, h);
        ctx.closePath();
    }

    public DrawDDoor(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, exit:RoomExit) {
        if (!exit || exit.type == ExitType.Normal) return;
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
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