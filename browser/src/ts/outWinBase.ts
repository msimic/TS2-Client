import * as Util from "./util";
import { colorIdToHtml } from "./color";
import { EventHook } from "./event";
import { ConfigIf } from "./util";

/*export interface ConfigIf {
    onSet(key: string, cb: (val: any) => void): void;
    getDef(key: string, def: any): any;
}*/


export class OutWinBase {
    public EvtLine = new EventHook<[string, string]>();
    public EvtBuffer = new EventHook<[string, string]>();

    protected debugScripts = false;

    protected colorsEnabled: boolean;
    private copyOnMouseUp: boolean;
    private logTime: boolean;

    private lineCount: number = 0;
    private maxLines: number = 500;
    private mouseWasDown = false;

    private onMouseUp = () => {
        if (this.mouseWasDown) {
            this.mouseWasDown = false;
            document.execCommand('copy');
            $("#cmdInput").focus();
        }
    }

    constructor(rootElem: JQuery, private config: ConfigIf) {
        this.$rootElem = rootElem;
        this.$targetElems = [rootElem];
        this.$target = rootElem;
        this.maxLines = config.getDef("maxLines", 1000);
        this.debugScripts = config.getDef("debugScripts", true);
        config.onSet("debugScripts", (val) => {
            this.debugScripts = val;
        });

        // direct children of the root will be line containers, let"s push the first one.
        this.pushElem($("<span>").appendTo(rootElem));

        this.colorsEnabled = this.config.getDef("colorsEnabled", true);
        this.copyOnMouseUp = this.config.getDef("copyOnMouseUp", true);
        this.logTime = this.config.getDef("logTime", false);
        this.config.onSet("logTime", (v) => {
            this.logTime = v;
        });
        
        if (this.copyOnMouseUp) {
            this.$rootElem.mousedown(this.onMouseDown);
            this.$rootElem.mouseup(this.onMouseUp);
        }

        this.config.onSet("maxLines", (val: any) => { this.setMaxLines(val); });

        this.config.onSet("colorsEnabled", (val: any) => { this.setColorsEnabled(val); });
        this.config.onSet("copyOnMouseUp", (val: any) => { 
            this.copyOnMouseUp = val;
            this.$rootElem[0].removeEventListener("mousedown", this.onMouseDown);
            this.$rootElem[0].removeEventListener("mouseup", this.onMouseUp);
            if (this.copyOnMouseUp) {
                this.$rootElem[0].addEventListener("mousedown", this.onMouseDown);
                this.$rootElem[0].addEventListener("mouseup", this.onMouseUp);
            }
        });
    }

    protected postInit() {
        //this.getOuterElement().bind("scroll", (e: any) => { this.handleScroll(e); });
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

    private scrollLock = false; // true when we should not scroll to bottom
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
            if (data[1] != this.appendBuffer) {
                //this.outputChanged(data);
            }
            this.appendBuffer = "";
            this.newLine();
        } else {
            let data:[string,string] = [this.lineText, this.appendBuffer];
            this.EvtBuffer.fire(data);
            if (data[1] != this.appendBuffer) {
                //this.outputChanged(data);
            }
        }
    };

    protected outputChanged(data: [string, string]) {
        this.lineText = data[0];
        this.appendBuffer = data[1];
        this.$target.html(this.appendBuffer);
        if (this.appendBuffer == "") {
            this.popElem().remove();
        }
    }

    private padStart(str:string, targetLength:number, padString:string) {
        targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (str.length >= targetLength) {
            return String(str);
        } else {
            targetLength = targetLength - str.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(str);
        }
    };

    protected appendToCurrentTarget(o:any) {
        if (this.$target == this.$rootElem) {
            this.lineCount++;
        }
        try {
        (this.$target)[0].appendChild((o instanceof jQuery) ? (<any>o)[0] : (o instanceof Node) ? o : $("<span>"+o+"</span>")[0]);
        } catch (err) {
            (this.$target)[0].appendChild($("<span>"+err.toString()+"</span>")[0])
        }
    }

    protected line() {
        return this.$targetElems[1];
    }

    public append(o: any, toRoot:boolean) {
        if (o == "<span></span>" || o == '') {
            return;
        }
        //const time = new Date();
        /*if (this.logTime && o) {
            const time = this.padStart(new Date().toISOString().split("T")[1].split("Z")[0] + " ", 12, " ");
            this.appendToCurrentTarget('<span class="timeLog">' + time + "</span>");
        }*/
        if (toRoot) {
            this.$target.append(o); //$(o).insertBefore(this.$target);
            if (this.$target == this.$rootElem) {
                this.lineCount += 1;
                /*const childCnt = this.$rootElem.children().length;
                if (childCnt != this.lineCount) {
                    console.log("Lines out of sync! " + childCnt + ":" + this.lineCount);
                }*/
            }
            this.newLine();
        }
        else {
            this.appendToCurrentTarget(o);
        }
        //const time2 = new Date();
        //const timeDif = Math.abs(<any>time2-<any>time);
        //console.log(timeDif);
    }

    private time() {
        const time = this.padStart(new Date().toISOString().split("T")[1].split("Z")[0] + " ", 12, " ");
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

    private writeBuffer() {
        /*if (this.appendBuffer && this.appendBuffer != "<span></span>") {
            this.appendToCurrentTarget(this.appendBuffer);
        }*/
        this.appendBuffer = "";
    };

    public outputDone() {
        this.writeBuffer();
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
        elem.stop().animate({scrollTop:elem.prop("scrollHeight")}, 50);
        //elem.scrollTop(elem.prop("scrollHeight"));
        this.scrollLock = false;
        this.scrollRequested = false;
        // console.timeEnd("_scroll_bottom");
    };

    public ScrollPageUp() {
        let elem = this.getOuterElement();
        const scrollH = parseInt(elem.prop('scrollTop'))-elem.height()
        elem.stop().animate({scrollTop:scrollH}, 50);
        //elem.scrollTop(elem.prop("scrollHeight"));
        this.scrollLock = true;
        this.scrollRequested = false;
    }
    public ScrollPageDown() {
        let elem = this.getOuterElement();
        const scrollH = parseInt(elem.prop('scrollTop'))+elem.height()
        elem.stop().animate({scrollTop:scrollH}, 50);
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
        
        requestAnimationFrame(() => {this.getOuterElement()[0].scrollTop = this.getOuterElement()[0].scrollHeight; this.scrollRequested = false;//this.privScrolBottom()
        });
        this.scrollRequested = true;
    }
}
