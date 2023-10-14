import { AppInfo } from "./appInfo";
import { htmlEscape } from "./util";

export class AboutWin {
    private $win: JQuery;

    constructor() {
        const inWeb = !!!(<any>window).ipcRenderer;
        const title = inWeb ? AppInfo.AppTitle : AppInfo.AppTitle.replace("Web ","");
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winAbout";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>INFORMAZIONI CLIENT E VERSIONE</div>
        <!--content-->
        <div style="text-align:center;">
            <h1>${title}</h1>
            Versione: ${AppInfo.Version}
            <br>
            Build: ${AppInfo.Build}
            <br>
            <br>
            Sito: <a href="${AppInfo.RepoUrl}" style="color:blue;" target="_blank">${AppInfo.RepoUrl}</a>
            <br>
            Bug report: <a href="${AppInfo.BugsUrl}" style="color:blue;" target="_blank">${AppInfo.BugsUrl}</a>
            <br>
            <br>
            Autore: ${htmlEscape(AppInfo.Author)}
            <br>
            Contributori: ${htmlEscape(AppInfo.Contributors.join(", "))}
        </div>
        `;

        this.$win = $(win);

        (<any>this.$win).jqxWindow({width: 480, height: 290});
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}
