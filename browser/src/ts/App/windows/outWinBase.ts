import * as Util from "../../Core/util";
import { colorIdToHtml } from "../../Core/color";
import { EventHook } from "../../Core/event";
import { ConfigIf, padStart } from "../../Core/util";
import { Notification } from "../messagebox"
import { OutputLogger } from "../outputLogger";

/*export interface ConfigIf {
    onSet(key: string, cb: (val: any) => void): void;
    getDef(key: string, def: any): any;
}*/


export class OutWinBase {

    public EvtLine = new EventHook<[string, string]>();
    public EvtBuffer = new EventHook<[string, string]>();
    protected logger: OutputLogger = new OutputLogger();
    
    public debugScripts = false;

    protected colorsEnabled: boolean;
    private copyOnMouseUp: boolean;
    private logTime: boolean;

    private lineCount: number = 0;
    private maxLines: number = 500;
    private animatescroll: boolean = true;
    private mouseWasDown = false;
    private _log: boolean = this.logger.isEnabled();
    public get log(): boolean {
        return this._log;
    }
    public set log(value: boolean) {
        if (!this._log && value) {
            this.logger.clear()
        }
        this._log = value;
        if (this._log) {
            this.append("<span style=\"color:orange\">Registrazione attiva.<br/></span>", true)
        }
        if (!!value) {
            this.logger.start();
        } else {
            this.logger.stop();
        }
    }

    public getLines(): string[] {
        return [...this.$rootElem.children().toArray()].map((e) => e.outerHTML);
    }

    private onMouseUp = () => {
        if (!this.copyOnMouseUp) {
            this.mouseWasDown = false;
            this.$rootElem[0].removeEventListener("mousedown", this.onMouseDown);
            this.$rootElem[0].removeEventListener("mouseup", this.onMouseUp);
            if (!document.getSelection().toString().trim()) {
                $("#cmdInput").focus();
            }
            return;
        }
        if (this.mouseWasDown) {
            this.mouseWasDown = false;
            
            const testo = document.getSelection().toString().trim();
            if (testo) {
                let startNode = document.getSelection().anchorNode
                if (startNode && this.$rootElem[0].contains(startNode)) {
                    if (!navigator.clipboard){
                        document.execCommand('copy');
                    } else {
                        navigator.clipboard.writeText(testo).then(()=>{
                            Notification.Show("Selezione copiata automaticamente", true);
                        });
                    }
                }
            }
            $("#cmdInput").focus();
        }
    }

    onLogTime = (v:any) => { this.logTime = v; }
    onDebugScripts = (v:any) => {
         this.debugScripts = v; 
    }
    onMaxLinesChanged = (val: any) => { this.setMaxLines(parseInt(val)); }
    onAnimateScrollChanged = (val: any) => { this.animatescroll = !!val; }
    onColorsEnabledChanged = (val: any) => { this.setColorsEnabled(val); }
    onCopyOnMOuseUpChanged = (val: any) => { 
        this.copyOnMouseUp = val;
        this.$rootElem[0].removeEventListener("mousedown", this.onMouseDown);
        this.$rootElem[0].removeEventListener("mouseup", this.onMouseUp);
        if (this.copyOnMouseUp) {
            this.$rootElem[0].addEventListener("mousedown", this.onMouseDown);
            this.$rootElem[0].addEventListener("mouseup", this.onMouseUp);
        }
    }

    releaseOnSetHandlers = () => {
        this.config.onSetRelease("logTime", this.onLogTime)
        this.config.onSetRelease("debugScripts", this.onDebugScripts)
        this.config.onSetRelease("maxLines", this.onMaxLinesChanged)
        this.config.onSetRelease("animatescroll", this.onAnimateScrollChanged)
        this.config.onSetRelease("colorsEnabled", this.onColorsEnabledChanged)
        this.config.onSetRelease("copyOnMouseUp", this.onCopyOnMOuseUpChanged)
    }

    setupLogTime() {
        this.logTime = this.config.getDef("logTime", false);
        this.config.onSet("logTime", this.onLogTime);
    }

    constructor(protected name:string, rootElem: JQuery, private config: ConfigIf) {
        console.log("!!! Ceate output  " + this.name)
        this.$rootElem = rootElem;
        this.$targetElems = [rootElem];
        this.$target = rootElem;

        // direct children of the root will be line containers, let"s push the first one.
        this.pushElem($("<span>").appendTo(rootElem));

        this.onDebugScripts(config.getDef("debugScripts", false));
        this.config.onSet("debugScripts", this.onDebugScripts);        

        this.maxLines = config.getDef("maxLines", 1000);
        this.config.onSet("maxLines", this.onMaxLinesChanged);

        this.animatescroll = config.getDef("animatescroll", true);
        this.config.onSet("animatescroll", this.onAnimateScrollChanged);

        this.colorsEnabled = this.config.getDef("colorsEnabled", true);
        this.config.onSet("colorsEnabled", this.onColorsEnabledChanged);

        this.copyOnMouseUp = this.config.getDef("copyOnMouseUp", true);
        this.config.onSet("copyOnMouseUp", this.onCopyOnMOuseUpChanged);
        if (this.copyOnMouseUp) {
            this.$rootElem.mousedown(this.onMouseDown);
            this.$rootElem.mouseup(this.onMouseUp);
        }
    }

    public destroy() {
        console.log("!!! DestroyOutput " + this.name)
        this.releaseOnSetHandlers()
    }

    protected postInit() {
        this.getOuterElement().on('wheel', (e: any) => {
            this.handleScroll()
        })
        this.cls();
    }

    onMouseDown = (onMouseDown: any) => {
        this.mouseWasDown = true;
    }

    public cls() {
        this.lineCount = 0;
        this.$rootElem.empty();
        this.$targetElems = [this.$rootElem];
        this.$target = this.$rootElem;
    }
    
    public setMaxLines(count: number) {
        if (!count) count = 500;
        this.maxLines = count;
    }

    private setColorsEnabled(val: boolean) {
        if (val === this.colorsEnabled) {
            return;
        }

        this.colorsEnabled = val;

        for (let colorId in colorIdToHtml) {
            let colorHtml = colorIdToHtml[colorId];

            this.$rootElem.find(".fg-" + colorId).css("color", this.colorsEnabled ? colorHtml : "");
            this.$rootElem.find(".bg-" + colorId).css("background-color", this.colorsEnabled ? colorHtml : "");
            this.$rootElem.find(".bb-" + colorId).css("border-bottom-color", this.colorsEnabled ? colorHtml : "");
        }
    }

    private blink: boolean;
    private underline: boolean;
    private fgColorId: string;
    private bgColorId: string;

    public setBlink(value: boolean) {
        this.blink = value;
    }

    public setUnderline(value: boolean) {
        this.underline = value;
    }

    public setFgColorId(colorId: string) {
        this.fgColorId = colorId;
    }

    public setBgColorId(colorId: string) {
        this.bgColorId = colorId;
    };

    // handling nested elements, always output to last one
    private $targetElems: JQuery[];
    private underlineNest = 0;
    protected $target: JQuery;
    private $rootElem: JQuery;

    protected getOuterElement():JQuery {
        return this.$rootElem;
    }

    public scrollLock = false; // true when we should not scroll to bottom
    private handleScroll() {
        let scrollHeight = this.getOuterElement().prop("scrollHeight");
        let scrollTop = this.getOuterElement().scrollTop();
        let outerHeight = this.getOuterElement().outerHeight();
        let is_at_bottom = outerHeight + scrollTop + 35 >= scrollHeight;

        this.scrollLock = !is_at_bottom;
    }

    // elem is the actual jquery element
    public pushElem(elem: JQuery) {
        //this.writeBuffer();

        this.appendToCurrentTarget(elem[0]);
        this.$targetElems.push(elem);
        this.$target = elem;

        if (elem.hasClass("underline")) {
            this.underlineNest += 1;
        }
    }

    public popElem() {
        //this.writeBuffer();

        let popped = this.$targetElems.pop();
        this.$target = this.$targetElems[this.$targetElems.length - 1];

        if (popped.hasClass("underline")) {
            this.underlineNest -= 1;
        }
        //this.appendToCurrentTarget(popped);
        return popped;
    }

    protected appendBuffer = "";
    protected lineText = ""; // track full text of the line with no escape sequences or tags
    public addText(txt: string) {
        if (txt == '') return;

        let html = Util.rawToHtml(txt);
        let spanText = "<span";

        let classText = "";
        if (this.underline && this.colorsEnabled) {
            classText += "underline ";
        }
        if (this.blink && this.colorsEnabled) {
            classText += "blink ";
        }
        if (this.fgColorId) {
            classText += "fg-" + this.fgColorId + " ";
        }
        if (this.bgColorId) {
            classText += "bg-" + this.bgColorId + " ";
        }
        if (this.underlineNest > 0) {
            classText += "bb-" + this.fgColorId + " ";
        }

        if (classText !== "") {
            spanText += " class=\"" + classText + "\"";
        }

        let styleText = "";

        if (this.underlineNest > 0) {
            styleText += "border-bottom-style:solid;";
            styleText += "border-bottom-width:1px;";
            if (this.colorsEnabled) {
                styleText += "border-bottom-color:" + colorIdToHtml[this.fgColorId] + ";display: inline-block;";
            }
        }

        if (this.colorsEnabled) {
            
            if (this.fgColorId) {
                styleText += "color:" + colorIdToHtml[this.fgColorId] + ";";
            }
            if (this.bgColorId) {
                styleText += "background-color:" + colorIdToHtml[this.bgColorId] + ";";
            }
        }

        if (styleText !== "") {
            spanText += " style=\"" + styleText + "\"";
        }

        spanText += ">";
        spanText += html;
        spanText += "</span>";

        this.lineText += txt;
        this.appendBuffer += spanText;
        this.appendToCurrentTarget(spanText);
        
        if (txt.endsWith("\n")) {
            // firo i trigger qua prima che venga a schermo
            // cosi per il futuro posso manipulare il buffer
            let data:[string,string] = [this.lineText, this.appendBuffer];
            this.EvtLine.fire(data);
            //if (data[1] != this.appendBuffer) {
                //this.outputChanged(data);
            //}

            this.newLine();
        } else {
            let data:[string,string] = [this.lineText, this.appendBuffer];
            this.EvtBuffer.fire(data);
            //if (data[1] != this.appendBuffer) {
                //this.outputChanged(data);
            //}
        }
    };

    newLineReceived() {
        this.appendBuffer = "";
    }

    protected outputChanged(data: [string, string]) {
        this.lineText = data[0];
        this.appendBuffer = data[1];
        this.$target.html(this.appendBuffer);
        if (this.appendBuffer == "") {
            this.popElem().remove();
        }
    }

    public markCurrentTargetAsPrompt(promptClass:string) {
        if (this.$target != this.$rootElem) {
            this.$target.addClass("prompt")
            if (promptClass) this.$target.addClass(promptClass)
        }
    }

    protected appendToCurrentTarget(o:any) {
        if (this.$target == this.$rootElem) {
            this.lineCount++;
        }
        //try {
        (this.$target)[0].appendChild((o instanceof jQuery) ? (<any>o)[0] : (o instanceof Node) ? o : $("<span>"+o+"</span>")[0]);
        // } catch (err) {
        //     (this.$target)[0].appendChild($("<span>"+err.toString()+"</span>")[0])
        // }
    }

    protected line() {
        return this.$targetElems[1];
    }

    public append(o: string, toRoot:boolean) {
        if (o == "<span></span>" || o == '') {
            return;
        }
        //const time = new Date();
        /*if (this.logTime && o) {
            const time = padStart(new Date().toISOString().split("T")[1].split("Z")[0] + " ", 12, " ");
            this.appendToCurrentTarget('<span class="timeLog">' + time + "</span>");
        }*/
        if (toRoot) {
            this.$rootElem.append(o); //$(o).insertBefore(this.$target);
            if (this.lineText == "" && this.$target != this.$rootElem && this.$targetElems.length == 2) {
                let elm = this.popElem()
                this.pushElem(elm)
            }
            if(this.log) {
                const oldLine = this.lineText
                this.lineText = (o)+"\n"
                this.logLine()
                this.lineText = oldLine
            }
            //if (this.$target == this.$rootElem) {
                this.lineCount += 1;
                /*const childCnt = this.$rootElem.children().length;
                if (childCnt != this.lineCount) {
                    console.log("Lines out of sync! " + childCnt + ":" + this.lineCount);
                }*/
            //}
            //this.newLine();
        }
        else {
            this.appendToCurrentTarget(o);
        }
        //const time2 = new Date();
        //const timeDif = Math.abs(<any>time2-<any>time);
        //console.log(timeDif);
    }

    private time() {
        const d = new Date()
        const time = `${padStart(d.getHours().toString(), 2, "0")}:${padStart(d.getMinutes().toString(), 2, "0")}:${padStart(d.getSeconds().toString(), 2, "0")}.${padStart(d.getMilliseconds().toString(), 3, "0")} `;
        return ('<span class="timeLog">' + time + "</span>");
    }
    removing = false
    protected newLine() {
        while (this.$targetElems.length > 1) {
            let line = this.popElem(); // pop the old line
            if (this.$targetElems.length == 1 && this.logTime) {
                line.prepend(this.time());
            }
        }   
        this.pushElem($("<span>"));
        this.scrollBottom();

        /*const childCnt = this.$rootElem.children().length;
        if (childCnt != this.lineCount) {
            console.log("Lines out of sync! " + childCnt + ":" + this.lineCount);
        }*/

        this.logLine();
        this.lineText = "";

        //this.lineCount += 1;
        
        if (this.lineCount > this.maxLines) {
            if (this.$rootElem.children().length>this.maxLines) {
                if (this.removing) console.log("Bug removing in newLine")
                this.removing = true
                this.lineCount = this.$rootElem.children().length;
                for (let i = 0; i < this.maxLines/4; i++) {
                    if (this.$rootElem[0].firstChild) {
                        this.lineCount--;
                        this.$rootElem[0].removeChild(this.$rootElem[0].firstChild)
                    }                 
                }
                this.removing = false
            } else {
                this.lineCount = this.$rootElem.children().length;
            }
        }
    }
    protected logLine():void {};

    private writeBuffer() {
        /*if (this.appendBuffer && this.appendBuffer != "<span></span>") {
            this.appendToCurrentTarget(this.appendBuffer);
        }*/
        this.appendBuffer = "";
    };

    public outputDone() {
        //this.writeBuffer();
        this.scrollBottom();
    };

    public push(text:string, html:string) {
        this.lineText+=text;
        this.appendBuffer+=html;
    }

    private scrollRequested = false;
    private privScrolBottom() {
        // console.time("_scroll_bottom");
        let elem = this.getOuterElement();
        elem.stop().animate({scrollTop:elem.prop("scrollHeight")}, 150);
        //elem.scrollTop(elem.prop("scrollHeight"));
        this.scrollLock = false;
        this.scrollRequested = false;
        // console.timeEnd("_scroll_bottom");
    };

    public ScrollPageUp() {
        let elem = this.getOuterElement();
        const scrollH = parseInt(elem.prop('scrollTop'))-elem.height()
        elem.stop().animate({scrollTop:scrollH}, 150);
        //elem.scrollTop(elem.prop("scrollHeight"));
        this.scrollLock = true;
        this.scrollRequested = false;
    }
    public ScrollPageDown() {
        let elem = this.getOuterElement();
        const scrollH = parseInt(elem.prop('scrollTop'))+elem.height()
        elem.stop().animate({scrollTop:scrollH}, 150);
        //elem.scrollTop(elem.prop("scrollHeight"));
        this.scrollLock = true;
        this.scrollRequested = false;
        this.handleScroll()
    }
    public ScrollTop() {
        let elem = this.getOuterElement();
        elem.stop().animate({scrollTop:0}, 250);
        //elem.scrollTop(elem.prop("scrollHeight"));
        this.scrollLock = true;
        this.scrollRequested = false;
    }

    public scrollBottom(force: boolean = false) {
        if (this.scrollLock && force !== true) {
            return;
        }
        if (this.scrollRequested) {
            return;
        }
        
        requestAnimationFrame(() => {
            if (!this.animatescroll) {
                this.getOuterElement()[0].scrollTop = this.getOuterElement()[0].scrollHeight; this.scrollRequested = false;//this.privScrolBottom()
            } else {
                this.privScrolBottom();
            }
            this.scrollRequested = false;
        });
        this.scrollRequested = true;
    }
}
