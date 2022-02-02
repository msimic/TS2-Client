
export const ButtonOK = 1;
export const ButtonCancel = 0;

export enum Button {
    Cancel = ButtonCancel,
    Ok = ButtonOK,
}

export interface MessageboxResult {
    button:Button;
    result: string;
    results: string[];
}

export class Messagebox {
    public static async Show(title: string, text: string) {
        return await messagebox(title, text, null, "OK", "", false, [""], null, null, false);
    }
    public static async ShowWithButtons(title: string, text: string, okButton:string, cancelButton:string): Promise<MessageboxResult> {
        return await messagebox(title, text, null, okButton, cancelButton, false, [""], null, null, false);
    }
    public static async Question(text: string): Promise<MessageboxResult> {
        return await messagebox("Domanda", text, null, "Si", "No", false, [""], null, null, false);
    }
    public static async ShowWithWithCallback(title: string, text: string, callback:(val:string)=>void): Promise<MessageboxResult> {
        return await messagebox(title, text, callback, "OK", "", false, [""], null, null, false);
    }
    public static async ShowWithWithButtonsAndCallback(title: string, text: string, okButton:string, cancelButton:string, callback:(val:string)=>void): Promise<MessageboxResult> {
        return await messagebox(title, text, callback, okButton, cancelButton, false, [""], null, null, false);
    }
    public static async ShowFull(title: string, text: string, okButton:string, cancelButton:string, callback:(val:string)=>void, width:number, height:number): Promise<MessageboxResult> {
        return await messagebox(title, text, callback, okButton, cancelButton, false, [""], width, height, false);
    }
    public static async ShowInputWithButtons(title: string, text: string, defaultText:string, okButton:string, cancelButton:string): Promise<MessageboxResult> {
        return await messagebox(title, text, null, okButton, cancelButton, true, [defaultText], null, null, false);
    }
    public static async ShowInput(title: string, text: string, defaultText:string, multiline:boolean=false): Promise<MessageboxResult> {
        let res = await messagebox(title||"Domanda", text, null, "OK", "Annulla", true, [defaultText], null, null, false, multiline);
        return res;
    }
    public static async ShowMultiInput(title: string, labels: string[], defaultValues:string[]): Promise<MessageboxResult> {
        let res = await messagebox(title||"Domanda", labels.join('\n'), null, "OK", "Annulla", true, defaultValues, null, null, true);
        return res;
    }
}

export async function messagebox(title: string, text: string, callback:(val:string)=>void, okbuttontext:string, cancelbuttontext:string, input:boolean, inputDefault:string[], width:number, height:number, multiinput:boolean, multiline:boolean=false): Promise<MessageboxResult> {

    let resolveFunc:Function = null;
    let rejectFunc:Function = null;
    let ret:MessageboxResult = {
        button: ButtonCancel,
        result: "",
        results: []
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

    const numInputs = multiinput ? text.split('\n').length : 1
    const inputLabels = multiinput ? text.split('\n') : [text]

    let innserMessageboxBody = ""


    for (let index = 0; index < inputLabels.length; index++) {
        const label = inputLabels[index];

        let inputTemplate = `<input type="text" style="box-sizing:border-box;width:100%;" id="messageboxinput${index}">`
        if (multiline) {
            inputTemplate = `<textarea style="min-height:200px;height:100%;box-sizing:border-box;width:100%;" id="messageboxinput${index}"></textarea>`
        }
        const template =`
            <div style="display: table-row;height:auto;">
                <div class="messageboxtext" style="display: table-cell;vertical-align: middle;text-align:center;white-space: nowrap;" id="message${index}"></div>
            </div>
            <div style="display: table-row;height:${multiline?100:1}%;">
                <div style="display: table-cell;">
                    ${inputTemplate}
                </div>
            </div>
            `;
        innserMessageboxBody += template
    }

    win.innerHTML = `
    <!--header-->
    <div id="title"></div>
    <!--content-->
    <div>
        <div style="display: table;height: 100%;width: 100%;box-sizing: border-box;position:relative;">
            ${innserMessageboxBody}
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
    const messageText = [...Array(numInputs).keys()].map((v,i) => $("#message"+i, $win));
    const messageInput = [...Array(numInputs).keys()].map((v,i) => $("#messageboxinput"+i, $win));
    if (!input) {
        messageInput.map(v => v.hide());
    } else if (inputDefault) {
        messageInput.map((v,i) => v.val(inputDefault[i]));
    }

    if (!multiline) messageInput.map(v => v.keyup(k => {
        if (k.key == "Enter" || k.key == "Return") {
            acceptButton.click();
        }
    }));

    (<any>$win).jqxWindow({minWidth: width || 350, minHeight: height || 100, showCollapseButton: false, isModal: true, resizable: true});

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
    messageText.map((v,i) => v.html("<p style='margin:0;padding:0;'>" + inputLabels[i].replace(/\n/g, "<br/>") +"</p>"));

    (<any>$win).jqxWindow("open");
    (<any>$win).jqxWindow('bringToFront');
    (<any>$win).on("close", () => {
        if (callback) callback(ret.result);
        (<any>$win).jqxWindow("destroy");
        if (input) {
            ret.result = messageInput[0].val();
            if (multiinput) {
                ret.results = messageInput.map(v => v.val())
            }
        }
        if (resolveFunc) resolveFunc(ret);
        $("#cmdInput").focus();
    });
    
    if (!height) {
        (<any>$win).find('.jqx-window-content').append('<div id="bottomOfContent"></div>');

        let height = [...messageText.map(v => v.height())].reduce(function(a, b) { return a + b; }, 0);
        let inputheight = [...messageInput.map(v => v.height())].reduce(function(a, b) { return a + b; }, 0);
        // get new height based on position of marker
        var newHeight = height +
             $('.messageboxbuttons', $win).height() +
             $('.jqx-window-header', $win).height() +
             (input ? inputheight : 0)+
              70;

        // apply new height
        (<any>$win).jqxWindow({height: newHeight});
    }

    if (!width) {
        let newWidth = Math.max(...messageText.map(v => v.outerWidth()+10));
        (<any>$win).jqxWindow({width: newWidth});
    }

    setTimeout(()=>{
    if (input) {
        messageInput[0].focus();
    } else {
        acceptButton.focus();
    }}, 200);
    return promise;
}