import { AppInfo } from "./appInfo";
import { marked } from "marked";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/javascript';
import { importFromFile } from "./util";
import { Messagebox } from "./messagebox";

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);

interface WindowPos {
    x: number;
    y: number,
    w: number,
    h: number
}

export class HelpWin {
    private $win: JQuery;
    private $helpContent: JQuery;
    private searchButton: JQuery;
    private searchText: JQuery;
    private uploadButton: JQuery;
    private currentSearchHit:Element;

    constructor() {
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winHelp";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Aiuto / Help</div>
        <!--content-->
        <div>
            <div style="display:flex;flex-direction:column;position: relative;height: 100%;">
                <div style="flex:auto">
                    Ricerca: <input type="text" id="helpSearchText">
                    <button title="Cerca" id="helpSearch">&#128269;</button>
                    <button title="Carica locale" id="helpLoad">&#8682;</button>
                </div>
                <div id="helpContent" style="flex:auto">
                </div>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$helpContent = $("#helpContent", win);
        this.searchButton = $("#helpSearch",this.$win);
        this.uploadButton = $("#helpLoad",this.$win);
        this.searchText = $("#helpSearchText",this.$win);
        this.searchText.on("keydown", ev => {
            if (ev.key == "Enter") {
                this.doSearch()
            }
        })
        this.searchButton.on("click", ()=> {
            this.doSearch();
        });
        this.uploadButton.on("click", ()=> {
            importFromFile((d)=>{
                this.loadHelp(d);
            })
        });

        (<any>this.$win).jqxWindow({width: 360, height: 200});

        this.$win.on('moved', (event:any) => {
            let data:WindowPos = localStorage.getItem("winHelp_Pos")?JSON.parse(localStorage.getItem("winHelp_Pos")):{x:100,y:100,w:800,h:600};
            data.x = event.args.x;
            data.y = event.args.y;
            localStorage.setItem("winHelp_Pos", JSON.stringify(data));
        });

        this.$win.on('resized', function (event:any) {
            let data:WindowPos = localStorage.getItem("winHelp_Pos")?JSON.parse(localStorage.getItem("winHelp_Pos")):{x:100,y:100,w:800,h:600};
            data.w = event.args.width;
            data.h = event.args.height;
            localStorage.setItem("winHelp_Pos", JSON.stringify(data));
        });
    }

    private async doSearch() {
        if (this.currentSearchHit) {
            $(this.currentSearchHit).removeClass("searchResult");
        }
        if (this.searchText.val().length < 3) {
            await Messagebox.Show("Ricerca", "La ricerca deve contenere almeno tre caratteri!")
            this.searchText.focus();
            return;
        }
        const current: JQuery = (<any>this.$helpContent).findByContentText(this.searchText.val());
        if (current && current.length) {
            if (this.currentSearchHit) {
                let i = 0;
                for (i = 0; i < current.length; i++) {
                    const element = current[i].scrollIntoView ? current[i] : current[i].parentElement;
                    if (element == this.currentSearchHit) {
                        break;
                    }
                }
                let startIndex = i;
                if (++startIndex >= current.length) {
                    startIndex = 0;
                }

                if (current[startIndex]) {
                    this.scrollTo(current[startIndex]);
                }
                this.searchButton.html("&#128269; (" + (startIndex+1) +"/"+ current.length +")")
            } else {
                this.scrollTo(current[0]);
                this.searchButton.html("&#128269; (" +"1/"+ current.length +")") 
            }
        } else {
            this.searchButton.html("&#128269; (nessun risultato)") 
        }
    }

    private scrollTo(current: Element) {
        if (current.scrollIntoView) {
            $(current).addClass("searchResult")      
            current.scrollIntoView();
            this.currentSearchHit = current;
        } else if (current.parentElement.scrollIntoView) {
            current.parentElement.scrollIntoView();
            $(current.parentElement).addClass("searchResult") 
            this.currentSearchHit = current.parentElement;
        }
    }

    public async show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
        let data:WindowPos = localStorage.getItem("winHelp_Pos")?JSON.parse(localStorage.getItem("winHelp_Pos")):{x:100,y:100,w:800,h:600};
        if (data) {
            (<any>this.$win).jqxWindow('move', data.x, data.y);
            (<any>this.$win).jqxWindow('resize', data.w, data.h);
        }
        const helpMd = await fetch("./help/TS2Client_Help.md")
        const helpTxt = await helpMd.text()
        await this.loadHelp(helpTxt);
    }

    private async loadHelp(helpTxt: string) {
        const parsed = await marked.parse(helpTxt, { async: true });
        if (parsed) {
            this.$helpContent.html(parsed);
            $("a[href]", this.$helpContent).each((i, e) => {
                const url = $(e).attr("href");
                if (url.startsWith("#")) {
                    $(e).removeAttr("href");
                    $(e).css("cursor", "pointer");
                    $(e).on("click", evt => {
                        const elm = $("a[name=" + url.substring(1) + "]", this.$helpContent)[0];
                        if (elm)
                            elm.scrollIntoView();
                    });
                }
            });
            $("code[class]", this.$helpContent).each((i, e) => {
                const highlightedCode = hljs.highlightAuto(e.textContent).value;
                e.innerHTML = highlightedCode;
            });
        }
    }
}
