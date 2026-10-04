const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const SoundManager = {
  bgMusic: null,
  musicStarted: false,
  
  init: function() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    this.startBackgroundMusic();
  },
  
  startBackgroundMusic: function() {
    if(this.musicStarted) return;
    this.musicStarted = true;
    
    // إنشاء صوت رياح هادئة باستخدام Noise
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400; // رياح هادئة جداً
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.03; // صوت منخفض كخلفية مريحة
    
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseSrc.start();
    
    this.bgMusic = gainNode;
    
    // زقزقة عصافير هادئة عشوائياً
    this.startBirds();
  },
  
  startBirds: function() {
    setInterval(() => {
      if(Math.random() > 0.4) {
        this.playBirdChirp();
      }
    }, 4000);
  },
  
  playBirdChirp: function() {
    if(audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    
    // التردد ينزل بسرعة لمحاكاة صوت زقزقة العصفور
    const startFreq = 3000 + Math.random() * 2000;
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq - 1500, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
    
    // صدى خفيف للعصفور الثاني
    if(Math.random() > 0.5) {
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(startFreq + 500, audioCtx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(startFreq - 1000, audioCtx.currentTime + 0.1);
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.2);
      }, 150);
    }
  },

  playTone: function(freq, type, duration, vol = 0.1) {
    this.init();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.start(); 
    osc.stop(audioCtx.currentTime + duration);
  },
  
  click: function() { this.playTone(600, 'sine', 0.1); },
  success: function() { 
    this.playTone(523.25, 'sine', 0.15); 
    setTimeout(() => this.playTone(659.25, 'sine', 0.15), 150); 
    setTimeout(() => this.playTone(783.99, 'sine', 0.25), 300);
  },
  error: function() {
    this.playTone(300, 'square', 0.2); 
    setTimeout(() => this.playTone(250, 'square', 0.25), 200);
  },
  
  startSeq: function() {
    this.init();
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.15), i * 150);
    });
    setTimeout(() => this.playTone(659.25, 'sine', 1.0, 0.2), 600);
  },
  
  levelComplete: function() {
    this.init();
    setTimeout(() => this.playTone(440, 'triangle', 0.2), 0);
    setTimeout(() => this.playTone(554.37, 'triangle', 0.2), 150);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.4), 300);
    setTimeout(() => this.playTone(880, 'triangle', 0.6), 450); 
  },
  
  speak: function(text, onEndCallback) {
    window.speechSynthesis.cancel();
    let msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'ar-SA';
    msg.rate = 0.95; 
    msg.pitch = 1.0; 
    
    const voices = window.speechSynthesis.getVoices();
    const arabicVoices = voices.filter(v => v.lang.startsWith('ar'));
    if (arabicVoices.length > 0) {
      let bestVoice = arabicVoices.find(v => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online'));
      msg.voice = bestVoice || arabicVoices[0];
    }
    
    if(this.bgMusic) this.bgMusic.gain.value = 0.005; // خفض أصوات الطبيعة أثناء الحديث
    msg.onend = () => {
      if(this.bgMusic) this.bgMusic.gain.value = 0.03;
      if(onEndCallback) onEndCallback();
    };
    
    window.speechSynthesis.speak(msg);
  },
  
  stopSpeak: function() {
    window.speechSynthesis.cancel();
    if(this.bgMusic) this.bgMusic.gain.value = 0.03;
  }
};

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
