
export const ButtonOK = 1;
export const ButtonCancel = 0;

export interface MessageboxResult {
    button:number;
    result: string;
}

export class Messagebox {
    public static async Show(title: string, text: string) {
        return await messagebox(title, text, null, "OK", "", false, "", null, null);
    }
    public static async ShowWithButtons(title: string, text: string, okButton:string, cancelButton:string): Promise<MessageboxResult> {
        return await messagebox(title, text, null, okButton, cancelButton, false, "", null, null);
    }
    public static async Question(text: string): Promise<MessageboxResult> {
        return await messagebox("Domanda", text, null, "Si", "No", false, "", null, null);
    }
    public static async ShowWithWithCallback(title: string, text: string, callback:(val:string)=>void): Promise<MessageboxResult> {
        return await messagebox(title, text, callback, "OK", "", false, "", null, null);
    }
    public static async ShowWithWithButtonsAndCallback(title: string, text: string, okButton:string, cancelButton:string, callback:(val:string)=>void): Promise<MessageboxResult> {
        return await messagebox(title, text, callback, okButton, cancelButton, false, "", null, null);
    }
    public static async ShowFull(title: string, text: string, okButton:string, cancelButton:string, callback:(val:string)=>void, width:number, height:number): Promise<MessageboxResult> {
        return await messagebox(title, text, callback, okButton, cancelButton, false, "", width, height);
    }
    public static async ShowInputWithButtons(title: string, text: string, defaultText:string, okButton:string, cancelButton:string): Promise<MessageboxResult> {
        return await messagebox(title, text, null, okButton, cancelButton, true, defaultText, null, null);
    }
    public static async ShowInput(title: string, text: string, defaultText:string): Promise<MessageboxResult> {
        let res = await messagebox(title||"Domanda", text, null, "OK", "Annulla", true, defaultText, null, null);
        return res;
    }
}

export async function messagebox(title: string, text: string, callback:(val:string)=>void, okbuttontext:string, cancelbuttontext:string, input:boolean, inputDefault:string, width:number, height:number): Promise<MessageboxResult> {

    let resolveFunc:Function = null;
    let rejectFunc:Function = null;
    let ret:MessageboxResult = {
        button: ButtonCancel,
        result: ""
    };
    let promise = new Promise<MessageboxResult>((resolve,reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
    });

    let win = document.createElement("div");
    win.style.display = "none";
    win.className = "winMessagebox";
    document.body.appendChild(win);
    okbuttontext = okbuttontext == undefined ? "OK" : okbuttontext;
    cancelbuttontext = cancelbuttontext == undefined ? "Annulla" : cancelbuttontext;

    win.innerHTML = `
    <!--header-->
    <div id="title"></div>
    <!--content-->
    <div>
        <div style="display: table;height: 100%;width: 100%;box-sizing: border-box;position:relative;">
            <div style="display: table-row;height:auto;">
                <div class="messageboxtext" style="display: table-cell;vertical-align: middle;text-align:center;white-space: nowrap;" id="message"></div>
            </div>
            <div style="display: table-row;height:1%;">
                <div style="display: table-cell;">
                    <input type="text" style="box-sizing:border-box;width:100%;" id="messageboxinput">
                </div>
            </div>
            <div style="display: table-row;height:1%">
                <div class="messageboxbuttons" style="display: table-cell;">
                    <button id="accept" class="acceptbutton greenbutton"></button>
                    <button id="cancel" class="cancelbutton redbutton"></button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    let $win = $(win);

    const acceptButton = $("#accept", $win);
    const cancelButton = $("#cancel", $win);
    const titleText = $("#title", $win);
    const messageText = $("#message", $win);
    const messageInput = $("#messageboxinput", $win);
    if (!input) {
        messageInput.hide();
    } else if (inputDefault) {
        messageInput.val(inputDefault);
    }

    messageInput.keyup(k => {
        if (k.key == "Enter" || k.key == "Return") {
            acceptButton.click();
        }
    });

    (<any>$win).jqxWindow({minWidth: width || 350, minHeight: height || 150, showCollapseButton: false, isModal: true, resizable: true});

    $(acceptButton).text(okbuttontext);
    if (!okbuttontext) $(acceptButton).hide();
    $(cancelButton).text(cancelbuttontext);
    if (!cancelbuttontext) $(cancelButton).hide();

    $(acceptButton).click(() => {
        ret.button = ButtonOK;
        ret.result = (okbuttontext);
        (<any>$win).jqxWindow("close");
    });
    $(cancelButton).click(() => {
        ret.result = (cancelbuttontext);
        ret.button = ButtonCancel;
        (<any>$win).jqxWindow("close");
    });
    $(titleText).text(title);
    $(messageText).html("<p>" + text.replace(/\n/g, "<br/>") +"</p>");

    (<any>$win).jqxWindow("open");
    (<any>$win).jqxWindow('bringToFront');
    (<any>$win).on("close", () => {
        if (callback) callback(ret.result);
        (<any>$win).jqxWindow("destroy");
        if (input) {
            ret.result = messageInput.val();
        }
        if (resolveFunc) resolveFunc(ret);
        $("#cmdInput").focus();
    });
    
    if (!height) {
        (<any>$win).find('.jqx-window-content').append('<div id="bottomOfContent"></div>');

        // get new height based on position of marker
        var newHeight = $(messageText).height() +
             $('.messageboxbuttons', $win).height() +
             $('.jqx-window-header', $win).height() +
             (input ? $('.messageboxinput', $win).height() : 0)+
              50;

        // apply new height
        (<any>$win).jqxWindow({height: newHeight});
    }

    if (!width) {
        let newWidth = messageText.outerWidth()+10;
        (<any>$win).jqxWindow({width: newWidth});
    }

    setTimeout(()=>{
    if (input) {
        messageInput.focus();
    } else {
        acceptButton.focus();
    }}, 200);
    return promise;
}