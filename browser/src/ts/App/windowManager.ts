import { CustomWin } from "./windows/customWindow";
import { EventHook } from "../Core/event";
import { ControlType, LayoutManager } from "./layoutManager";
import { Mapper } from "../Mapper/mapper";
import { MapperWindow } from "../Mapper/windows/mapperWindow";
import { Button, Messagebox, messagebox } from "./messagebox";
import { Profile, ProfileManager } from "./profileManager";
import { throttle, waitForVariableValue } from "../Core/util";

export interface IBaseWindow {
    destroy():void;
    write(text:string, buffer:string):void;
    getLines(): string[];
    writeLine(text:string, buffer:string):void;
    cls():void;

}

export interface WindowData {
    name: string;
    x:number;
    y:number;
    w:number;
    h:number;
    visible:boolean;
    collapsed:boolean;
    docked:boolean;
    font?:string;
    fontSize?:number;
    anchorWidth?:number;
    anchorHeight?:number;
}

export interface WindowDefinition {
    window: JQuery; //jqxWindow
    custom:boolean;
    output: IBaseWindow;
    data: WindowData;
    created:boolean;
    initialized:boolean;
    dispose?: Function;
}

export class WindowManager {
    
    private loading:boolean = false;
    private saving:boolean = false;
    private profileName:string = null;
    
    public windows: Map<string, WindowDefinition> = new Map<string, WindowDefinition>();
    public EvtEmitWindowsChanged = new EventHook<string[]>();
    private layoutManager:LayoutManager
    private mapper:Mapper
    public updateWindowList:Function = null;

    constructor(private profileManager:ProfileManager) {
        this.updateWindowList = throttle(this.updateWindowListImpl, 500);

        profileManager.evtProfileChanged.handle(async (ev:{[k: string]: any})=>{
            console.log("Windowsmanager got new config")
            await this.profileConnected(ev.current);
        });
        this.profileConnected(profileManager.getCurrent());
    }

    public setMapper(mapper: Mapper) {
        this.mapper= mapper;
    }

    public setLayoutManager(lay:LayoutManager) {
        this.layoutManager = lay;
    }

    public getLayoutManager(): LayoutManager {
        return this.layoutManager;
    }

    public async load() {
        if (this.loading) return;
        this.loading = true;
        try {
            let cp:string;
            this.cleanupWindows();
            if (!(cp = this.profileName)) {
                console.log("wm: LOAD base profile windows")
                //await this.deleteWindows();
                return;
            }
            console.log("wm: LOAD " + cp)
            const prof = this.profileManager.getProfile(cp)
            this.loadProfileWindows(prof);
            this.addDockedWindowsFromLayout(prof);
            await this.showWindows(false);
            this.updateWindowList();
            this.loading = false;
        } finally {
            this.loading = false;
        }
    }

    private loadProfileWindows(prof: Profile) {
        let wnds = [...(prof.windows||[])];
        (this.windows as any).loadedFrom = prof.name;
        console.log("wm: LOAD profile windows" + prof.name)
        //console.log("LOAD")
        //console.log(wnds)
        //await this.deleteWindows();
        //console.log("LOAD Deleted")
        //console.log("LOAD " + cp + ": " + wnds.map(v => v.name).join(","))
        if (wnds) for (const iterator of wnds) {
            this.windows.set(iterator.name, {
                window: null,
                output: null,
                custom: null,
                data: iterator,
                created: false,
                initialized: false
            });
        }
    }

    private addDockedWindowsFromLayout(prof: Profile) {
        if (prof.useLayout) {
            for (let w of this.layoutManager.findDockingPositions(null)) {
                if (w.type == ControlType.Window) {
                    if (!this.windows.has(w.content)) {
                        this.windows.set(w.content, {
                            window: null,
                            output: null,
                            custom: null,
                            data: {
                                collapsed: false,
                                docked: true,
                                name: w.content,
                                visible: true,
                                x: 100,
                                y: 100,
                                w: 450,
                                h: 250
                            },
                            created: false,
                            initialized: false
                        });
                    }
                }
            }
        }
    }

    public updateWindowListImpl() {
        this.EvtEmitWindowsChanged.fire([...this.windows.keys()]);
    }

    profileDisconnected() {
        this.loading = true
        try {
            (this.windows as any).loadedFrom = "-"
            console.log("windowsmanager profileDisconnected: " + this.profileManager.getCurrent())
            this.cleanupWindows();
        } finally {
            this.loading = false
        }
        //this.save()
    }

    private cleanupWindows() {
        (this.windows as any).loadedFrom = "-"
        console.log("Cleaning up existing windows")
        for (const w of this.windows) {
            if (w[1].window) {
                console.log("Cleaning up "+w[0])
                const wasVisible = w[1].data.visible;
                const wasDocked = w[1].data.docked;
                let name = w[1].data.name;
                let wnd = <any>w[1].window;
                (wnd).jqxWindow("close");
                w[1].data.visible = wasVisible;
                w[1].data.docked = wasDocked;
            }
        }
        this.deleteWindows()
    }

    async profileConnected(profileName:string) {
        //await this.cleanupWindows()
        this.profileName = profileName;
        console.log("windowsmanager profileConnected: " + profileName)
        //await this.deleteWindows();
        await this.load();
    }

    public async showWindows(duringLoad?:boolean) {
        let resolve:Function = null;
        let toShow:string[] = [];

        let oldLoading = this.loading
        try {
            const openings:Promise<WindowDefinition>[] = []
            for (const w of this.windows) {
                if (w[1].data.visible) {
                    this.loading = false
                    let wnd = this.createWindow(w[1].data.name, null, false);
                    this.loading = duringLoad
                    openings.push(this.show(w[0]));
                    toShow.push(w[0])
                }
            }
            await Promise.all(openings)
        } finally {
            this.loading = oldLoading
        }
    }

    private deleteWindows() {

        let toDestroy:string[] = [];
        this.windows.forEach((v, k) => {
            console.log("deleteWindows " + v.data.name)
            if (v.output) {
                v.output.destroy()
                delete v.output;
                v.output = null;
            }
            if (v.window) {
                toDestroy.push(k);
                const wasVisible = v.data.visible;
                (<any>v.window).jqxWindow("close");
                (<any>v.window).jqxWindow("destroy");
                (<any>v.window).remove();
                v.window = null;
                v.data.visible = wasVisible;
            }
        });
        this.windows.clear()
    }

    public isDocked(window:string, ui:JQuery) {
        const w = ui.hasClass("jqx-window") ? ui : ui.parents(".jqx-window");
        
        let windowDef = this.windows.get(window);
        if (!windowDef) return false;
        return windowDef.data.docked || w.data("docked");
    }

    public dock(window:string, ui:JQuery) { 

        if (!this.profileManager.getCurrent()) return;
        if (!this.layoutManager.getCurrent()) {
            return;
        }
        let windowDef = this.windows.get(window);
        if (!windowDef) return;
        const witm = this.layoutManager.findDockingPositions(window)[0];
        let dockPos = $("#window-dock-"+window.replace(/ /g,"-"));
        if (!witm) {
            windowDef.data.docked = false;
            this.save();
            //Messagebox.Show("Info", "Questa finestra non ha una posizione definita nel layout e rimarra' staccata.\nPer poter ancorarla devi definire nel layout in che pannello va\nancorata aggiungendo un elemento di tipo 'finestra'\ncon il contenuto '" + window + "'");
            return;
        }
        if (!dockPos.length) {
            //Messagebox.Show("Info", "Non trovo la posizione definita nel layout.\nPer poter ancorarla devi definire nel layout in che pannello va\nancorata aggiungendo un elemento di tipo 'finestra'\ncon il contenuto '" + window + "'");
            return;
        }
        let w = ui.hasClass("jqx-window") ? ui : ui.parents(".jqx-window");
        if (!w) return;
        (<any>$(w)).jqxWindow("expand");
        w.hide()
        var duration = (<any>$(w)).jqxWindow('collapseAnimationDuration');
        setTimeout(() => {
            w.css({
                "position":"relative",
                "left":"unset",
                "top":"unset"
            });
            (<any>$(w)).jqxWindow({ draggable: false });

            this.applyDockSizes(windowDef)
            if (!windowDef.data.anchorHeight) $(".jqx-resize", w).css({
                "height": "unset",
            });
            $(".jqx-resize", w).css({
                "width": "100%"
            });
            $(".jqx-window-header", w).css({
                "width": "unset",
                "height": "unset",
            });
            $(".jqx-window-content", w).css({
                "width": "unset",
                "height": "unset",
            });
            w.insertAfter(dockPos);
            $(".jqx-window-pin-button",w).addClass("jqx-window-pin-button-pinned");
            w.show();
            w.data("docked", true);
            windowDef.data.docked = true;
            if ((<any>$(w))[0] && (<any>$(w))[0].sizeChanged) {
                setTimeout(() => (<any>$(w))[0].sizeChanged(), (duration||150));
            }
            this.save();
            w.trigger("docked", true);
        }, duration);
    }

    public async unDock(window:string, ui:JQuery) {
        let w = ui.hasClass("jqx-window") ? ui : ui.parents(".jqx-window");
        $(".jqx-window-pin-button",w).removeClass("jqx-window-pin-button-pinned");
        w.data("docked", false);
        (<any>$(w)).jqxWindow({ draggable: true }); 
        var duration = (<any>$(w)).jqxWindow('collapseAnimationDuration');
        let wnd = this.windows.get(window);
        wnd.data.docked = false;
        const prevContent:string[] = wnd.output ? wnd.output.getLines() : [];
        if (wnd.output || wnd.custom) {
            if (wnd.output) wnd.output.destroy()
            delete wnd.output
            wnd.output = null;
            wnd.custom = null;
        }

        wnd = await this.show(window);
        if ((<any>$(w))[0] && (<any>$(w))[0].sizeChanged) {
            setTimeout(() => (<any>$(w))[0].sizeChanged(), (duration || 150));
        }
        if (wnd?.output && prevContent.length) {
            for (const line of prevContent) {
                wnd.output.write(line, line)
            }
        }
        this.save();
        w.trigger("undocked", true);
    }
    
    public addDockButton(parent:JQuery, window:string) {
        parent = $(".jqx-window-header", parent);
        let btnBack = $(`<div title="Ancora o stacca la finestra" class="jqx-window-dock-button-background" style="float: left;width: 16px; height: 16px; margin-right: 7px; margin-left: 0px;"><div class="jqx-window-pin-button" style="width: 100%; height: 100%; top: 0px;"></div></div>`)
        parent.prepend(btnBack);
        btnBack.click(()=>{
            if (this.isDocked(window, parent)) {
                this.unDock(window, parent);
            } else {
                this.dock(window, parent);
            }
        });
    }

    public addSettingsButton(parent:JQuery, window:string) {
        let btnBack = $(`<div title="Impostazioni" class="jqx-window-settings-button-background" style="width: 16px; height: 16px; margin-right: 7px; margin-left: 0px;position:absolute;"><div class="jqx-window-settings-button" style="background-size: 16px;width: 16px; height: 16px;  top: 0px;"></div></div>`)
        $(".jqx-window-header", parent).append(btnBack);
        btnBack.click(()=>{
            this.showSettings(window, parent);
        });
    }

    async showSettings(window: string, parent:JQuery) {
        const wnd = this.windows.get(window);
        const r = await Messagebox.ShowMultiInput("Impostazioni finestra (campi vuoti per predefinito)", ["Font (nome o famiglia di font)", "Grandezza font (in pixel)", "Larghezza ancorata", "Altezza ancorata", "Cancella finestra!"], [wnd.data.font||"",wnd.data.fontSize?wnd.data.fontSize.toString():"",wnd.data.anchorWidth?wnd.data.anchorWidth.toString():"",wnd.data.anchorHeight?wnd.data.anchorHeight.toString():"", false])
        if (r.button == Button.Ok) {
            if (r.results[0]) {
                wnd.data.font = r.results[0]
            } else {
                wnd.data.font = undefined
            }
            if (r.results[1]) {
                wnd.data.fontSize = Number(r.results[1])
            } else {
                wnd.data.fontSize = undefined
            }
            if (r.results[2]) {
                wnd.data.anchorWidth = Number(r.results[2])
            } else {
                wnd.data.anchorWidth = undefined
            }
            if (r.results[3]) {
                wnd.data.anchorHeight = Number(r.results[3])
            } else {
                wnd.data.anchorHeight = undefined
            }
            if (r.results[4]) {
                let r = await Messagebox.Question("Sei sicuro di voler cancellare questa finestra?")
                if (r.button == Button.Ok) await this.destroyWindow(wnd.data.name, true)
            } else {
                this.applySettings(wnd, parent);
            }
            this.save();
        }
    }

    private applySettings(wnd: WindowDefinition, parent: JQuery) {
        if (!parent.length) return;
        if (wnd.window.length) {
            this.applyDockSizes(wnd);
        }
        if (wnd.window.length && (<any>$(wnd.window))[0] && (<any>$(wnd.window))[0].sizeChanged) {
            var duration = (<any>$(wnd.window)).jqxWindow('collapseAnimationDuration');
            setTimeout(() => {
                if ((<any>$(wnd.window))[0]?.sizeChanged) {
                    (<any>$(wnd.window))[0].sizeChanged()
                }
            }, (duration || 150));
        }
        if (wnd.data.fontSize) {
            let s = null;
            s = $(".jqx-window-content", parent).attr('style');
            s = (s || '').replace(/font-size\:[^\;]+\;/g, '') + 'font-size: ' + wnd.data.fontSize + 'px !important;'; 
            $(".jqx-window-content", parent).attr('style', s)

            s = $(".outputText", parent).attr('style');
            s = (s || '').replace(/font-size\:[^\;]+\;/g, '') + 'font-size: ' + wnd.data.fontSize + 'px !important;'; 
            $(".outputText", parent).attr('style', s)
            
        } else {
            let s = null;
            s = $(".jqx-window-content", parent).attr('style');
            s = (s || '').replace(/font-size\:[^\;]+\;/g, '') + 'font-size: unset;'; 
            $(".jqx-window-content", parent).attr('style', s)

            s = $(".outputText", parent).attr('style');
            s = (s || '').replace(/font-size\:[^\;]+\;/g, '') + 'font-size: unset;'; 
            $(".outputText", parent).attr('style', s)
        }
        if (wnd.data.font) {
            let s = null;
            s = $(".jqx-window-content", parent).attr('style');
            s = (s || '').replace(/font-family\:[^\;]+\;/g, '') + 'font-family: ' + wnd.data.font + ' !important;'; 
            $(".jqx-window-content", parent).attr('style', s)

            s = $(".outputText", parent).attr('style');
            s = (s || '').replace(/font-family\:[^\;]+\;/g, '') + 'font-family: ' + wnd.data.font + ' !important;'; 
            $(".outputText", parent).attr('style', s)
        } else {
            let s = null;
            s = $(".jqx-window-content", parent).attr('style');
            s = (s || '').replace(/font-family\:[^\;]+\;/g, '') + 'font-family: inherit;'; 
            $(".jqx-window-content", parent).attr('style', s)

            s = $(".outputText", parent).attr('style');
            s = (s || '').replace(/font-family\:[^\;]+\;/g, '') + 'font-family: inherit;'; 
            $(".outputText", parent).attr('style', s)
        }
        this.updateWindowList();
    }

    private applyDockSizes(wnd: WindowDefinition) {
        if (!wnd || !wnd.data) return;

        if (wnd.data.anchorWidth && wnd.window) {
            wnd.window.css({
                "width": `${wnd.data.anchorWidth}px !important`
            });
            //((wnd.window)[0] as HTMLElement).style.setProperty("display", "block", "important")
        } else { if (wnd.window) wnd.window.css({ "width": "unset", "display": "unset" }); }

        if (wnd.data.anchorHeight && wnd.window) {
            wnd.window.css({
                "flex-grow:": "0 !important",
                "flex-basis": `${wnd.data.anchorHeight}px !important`
            });
            $(".jqx-resize", wnd.window).css({
                "height": `${wnd.data.anchorHeight}px !important`
            });
            ((wnd.window)[0] as HTMLElement).style.setProperty("display", "block", "important");
        } else if (wnd.window) { 
            wnd.window.css({ "height": "unset !important", "display": "unset" });
            $(".jqx-resize", wnd.window).css({
                "height": "unset !important"
            });
        }
    }

    public async destroyWindow(name:string, permanent:boolean) {

        let resolve:Function = null;
        var p = new Promise((rs,rj) => {
            resolve = rs;
        })
        let wdef = this.windows.get(name);
        if (wdef) {
            
            console.log("destroyWindow " + wdef.data.name)
            wdef.initialized = false;
            wdef.created = false;
            if (wdef.output) {
                wdef.output.destroy()
                delete wdef.output;
            }
            if (wdef.window) {
                (<any>wdef.window).jqxWindow("close");
                (<any>wdef.window).jqxWindow("destroy");
                (<any>wdef.window).remove();
                delete wdef.window;
            }
            wdef.output = null;
            wdef.window = null;
            if (permanent) {
                this.windows.delete(name);
                this.save();
            }
            this.updateWindowList();
            let int:number = null;
            int = <number><any>setInterval(()=>{
                let tw = wdef.data.name;
                if ($(".win-"+tw.replace(/ /g,"-")).length) {
                    return;
                }
                clearInterval(int);
                console.log("Destroyed " + name)
                resolve();
            },100);
        } else {
            console.log("Destroyed " + name)
            resolve();
        }
        return p;
    }
    public createWindow(name:string,createData?:WindowData, autoOpen?:boolean, recreate?:boolean):WindowDefinition {

        //console.log("createWindow " + name);
        if ((this.windows as any).loadedFrom && this.profileName != (this.windows as any).loadedFrom) {
            console.log("BUG: creating window in swrong profile")
            //debugger;
        }
        //console.log("Creating window " + name)
        if (!recreate && this.windows.has(name)) {
            const def = this.windows.get(name);
            //console.log("OLD " + name);
            //console.log(def);
            if (def.data && createData && def.window) {
                let different = false;
                for (const key in createData) {
                    if (Object.prototype.hasOwnProperty.call(createData, key)) {
                        if ((<any>def.data)[key] != (<any>createData)[key]) {
                            different = true;
                            break;
                        }
                    }
                }
                if (different) {
                    def.data = Object.assign(def.data, createData);
                    this.applySettings(def, def.window)
                }
            }
            return def;
        }

        if (this.loading) {
            return null;
        }
        //console.log("NEW window" + name);

        let win = null;
        let customOutput = null;
        if (name != "Mapper") {

            win = document.createElement("div");
            win.style.display = "none";
            win.className = "win-"+name.replace(/ /g,"-") + " customWindow";
            document.body.appendChild(win);

            win.innerHTML = `
            <!--header-->
            <div>${name}</div>
            <!--content-->
            <div>
                <div class="${$("#winOutput")[0].classList} full scrollable" id="win-${name.replace(/ /g,"-")}"></div>
            </div>
            `;

        } else {
            customOutput = new MapperWindow(this.mapper, this)
            win = customOutput.Instance();
        }

        const hasLayout = this.profileManager.getCurrent()?this.profileManager.getProfile(this.profileManager.getCurrent()).useLayout:false;
        let defaults = <WindowDefinition>(this.windows.get(name) || createData);

        if (createData) {
            defaults = {
                custom: customOutput != null,
                window: null,
                output: null,
                created:true,
                initialized: false,
                data: {
                    name: name,
                    w: createData.w || 450,
                    h: createData.h || 250,
                    x: createData.x || 100,
                    y: createData.y || 100,
                    visible: createData.visible || true,
                    collapsed: createData.collapsed || false,
                    docked:createData.docked==undefined?(hasLayout?true:false):createData.docked,
                    font: createData.font,
                    fontSize: createData.fontSize,
                    anchorWidth: createData.anchorWidth,
                    anchorHeight: createData.anchorHeight,
                }
            }
        }

        let collapse = false, dock = false;
        if (defaults && defaults.data) {
            collapse = defaults.data.collapsed
            dock = defaults.data.docked
        } else {
            dock = (hasLayout?true:false)
        }

        const $win = $(win);
        let wWidth = (defaults&&defaults.data?defaults.data.w:420)
        wWidth = Math.min($(window).width()-20, wWidth)
        let wHeight = (defaults&&defaults.data?defaults.data.h:250)
        wHeight = Math.min($(window).height()-20, wHeight)
        if (isNaN(wWidth)) {
            wWidth = 420
        }
        if (isNaN(wHeight)) {
            wHeight = 250
        }
        const w = (<any>$win).jqxWindow({showAnimationDuration: 0, width: wWidth, height: wHeight, showCollapseButton: true, autoOpen: false});

        let inresize=false;
        let observer:ResizeObserver = null;

        if (defaults && defaults.data) {
            (<any>$win).jqxWindow('move', defaults.data.x, defaults.data.y);
            (<any>$win).jqxWindow('resize', defaults.data.w, defaults.data.h);
        }

        let self = this;
        w.on('moved', function (event:any) {
            if (!self.windows || !self.windows.get || !self.windows.get(name)) return;
            let data = self.windows.get(name).data;
            data.x = event.args.x;
            data.y = event.args.y;
            self.save();
        });

        w.on('resized', function (event:any) {
            if (event.args.width == 0 && event.args.height == 0) return;
            if (!self.windows || !self.windows.get || !self.windows.get(name)) return;
            let data = self.windows.get(name).data;
            data.w = event.args.width;
            data.h = event.args.height;
            self.save();
        });

        w.on('open', function (event:any) {
            if (!self.windows || !self.windows.get || !self.windows.get(name)) return;
            let wd = self.windows.get(name);
            if (!wd) {
                (<any>$(event.target)).jqxWindow("destroy");
                return;
            }
            observer = new ResizeObserver(()=>{
                if (inresize) return;
                inresize = true;
                window.requestAnimationFrame(() => {
                    const size = $(".jqx-window-content",w).height();
                    if (size) $(".outputText",w).css({
                        "maxHeight": size + "px"
                    });
                    inresize = false;
                });
            });
            observer.observe(w[0])
            if (!wd.initialized) {
                wd.initialized = true;
                setTimeout(() => {
                    self.addDockButton($(".win-"+name.replace(/ /g,"-")),name);
                    self.addSettingsButton($(".win-"+name.replace(/ /g,"-")),name);
                    $(".jqx-resize", $win).height('unset')
                    if (collapse) {
                         (<any>w).jqxWindow('collapse');
                        let padding = $(".jqx-window-content",(w)).css("padding")
                        $(".jqx-window-content",(w)).css("padding", "0")
                        setTimeout(() => {$(".jqx-window-content",(w)).css("padding", padding)}, 150)
                    } 
                    if (dock) self.dock(name,$(".jqx-window-header", $win));
                    $("#cmdInput").focus();
                }, 1);
            }
            let data = self.windows.get(name).data;
            data.visible = true;
            self.save();
        });

        w.on('close', function (event:any) {
            if (!self.windows || !self.windows.get || !self.windows.get(name)) return;
            let data = self.windows.get(name).data;
            if (observer) {
                observer.disconnect()
            }
            data.visible = false;
            self.save();
        });

        w.on('collapse', function (event:any) {
            if (!self.windows || !self.windows.get || !self.windows.get(name)) return;
            let data = self.windows.get(name);
            data.data.collapsed = true;
            if (data.window) {
                $(".expand", data.window).css("height","unset")
            }
            self.save();
        });

        w.on('expand', function (event:any) {
            if (!self.windows || !self.windows.get || !self.windows.get(name)) return;
            let data = self.windows.get(name);
            data.data.collapsed = false;
            /**if (data.window) {
                $(".expand", data.window).css("height","100%")
            }*/
            self.save();
        });

        const def: WindowDefinition = {
            window: w,
            custom: customOutput ? true : false,
            output: customOutput ? customOutput : new CustomWin("win-"+name.replace(/ /g,"-"), this.profileManager.activeConfig),
            created: true,
            initialized: false,
            data: {
                name: name,
                w: 450,
                h: 250,
                x: 100,
                y: 100,
                visible: true,
                collapsed: false,
                docked: createData?createData.docked:(hasLayout?true:false),
                font: (createData?createData.font:undefined)||(defaults?defaults.data.font:undefined),
                fontSize: (createData?createData.fontSize:undefined)||(defaults?defaults.data.fontSize:undefined),
                anchorWidth: (createData?createData.anchorWidth:undefined)||(defaults?defaults.data.anchorWidth:undefined),
                anchorHeight: (createData?createData.anchorHeight:undefined)||(defaults?defaults.data.anchorHeight:undefined),
            }
        }

        this.windows.set(name, def);

        this.applySettings(def, w)



        def.data.w = w.jqxWindow('width');
        def.data.h = w.jqxWindow('height');
        let pos = w.offset();
        def.data.x = pos.left;
        def.data.y = pos.top;

        def.data.collapsed = ((defaults && defaults.data) ? defaults.data.collapsed : w.jqxWindow('collapsed'));
        def.data.visible = ((defaults && defaults.data) ? defaults.data.visible : true);
        def.data.font = ((defaults && defaults.data) ? defaults.data.font : undefined);
        def.data.fontSize = ((defaults && defaults.data) ? defaults.data.fontSize : undefined);
        def.data.anchorWidth = ((defaults && defaults.data) ? defaults.data.anchorWidth : undefined);
        def.data.anchorHeight = ((defaults && defaults.data) ? defaults.data.anchorHeight : undefined);

        if ((defaults && defaults.data.visible)||!defaults) {
            if (autoOpen === undefined || autoOpen!=false) (async () => {await this.show(name);})()
        }
        this.save();

        if (defaults && defaults.data.collapsed) {
            (<any>$win).jqxWindow('collapse');
        }

        this.updateWindowList();
        return def;
    }

    public save() {
        if (this.loading) {
            return;
        }
        if (this.saving) {
            console.log("Problem in saving windows. Double save.")
            //debugger;
        }
        this.saving = true
        try {
            var wnds = [...this.windows.values()].map(v => v.data);
            const usr = this.profileName
            let loadedFrom = (this.windows as any).loadedFrom
            if (loadedFrom === undefined) {
                (this.windows as any).loadedFrom = usr
                loadedFrom = usr;
            }
            // console.log("Save windows " + usr + "/" + loadedFrom  + ": " + wnds.map(v => v.name).join(","))
            if (loadedFrom != usr) {
                //debugger;
                return;
            }
            this.profileManager.saveWindows(this.profileName, wnds);
        } finally {
            this.saving = false
        }
    }

    public async show(window:string) {
        var w = this.windows.get(window);
        if (w.data) {
            w.data.visible = true
        }
        console.log("Showing window " + window)
        //console.log("SHOW " + w.data.name) 
        if (w.created && !w.output && !this.loading) {
            const data = w.data;
            data.visible = false
            await this.destroyWindow(window, true);
            //await waitForVariableValue(this, "loading", false);
            w = this.createWindow(window, data);
            if (w && w.data) {
                w.data.visible = true
            } else {
                //debugger;
            }
        } else if (w && !this.loading && (!w.window || !w.output)) {
            w = this.createWindow(window, w.data, false, true);
        }
        if ((w && w.window) && !this.loading) {
            w.window.css("visibility","visible")
            w.window.css("opacity",0)
            setTimeout(()=>{
                if (w.window) {
                    w.window.animate({"opacity":1}, 200)
                }
            }, 100)
            if (!(<any>w.window).jqxWindow('isOpen')) (<any>w.window).jqxWindow("open");
            this.bringToFront(w);
        }
        return w;
    }

    private bringToFront(w: WindowDefinition) {
        console.log("Bring to front " + w.data.name);
        (<any>w.window).jqxWindow('bringToFront');
    }

    public hide(window:string) {
        var w = this.windows.get(window);
        (<any>w.window).jqxWindow("close");
        w.window.css("visibility","hidden")
        w.data.visible = false;
        console.log("Hiding window " + window)
        this.save();
    }
}
