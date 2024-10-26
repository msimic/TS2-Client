import { AppInfo } from "../appInfo";
import { EventHook } from "./event";
import { Button, Messagebox, messagebox } from "../App/messagebox";
import { TrigAlItem } from "../Scripting/windows/trigAlEditBase";
import { Mudslinger } from "../App/client";
import { UserConfigData } from "../App/userConfig";

export function htmlEscape(text:string) {
    return replaceLf(
        replaceLtGt(
        replaceAmp(text)));
}

export function replaceLtGt(text: string): string {
    return (text||"").toString().replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
}

export function replaceAmp(text: string): string {
    return (text||"").toString().replace(/&/g, "&amp;");
}

export function replaceLf(text: string): string {
    // We are presumably already stripping out CRs before this
    return (text||"").toString().replace(/\n/g, "<br>");
}

export function raw(text: string): string {
    if (typeof text == "number") {
        return (<number>text).toString();
    } else if (typeof text != "string") {
        text = JSON.stringify(text);
        text = text.slice(1, text.length-1);
    }
    return text;
}

export interface ConfigIf {
    data: UserConfigData;
    set(key: string, val: any, nosave?:boolean): void;
    get(key:string): any;
    onSet(key: string, cb: (val: any) => void): void;
    onSetRelease(key: string, cb: (val: any) => void): void;
    getDef(key: string, def: any): any;
    evtConfigImport: EventHook<{data: {[k: string]: any}, owner: any}>;
}

export function padStart(str:string, targetLength:number, padString:string) {
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

export function createPath(cmd: string): string {
    if (cmd[0]!=".") return '';

    let number:string = '';
    let ret = [];

    for (let i = 1; i < cmd.length; i++) {
        const c = cmd[i];
        if (c >= '0' && c <= '9') {
            number += c;
        } else {
            for (let n = 0; n < (number ? parseInt(number) : 1); n++) {
                ret.push(c);
            }
            number = '';
        }
    }

    return ret.join("\n");
}

export function isTrue(v:any):boolean {
    if (typeof v == "boolean") return v;
    if (typeof v == "string") return v == "true";
    return false;
}

export function rawToHtml(text: string): string {
    if (typeof text != "string") {
        text = JSON.stringify(text);
        text = text.slice(1, text.length-1);
    }
    return replaceLf(
            replaceLtGt(
            replaceAmp(text)));
}

export function linesToArray(str:string):string[] {
    let ret:string[] = [];
    ret = str.replace('\r', '').split('\n');
    return ret;
}

export function throttle(fn:Function, threshhold:number, scope?:any):Function {
    threshhold = threshhold || (threshhold = 250);
    var last:number;
    var deferTimer:number;


    return function () {

        var context = scope || this;
      var now = +new Date,
          args = arguments;
      if (last && now < last + threshhold) {
        // hold on to it
        clearTimeout(deferTimer);
        /*try {
        console.log("deferring " + JSON.stringify(args))
        } catch (err) {
            return
        }*/
        deferTimer = <number><unknown>setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        //console.log("executing")
        fn.apply(context, args);
      }
    };
  }

export function stripHtml(sText:string):string {
    let intag = false;
    let positions = [];
    for (var i = 0; i < sText.length; i++) {
        if (sText[i] == "<") intag = true;
        if (!intag) {
            positions.push(sText[i]);
        }
        if (sText[i] == ">") intag = false;
    }
    return positions.join("");
}

export function Acknowledge(ack:string, str:string) {
    const val = localStorage.getItem('ack_'+ack);
    if (val == 'true') return;
    const w = Math.min($(window).width()-20, 400);
    messagebox("Informazione", str, () => {
        localStorage.setItem('ack_'+ack, "true");
    }, "OK", "", false, [""], w, null, false, "");
}

export interface Color {
    r:number;
    g:number;
    b:number;
    a:number;
}

export function isAlphaNumeric(str:string) {
    var code, i, len;
  
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123) &&
          !(code == 40 || code == 41) &&
          !(code == 91 || code == 93) &&
          !(code == 46)) { // lower alpha (a-z)
        return false;
      }
    }
    return true;
  };


export function colorToHex(color:Color, withAlpha:boolean):string {

    if (!color) {
        return "transparent";
    }
    let rHex = color.r.toString(16);
    let gHex = color.g.toString(16);
    let bHex = color.b.toString(16);
    let aHex = (color.a+255).toString(16);

    // Add a leading zero if the hex value is less than 10
    if (rHex.length == 1) rHex = "0" + rHex;
    if (gHex.length == 1) gHex = "0" + gHex;
    if (bHex.length == 1) bHex = "0" + bHex;
    if (aHex.length == 1) aHex = "0" + bHex;

    // Concatenate the hex values with a # symbol
    let hexColor = "#" + rHex + gHex + bHex;

    if (withAlpha) {
        if (color.a) {
            hexColor += aHex;
        } else {
            hexColor += "00"
        }
    }

    // Return the hex color
    return hexColor;
}
export function colorCssToRGB(colorKeyword:string):Color {
    
    if (!colorKeyword) {
        return {
            r: 0,
            g: 0,
            b: 0,
            a: 1
          };
    }

    function parseColor (input:string) {
        var m = input.match (/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*(\d+(\.\d+)?)\s*)?\)$/i);
        if (m) {
          return {
            r: parseInt (m [1]),
            g: parseInt (m [2]),
            b: parseInt (m [3]),
            a: m [5] ? parseFloat (m [5]) : 1
          };
        }
        return null;
      }

    if (colorKeyword.endsWith(";")) {
        colorKeyword = colorKeyword.slice(0, colorKeyword.length - 1)
    }
    let el = document.createElement('div');

    el.style.color = colorKeyword;

    document.body.appendChild(el);

    let rgbValue = window.getComputedStyle(el).color;

    document.body.removeChild(el);

    return parseColor(rgbValue);
}

export function waitForVariableValue(obj: any, varName:string, expectedValue:any, timeout?:number) {
    return new Promise<boolean>(resolve => {
      var tmo = timeout || 1000;
      var start_time = Date.now();
      async function checkFlag() {
        if (obj[varName] == expectedValue) {
          resolve(true);
        } else if (Date.now() > start_time + tmo) {
          resolve(false);
        } else {
          await new Promise<boolean>(resolve => setTimeout(resolve, 100));
          checkFlag();
        }
      }
      checkFlag();
    });
}

export function escapeRegExp(string:string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function escapeRegexReplacement(string:string) {
    return string.replace(/\$/g, '$$$$');
}

export function downloadJsonToFile(json:any, filename:string) {
    let jsonstr = JSON.stringify(json, null, 2);
    downloadString(jsonstr, filename);
}

export function downloadString(jsonstr: string, filename: string) {
    let blob = new Blob([jsonstr], { type: "octet/stream" });
    let url = window.URL.createObjectURL(blob);

    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
}

export function importFromFile(callback:(data:string)=>void) {
    if (!callback) return;
    let inp: HTMLInputElement = document.createElement("input");
    inp.type = "file";
    inp.style.visibility = "hidden";

    inp.addEventListener("change", (e: any) => {
        let file = e.target.files[0];
        if (!file) {
            return;
        }

        let reader = new FileReader();
        reader.onload = (e1: any) => {
            let text = e1.target.result;
            callback(text)
        };
        reader.readAsText(file);

    });

    document.body.appendChild(inp);
    inp.click();
    document.body.removeChild(inp);
}

// https://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
export function utf8encode(str: string): Uint8Array {
    let utf8: number[] = [];

    for (let i = 0; i < str.length; ++i) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 
                      0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18), 
                      0x80 | ((charcode>>12) & 0x3f), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
        }
    }

    return new Uint8Array(utf8);
}

/* https://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript */
export function utf8decode(array: Uint8Array): { result: string; partial: Uint8Array } {
    let out, i, len, c;
    let char2, char3, char4;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
        c = array[i++];
    
        switch(c >> 4)
        { 
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12: case 13:
                // 110x xxxx   10xx xxxx
                if ( (i + 1) > len) {
                    return { result: out, partial: array.slice(i - 1) };
                }
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                if ( (i + 2) > len) {
                    return { result: out, partial: array.slice(i - 1) };
                }
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                               ((char2 & 0x3F) << 6) |
                               ((char3 & 0x3F) << 0));
                break;
            case 15:
                // 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx
                if ( (i + 3) > len) {
                    return { result: out, partial: array.slice(i - 1) };
                }
                char2 = array[i++];
                char3 = array[i++];
                char4 = array[i++];
                out += String.fromCodePoint(((c & 0x07) << 18) | ((char2 & 0x3F) << 12) | ((char3 & 0x3F) << 6) | (char4 & 0x3F));

                break;
        }
    }

    return { result: out, partial: null };
}

export function CreateCodeMirror(element:HTMLTextAreaElement) {
    function bracketFolding(pairs:any) {
        return function(cm:any, start:any) {
          var line = start.line, lineText:string = cm.getLine(line);
      
          function findOpening(pair:any) {
            var tokenType;
            for (let ln = line; ln >= 0; ln--) {
                let lnText:string = cm.getLine(ln)
                let startCh:number = ln == line ? start.ch : lnText.length
                for (let at = startCh, pass = 0;;) {
                    var found = at <= 0 ? -1 : lnText.lastIndexOf(pair[0], at - 1);
                    if (found == -1) {
                        if (pass == 1) break;
                        pass = 1;
                        at = lineText.length;
                        continue;
                    }
                    if (pass == 1 && ln == line && found < start.ch) break;
                    let tk = cm.getTokenAt((window.CodeMirror as any).Pos(ln, found + 1))
                    tokenType = cm.getTokenTypeAt((window.CodeMirror as any).Pos(ln, found + 1));
                    if (!/^(comment|string)/.test(tokenType)) return {ch: found + 1, line:ln, tokenType: tokenType, pair: pair};
                    at = found - 1;
                }
            }
            return null
          }
      
          function findRange(found:any) {
            let foundLine = found.line;
            var count = 1, lastLine = cm.lastLine(), end, startCh = found.ch, endCh
            outer: for (var i = line; i <= lastLine; ++i) {
              var text = cm.getLine(i), pos = i == line ? startCh : 0;
              for (;;) {
                var nextOpen = text.indexOf(found.pair[0], pos), nextClose = text.indexOf(found.pair[1], pos);
                if (nextOpen < 0) nextOpen = text.length;
                if (nextClose < 0) nextClose = text.length;
                pos = Math.min(nextOpen, nextClose);
                if (pos == text.length) break;
                if (cm.getTokenTypeAt((window.CodeMirror as any).Pos(i, pos + 1)) == found.tokenType) {
                  if (pos == nextOpen) ++count;
                  else if (!--count) { end = i; endCh = pos; break outer; }
                }
                ++pos;
              }
            }
      
            if (end == null || line == end) return null
            return {from: (window.CodeMirror as any).Pos(foundLine, startCh),
                    to: (window.CodeMirror as any).Pos(end, endCh)};
          }
      
          var found = []
          for (var i = 0; i < pairs.length; i++) {
            var open = findOpening(pairs[i])
            if (open) found.push(open)
          }
          found.sort(function(a, b) { return a.ch - b.ch })
          for (var i = 0; i < found.length; i++) {
            var range = findRange(found[i])
            if (range) return range
          }
          return null
        }
      }

      function findBraceBlockRange(editor:any, start:any) {
        const doc = editor.getDoc();
        const cursorPos = start//doc.getCursor();
      
        // Initialize stack to track nested braces
        const stack = [];
        let startPos = null;
        let endPos = null;
        outerStart: for (let line = cursorPos.line; line >= 0; line--) {
          const lineContent = doc.getLine(line);
          for (let ch = (line == cursorPos.line ? cursorPos.ch : lineContent.length - 1); ch >= 0; ch--) {
            const char = lineContent[ch];
            if (char === '{' || char === '[') {
              // Check if it's part of a comment
              const token = editor.getTokenAt({ line, ch });
              if (!token.type || !token.type.includes('comment')) {
                if (stack.length === 0) {
                  // Found outermost opening brace
                  startPos = { line, ch };
                  startPos.ch++
                  break outerStart
                }
                stack.pop();
              }
            } else if (char === '}' || char === ']') {
              // Check if it's part of a comment
              const token = editor.getTokenAt({ line, ch });
              if (!token.type || !token.type.includes('comment')) {
                stack.push(char);
              }
            }
          }
        }

        outerEnd: if (startPos) for (let line = cursorPos.line; line < editor.lastLine(); line++) {
            const lineContent = doc.getLine(line);
            for (let ch = (line == cursorPos.line ? cursorPos.ch : 0); ch < lineContent.length; ch++) {
              const char = lineContent[ch];
              if (char === '}' || char === ']') {
                // Check if it's part of a comment
                const token = editor.getTokenAt({ line, ch });
                if (!token.type || !token.type.includes('comment')) {
                  if (stack.length === 0) {
                    // Found outermost opening brace
                    endPos = { line, ch };
                    break outerEnd
                  }
                  stack.pop();
                }
              } else if (char === '{' || char === '[') {
                // Check if it's part of a comment
                const token = editor.getTokenAt({ line, ch });
                if (!token.type || !token.type.includes('comment')) {
                  stack.push(char);
                }
              }
            }
          }
      
        if (startPos && endPos) {
            editor.setCursor(startPos)
            return {from: (window.CodeMirror as any).Pos(startPos.line, startPos.ch),
                to: (window.CodeMirror as any).Pos(endPos.line, endPos.ch)};
        }
        console.log('No opening brace found outside comments.');
        return null;
      }

    (window.CodeMirror as any).braceRangeFinder = function(cm:any, start:any) {
        return findBraceBlockRange(cm, start)
        //return bracketFolding([["{", "}"], ["[", "]"]])(cm, start)
    };

    let mode = {
        name: "javascript",
        globalVars: true,
    };
    let config = {
        mode: mode,
        lineWiseCopyCut: false,
        theme: Mudslinger.GetCodeMirrorTheme(),
        autoRefresh: true, // https://github.com/codemirror/CodeMirror/issues/3098
        matchBrackets: true,
        lineNumbers: true,
        scrollbarStyle: "overlay",
        tabSize: 2,
        keyMap: "sublime",
        autoCloseBrackets: true,
        foldGutter: true,
        styleActiveLine: true,
        search: { bottom:true},
        foldOptions: {
            rangeFinder: (window.CodeMirror as any).braceRangeFinder
        },
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        extraKeys: {"Ctrl-Space": "autocomplete", "Alt-F": "findPersistent"},
    };
    let cm = (window.CodeMirror as any).fromTextArea(
        element, <any>config
    );
    addIntellisense(cm)
    return cm
}
            
export function addIntellisense(editor:CodeMirror.Editor) {
    if (!$("#editorContextMenu").length) {
        $("<div id='editorContextMenu' style='display:none'>").appendTo(document.body)
    }
    $.ajax("./modules/ecmascript.json?rng="+AppInfo.Version).done(function(code:any) {
        let server = new (window.CodeMirror as any).TernServer({ecmaVersion: 10, hintDelay: 4000, allowAwaitOutsideFunction: true, defs: [code]});
        editor.on("contextmenu", (cm:CodeMirror.Editor, e:MouseEvent) => {
            setTimeout(() => {
                let editorMenu:any = null;
                let menuData:any = {
                    "goDef": ["Vai a definizione","Alt+D"],
                    "findRef": ["Cerca","Ctrl+F / Alt+F / F3"],
                    "highlight": ["Evidenzia","Ctrl+."],
                    "collapse": ["Collassa","Ctrl+Q /Shift+Ctrl+Q"],
                    "rename": ["Rinomina","F2"],
                    "info": ["Docs","Ctrl+O"],
                    "complete": ["Completa", "Ctrl-Space"]
                }
                let lis = Object.getOwnPropertyNames(menuData).map(n => {
                    const str = menuData[n];
                    return `<li data-value="${n}">${str[0]} <span style='float:right;opacity:0.5;'>${str[1]}</span></li>`
                }).join("")
                $("#editorContextMenu").html("")
                editorMenu = ($("<div><ul>" + lis + "</ul><div>") as any)
                editorMenu.appendTo($("#editorContextMenu"))
                editorMenu.jqxMenu({ animationShowDelay: 0, popupZIndex: 999999, animationShowDuration : 0, width: '100px', height: null, autoOpenPopup: false, mode: 'popup'});
                const token = cm.getTokenAt(cm.getCursor());
                var scrollTop = e.clientY + $(window).scrollTop();
                var scrollLeft = e.clientX + $(window).scrollLeft();
                editorMenu.on('closed', function () {
                    setTimeout(()=>{
                        editorMenu.jqxMenu('destroy')
                        editorMenu.remove()
                    }, 100)
                });
                editorMenu.on('itemclick', function (event:any)
                {
                    var val = $(event.args).data("value");
                    
                    editorMenu.jqxMenu('close')
                    switch (val) {
                        case "goDef": {
                            server.jumpToDef(cm)
                            break;
                        }
                        case "findRef": {
                            let cursor = (cm as any).getSearchCursor(token.string);
                            cursor.findNext();
                            if (cursor.from() && cursor.to()) cm.setSelection(cursor.from(), cursor.to());
                            (cm as any).execCommand("findPersistent")
                            break;
                        }
                        case "highlight": {
                            server.selectName(cm);
                            break;
                        }
                        case "rename": {
                            server.rename(cm);
                            break;
                        }
                        case "info": {
                            server.showDocs(cm);
                            break;
                        }
                        case "complete": {
                            (cm as any).showHint({hint: server.getHint, completeSingle:true});
                            break;
                        }
                        case "collapse": {
                            let c:any = cm.getCursor();
                            var isFolded = (cm as any).isFolded(c);
                            if (isFolded) {
                                (cm as any).execCommand("unfold")
                            }
                            else {
                                (cm as any).foldCode(c);
                            }
                            break;
                        }
                    }
                });
                editorMenu.jqxMenu('open', scrollLeft, scrollTop);
            }, 50)
            e.stopPropagation()
            e.preventDefault()
            return true
        });
        editor.setOption("extraKeys", {
            "Ctrl-Space": function(cm:any) { /*server.complete(cm);*/ cm.showHint({hint: server.getHint, completeSingle:true}); },
            "Ctrl-I": function(cm:any) { server.showType(cm); },
            "Ctrl-O": function(cm:any) { server.showDocs(cm); },
            "Alt-D": function(cm:any) { server.jumpToDef(cm); },
            "Alt-.": function(cm:any) { server.jumpBack(cm); },
            "F2": function(cm:any) { server.rename(cm); },
            "Ctrl-.": function(cm:any) { server.selectName(cm); },
            "Tab": function(cm:any){
                if (cm.somethingSelected()) cm.indentSelection("add");
                else cm.replaceSelection("  ", "end");
              },
            "Ctrl-Q": function(cm:any) {
                let c:any = cm.getCursor();
                var isFolded = (cm as any).isFolded(c);
                if (isFolded) {
                    //(cm as any).execCommand("unfold")
                    (cm as any).foldCode(c);
                }
                else {
                    (cm as any).foldCode(c);
                }
                return;
            },
            "Shift-Ctrl-Q": function(cm:any) {
                (cm as any).execCommand("foldAll")
            },
            "Alt-F": "findPersistent"
        })
        editor.on("keydown", function(cm:any, event:any) {
            if (event.code == "Escape") {
                $(cm.getTextArea()).closest("div.jqx-window-content").find(":button:visible").last().focus()
                event.preventDefault()
                event.stopPropagation()
                return false 
            }
            return true
        });
        editor.on("cursorActivity", function(cm:any) { server.updateArgHints(cm); });
        var ExcludedIntelliSenseTriggerKeys:{[k: string]: string} =
        {
            "8": "backspace",
            "9": "tab",
            "13": "enter",
            "16": "shift",
            "17": "ctrl",
            "18": "alt",
            "19": "pause",
            "20": "capslock",
            "27": "escape",
            "32": "space",
            "33": "pageup",
            "34": "pagedown",
            "35": "end",
            "36": "home",
            "37": "left",
            "38": "up",
            "39": "right",
            "40": "down",
            "45": "insert",
            "46": "delete",
            "50": "quote",
            "66": "{",
            "67": "}",
            "91": "left window key",
            "92": "right window key",
            "93": "select",
            "107": "add",
            "109": "subtract",
            "110": "decimal point",
            "111": "divide",
            "112": "f1",
            "113": "f2",
            "114": "f3",
            "115": "f4",
            "116": "f5",
            "117": "f6",
            "118": "f7",
            "119": "f8",
            "120": "f9",
            "121": "f10",
            "122": "f11",
            "123": "f12",
            "144": "numlock",
            "145": "scrolllock",
            "186": "semicolon",
            "187": "equalsign",
            "188": "comma",
            "189": "dash",
            /*"190": "period",*/
            "191": "slash",
            "192": "graveaccent",
            "220": "backslash",
            "222": "quote"
        }

        editor.on("keyup", function(editor:any, event:any)
        {
            var __Cursor = editor.getDoc().getCursor();
            var __Token = editor.getTokenAt(__Cursor);

            let prevent = ['[',']','-','+','=','>','<','!','(',')','{','}','`'];

            if (!editor.state.completionActive && !(event.ctrlKey||event.altKey||event.shiftKey) &&
                !ExcludedIntelliSenseTriggerKeys[<string>(event.keyCode || event.which).toString()] && !(prevent.indexOf(__Token.string)!=-1)
                /*(__Token.type == "tag" || __Token.string == " " || __Token.string == "<" || __Token.string == "/")*/)
            {
                editor.showHint({hint: server.getHint, completeSingle:false});
            }
        });
    });
}

export function circleNavigate(first:JQuery|HTMLElement, last:JQuery|HTMLElement, fallback:JQuery|HTMLElement = null, win:JQuery) {
    if (win) (<any>win).jqxWindow("close");
    $(last).on("keydown", (ev) => {
        if (ev.keyCode == 9 && !ev.shiftKey) {
            ev.preventDefault()
            ev.stopPropagation()
            if (!win || (<any>win).jqxWindow("isOpen")) $(first).focus()
        }
    });
    if (fallback) $(fallback).on("keydown", (ev) => {
        if (ev.keyCode == 9 && !ev.shiftKey && $(last).is(":disabled")) {
            ev.preventDefault()
            ev.stopPropagation()
            if (!win || (<any>win).jqxWindow("isOpen")) $(first).focus()
        }
    });
    $(first).on("keydown", (ev) => {
        if (ev.keyCode == 9 && ev.shiftKey) {
            ev.preventDefault()
            ev.stopPropagation()
            if (!win || (<any>win).jqxWindow("isOpen")) $(last).focus()
        }
    });
}

export function AskReload() {
    Messagebox.ShowWithButtons("Configurazione aggiornata",
        "I trigger e alias sono stati importati.\nSarebbe consigliabile riavviare il client, vuoi farlo?",
        "Si", "No").then(v => {
        if (v.button == Button.Ok) {
            window.location.reload()
        }
    });
}

export function getVersionNumbers(ver:string):number[] {
    const rx = new RegExp("(\\d+)\\.(\\d+)\\.(\\d+)(beta(\\d*))?");

    let m:RegExpMatchArray = null;
    if (!(m = ver.match(rx)))
        return null;

    return [ parseInt(m[1]),  // major
            parseInt(m[2]),             // minor
            parseInt(m[3]),             // rev.
            m[4] == null ? 100000    // no beta suffix
                    : !m[5] ? 1        // "beta"
                    : parseInt(m[5])    // "beta3"
    ];
}

export function isVersionNewer(current:string, required:string):boolean {

    const testVer:number[] = getVersionNumbers(current);
    const baseVer:number[] = getVersionNumbers(required);

    for (let i = 0; i < testVer.length; i++)
        if (testVer[i] != baseVer[i])
            return testVer[i] > baseVer[i];

    return true;
}

export function denyClientVersion(cfg:any):string {
    const minMajor = cfg.requiresClientMajor || 1;
    const minMinor = cfg.requiresClientMinor || 0;
    const minRev = cfg.requiresClientRevision || 0;
    const ver = AppInfo.Version;
    const required = `${minMajor}.${minMinor}.${minRev}`;
    if (!isVersionNewer(ver, required)) {
        return required;
    }
    return null;
}