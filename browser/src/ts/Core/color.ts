import { colorCssToRGB } from "./util";

export type ansiName = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white";
export type ansiLevel = "low" | "high";

export type ansiColorTuple = [ansiName, ansiLevel];

export function copyAnsiColorTuple(color: ansiColorTuple): ansiColorTuple {
    return [color[0], color[1]];
}

export function hexToRgb(hex: string): string {
    // Remove the hash symbol if present
    hex = hex.replace(/^#/, '');

    // Parse the hex color code
    let r: number, g: number, b: number, a: number | undefined;

    if (hex.length === 3 || hex.length === 4) {
        // Handle shorthand hex color code
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
        if (hex.length === 4) {
            a = parseInt(hex[3] + hex[3], 16);
        }
    } else if (hex.length === 6 || hex.length === 8) {
        // Handle full hex color code
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
        if (hex.length === 8) {
            a = parseInt(hex.substring(6, 8), 16);
        }
    } else {
        throw new Error("Invalid hex color code");
    }

    // Return RGB or RGBA format
    if (a !== undefined) {
        return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
    } else {
        return `rgb(${r}, ${g}, ${b})`;
    }
}

export function parseColorToken(token:string) : { color: string, background: string, bold: boolean, underline: boolean, blink:boolean} {
    if (!token || !token.toLowerCase().startsWith("%c")) return null
    token = token.substring(2, token.length)
    let c = {
        color: "",
        background: "",
        bold: false,
        underline: false,
        blink: false    
    }

    let faint = false
    let reverse = false
    let rgb = false
    switch (token[0]) {
        case '1' : c.bold = true; break;
        case '2' : faint = true; break;
        case '3' : rgb = true; break;
        case '4' : c.underline = true; break;
        case '5' : c.blink = true; break;
        case '6' : reverse = true; break;
    }

    c.background = ansiToCssColor(parseInt(token[1]))
    c.color = ansiToCssColor(parseInt(token.substring(2, token.length)))

    
    if (reverse) {
        // switch c.color c.background
        let tmp = c.color
        c.color = c.background
        c.background = tmp
    }

    if (faint) {
        c.color += "88"
        c.background += "88"
    }

    if (rgb) {
        c.color = hexToRgb(c.color)
        c.background = hexToRgb(c.background)
    }

    return c
}
export function ansiToCssColor(ansiCode: number): string {
    const ansiColors: { [key: number]: string } = {
        0: "black",
        1: "red",
        2: "green",
        3: "yellow",
        4: "blue",
        5: "magenta",
        6: "cyan",
        7: "white",
        8: "brightBlack",
        9: "brightRed",
        10: "brightGreen",
        11: "brightYellow",
        12: "brightBlue",
        13: "brightMagenta",
        14: "brightCyan",
        15: "brightWhite"
    };

    const cssColors: { [key: string]: string } = {
        black: "#000000",
        red: "#800000",
        green: "#008000",
        yellow: "#808000",
        blue: "#000080",
        magenta: "#800080",
        cyan: "#008080",
        white: "#C0C0C0",
        brightBlack: "#808080",
        brightRed: "#FF0000",
        brightGreen: "#00FF00",
        brightYellow: "#FFFF00",
        brightBlue: "#0000FF",
        brightMagenta: "#FF00FF",
        brightCyan: "#00FFFF",
        brightWhite: "#FFFFFF"
    };

    const ansiName = ansiColors[ansiCode];
    if (ansiName) {
        return cssColors[ansiName];
    } else {
        return "#000000";
    }
}

export const ansiFgLookup: {[k: number]: ansiName} = {
    30: "black",
    31: "red",
    32: "green",
    33: "yellow",
    34: "blue",
    35: "magenta",
    36: "cyan",
    37: "white"
};

export const ansiBgLookup: {[k: number]: ansiName} = {
    40: "black",
    41: "red",
    42: "green",
    43: "yellow",
    44: "blue",
    45: "magenta",
    46: "cyan",
    47: "white"
};

export const colorIdToHtml: {[k: string]: string} = {
    "black-low": "rgb(0,0,0)",
    "red-low": "rgb(187,0,0)",
    "green-low": "rgb(0,187,0)",
    "yellow-low": "rgb(187,187,0)",
    "blue-low": "rgb(22,22,226)",
    "magenta-low": "rgb(187,0,187)",
    "cyan-low": "rgb(0,187,187)",
    "white-low": "rgb(192,192,192)",

    "black-high": "rgb(128,128,128)",
    "red-high": "rgb(255,0,0)",
    "green-high": "rgb(0,255,0)",
    "yellow-high": "rgb(255,255,0)",
    "blue-high": "rgb(100,100,255)",
    "magenta-high": "rgb(255,0,255)",
    "cyan-high": "rgb(0,255,255)",
    "white-high": "rgb(255,255,255)",

    "0": "#000000",
    "1": "#800000",
    "2": "#008000",
    "3": "#808000",
    "4": "#000080",
    "5": "#800080",
    "6": "#008080",
    "7": "#c0c0c0",

    "8": "#808080",
    "9": "#ff0000",
    "10": "#00ff00",
    "11": "#ffff00",
    "12": "#0000ff",
    "13": "#ff00ff",
    "14": "#00ffff",
    "15": "#ffffff",

    "16": "#000000",
    "17": "#00005f",
    "18": "#000087",
    "19": "#0000af",
    "20": "#0000d7",
    "21": "#0000ff",

    "22": "#005f00",
    "23": "#005f5f",
    "24": "#005f87",
    "25": "#005faf",
    "26": "#005fd7",
    "27": "#005fff",

    "28": "#008700",
    "29": "#00875f",
    "30": "#008787",
    "31": "#0087af",
    "32": "#0087d7",
    "33": "#0087ff",

    "34": "#00af00",
    "35": "#00af5f",
    "36": "#00af87",
    "37": "#00afaf",
    "38": "#00afd7",
    "39": "#00afff",

    "40": "#00d700",
    "41": "#00d75f",
    "42": "#00d787",
    "43": "#00d7af",
    "44": "#00d7d7",
    "45": "#00d7ff",

    "46": "#00ff00",
    "47": "#00ff5f",
    "48": "#00ff87",
    "49": "#00ffaf",
    "50": "#00ffd7",
    "51": "#00ffff",

    "52": "#5f0000",
    "53": "#5f005f",
    "54": "#5f0087",
    "55": "#5f00af",
    "56": "#5f00d7",
    "57": "#5f00ff",

    "58": "#5f5f00",
    "59": "#5f5f5f",
    "60": "#5f5f87",
    "61": "#5f5faf",
    "62": "#5f5fd7",
    "63": "#5f5fff",

    "64": "#5f8700",
    "65": "#5f875f",
    "66": "#5f8787",
    "67": "#5f87af",
    "68": "#5f87d7",
    "69": "#5f87ff",

    "70": "#5faf00",
    "71": "#5faf5f",
    "72": "#5faf87",
    "73": "#5fafaf",
    "74": "#5fafd7",
    "75": "#5fafff",

    "76": "#5fd700",
    "77": "#5fd75f",
    "78": "#5fd787",
    "79": "#5fd7af",
    "80": "#5fd7d7",
    "81": "#5fd7ff",

    "82": "#5fff00",
    "83": "#5fff5f",
    "84": "#5fff87",
    "85": "#5fffaf",
    "86": "#5fffd7",
    "87": "#5fffff",

    "88": "#870000",
    "89": "#87005f",
    "90": "#870087",
    "91": "#8700af",
    "92": "#8700d7",
    "93": "#8700ff",

    "94": "#875f00",
    "95": "#875f5f",
    "96": "#875f87",
    "97": "#875faf",
    "98": "#875fd7",
    "99": "#875fff",

    "100": "#878700",
    "101": "#87875f",
    "102": "#878787",
    "103": "#8787af",
    "104": "#8787d7",
    "105": "#8787ff",

    "106": "#87af00",
    "107": "#87af5f",
    "108": "#87af87",
    "109": "#87afaf",
    "110": "#87afd7",
    "111": "#87afff",

    "112": "#87d700",
    "113": "#87d75f",
    "114": "#87d787",
    "115": "#87d7af",
    "116": "#87d7d7",
    "117": "#87d7ff",

    "118": "#87ff00",
    "119": "#87ff5f",
    "120": "#87ff87",
    "121": "#87ffaf",
    "122": "#87ffd7",
    "123": "#87ffff",

    "124": "#af0000",
    "125": "#af005f",
    "126": "#af0087",
    "127": "#af00af",
    "128": "#af00d7",
    "129": "#af00ff",

    "130": "#af5f00",
    "131": "#af5f5f",
    "132": "#af5f87",
    "133": "#af5faf",
    "134": "#af5fd7",
    "135": "#af5fff",

    "136": "#af8700",
    "137": "#af875f",
    "138": "#af8787",
    "139": "#af87af",
    "140": "#af87d7",
    "141": "#af87ff",

    "142": "#afaf00",
    "143": "#afaf5f",
    "144": "#afaf87",
    "145": "#afafaf",
    "146": "#afafd7",
    "147": "#afafff",

    "148": "#afd700",
    "149": "#afd75f",
    "150": "#afd787",
    "151": "#afd7af",
    "152": "#afd7d7",
    "153": "#afd7ff",

    "154": "#afff00",
    "155": "#afff5f",
    "156": "#afff87",
    "157": "#afffaf",
    "158": "#afffd7",
    "159": "#afffff",

    "160": "#d70000",
    "161": "#d7005f",
    "162": "#d70087",
    "163": "#d700af",
    "164": "#d700d7",
    "165": "#d700ff",

    "166": "#d75f00",
    "167": "#d75f5f",
    "168": "#d75f87",
    "169": "#d75faf",
    "170": "#d75fd7",
    "171": "#d75fff",

    "172": "#d78700",
    "173": "#d7875f",
    "174": "#d78787",
    "175": "#d787af",
    "176": "#d787d7",
    "177": "#d787ff",

    "178": "#d7af00",
    "179": "#d7af5f",
    "180": "#d7af87",
    "181": "#d7afaf",
    "182": "#d7afd7",
    "183": "#d7afff",

    "184": "#d7d700",
    "185": "#d7d75f",
    "186": "#d7d787",
    "187": "#d7d7af",
    "188": "#d7d7d7",
    "189": "#d7d7ff",

    "190": "#d7ff00",
    "191": "#d7ff5f",
    "192": "#d7ff87",
    "193": "#d7ffaf",
    "194": "#d7ffd7",
    "195": "#d7ffff",

    "196": "#ff0000",
    "197": "#ff005f",
    "198": "#ff0087",
    "199": "#ff00af",
    "200": "#ff00d7",
    "201": "#ff00ff",

    "202": "#ff5f00",
    "203": "#ff5f5f",
    "204": "#ff5f87",
    "205": "#ff5faf",
    "206": "#ff5fd7",
    "207": "#ff5fff",

    "208": "#ff8700",
    "209": "#ff875f",
    "210": "#ff8787",
    "211": "#ff87af",
    "212": "#ff87d7",
    "213": "#ff87ff",

    "214": "#ffaf00",
    "215": "#ffaf5f",
    "216": "#ffaf87",
    "217": "#ffafaf",
    "218": "#ffafd7",
    "219": "#ffafff",

    "220": "#ffd700",
    "221": "#ffd75f",
    "222": "#ffd787",
    "223": "#ffd7af",
    "224": "#ffd7d7",
    "225": "#ffd7ff",

    "226": "#ffff00",
    "227": "#ffff5f",
    "228": "#ffff87",
    "229": "#ffffaf",
    "230": "#ffffd7",
    "231": "#ffffff",

    "232": "#080808",
    "233": "#121212",
    "234": "#1c1c1c",
    "235": "#262626",
    "236": "#303030",
    "237": "#3a3a3a",

    "238": "#444444",
    "239": "#4e4e4e",
    "240": "#585858",
    "241": "#606060",
    "242": "#666666",
    "243": "#767676",

    "244": "#808080",
    "245": "#8a8a8a",
    "246": "#949494",
    "247": "#9e9e9e",
    "248": "#a8a8a8",
    "249": "#b2b2b2",

    "250": "#bcbcbc",
    "251": "#c6c6c6",
    "252": "#d0d0d0",
    "253": "#dadada",
    "254": "#e4e4e4",
    "255": "#eeeeee"
};
