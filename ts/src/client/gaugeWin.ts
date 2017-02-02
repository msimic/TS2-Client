import { GlEvent, GlDef } from "./event";
import * as Util from "./util";

const GAUGE_HEIGHT = "18%";
const GAUGE_WIDTH = "100%";

class MsdpVals {
    HEALTH: number;
    HEALTH_MAX: number;
    MANA: number;
    MANA_MAX: number;
    MOVEMENT: number;
    MOVEMENT_MAX: number;
    EXPERIENCE_TNL: number;
    EXPERIENCE_MAX: number;
    OPPONENT_HEALTH: number;
    OPPONENT_HEALTH_MAX: number;
    OPPONENT_NAME: string;
}


export class GaugeWin {
    private divMyCont: HTMLDivElement;
    private $hpBar: JQuery;
    private $manaBar: JQuery;
    private $moveBar: JQuery;
    private $tnlBar: JQuery;
    private $enemyBar: JQuery;

    private msdpVals: MsdpVals = new MsdpVals();
    private updateFuncs: {[k: string]: () => void} = {};

    constructor(cont: HTMLDivElement) {
        this.divMyCont = cont;

        this.divMyCont.innerHTML = `
        <div class='hpBar gaugeBar'></div>
        <div class='manaBar gaugeBar'></div>
        <div class='moveBar gaugeBar'></div>
        <div class='tnlBar gaugeBar'></div>
        <div class='enemyBar gaugeBar'></div>
        `;
        this.$hpBar = $(this.divMyCont.getElementsByClassName("hpBar")[0]);
        this.$manaBar = $(this.divMyCont.getElementsByClassName("manaBar")[0]);
        this.$moveBar = $(this.divMyCont.getElementsByClassName("moveBar")[0]);
        this.$tnlBar = $(this.divMyCont.getElementsByClassName("tnlBar")[0]);
        this.$enemyBar = $(this.divMyCont.getElementsByClassName("enemyBar")[0]);
        
        this.createUpdateFuncs();
        this.loadLayout();

        GlEvent.msdpVar.handle(this.handleMsdpVar, this);
    }

    private renderGaugeText(curr: number, max: number, tag: string) {
        let rtn = "<pre class=\"gauge_text\">"
            + ("     " + curr).slice(-5)
            + " / "
            + ("     " + max).slice(-5)
            + " "
            + tag
            + "</pre>";
        return rtn;
    }

    private loadLayout() {
        (<any>this.$hpBar).jqxProgressBar({
            width: GAUGE_WIDTH,
            height: GAUGE_HEIGHT,
            value: 50,
            showText: true,
            animationDuration: 0,
            renderText: (text: string) => {
                return this.renderGaugeText( this.msdpVals["HEALTH"] || 0, this.msdpVals["HEALTH_MAX"] || 0, "hp ");
            }
        });

        this.$hpBar.children(".jqx-progressbar-value").css(
            "background-color", "#DF0101");

        (<any>this.$manaBar).jqxProgressBar({
            width: GAUGE_WIDTH,
            height: GAUGE_HEIGHT,
            value: 50,
            showText: true,
            animationDuration: 0,
            renderText: (text: string) => {
                return this.renderGaugeText( this.msdpVals["MANA"] || 0, this.msdpVals["MANA_MAX"] || 0, "mn ");
            }
        });
        this.$manaBar.children(".jqx-progressbar-value").css(
                "background-color", "#2E64FE");

        (<any>this.$moveBar).jqxProgressBar({
            width: GAUGE_WIDTH,
            height: GAUGE_HEIGHT,
            value: 50,
            showText: true,
            animationDuration: 0,
            renderText: (text: string) => {
                return this.renderGaugeText( this.msdpVals["MOVEMENT"] || 0, this.msdpVals["MOVEMENT_MAX"] || 0, "mv ");
            }
        });
        this.$manaBar.children(".jqx-progressbar-value").css(
                "background-color", "#04B4AE");

        (<any>this.$moveBar).jqxProgressBar({
            width: GAUGE_WIDTH,
            height: GAUGE_HEIGHT,
            value: 0,
            showText: true,
            animationDuration: 0,
            renderText: (tex: string) => {
                return Util.stripColorTags(this.msdpVals.OPPONENT_NAME || "");
            }
        });
        this.$enemyBar.children(".jqx-progressbar-value").css(
                "background-color", "purple");

        (<any>this.$tnlBar).jqxProgressBar({
            width: GAUGE_WIDTH,
            height: GAUGE_HEIGHT,
            value: 50,
            showText: true,
            animationDuration: 0,
            renderText: (text: string) => {
                let tnl = this.msdpVals.EXPERIENCE_TNL || 0;
                let max = this.msdpVals.EXPERIENCE_MAX || 0;
                return this.renderGaugeText(max - tnl, max, "etl");
            }
        });
        this.$tnlBar.children(".jqx-progressbar-value").css(
                "background-color", "#04B404");

        for (let k in this.updateFuncs) {
            this.updateFuncs[k]();
        }
    }

    private createUpdateFuncs() {
        this.updateFuncs["HEALTH"] = () => {
            let val = this.msdpVals["HEALTH"] || 0;
            let max = this.msdpVals["HEALTH_MAX"] || 0;
            if ( !max || max === 0) { return; }
            (<any>$("#hp_bar")).jqxProgressBar({value: 100 * val / max });
        };
        this.updateFuncs["HEALTH_MAX"] = this.updateFuncs["HEALTH"];

        this.updateFuncs["MANA"] = () => {
            let val = this.msdpVals["MANA"] || 0;
            let max = this.msdpVals["MANA_MAX"] || 0;
            if ( !max || max === 0) { return; }
            (<any>$("#mana_bar")).jqxProgressBar({value: 100 * val / max});
        };
        this.updateFuncs["MANA_MAX"] = this.updateFuncs["MANA"];

        this.updateFuncs["MOVEMENT"] = () => {
            let val = this.msdpVals["MOVEMENT"] || 0;
            let max = this.msdpVals["MOVEMENT_MAX"] || 0;
            if ( !max || max === 0) { return; }
            (<any>$("#move_bar")).jqxProgressBar({value: 100 * val / max});
        };
        this.updateFuncs["MOVEMENT_MAX"] = this.updateFuncs["MOVEMENT"];

        this.updateFuncs["OPPONENT_HEALTH"] = () => {
            let val = this.msdpVals["OPPONENT_HEALTH"] || 0;
            let max = this.msdpVals["OPPONENT_HEALTH_MAX"] || 0;
            if ( !max || max === 0) { return; }
            (<any>$("#enemy_bar")).jqxProgressBar({value: 100 * val / max});
        };
        this.updateFuncs["OPPONENT_HEALTH_MAX"] = this.updateFuncs["OPPONENT_HEALTH"];
        this.updateFuncs["OPPONENT_NAME"] = this.updateFuncs["OPPONENT_HEALTH"];

        this.updateFuncs["EXPERIENCE_TNL"] = () => {
            let val = this.msdpVals["EXPERIENCE_TNL"] || 0;
            let max = this.msdpVals["EXPERIENCE_MAX"] || 0;
            if ( !max || max === 0) { return; }
            (<any>$("#tnl_bar")).jqxProgressBar({value: 100 * (max - val) / max});
        };
        this.updateFuncs["EXPERIENCE_MAX"] = this.updateFuncs["EXPERIENCE_TNL"];
    }

    private handleMsdpVar(data: GlDef.MsdpVarData) {
        if (data.varName in this.updateFuncs) {
            let dict: {[k: string]: any} = this.msdpVals;
            dict[data.varName] = data.value;
            this.updateFuncs[data.varName]();
        }
    }
}
