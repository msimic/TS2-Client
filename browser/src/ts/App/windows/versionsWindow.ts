import { AppInfo } from "../../appInfo";

export class VersionsWin {
    private $win: JQuery;
    private $div: JQuery;

    constructor() {
        const inWeb = !!!(<any>window).ipcRenderer;
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winAbout";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Registro modifiche</div>
        <!--content-->
        <div style="text-align:center;display: flex;flex-direction: column;">
            
            <pre id="versionsDiv" style="font: bold 12px consolas;margin:5px;text-align:left;white-space: wrap;overflow-y: scroll;"></pre>
        </div>
        `;

        this.$win = $(win);
        this.$div = $("#versionsDiv", this.$win);
        fetch("./versions.txt?v=" + AppInfo.Version).then(async r => this.$div.html((await r.text()).split('\n').join("<br/>")));

        const w = Math.min($(window).width()-20, 480);
        const h = Math.min($(window).height()-20, 290);

        (<any>this.$win).jqxWindow({width: w, height: h});
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}
