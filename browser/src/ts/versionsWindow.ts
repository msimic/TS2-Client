import { AppInfo } from "./appInfo";

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
            
            <pre id="versionsDiv" style="margin:5px;text-align:left;white-space: pre-wrap;overflow-y: scroll;"></pre>
        </div>
        `;

        this.$win = $(win);
        this.$div = $("#versionsDiv", this.$win);
        fetch("./versions.txt").then(async r => this.$div.text(await r.text()));
        (<any>this.$win).jqxWindow({width: 540, height: 280});
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}
