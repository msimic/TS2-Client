import { debounce } from "lodash";
import { AppInfo } from "../../appInfo";
import { htmlEscape, throttle } from "../../Core/util";
import { WebRTC, ChannelData } from "../../Core/webRTC";
import { EvtScriptEmitPrint } from "../../Scripting/jsScript";
import { CommandInput } from "../commandInput";
import { IBaseWindow } from "../windowManager";

export class VoiceWin implements IBaseWindow {
    private $win: JQuery;
    private $afk: JQuery;
    private $status: JQuery;
    private $rooms: JQuery;
    private $users: JQuery;
    private $muteMicrophone: JQuery;
    private $muteAudio: JQuery;
    private $disconnect: JQuery;
    private $toolbar: JQuery;
    private $autoconnect: JQuery;
    private cDatas = new Map<string, ChannelData>() 
    rooms: string[];
    room: string;
    requestedRoom: string;
    lastActive:Date;
    private _status: string;
    public get status(): string {
        return this._status;
    }
    public set status(value: string) {
        this._status = value;
        this.$status.text(this.status || "")
    }
    private _autoconnect: boolean = null;
    public get autoconnect(): boolean {
        return !!localStorage.getItem("voiceAutoconnect");
    }
    public set autoconnect(value: boolean) {
        if (value)
            localStorage.setItem("voiceAutoconnect", value.toString());
        else
            localStorage.removeItem("voiceAutoconnect") 
    }
    public get autoconnectRoom(): string {
        return localStorage.getItem("voiceRoom");
    }
    public set autoconnectRoom(value: string) {
        if (!value) {
            localStorage.removeItem("voiceRoom")
        } else {
            localStorage.setItem("voiceRoom", value);
        }
    }

    checkAfk() {
        function isFifteenMinutesPassed(date1:Date, date2:Date) {
            const FIFTEEN_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds
            const diff = Math.abs(date2.getTime() - date1.getTime());
            return diff >= FIFTEEN_MINUTES;
        }
        if (this.$afk.prop("checked") && isFifteenMinutesPassed(new Date(), this.lastActive)) {
            this.Disconnect(true)
        }
    }

    Instance() {
        return this.$win
    }
    constructor(private rtc: WebRTC, private cmdInput:CommandInput, private audible=false) {
        setInterval(this.checkAfk.bind(this), 30000)
        this.lastActive = new Date()
        cmdInput.EvtEmitCmd.handle(c => {
            if (!c.fromScript) {
                this.lastActive = new Date()
            }
        })
        cmdInput.EvtEmitAliasCmds.handle(c => {
            if (!c.fromScript) {
                this.lastActive = new Date()
            }
        })

        let win = document.createElement("div");
        win.style.display = "none";
        win.className = "winVoice";
        document.body.appendChild(win);

        win.innerHTML = `
        <!--header-->
        <div>Voice chat</div>
        <!--content-->
        <div>
            <div style="display:flex;flex-direction:column;height:100%;">
                <div class='jqxTabs' style="flex:1">
                    <ul>
                        <li>Canali</li>
                        <li>Partecipanti</li>
                        <li>Impostazioni</li>
                    </ul>
                    <div>
                        <div class="tab-content">
                            <div class="rooms">
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="tab-content">
                            <div class="users">
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="tab-content">
                            <p style="padding: 5px;margin: 0;">
                            <label><input class="autoconnect" type="checkbox">Riconnetti automaticamente ultimo canale a avvio</label>
                            <label><input class="afk" type="checkbox">Disconetti audio per AFK (15 min)</label>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="voicetoolbar">
                    <button class="microphone" title="Attiva o disattiva microfono"><span class="gray-emoji">🎤</span></button>
                    <button class="speaker" title="Attiva o disattiva audio"><span class="gray-emoji">🔊</span></button>
                    <span class="status"></span>
                    <button class="disconnect" title="Esci dai canali audio"><span class="gray-emoji">📞</span></button>
                </div>
            </div>
        </div>
        `;

        this.OnEnterChannel = throttle(this.OnEnterChannel, 250) as any;
        this.refreshChannelData = throttle(this.refreshChannelData, 250) as any;
        this.refreshUI = throttle(this.refreshUI, 250) as any;

        
        this.rooms = rtc.getChannels()
        this.$win = $(win);

        const w = Math.min($(window).width()-20, 300);
        const h = Math.min($(window).height()-20, 180);
        (<any>$('.jqxTabs',this.$win)).jqxTabs({ height: '100%', width: '100%' });
        
        (<any>this.$win).jqxWindow({showAnimationDuration: 0, width: w, height: h, showCollapseButton: true, isModal: false});
        (<any>this.$win).jqxWindow("close")

        if (this.autoconnect) this.room = this.autoconnectRoom
        this.$toolbar = $(".voicetoolbar", this.$win)
        this.$status = $(".status", this.$win)
        this.$afk = $(".afk", this.$win).on("change", ()=>{
            if (this.$afk.prop("checked")) {
                localStorage.setItem("voiceDisconnectOnAfk", "true")
            } else {
                localStorage.removeItem("voiceDisconnectOnAfk")
            }
        })
        this.$afk.prop("checked", localStorage.getItem("voiceDisconnectOnAfk") == undefined ? true : localStorage.getItem("voiceDisconnectOnAfk"))
        
        this.$autoconnect = $(".autoconnect", this.$win)
        this.$autoconnect.prop("checked", this.autoconnect)
        this.$autoconnect.on("change", v => {
            if (this.$autoconnect.prop("checked")) {
                this.autoconnect = true
                this.autoconnectRoom = this.room
            } else {
                this.autoconnect = false
                this.autoconnectRoom = null
            }
        })
        this.$toolbar.hide()
        this.$disconnect = $(".disconnect", this.$win).on("click", (e) => {
            this.Disconnect(false)
            this.updateStatus()
        })
        this.$muteMicrophone = $(".microphone", this.$win)
        this.$muteMicrophone.on("click", (e) => {
            if (this.$muteMicrophone.hasClass("toggled")) {
                this.DisableMicrophone()
            } else {
                this.EnableMicrophone()
            }
            this.updateStatus()
        })
        this.$muteAudio = $(".speaker", this.$win).on("click", (e) => {
            if (this.$muteAudio.hasClass("toggled")) {
                this.DisableAudio()
            } else {
                this.EnableAudio()
            }
            this.updateStatus()
        })
        this.$rooms = $(".rooms", this.$win)
        this.$users = $(".users", this.$win)

        this.EnableAudio()
        this.EnableMicrophone()
        this.initRTC()
        if (this.autoconnect && this.autoconnectRoom) {
            this.rtc.Connect()
        }
        this.drawRooms()
    }
    destroy(): void {
        this.release();
        (<any>$(this.$win)).jqxWindow("destroy")
    }
    write(text: string, buffer: string): void {
        this.status = text
    }
    getLines(): string[] {
        return [this.status]
    }
    writeLine(text: string, buffer: string): void {
        this.status = text
    }
    cls(): void {
        this.status = ""
    }
    async EnableAudio() {
        this.$muteAudio.addClass("toggled")
        this.rtc.ToggleAudio(true)
    }
    async DisableAudio() {
        this.$muteAudio.removeClass("toggled")
        this.rtc.ToggleAudio(false)
    }
    async DisableMicrophone() {
        this.$muteMicrophone.removeClass("toggled")
        this.rtc.ToggleMicrophone(false)
    }
    async EnableMicrophone() {
        this.$muteMicrophone.addClass("toggled")
        this.rtc.ToggleMicrophone(true)
    }
     static async playSound(sound:string) {
        // if ((<any>window).audio) {
        //     (<any>window).audio.src="";
        // }
        (<any>window).audio = new Audio("sounds/"+sound);
        await (<any>window).audio.play();
    }
    async Disconnect(soft:boolean) {
        if (!soft) {
            if (this.audible) await VoiceWin.playSound("disconnect-voice.mp3")
        }
        this.room = null
        this.$toolbar.hide()
        this.rtc.Leave()
    }

    Connect(room:string) {
        this.$toolbar.show()
        this.requestedRoom = room
        this.setRoom(room)
        this.rtc.Connect();
        this.rtc.Join(this.requestedRoom)
        this.refreshChannelData();
        this.updateStatus()
    }

    private refreshChannelData() {
        for (const r of this.rooms) {
            this.rtc.getChannelData(r);
        }
    }

    setRoom(rm:string) {
        this.room = rm
    }

    async enterRoom() {
        if (this.requestedRoom) {
            this.room = this.requestedRoom
            this.requestedRoom = null
        }
        if (!this.room && this.autoconnect && this.autoconnectRoom) {
            this.setRoom(this.autoconnectRoom)
        }
        if (this.autoconnect) {
            this.autoconnectRoom = this.room
        }
        let nomic = !this.$muteMicrophone.hasClass("toggled")
        let noaudio = !this.$muteAudio.hasClass("toggled")
        this.rtc.Join(this.room)
        let rm = this.room
        $("p",this.$rooms).removeClass("toggled")
        let li = $("p",this.$rooms)
        let l = li.filter((v,e) => $(e).data("room")==rm)
        l.addClass("toggled")
        this.$toolbar.show()
        if (nomic) {
            this.DisableMicrophone()
        }
        if (noaudio) {
            this.DisableAudio()
        }
        //this.EnableAudio()
        //this.EnableMicrophone()
    }

    drawRooms() {
        this.$rooms.empty()
        this.rooms.forEach(r => {
            let l = $(`<a href="#">${r}</a>`)
            let li = $(`<span style="cursor:pointer;"></span>`, this.$win).on("click", () => {
                this.Connect(r)
            })
            if (r == this.room) {
                li.addClass("toggled")
            }
            li.data("room", r)
            li.append(l)
            li.append("<span class='utenti'>")
            this.$rooms.append(li)
            let ut = $("span", li).last()
            
            if (this.rtc.isConnected()) {
                this.loadRoomInfo(ut, r)
            } else {
                ut.text("(?)")
            }
        })
    }
    loadRoomInfo($users: JQuery, rm:string) {
        let cd = this.cDatas.get(rm)
        if (!cd) {
            $users.text("(?)")
            return
        }
        let num = cd.users.length
        let users = cd.users.map(u => u.name).join(",")
        $users.text("("+num+")")
        $users.attr("title", users)
        console.log("setting users for " + rm)
        if (rm == this.room) {
            this.setUsers(cd);
        }
    }

    private setUsers(cd: ChannelData) {
        if (cd.name != this.room) return
        let idName = new Map<string, string>();
        [...this.rtc.peers.values()].map(v => {
            idName.set(v.name, v.id)
        })
        this.$users.empty()
        let usr = cd.users.filter(u => u.name != this.rtc.userName).map(u => u.name)
        if (usr.length) {
            for (const u of usr) {
                let uspan = $(`<span class="user">${u} <button class="voldown" title="Abassa volume dell'utente">🔉</button><span class="volvalue" style="cursor:pointer;" title="Muta o abilita audio"></span><button class="volup" title="Alza volume dell'utente">🔊</button></span>`)
                let val = $(".volvalue", uspan);
                
                let id = idName.get(u)
                if (!this.rtc.hasPeer(id)) continue;

                let showVol = () => {
                    let vol = this.rtc.getPeerVolume(id)
                    if (this.rtc.getPeerMuted(id)) {
                        vol = 0
                    }
                    val.text((Math.round((vol||0)*100) ?? "?") + " %")
                }
                val.on("click", ()=> {
                    this.rtc.setPeerMuted(id)
                    showVol()
                })
                showVol()
                $(".volup", uspan).on("click", () => {
                    this.rtc.setPeerVolume(id, this.rtc.getPeerVolume(id)+.05)
                    showVol()
                })
                $(".voldown", uspan).on("click", () => {
                    this.rtc.setPeerVolume(id, this.rtc.getPeerVolume(id)-.05)
                    showVol()
                })
                this.$users.append(uspan)
            }
        } else {
            this.$users.append("<p>Nessun utente nel canale.</p>")
        }
    }

    NotifyText(str:string) {
        if (!this.audible) return
        EvtScriptEmitPrint.fire({
            owner: "RTC",
            message: str
        });
    }
    release() {
        this.rtc.EvtNewChannelData.release(this.newChannelData)
        this.rtc.EvtChannelChange.release(this.onChannelChange)
        this.rtc.EvtPeersChanged.release(this.onPeersChanged);
        this.rtc.EvtConnected.release(this.onConnected);
        this.rtc.EvtDisconnected.release(this.onDisconnected);
        this.rtc.EvtEnteredChannel.release(this.OnEnterChannel);
        this.rtc.EvtExitedChannel.release(this.onExitedChannel);
        this.rtc.EvtPeersLeft.release(this.onPeersLeft);
        this.rtc.EvtPeersCame.release(this.onPeersCame);
        this.rtc.EvtMicChanged.release(this.onMicChanged);
        this.rtc.EvtAudioChanged.release(this.onAudioChanged)
    }

    initRTC() {
        this.rtc.EvtNewChannelData.handle(this.newChannelData)
        this.rtc.EvtChannelChange.handle(this.onChannelChange)
        this.rtc.EvtPeersChanged.handle(this.onPeersChanged);
        this.rtc.EvtConnected.handle(this.onConnected);
        this.rtc.EvtDisconnected.handle(this.onDisconnected);
        this.rtc.EvtEnteredChannel.handle(this.OnEnterChannel);
        this.rtc.EvtExitedChannel.handle(this.onExitedChannel);
        this.rtc.EvtPeersLeft.handle(this.onPeersLeft);
        this.rtc.EvtPeersCame.handle(this.onPeersCame);
        this.rtc.EvtMicChanged.handle(this.onMicChanged);
        this.rtc.EvtAudioChanged.handle(this.onAudioChanged);
    }
    onAudioChanged = async (v: boolean) => {
        if (!v) {
            if (this.audible) await VoiceWin.playSound("plop.mp3")
            this.$muteAudio.removeClass("toggled")
        } else {
            if (this.audible) await VoiceWin.playSound("plim.mp3")
            this.$muteAudio.addClass("toggled")
        }
        this.updateStatus()
    }
    onMicChanged = async (v: boolean) => {
        if (!v) {
            if (this.audible) await VoiceWin.playSound("plop.mp3")
            this.$muteMicrophone.removeClass("toggled")
        } else {
            if (this.audible) await VoiceWin.playSound("plim.mp3")    
            this.$muteMicrophone.addClass("toggled")
        }
        this.updateStatus()
    }
    onPeersCame = (onPeersCame: any) => {
        if (this.room) this.rtc.getChannelData(this.room)
    }
    onPeersLeft =(onPeersLeft: any) => {
        if (this.room) this.rtc.getChannelData(this.room)
    }
    onExitedChannel =(onExitedChannel: any) => {
        this.room = null
        this.refreshChannelData()
    }
    onDisconnected = (onDisconnected: any) => {
        this.Disconnect(true)
        this.refreshUI()
        this.NotifyText("Disconnessione da canali audio")
    }
    onConnected = (onConnected: any) => {
        if (this.room || this.requestedRoom || this.autoconnect && this.autoconnectRoom) this.enterRoom()
        this.refreshChannelData()
    }
    onPeersChanged = (peer: any) => {
        if (this.room)
             this.rtc.getChannelData(this.room)
    }
    onChannelChange = (c: any) => {
        this.rtc.getChannelData(c)
    }
    newChannelData = (cd: ChannelData) => {
        this.cDatas.set(cd.name, cd)
        cd.users = [...new Set(cd.users)]
        this.refreshUI();
    }

    private refreshUI() {
        this.drawRooms();
        this.updateStatus();
    }

    private OnEnterChannel = async (d: string) => {
        if (d != this.room) {
            this.room = d
            this.refreshChannelData();
            this.NotifyText("Connesso a canale audio '" + d + "'")
            if (this.audible) await VoiceWin.playSound("connect-voice.ogg");
        }
    }

    updateStatus() {
        let str = "Scegli un canale..."
        let audio = ""
        if (this.rtc.IsMicEnabled() && this.rtc.IsAudioEnabled()) {
            audio += ""
        } else if (!this.rtc.IsMicEnabled() && !this.rtc.IsAudioEnabled()){
            audio += "(Microfono e audio spenti)"
        } else if (!this.rtc.IsMicEnabled()) {
            audio += "(Microfono spento)"
        } else if (!this.rtc.IsAudioEnabled()) {
            audio += "(Audio spento)"
        }
        if (!this.rtc.userName) {
            audio = "Non autenticato"
        }
        str = "" + audio + ""
        this.status = str

    }

    public show() {
        (<any>this.$win).jqxWindow("open");
        (<any>this.$win).jqxWindow("bringToFront");
    }
}

