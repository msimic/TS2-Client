class IoEventHook<TData> {
    constructor(private ioObj: any, private evtName: string) {

    }
    
    public handle(callback: (data: TData) => void) {
        return this.ioObj.on(this.evtName, callback);
    }

    public fire(data: TData): boolean {
        return this.ioObj.emit(this.evtName, data);
    }
}

export class IoEvent {
    constructor(private ioOobj: any) {
    }

    public srvTelnetData = new IoEventHook<ArrayBuffer>(this.ioOobj, "srvTelnetData");
    public srvTelnetClosed = new IoEventHook<boolean>(this.ioOobj, "srvTelnetClosed");
    public srvTelnetOpened = new IoEventHook<[string, number]>(this.ioOobj, "srvTelnetOpened");
    public srvTelnetError = new IoEventHook<string>(this.ioOobj, "srvTelnetError");
    public srvSetClientIp = new IoEventHook<string>(this.ioOobj, "srvSetClientIp");

    public clReqTelnetOpen = new IoEventHook<[string, number]>(this.ioOobj, "clReqTelnetOpen");
    public clReqTelnetClose = new IoEventHook<void>(this.ioOobj, "clReqTelnetClose");
    public clReqTelnetWrite = new IoEventHook<ArrayBuffer>(this.ioOobj, "clReqTelnetWrite");
    public clReqSetVars = new IoEventHook<ArrayBuffer>(this.ioOobj, "clReqSetVars");
}
