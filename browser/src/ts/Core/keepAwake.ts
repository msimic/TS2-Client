class SignalGenerator {
    private mute = false;
    private started = false;
    private range:number = 1;
    private ctx:AudioContext = null;
    private osc:OscillatorNode = null;
    private gain:GainNode = null;
    
    constructor(public freq:number,public ampl:number,public wave:OscillatorType) {
        this.freq = freq;
        this.ampl = ampl;
        this.wave = wave;
    }
    async stop() {
      if (!this.ctx) return false;
      return await this.ctx.close();
    }
    start() {

        if (!this.started) {

            var AudioContext = window.AudioContext || (<any>window).webkitAudioContext;
            if (!AudioContext) {
                console.warn("AudioContext not supported")
                return;
            }
          
            let a:AudioContext = new AudioContext({
                latencyHint: 'interactive',
                sampleRate: 44100
            });

            this.ctx = a;
            // Create nodes.
            this.osc = a.createOscillator();
            this.gain = a.createGain();

            // Set parameters.
            this.gain.gain.value = this.ampl / 1000.0;
            this.osc.frequency.value = this.freq;
            this.osc.type = this.wave;

            // Connect 
            this.osc.connect(this.gain);
            this.gain.connect(a.destination);

            // Schedule tone.
            this.osc.start();
            this.started = true;
        }
    }
    setFreq(freq:number, range:number, callback:Function) {
        this.freq = freq;
        this.range = range;
        this.osc.frequency.value = (this.freq) * Math.pow(10, (this.range));
        callback(this.osc.frequency.value);
    };
    setAmpl(ampl:number, callback:Function) {
        this.ampl = ampl;
        if (this.mute === false) {
            this.gain.gain.value = this.ampl / 1000.0;
        }
        callback(Number(this.ampl).toFixed(0));
    };
    setWave(wave:OscillatorType) {
        this.wave = wave;
        this.osc.type = this.wave;
    };

    setMute(mute:boolean) {
        this.mute = mute;

        if (this.mute === true) {
            this.gain.gain.value = 0;
        }
        else {
            this.gain.gain.value = this.ampl / 1000.0;
        }
    }
    getFreq() {
        return this.freq;
    }
    getAmpl() {
        return Number(this.ampl.toFixed(0));
    }
    getWave() {
        return this.wave;
    };
}

export class KeepAwake {
    private static sg:SignalGenerator = null;
    private static interval = 0;
    static On():void {
        if (this.IsOn())
            this.Off()
        this.sg = new SignalGenerator(19999.0, 30.0, "sine");
        this.sg.start()
        this.sg.setMute(true)
        console.log("Keep tab awake On")
        this.interval = <any>setInterval(() => {
            this.sg.setMute(false)
            //console.log("Keepawake")
            setTimeout(() => this.sg.setMute(true), 100)
        }, 15000)
    }
    static Off():void {
        if (this.interval) {
            clearInterval(this.interval);
        }
        if (this.sg) {
            this.sg.stop()
        }
        this.sg = null
        console.log("Keep tab awake Off")
    }
    static IsOn():boolean {
        return (this.sg != null && this.interval > 0);
    }
}