export class EventHook<TData> {
    private handlers: Array<[(data: TData) => boolean|void|Promise<void>|Promise<boolean>, any]> = [];

    public handle(callback: (data: TData) => boolean|void|Promise<void>|Promise<boolean>, context?: any) {
        this.handlers.push([callback, context]);
    }

    public release(callback: (data: TData) => boolean|void|Promise<void>|Promise<boolean>) {
        for (let index = 0; index < this.handlers.length; index++) {
            const element = this.handlers[index];
            if (element && element[0] == callback) {
                this.handlers.splice(index, 1);
                index--;
            }
        }
    }

    public fire(data: TData): boolean {
        if (this.handlers.length < 1) {
            return false;
        }

        let ret = false
        for (let [cb, context] of this.handlers) {
            ret = cb.call(context, data) || ret;
        }

        return ret;
    }
}
