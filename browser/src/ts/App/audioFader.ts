import { debounce } from "lodash";

enum AudioStatus {
    FadingIn,
    Playing,
    FadingOut,
    Stopped
}
interface AudioState {
    status: AudioStatus;
    audio: HTMLAudioElement;
    manager: (stop: boolean, volume?: number) => void;
}
export class AudioFader {
    private map: Map<HTMLAudioElement, AudioState> = new Map();
    createState(audio: HTMLAudioElement) {
        let st: AudioState = {
            audio: audio,
            status: AudioStatus.Stopped,
            manager: null
        };
        this.map.set(audio, st);
    }
    constructor(private volume: number, ...audios: HTMLAudioElement[]) {
        this.setVolume(this.volume);
        this.load = debounce(this.load, 300);
        for (const au of audios) {
            this.createState(au);
            au.loop = true;
            au.volume = 0;
        }
        this.attach();
    }

    public setVolume(vol: number) {
        this.volume = vol / 100;
        for (const as of this.map.values()) {
            if (as.status == AudioStatus.Playing) {
                as.audio.volume = this.volume;
            }
        }
    }

    destroy() {
        this.stopAll();
        this.release();
    }

    release() {
        for (const as of this.map.keys()) {
            as.removeEventListener("canplay", this.playAudio);
        }
    }

    attach() {
        for (const as of this.map.keys()) {
            as.addEventListener("canplay", this.playAudio);
        }
    }

    playAudio = (ev: Event) => {
        let audio = (ev.target as HTMLAudioElement);
        if (!audio || !this.map.get(audio)) return;
        audio.volume = 0;
        audio.play();
        this.map.get(audio).manager(false, this.volume);
    };

    play(url: string) {

        console.log("requesting play: " + url);


        if ([...this.map.values()].find(s => (s.status == AudioStatus.Playing || s.status == AudioStatus.FadingIn) && s.audio.src == url)) {
            console.log("url already playing: " + url);
            return;
        }

        let st: AudioState = null;
        st = [...this.map.values()].find(s => s.status == AudioStatus.Stopped);
        st ||= [...this.map.values()].find(s => s.status == AudioStatus.FadingOut);
        st ||= [...this.map.values()].find(s => s.status == AudioStatus.FadingIn);

        if (!st || !st.audio) {
            console.warn("No suitable player");
            return;
        }

        let playing = this.fadeOut();
        let rest = [...this.map.values()].filter(s => s != playing && (s.status == AudioStatus.Playing || s.status == AudioStatus.FadingIn));
        for (const pl of rest) {
            if (pl.status == AudioStatus.FadingIn && pl.manager) {
                pl.manager(true)
                pl.manager = null;
            }
            this.fadeOut(pl)
        }

        if (st.manager) {
            st.manager(true);
        }

        let fadeInFunc = (stop: boolean, val: number = 0.33) => {
            let stopMe = stop;
            let myState = st;
            let fadeInterval: any = 0;

            let stopFunc = () => {
                try { myState.audio.pause(); } catch { }
                try { myState.audio.src = ""; } catch { }
            };
            if (stopMe) {
                console.log("stopping " + myState.audio.classList + " on " + myState.audio.src);
                myState.manager = null;
                myState.status = AudioStatus.Stopped;
                fadeInterval && clearInterval(fadeInterval);
                stopFunc();
                return;
            }
            let step = val / 20;
            console.log("starting " + myState.audio.classList + " on " + myState.audio.src);
            fadeInterval = setInterval(() => {
                if (stopMe || !myState.manager) {
                    myState.manager = null;
                    myState.status = AudioStatus.Stopped;
                    stopFunc();
                    clearInterval(fadeInterval);
                    return;
                }
                myState.status = AudioStatus.FadingIn;
                if (myState.audio.volume < val) {
                    myState.audio.volume += Math.min(1 - myState.audio.volume, step);
                } else {
                    myState.status = AudioStatus.Playing;
                    console.log("started " + myState.audio.classList + " on " + myState.audio.src);
                    clearInterval(fadeInterval);
                }
            }, 200);
        };
        st.manager = fadeInFunc;
        st.status = AudioStatus.FadingIn;
        this.load(st, url);
    }
    load = (st: AudioState, url: string) => {
        console.log("load audio");
        st.audio.src = url;
        st.audio.load();
    };

    public fadeOutAll() {
        for (const pl of this.map.values()) {
            if (pl.status == AudioStatus.FadingIn && pl.manager) {
                pl.manager(true)
                pl.manager = null;
            }
            this.fadeOut(pl)
        }
    }
    public fadeOut(state:AudioState = null) {
        let playing = state || [...this.map.values()].find(s => s.status == AudioStatus.Playing);

        if (playing) {
            let fadeOutFunc = (stop: boolean, val: number = 0) => {
                let stopMe = stop;
                let myState = playing;
                let fadeInterval: any = 0;

                let stopFunc = () => {
                    try { myState.audio.pause(); } catch { }
                    try { myState.audio.src = ""; } catch { }
                };
                if (stopMe) {
                    console.log("stopping " + myState.audio.classList + " on " + myState.audio.src);
                    myState.manager = null;
                    myState.status = AudioStatus.Stopped;
                    fadeInterval && clearInterval(fadeInterval);
                    stopFunc();
                    return;
                }
                let step = myState.audio.volume / 20;
                console.log("fading out " + myState.audio.classList + " on " + myState.audio.src);
                fadeInterval = setInterval(() => {
                    if (stopMe || !myState.manager) {
                        myState.manager = null;
                        myState.status = AudioStatus.Stopped;
                        stopFunc();
                        clearInterval(fadeInterval);
                        return;
                    }
                    myState.status = AudioStatus.FadingOut;
                    if (myState.audio.volume > val) {
                        myState.audio.volume -= Math.min(myState.audio.volume, step);
                    } else {
                        myState.status = AudioStatus.Stopped;
                        console.log("faded out " + myState.audio.classList + " on " + myState.audio.src);
                        clearInterval(fadeInterval);
                    }
                }, 200);
            };
            playing.status = AudioStatus.FadingOut
            playing.manager = fadeOutFunc;
            playing.manager(false, 0);
        }
        return playing;
    }

    stopAll() {
        for (const as of this.map.values()) {
            if (as.manager) {
                as.manager(true);
                as.status = AudioStatus.Stopped;
            }
        }
    }
}
