import { AliasManager } from "../aliasManager";
import { EventHook } from "../../Core/event";
import { copyData, TrigAlEditBase, TrigAlItem } from "./trigAlEditBase";
import { ProfileManager } from "../../App/profileManager";
import { JsScript } from "../jsScript";
export const EvtCopyAliasToBase = new EventHook<copyData>()

export class AliasEditor extends TrigAlEditBase {
    constructor(profileManager:ProfileManager, protected aliasManager: AliasManager,  isBase:boolean, script:JsScript, title?:string) {
        super(isBase, title || "Alias", script);
        this.setProfileManager(profileManager)
        aliasManager.changed.handle(()=>{
            if ((<any>this.$win).jqxWindow('isOpen')) super.refresh()
        })
        this.$isPromptCheckbox.parent().hide();
    }

    protected getCount() {
        return (this.aliasManager.aliases || []).length;
    }

    protected getListItems() {
        let triggers = this.aliasManager.aliases;
        let lst = [];
        for (let i = 0; i < triggers.length; i++) {
            lst.push(triggers[i]);
        }

        return lst;
    }

    protected supportsMacro():boolean {
        return true;
    }

    protected copyToOther(item: TrigAlItem): void {
        EvtCopyAliasToBase.fire({item: item, source: this.title, isBase: this.isBase})
    }

    protected defaultPattern: string = null;

    protected defaultValue: string = 
              "Scrivi qui il valore dell'alias.\n"
            + "Puo' essere 1 o piu' comandi, includendo i parametri (e.g. $1).\n\n"
            + "Per gli alias non-regex, usa $1 nel valore per rappresentare l'argomento intero dato al commando.\n"
            + "Esempio: Alias pattern 's', alias valore 'say $1', "
            + "Usa il @ per espandere variabili, es.: get spada @borsa\n"
            + "poi fai 's asadf dfdfa' e 'say asadf dfdfa' verra mandato.\n\n"
            + "Per alias regex, usa $numero per rappresentare i match del tuo regex.\n"
            + "Esempio: Alias pattern 's (\\w+)', alias valore 'say $1', "
            + "poi fai 's asadf' e 'say asadf' verra' mandato.";

    protected defaultScript: string = 
              "/* Scrivi la tua script qui.\n"
            + "Questo e' il codice javascript che verra eseguito quando l'alias viene lanciato.\n"
            + "Non puoi creare variabili globali.\n"
            + "Usa 'var' per creare variabili locali.\n"
            + "Aggiungi valori a 'this' per interagire tra piu script.\n"
            + "Esempio: this.mio_valore = 123;\n"
            + "Ogni script lanciata usa lo stesso 'this'.\n"
            + "\n"
            + "Usa la funzione send() per lanciare comandi al mud. Esempio: send('kill orc');\n"
            + "Usa la funzione print() per per echo in locale. Esempio: print('Arrivato un avversario!!');\n"
            + "Per alias regex, 'match' sara il l'array risultato di match della regex, con \n"
            + "gli indici che sono i gruppi della regex.\n"
            + "*/\n";

    protected getList() {
        let aliases = this.aliasManager.aliases;
        let lst = [];
        for (let i = 0; i < aliases.length; i++) {
            lst.push((aliases[i].id || aliases[i].pattern)  + (aliases[i].class ? " <" + aliases[i].class + ">": ""));
        }

        return lst;
    }

    protected getItem(ind: number) {
        if (!this.aliasManager) return null;
        
        let aliases = this.aliasManager.aliases;
        if (ind < 0 || ind >= aliases.length) {
            return null;
        } else {
            return aliases[ind];
        }
    }

    protected saveItem(alias: TrigAlItem):number {
        let ind = this.aliasManager.aliases.indexOf(alias)
        if (ind < 0) {
            // New alias
            this.aliasManager.aliases.push(alias);
            ind = this.aliasManager.aliases.length - 1
        } else {
            // Update alias
            this.aliasManager.aliases[ind] = alias;
        }
        this.aliasManager.saveAliases();
        return ind;
    }

    protected deleteItem(item:TrigAlItem) {
        this.aliasManager.deleteAlias(item)
        this.aliasManager.saveAliases();
    }
}