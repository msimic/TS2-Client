import { AppInfo } from "./appInfo";

export class AboutWin {
    private $win: JQuery;

    constructor() {
        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winAbout";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>ABOUT</div>
        <!--content-->
        <div>
            <h1>${AppInfo.AppTitle}</h1>
            <br>
            <a href="${AppInfo.RepoUrl}" target="_blank">${AppInfo.RepoUrl}</a>
            <br>
            Version: ${AppInfo.Version}
            <br>
            Build: ${AppInfo.Build}
        </div>
        `;

        this.$win = $(win);

        (<any>this.$win).jqxWindow({width: 360, height: 200});
    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}
