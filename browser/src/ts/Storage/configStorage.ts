import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { UserConfig, UserConfigData } from '../App/userConfig'

export interface UserConfigDBV1 extends DBSchema {
    configs: {
      value: UserConfigData;
      key: string;
      indexes: { name: string };
    };
  }


export class UserConfigStorage {
    private db: IDBPDatabase<UserConfigDBV1>;

    constructor() {
        
    }

    async init() {
        this.db = await openDB<UserConfigDBV1>('userConfigDB', 1, {
            upgrade(db, oldVersion, newVersion) {
                db.createObjectStore('configs', {
                    keyPath: 'name',
                }).createIndex('name', 'name');
            },
        });
    };

    async getConfig(key: string) {
        return (this.db).get('configs', key);
    }
    async setConfig(key: string, val: UserConfig) {
        let to_convert:string[] = [];
        for (const key in val.data.cfgVals||[]) {
            if (Object.prototype.hasOwnProperty.call(val.data.cfgVals, key)) {
                const element = val.data.cfgVals[key];
                if (element instanceof Map) {
                    to_convert.push(key);
                    val.data.cfgVals[key] = [...val.data.cfgVals[key]];
                }
            }
        }
        for (const al of val.data.cfgVals["aliases"]||[]) {
            if (al.script) delete al.script
        }
        for (const al of val.data.cfgVals["triggers"]||[]) {
            if (al.script) delete al.script
        }
        for (const al of val.data.cfgVals["script_events"]||[]) {
            if (al && al[1] && al[1].length)
                for (const se of al[1]) {
                    delete se.script
                }
        }

        await (this.db).put('configs', val.data);
        for (const iterator of to_convert) {
            val.data.cfgVals[iterator] = new Map<string,any>(val.data.cfgVals[iterator]);
        }
    }

    async setConfigs(configs: UserConfig[]) {
        const tx = this.db.transaction("configs", "readwrite")
        const ops:Promise<string>[] = []
        for (const cfg of configs) {
            ops.push(tx.store.put(cfg.data))
        }
        return tx.done
    }

    async delConfigs(key: string) {
        return (this.db).delete('configs', key);
    }
    async clearConfigs() {
        return (this.db).clear('configs');
    }
    async configKeys() {
        return (this.db).getAllKeys('configs');
    }
    async allZones() {
        return (this.db).getAll("configs")
    }

}
