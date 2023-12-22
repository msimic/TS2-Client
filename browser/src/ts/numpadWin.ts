import { validate } from "schema-utils";
import { defNumpad, NumPadConfigDef } from "./commandInput";
import { UserConfig } from "./userConfig";

export class NumpadWin {
    private $win: JQuery;
    private okButton: HTMLButtonElement;
    private revertButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    comando: HTMLInputElement;
    cells: JQuery;
    selected:string;
    NumPad:typeof NumPadConfigDef = { ... defNumpad};

    constructor(private config:UserConfig) {

        if (config.evtConfigImport) config.evtConfigImport.handle(this.init, this);

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winNumpad";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Tastierino Numerico</div>
        <!--content-->
        <div id="numpadwindow" style="display:table;">
            <div class="numpad grid-wrap">
                <div class="key disabled" data-keyname="" style="grid-area:r1c1;">Num</div>
                <div class="key" data-keyname="NumpadDivide" style="grid-area:r1c2">/</div>
                <div class="key" data-keyname="NumpadMultiply" style="grid-area:r1c3">*</div>
                <div class="key" data-keyname="NumpadSubtract" style="grid-area:r1c4">-</div>  
            
                <div class="key" data-keyname="Numpad7" style="grid-area:r2c1">7</div>
                <div class="key" data-keyname="Numpad8" style="grid-area:r2c2">8</div>
                <div class="key" data-keyname="Numpad9" style="grid-area:r2c3">9</div>
                <div class="key" data-keyname="NumpadAdd" style="grid-area:r2c4">+</div>
                
                <div class="key" data-keyname="Numpad4" style="grid-area:r3c1">4</div>
                <div class="key" data-keyname="Numpad5" style="grid-area:r3c2">5</div>
                <div class="key" data-keyname="Numpad6" style="grid-area:r3c3">6</div>
            
                <div class="key" data-keyname="Numpad1" style="grid-area:r4c1">1</div>
                <div class="key" data-keyname="Numpad2" style="grid-area:r4c2">2</div>
                <div class="key" data-keyname="Numpad3" style="grid-area:r4c3">3</div>
                <div class="key" data-keyname="NumpadEnter" style="grid-area:r4c4">Enter</div>
            
                <div class="key" data-keyname="Numpad0" style="grid-area:r5c1">0</div>
                <div class="key" data-keyname="NumpadDecimal" style="grid-area:r5c3">.</div>
            </div>
            <!--<div style="display:table-row;">
                <div style="display:table-cell;text-align:left;vertical-align: middle;">
                    <label style="margin-right:10px;">Comando</label>
                </div>
            </div>-->
            <div style="display:table-row;">
                <div style="display:table-cell;vertical-align: middle;text-align:center;">
                    <input id="numcomando" tabindex="1" style="margin-top:10px;width:180px;" title="Il comando per il tasto selezionato" placeholder="&lt;comando&gt;"type="text"/>
                </div>
            </div>     
            <div style="display:table-row;">
                <div style="display:table-cell;vertical-align: middle;text-align:center;">
                    <div class="messageboxbuttons" style="margin-top: 3px;display: inline-block;">
                        <button tabindex="6" title="Ripristina" class="acceptbutton yellowbutton" style="width:auto;min-width:0;">⎌</button>
                        <button tabindex="7" title="Applica" class="acceptbutton greenbutton">Accetta</button>
                        <button tabindex="8" title="Annulla" class="cancelbutton redbutton">Annulla</button>
                    </div>
                </div>
            </div>              
        </div>
        `;

        this.$win = $(win);
        this.okButton = win.getElementsByClassName("greenbutton")[0] as HTMLButtonElement;
        this.revertButton = win.getElementsByClassName("yellowbutton")[0] as HTMLButtonElement;
        this.cancelButton = win.getElementsByClassName("cancelbutton")[0] as HTMLButtonElement;
        this.comando = $("#numcomando",win)[0] as HTMLInputElement;
        this.cells = $(".numpad > .key",win);
        this.cells.click((ev) => {
            if (this.selected)
                this.apply()

            this.cells.removeClass("selected")
            if ($(ev.target).data("keyname")) {
                this.selected = $(ev.target).data("keyname")
                $(ev.target).addClass("selected")
                this.load()
            }
        })

        this.okButton.addEventListener("click", (b) => {
            this.apply()
            this.save();
            $(this.comando).val("");
            (<any>this.$win).jqxWindow("close");
        });

        this.revertButton.addEventListener("click", (b) => {
            this.NumPad = { ... defNumpad};
            this.save();
            this.init();
            $(this.comando).val("");
        });

        this.$win.on("open", ()=>{
            setTimeout(() => {
                this.comando.focus()                
            }, 300);
        });

        (<any>this.$win).jqxWindow({width: 280, height: 365, showCollapseButton: false, isModal: true});
        (<any>this.$win).jqxWindow("close");

        this.cancelButton.addEventListener("click", (b) => {
            this.cells.removeClass("selected");
            $(this.comando).val("");
            (<any>this.$win).jqxWindow("close");
        });
    }

    public init() {
        this.selected = null;
        this.cells.removeClass("selected");
        if (this.config.getDef("numpad",false)!=false) {
            const npd = this.config.get("numpad")
            this.NumPad = typeof npd === "string" ? JSON.parse(npd) : npd;
        }
        Object.keys(this.NumPad).forEach((k) => {
            $(".key[data-keyname="+ k +"]", this.$win).attr("title", (<any> this.NumPad)[k])
        })
    }

    public apply() {
        if (this.selected) {
            (<any> this.NumPad)[this.selected] = $(this.comando).val()
            Object.keys(this.NumPad).forEach((k) => {
                $(".key[data-keyname="+ k +"]", this.$win).attr("title", (<any> this.NumPad)[k])
            })
        }
    }

    public save() {
        this.config.set("numpad",this.NumPad)
    }

    public load() {
        if (this.selected) {
            $(this.comando).val((<any> this.NumPad)[this.selected])
        }
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
        this.init();
    }

    public destroy() {
        (<any>this.$win).jqxWindow("destroy");
    }
}
