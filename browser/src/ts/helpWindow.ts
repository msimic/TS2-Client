import { AppInfo } from "./appInfo";
import { marked } from "marked";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/javascript';
import { downloadString, importFromFile } from "./util";
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
    private $helpIndex: JQuery;
    private $hamburger: JQuery;
    private searchButton: JQuery;
    private searchText: JQuery;
    private uploadButton: JQuery;
    private downloadButton: JQuery;
    private currentSearchHit:Element;
    private lastParsed: string;

    constructor() {
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winHelp";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Aiuto / Help</div>
        <!--content-->
        <div style="display: flex;flex-direction:column;position: absolute;/* height: 100%; *//* overflow-y: auto; */flex: auto;top: 0;bottom: 0;left: 0;right: 0;">
            <div style="flex:auto">
                <button class="hamburger">Indice &#x2261;</button>
                Ricerca: <input type="text" id="helpSearchText">
                <button title="Cerca" id="helpSearch">🔍</button>
                <button title="Carica locale" id="helpLoad">🡅</button>
                <button title="Scarica" id="helpDownload">🡇</button>
            </div>
            <div style="flex:auto;display:flex;flex-direction:row;position: relative;overflow-y: auto;top: 0;bottom: 0;right: 0;left: 0;">
                <div id="helpIndex" style="flex:auto;min-width: 360px;overflow-y:auto;width: auto;/* background-color:white; */font-size: 12px;position:absolute;top:0;left:0;right:0;bottom:0;">
                    <div id="helpIndexInner" style="border: 1px solid #80808073;border-radius: 5px;margin: 0;/* padding: 10px; */padding-right: 10px;margin-right: 5px;"></div>
                </div>
                <div id="helpContent" style="flex:auto;width:auto;top: 0;bottom: 0;display: flex;flex-direction: column;overflow-y: auto !important;">
                </div>
            </div>
        </div>
        `;

        this.$win = $(win);
        this.$helpContent = $("#helpContent", win);
        this.$helpIndex = $("#helpIndex", win);
        this.$hamburger = $(".hamburger", win);
        this.$helpIndex.hide();
        this.searchButton = $("#helpSearch",this.$win);
        this.uploadButton = $("#helpLoad",this.$win);
        this.downloadButton = $("#helpDownload",this.$win);
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

        this.downloadButton.on("click", ()=> {
            downloadString(this.lastParsed,"TS2Client_Help.md")
        });

        const w = Math.min($(window).width()-20, 450);
        const h = Math.min($(window).height()-20, 420);

        (<any>this.$win).jqxWindow({width: w, height: h});

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

        this.$hamburger.on("click", () => {
            if (this.$helpIndex.is(":visible")) {
                this.$helpIndex.hide()
            } else {
                this.$helpIndex.show()
            }
        })
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
        const helpMd = await fetch("./help/TS2Client_Help.md?v="+AppInfo.Version)
        const helpTxt = await helpMd.text()

        await this.loadHelp(helpTxt);
    }

    private async loadHelp(helpTxt: string) {
        const parsed = await marked.parse(helpTxt, { async: true });
        if (parsed) {
            this.lastParsed = parsed;
            let parsedContent = parsed;
            const rx = /(\<h1.+\>Indice\<\/h1\>)/.exec(parsedContent);
            const indexY = rx.index + rx[1].length
            const indexY2 = /\<hr\>/.exec(parsedContent).index
            let parsedIndex = "";
            if (indexY>-1 && indexY2 > -1) {
                parsedIndex = parsed.substring(indexY, indexY2 + 5);
                parsedContent = parsed.substring(indexY2 + 5)
                parsedIndex = parsedIndex.replace(/\<hr\>\n?$/gi, "")
            }
            $("#helpIndexInner",this.$helpIndex).html(parsedIndex);
            $("a[href]", this.$helpIndex).each((i, e) => {
                const url = $(e).attr("href");
                if (url.startsWith("#")) {
                    $(e).removeAttr("href");
                    $(e).css("cursor", "pointer");
                    $(e).on("click", evt => {
                        this.$helpIndex.hide()
                        const elm = $("a[name=" + url.substring(1) + "]", this.$helpContent)[0];
                        if (elm)
                            elm.scrollIntoView();
                    });
                }
            });
            this.$helpContent.html(parsedContent);
            $("a[href]", this.$helpContent).each((i, e) => {
                const url = $(e).attr("href");
                if (url.startsWith("#")) {
                    $(e).removeAttr("href");
                    $(e).css("cursor", "pointer");
                    $(e).on("click", evt => {
                        this.$helpIndex.hide()
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
