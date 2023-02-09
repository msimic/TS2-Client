import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { MapVersion, Zone, Room } from './mapper';

export interface MapperDBV1 extends DBSchema {
    version: {
        key: number,
        value: MapVersion,
    };
    zones: {
      value: Zone;
      key: number;
      indexes: { name: string };
    };
    rooms: {
        value: Room;
        key: number;
        indexes: { vnum: number };
      };
  }


export class MapperStorage {
    private db: IDBPDatabase<MapperDBV1>;

    constructor() {
        this.init(this);
    }

    async init(ctx: MapperStorage) {
        this.db = await openDB<MapperDBV1>('mapperDB', 1, {
            upgrade(db, oldVersion, newVersion) {
                db.createObjectStore('version');
                db.createObjectStore('zones', {
                    keyPath: 'id',
                }).createIndex('name', 'name');
                db.createObjectStore('rooms', {
                    keyPath: 'id',
                }).createIndex('vnum', 'vnum');
            },
        });
    };

    async getVersion(key: number) {
        return (this.db).get('version', key);
    }
    async setVersion(key: number, val: MapVersion) {
        return (this.db).put('version', val, key);
    }
    async setVersions(versions: MapVersion[]) {
        const tx = this.db.transaction("version", "readwrite")
        const ops = []
        for (const version of versions) {
            ops.push(tx.store.put(version))
        }
        return tx.done
    }
    async delVersion(key: number) {
        return (this.db).delete('version', key);
    }
    async clearVersion() {
        return (this.db).clear('version');
    }
    async versionKeys() {
        return (this.db).getAllKeys('version');
    }
    async allVersions() {
        return (this.db).getAll("version")
    }

    async getZone(key: number) {
        return (this.db).get('zones', key);
    }
    async setZone(key: number, val: Zone) {
        return (this.db).put('zones', val);
    }
    async setZones(zones: Zone[]) {
        const tx = this.db.transaction("zones", "readwrite")
        const ops = []
        for (const zone of zones) {
            ops.push(tx.store.put(zone))
        }
        return tx.done
    }

    async delZone(key: number) {
        return (this.db).delete('zones', key);
    }
    async clearZones() {
        return (this.db).clear('zones');
    }
    async zoneKeys() {
        return (this.db).getAllKeys('zones');
    }
    async allZones() {
        return (this.db).getAll("zones")
    }

    async getRoom(key: number) {
        return (this.db).get('rooms', key);
    }
    async setRoom(key: number, val: Room) {
        return (this.db).put('rooms', val);
    }
    async setRooms(rooms: Room[]) {
        const tx = this.db.transaction("rooms", "readwrite")
        const ops = []
        for (const room of rooms) {
            ops.push(tx.store.put(room))
        }
        return Promise.all([...ops,tx.done])
    }
    async delRoom(key: number) {
        return (this.db).delete('rooms', key);
    }
    async clearRooms() {
        return (this.db).clear('rooms');
    }
    async roomKeys() {
        return (this.db).getAllKeys('rooms');
    }
    async allRooms() {
        return (this.db).getAll("rooms")
    }
}
