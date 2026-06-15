// Localization Dictionary
const localization = {
    ko: {
        title: "온라인 에어컨",
        room_temp: "실내 온도",
        outdoor_temp: "실외 온도",
        electricity_cost: "누적 전기세",
        currency_unit: "원",
        btn_power: "전원",
        btn_temp_up: "온도 올림",
        btn_temp_down: "온도 내림",
        btn_mode: "모드",
        btn_speed: "풍량",
        btn_swing: "송풍방향",
        btn_eco: "절전",
        btn_turbo: "터보",
        btn_mute: "소리",
        btn_mute_on: "소리 켬",
        btn_mute_off: "소리 끔",
        btn_ambient: "주변 백색소음: ",
        btn_ambient_off: "꺼짐",
        btn_ambient_rain: "🌧️ 빗소리",
        btn_ambient_crickets: "🌙 풀벌레 소리",
        btn_ambient_campfire: "🔥 모닥불 소리",
        energy_label: "에너지소비효율등급",
        footer_text: "온라인 에어컨. 소리 조절을 활성화하고 바람 소리를 즐겨보세요! 에어컨을 켜면 실내 온도가 내려가고 전기세가 실시간으로 계산됩니다. 같은 방에 접속한 사람들과 에어컨을 공유하여 실시간으로 동시 조절할 수 있습니다.",
        cat_pant: "냥이가 더워합니다! 에어컨을 켜주세요.",
        cat_sleep: "냥이가 시원하게 자고 있습니다."
    },
    en: {
        title: "Online AC",
        room_temp: "Room Temp",
        outdoor_temp: "Outdoor Temp",
        electricity_cost: "Est. Cost",
        currency_unit: "KRW",
        btn_power: "Power",
        btn_temp_up: "Temp Up",
        btn_temp_down: "Temp Down",
        btn_mode: "Mode",
        btn_speed: "Fan Speed",
        btn_swing: "Swing",
        btn_eco: "Eco",
        btn_turbo: "Turbo",
        btn_mute: "Sound",
        btn_mute_on: "Mute",
        btn_mute_off: "Unmute",
        btn_ambient: "Ambient Sound: ",
        btn_ambient_off: "Off",
        btn_ambient_rain: "🌧️ Rain",
        btn_ambient_crickets: "🌙 Crickets",
        btn_ambient_campfire: "🔥 Campfire",
        energy_label: "ENERGY RATING",
        footer_text: "Online Air Conditioner. Turn on sound and enjoy the breeze! Turning on the AC cools the room and calculates electricity costs in real-time. Share the room with others to control the AC concurrently in real-time.",
        cat_pant: "The kitty is hot! Please turn on the AC.",
        cat_sleep: "The kitty is sleeping comfortably."
    }
};

// Generate a unique client sender ID
const mySenderId = 'user_' + Math.random().toString(36).substring(2, 9);

// Parse Room ID from URL query parameters (defaults to 'Lobby')
const urlParams = new URLSearchParams(window.location.search);
let initialRoom = urlParams.get('room') || 'Lobby';

// Application State Variables
let state = {
    roomId: initialRoom,
    isOn: false,
    mode: 'cool', // 'cool', 'heat', 'fan', 'dry'
    targetTemp: 24,
    currentRoomTemp: 29.5,
    outdoorTemp: 31.5,
    fanSpeed: 'auto', // 'auto', 'low', 'medium', 'high'
    isSwing: false,
    isEco: false,
    isTurbo: false,
    isMuted: false,
    activeAmbient: 'off', // 'off', 'rain', 'crickets', 'campfire'
    kwhUsage: 0.0,
    costAccumulated: 0.0,
    lang: 'ko'
};

// Multiplayer state variables
let client = null;
let activeUsers = {};
activeUsers[mySenderId] = Date.now(); // Add self to list

// Web Audio API Elements
let audioCtx = null;
let noiseBuffer = null;
let windSource = null;
let windFilter = null;
let windGain = null;
let windLfo = null;
let windLfoGain = null;

let ambientGain = null;
let ambientNodes = [];

// DOM Elements cache
const dom = {
    body: document.body,
    acUnit: document.getElementById('ac-unit'),
    acLedDisplay: document.getElementById('ac-led-display'),
    acFlap: document.getElementById('ac-flap'),
    roomTemp: document.getElementById('room-temp-val'),
    outdoorTemp: document.getElementById('outdoor-temp-val'),
    power: document.getElementById('power-val'),
    kwh: document.getElementById('kwh-val'),
    cost: document.getElementById('cost-val'),
    currencyUnit: document.getElementById('currency-unit'),
    
    // Multiplayer controls in header
    networkStatusDot: document.getElementById('network-status-dot'),
    roomInput: document.getElementById('room-input'),
    btnCopyRoom: document.getElementById('btn-copy-room'),
    activeUsersCount: document.getElementById('active-users-count'),
    
    // Remote LCD Screen
    remoteScreen: document.getElementById('remote-screen'),
    screenClock: document.getElementById('screen-clock'),
    screenTemp: document.getElementById('screen-temp-display'),
    screenModeText: document.getElementById('screen-mode-text'),
    screenModeIcon: document.getElementById('screen-mode-icon'),
    screenSpeed: document.getElementById('screen-speed'),
    screenSwing: document.getElementById('screen-swing'),
    screenExtra: document.getElementById('screen-extra'),
    
    // Remote buttons
    btnPower: document.getElementById('btn-power'),
    btnTempUp: document.getElementById('btn-temp-up'),
    btnTempDown: document.getElementById('btn-temp-down'),
    btnMode: document.getElementById('btn-mode'),
    btnSpeed: document.getElementById('btn-speed'),
    btnSwing: document.getElementById('btn-swing'),
    btnEco: document.getElementById('btn-eco'),
    btnTurbo: document.getElementById('btn-turbo'),
    btnMute: document.getElementById('btn-mute'),
    btnMuteIcon: document.getElementById('btn-mute-icon'),
    btnMuteText: document.getElementById('btn-mute-text'),
    btnAmbient: document.getElementById('btn-ambient'),
    btnLang: document.getElementById('btn-lang'),
    langIndicator: document.getElementById('lang-indicator'),
    
    catContainer: document.getElementById('cat-container')
};

// Set room input value initially
dom.roomInput.value = state.roomId;

// Theme selection controls
const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.themeVal;
        state.theme = theme;
        dom.body.setAttribute('data-theme', theme);
        triggerInteraction();
    });
});

// Sound toggles helper
const soundToggles = [document.getElementById('btn-sound-global'), dom.btnMute];
soundToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        toggleMute();
    });
});

// Setup clock
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    dom.screenClock.textContent = `${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

// Set Up Language
function setLanguage(lang) {
    state.lang = lang;
    dom.langIndicator.textContent = lang === 'ko' ? 'EN' : 'KR';
    dom.currencyUnit.textContent = lang === 'ko' ? '원' : '$';
    
    // Select elements with data-localize and translate them
    document.querySelectorAll('[data-localize]').forEach(el => {
        const key = el.dataset.localize;
        if (localization[lang][key]) {
            if (key === 'btn_mute') {
                el.textContent = state.isMuted ? localization[lang].btn_mute_off : localization[lang].btn_mute_on;
            } else {
                el.textContent = localization[lang][key];
            }
        }
    });

    // Update cat tooltip and ambient button text
    updateCatTooltip();
    updateAmbientButtonText();
    updateUsersCountDisplay();
}

dom.btnLang.addEventListener('click', () => {
    const newLang = state.lang === 'ko' ? 'en' : 'ko';
    setLanguage(newLang);
    triggerInteraction();
});

// Update Cat sleep/pant visual hints
function updateCatTooltip() {
    const isHot = !state.isOn && state.currentRoomTemp > 28;
    const desc = isHot ? localization[state.lang].cat_pant : localization[state.lang].cat_sleep;
    dom.catContainer.setAttribute('title', desc);
}

// Update ambient white noise text
function updateAmbientButtonText() {
    let soundText = localization[state.lang].btn_ambient_off;
    if (state.activeAmbient === 'rain') soundText = localization[state.lang].btn_ambient_rain;
    else if (state.activeAmbient === 'crickets') soundText = localization[state.lang].btn_ambient_crickets;
    else if (state.activeAmbient === 'campfire') soundText = localization[state.lang].btn_ambient_campfire;
    
    dom.btnAmbient.innerHTML = `<span>🍂</span> <span>${localization[state.lang].btn_ambient}${soundText}</span>`;
}

// Initialize Web Audio API
function initAudio() {
    if (audioCtx) return;

    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Synthesize White Noise Buffer
        const bufferSize = 2 * audioCtx.sampleRate;
        noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        // 2. Setup AC Breeze synthesizer chain
        windSource = audioCtx.createBufferSource();
        windSource.buffer = noiseBuffer;
        windSource.loop = true;

        windFilter = audioCtx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 300; // Low frequency hum

        windGain = audioCtx.createGain();
        windGain.gain.setValueAtTime(0, audioCtx.currentTime);

        // 3. Setup LFO for organic wind swells
        windLfo = audioCtx.createOscillator();
        windLfo.frequency.value = 0.18; // Slow swells every ~5.5s
        
        windLfoGain = audioCtx.createGain();
        windLfoGain.gain.value = 0.08; // Swell strength

        windLfo.connect(windLfoGain);
        windLfoGain.connect(windGain.gain); // Modulate gain directly

        // Connect chain
        windSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(audioCtx.destination);

        // Start noise and LFO
        windSource.start(0);
        windLfo.start(0);

        // 4. Setup Ambient chain
        ambientGain = audioCtx.createGain();
        ambientGain.gain.setValueAtTime(0, audioCtx.currentTime);
        ambientGain.connect(audioCtx.destination);

        console.log("Web Audio API Synthesizer initialized successfully.");
    } catch (e) {
        console.error("Failed to initialize Web Audio API:", e);
    }
}

// User interactions trigger this to unlock audio contexts safely (required by browsers)
function triggerInteraction() {
    if (!audioCtx) {
        initAudio();
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Synth a Tactile Button Beep
function playBeep(freq, duration, type = 'sine') {
    if (state.isMuted || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Audio beep failed:", e);
    }
}

// Play Cat Meow Sound Effect
function playMeow() {
    if (state.isMuted || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc2.type = 'sine';
        
        // Cat meow sweeping pitches
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.quadraticCurveToValueAtTime(900, now + 0.12, 650, now + 0.4);
        
        osc2.frequency.setValueAtTime(500 * 1.5, now);
        osc2.frequency.quadraticCurveToValueAtTime(900 * 1.5, now + 0.12, 650 * 1.5, now + 0.4);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.4);
        osc2.stop(now + 0.4);
    } catch (e) {
        console.warn("Meow audio failed:", e);
    }
}

// Stop any running ambient audio nodes
function stopAmbient() {
    ambientGain.gain.setValueAtTime(0, audioCtx.currentTime);
    ambientNodes.forEach(node => {
        try {
            node.stop();
        } catch (e) {}
    });
    ambientNodes = [];
}

// Synthesize Ambient Sounds (Rain, Crickets, Campfire)
function startAmbient(type) {
    if (!audioCtx) return;
    stopAmbient();
    
    if (type === 'rain') {
        const rainSource = audioCtx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;
        
        const bp = audioCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1100;
        bp.Q.value = 0.7;
        
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2200;
        
        rainSource.connect(bp);
        bp.connect(lp);
        lp.connect(ambientGain);
        
        rainSource.start(0);
        ambientNodes = [rainSource, bp, lp];
        ambientGain.gain.setTargetAtTime(state.isMuted ? 0 : 0.06, audioCtx.currentTime, 0.4);
        
    } else if (type === 'crickets') {
        const now = audioCtx.currentTime;
        
        // Multi-pitch crickets chirps
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const mod = audioCtx.createOscillator();
        const localGain = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.value = 4200;
        
        osc2.type = 'sine';
        osc2.frequency.value = 3900;
        
        mod.type = 'square';
        mod.frequency.value = 7.5; // Chirps rate
        
        const modGain = audioCtx.createGain();
        modGain.gain.value = 0.5; // depth
        
        mod.connect(modGain);
        modGain.connect(localGain.gain);
        
        osc1.connect(localGain);
        osc2.connect(localGain);
        localGain.connect(ambientGain);
        
        osc1.start(now);
        osc2.start(now);
        mod.start(now);
        
        ambientNodes = [osc1, osc2, mod, localGain, modGain];
        ambientGain.gain.setTargetAtTime(state.isMuted ? 0 : 0.02, audioCtx.currentTime, 0.4);
        
    } else if (type === 'campfire') {
        const now = audioCtx.currentTime;
        
        // Rumble sound
        const rumble = audioCtx.createBufferSource();
        rumble.buffer = noiseBuffer;
        rumble.loop = true;
        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 120;
        
        rumble.connect(lowpass);
        lowpass.connect(ambientGain);
        rumble.start(now);
        
        // High click crackling sound using synthesized pulses
        const crackle = audioCtx.createOscillator();
        crackle.type = 'sawtooth';
        crackle.frequency.value = 2500;
        
        const crackleGain = audioCtx.createGain();
        crackleGain.gain.setValueAtTime(0, now);
        
        const crackleMod = audioCtx.createOscillator();
        crackleMod.type = 'square';
        crackleMod.frequency.value = 14;
        
        crackleMod.connect(crackleGain.gain);
        crackle.connect(crackleGain);
        crackleGain.connect(ambientGain);
        
        crackle.start(now);
        crackleMod.start(now);
        
        ambientNodes = [rumble, lowpass, crackle, crackleGain, crackleMod];
        ambientGain.gain.setTargetAtTime(state.isMuted ? 0 : 0.04, audioCtx.currentTime, 0.4);
    }
}

// Adjust Wind Sound Parameter Synthesis based on AC Status
function updateWindSynthesis() {
    if (!audioCtx) return;

    if (!state.isOn || state.isMuted) {
        windGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        return;
    }

    let filterFreq = 300;
    let targetVolume = 0.08;

    // Adjust by Fan Speed
    switch (state.fanSpeed) {
        case 'low':
            filterFreq = 220;
            targetVolume = 0.05;
            break;
        case 'medium':
            filterFreq = 350;
            targetVolume = 0.09;
            break;
        case 'high':
            filterFreq = 480;
            targetVolume = 0.14;
            break;
        case 'auto':
        default:
            filterFreq = 320;
            targetVolume = 0.08;
            break;
    }

    // Adapt based on special mode features
    if (state.isTurbo) {
        filterFreq = 600;
        targetVolume = 0.20;
    } else if (state.isEco) {
        filterFreq = 180;
        targetVolume = 0.04;
    }

    if (state.mode === 'dry') {
        filterFreq *= 0.85;
        targetVolume *= 0.7;
    } else if (state.mode === 'fan') {
        filterFreq *= 1.1; // lighter sound
    }

    // Apply values smoothly
    windFilter.frequency.setTargetAtTime(filterFreq, audioCtx.currentTime, 0.4);
    windGain.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.4);
}

// Toggle Global Mute State
function toggleMute() {
    triggerInteraction();
    state.isMuted = !state.isMuted;
    
    // Update mute button states
    const muteIcons = document.querySelectorAll('#sound-global-icon, #btn-mute-icon');
    const muteTexts = document.querySelectorAll('#btn-mute-text');
    
    muteIcons.forEach(icon => {
        icon.textContent = state.isMuted ? '🔇' : '🔊';
    });
    
    muteTexts.forEach(txt => {
        txt.textContent = state.isMuted ? localization[state.lang].btn_mute_off : localization[state.lang].btn_mute_on;
    });

    if (state.isMuted) {
        if (ambientGain) ambientGain.gain.setValueAtTime(0, audioCtx.currentTime);
        if (windGain) windGain.gain.setValueAtTime(0, audioCtx.currentTime);
    } else {
        playBeep(2000, 0.05);
        updateWindSynthesis();
        if (state.activeAmbient !== 'off' && ambientGain) {
            // Restore ambient volume
            let vol = 0.05;
            if (state.activeAmbient === 'rain') vol = 0.06;
            if (state.activeAmbient === 'crickets') vol = 0.02;
            if (state.activeAmbient === 'campfire') vol = 0.04;
            ambientGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.3);
        }
    }
}

// Calculate electrical drawing power in real-time (Watts)
function calculateCurrentPower() {
    if (!state.isOn) return 1; // 1W Standby power

    let basePower = 650; // Watts for standard cooling
    
    if (state.mode === 'heat') basePower = 850;
    else if (state.mode === 'dry') basePower = 400;
    else if (state.mode === 'fan') basePower = 30;

    // Multipliers for Fan Speed
    let speedMult = 1.0;
    if (state.fanSpeed === 'low') speedMult = 0.7;
    else if (state.fanSpeed === 'high') speedMult = 1.35;

    let power = basePower * speedMult;

    if (state.isTurbo) {
        power *= 1.45;
    } else if (state.isEco) {
        power *= 0.55;
    }

    // Modern Inverter simulation:
    // If room temperature is at target, load is reduced significantly.
    const tempDiff = Math.abs(state.currentRoomTemp - state.targetTemp);
    if (state.mode !== 'fan' && tempDiff < 1.0) {
        // Compress down to low-power frequency speed maintenance mode
        const scale = 0.2 + (tempDiff * 0.8); // 20% to 100% capacity
        power *= scale;
    }

    return Math.round(power);
}

// Dynamic state rendering UI
function updateUI() {
    // 1. AC LED display on wall
    if (state.isOn) {
        dom.acUnit.classList.add('on');
        dom.acUnit.setAttribute('data-mode', state.mode);
        dom.acLedDisplay.textContent = `${state.targetTemp}°`;
        
        // Apply classes for speed animations
        dom.acUnit.classList.remove('speed-auto', 'speed-low', 'speed-medium', 'speed-high');
        dom.acUnit.classList.add(`speed-${state.fanSpeed}`);
        
        // Swing flap
        if (state.isSwing) {
            dom.acUnit.classList.add('swing');
        } else {
            dom.acUnit.classList.remove('swing');
        }
    } else {
        dom.acUnit.classList.remove('on', 'swing', 'speed-auto', 'speed-low', 'speed-medium', 'speed-high');
        dom.acLedDisplay.textContent = '--';
    }

    // 2. Remote Screen Backlight
    if (state.isOn) {
        dom.remoteScreen.classList.add('backlight-active');
        
        // Temp
        dom.screenTemp.innerHTML = `${state.targetTemp}<span class="screen-temp-unit">°C</span>`;
        
        // Mode
        dom.screenModeText.textContent = state.mode.toUpperCase();
        let mIcon = '❄️';
        if (state.mode === 'heat') mIcon = '☀️';
        else if (state.mode === 'dry') mIcon = '💧';
        else if (state.mode === 'fan') mIcon = '🌀';
        dom.screenModeIcon.textContent = mIcon;
        
        // Fan speed
        dom.screenSpeed.textContent = `SPD: ${state.fanSpeed.toUpperCase()}`;
        
        // Swing
        dom.screenSwing.textContent = state.isSwing ? 'SWING ⇳' : 'SWING OFF';
        
        // Extras
        let extraText = '';
        if (state.isEco) extraText += '🌱 ECO ';
        if (state.isTurbo) extraText += '⚡ TURBO';
        dom.screenExtra.textContent = extraText;
    } else {
        dom.remoteScreen.classList.remove('backlight-active');
        dom.screenTemp.innerHTML = `--<span class="screen-temp-unit">°C</span>`;
        dom.screenModeText.textContent = 'OFF';
        dom.screenModeIcon.textContent = '⏸️';
        dom.screenSpeed.textContent = 'SPD: OFF';
        dom.screenSwing.textContent = 'SWING OFF';
        dom.screenExtra.textContent = '';
    }

    // 3. Highlight remote buttons active states
    dom.btnPower.classList.toggle('active', state.isOn);
    dom.btnEco.classList.toggle('active-feature', state.isOn && state.isEco);
    dom.btnTurbo.classList.toggle('active-feature', state.isOn && state.isTurbo);
    dom.btnSwing.classList.toggle('active-feature', state.isOn && state.isSwing);
    
    // 4. Update displays
    dom.roomTemp.textContent = state.currentRoomTemp.toFixed(1);
    dom.outdoorTemp.textContent = state.outdoorTemp.toFixed(1);
    
    const powerWatts = calculateCurrentPower();
    dom.power.textContent = powerWatts;
    dom.kwh.textContent = state.kwhUsage.toFixed(4);
    
    if (state.lang === 'ko') {
        dom.cost.textContent = Math.round(state.costAccumulated).toLocaleString();
    } else {
        dom.cost.textContent = state.costAccumulated.toFixed(2);
    }

    // 5. Update wind synthesizers
    updateWindSynthesis();
    updateCatTooltip();
}


// --- MULTIPLAYER REAL-TIME SYNC LOGIC (MQTT) ---

// Determine if this browser is the Room's master host
function isHost() {
    const keys = Object.keys(activeUsers).sort();
    return keys[0] === mySenderId;
}

function updateNetworkStatus(status) {
    dom.networkStatusDot.className = 'status-dot ' + status;
}

function publishState(type = 'state') {
    if (!client || !client.connected) return;
    
    const payload = {
        type: type,
        senderId: mySenderId,
        state: {
            isOn: state.isOn,
            mode: state.mode,
            targetTemp: state.targetTemp,
            fanSpeed: state.fanSpeed,
            isSwing: state.isSwing,
            isEco: state.isEco,
            isTurbo: state.isTurbo,
            kwhUsage: state.kwhUsage,
            costAccumulated: state.costAccumulated
        }
    };
    
    const topic = `online-air-conditioner/rooms/${state.roomId}`;
    client.publish(topic, JSON.stringify(payload));
}

function handleIncomingMessage(data) {
    if (data.senderId === mySenderId) return; // Skip own echo
    
    // Track presence on any incoming message
    trackPresence(data.senderId);
    
    if (data.type === 'state' || data.type === 'state_response') {
        const s = data.state;
        
        // Detect differences to trigger local sounds
        const powerChanged = state.isOn !== s.isOn;
        const tempChanged = state.targetTemp !== s.targetTemp;
        const modeChanged = state.mode !== s.mode;
        const speedChanged = state.fanSpeed !== s.fanSpeed;
        const ecoChanged = state.isEco !== s.isEco;
        const turboChanged = state.isTurbo !== s.isTurbo;
        const swingChanged = state.isSwing !== s.isSwing;
        
        // Assign new state variables
        state.isOn = s.isOn;
        state.mode = s.mode;
        state.targetTemp = s.targetTemp;
        state.fanSpeed = s.fanSpeed;
        state.isSwing = s.isSwing;
        state.isEco = s.isEco;
        state.isTurbo = s.isTurbo;
        
        // Sync electricity consumption stats
        state.kwhUsage = s.kwhUsage;
        state.costAccumulated = s.costAccumulated;
        
        // Play audio feedback for remote users
        if (powerChanged) {
            if (state.isOn) {
                playBeep(1000, 0.08);
                setTimeout(() => playBeep(1400, 0.10), 80);
            } else {
                playBeep(1400, 0.08);
                setTimeout(() => playBeep(1000, 0.10), 80);
            }
        } else if (tempChanged) {
            playBeep(state.targetTemp > s.targetTemp ? 2100 : 1700, 0.06);
        } else if (modeChanged || speedChanged || ecoChanged || turboChanged || swingChanged) {
            playBeep(1900, 0.06);
        }
        
        updateUI();
        
    } else if (data.type === 'state_request') {
        // Send our current state back to help the new peer synchronize
        publishState('state_response');
        
    } else if (data.type === 'sync') {
        // Synchronize master host electricity counters
        state.kwhUsage = data.kwhUsage;
        state.costAccumulated = data.costAccumulated;
        updateUI();
        
    } else if (data.type === 'meow') {
        playMeow();
        const body = document.querySelector('.cat-body');
        if (body) {
            body.style.transform = 'scale(0.9) translateY(5px)';
            setTimeout(() => {
                body.style.transform = 'scale(1) translateY(0)';
            }, 150);
        }
    } else if (data.type === 'ping') {
        // Handled globally by tracking presence
    }
}

// Track active users presence list
function trackPresence(senderId) {
    activeUsers[senderId] = Date.now();
    updateUsersCountDisplay();
}

function updateUsersCountDisplay() {
    // Clean up inactive users (no ping for 15 seconds)
    const now = Date.now();
    for (let user in activeUsers) {
        if (user !== mySenderId && now - activeUsers[user] > 15000) {
            delete activeUsers[user];
        }
    }
    
    const count = Object.keys(activeUsers).length;
    
    if (state.lang === 'ko') {
        dom.activeUsersCount.textContent = `👥 ${count}명 접속 중`;
    } else {
        dom.activeUsersCount.textContent = `👥 ${count} Online`;
    }
}

// Connect to the public secure MQTT WebSocket Broker
function connectMultiplayer() {
    updateNetworkStatus('connecting');
    
    // Disconnect existing client if connected
    if (client) {
        try {
            client.end();
        } catch (e) {}
    }
    
    const clientId = 'ac_' + mySenderId + '_' + Math.floor(Math.random() * 100);
    const options = {
        clientId: clientId,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 5000
    };
    
    try {
        // EMQX Public broker (wss secure connection)
        client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', options);
        
        client.on('connect', () => {
            console.log('Connected to multiplayer broker. Room:', state.roomId);
            updateNetworkStatus('connected');
            
            const topic = `online-air-conditioner/rooms/${state.roomId}`;
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error('Subscription error:', err);
                } else {
                    // Send request to pull current state from any existing users in the room
                    client.publish(topic, JSON.stringify({
                        type: 'state_request',
                        senderId: mySenderId
                    }));
                }
            });
        });
        
        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                handleIncomingMessage(data);
            } catch (e) {
                console.error('Failed to parse incoming payload:', e);
            }
        });
        
        client.on('close', () => {
            updateNetworkStatus('offline');
        });
        
        client.on('error', (err) => {
            console.warn('MQTT Connection error:', err);
            updateNetworkStatus('offline');
        });
        
    } catch (e) {
        console.error('Failed to initialize MQTT connection:', e);
        updateNetworkStatus('offline');
    }
}

// Broadcast periodic ping / sync to keep peer presence and electricity stats aligned
setInterval(() => {
    if (client && client.connected) {
        const topic = `online-air-conditioner/rooms/${state.roomId}`;
        if (isHost()) {
            // Host sends sync message containing authoritative electricity stats
            client.publish(topic, JSON.stringify({
                type: 'sync',
                senderId: mySenderId,
                kwhUsage: state.kwhUsage,
                costAccumulated: state.costAccumulated
            }));
        } else {
            // Ordinary client pings presence
            client.publish(topic, JSON.stringify({
                type: 'ping',
                senderId: mySenderId
            }));
        }
    }
    updateUsersCountDisplay();
}, 5000); // Synchronize every 5 seconds

// Room switching event handler
dom.roomInput.addEventListener('change', () => {
    let newRoom = dom.roomInput.value.trim();
    if (!newRoom) {
        dom.roomInput.value = state.roomId;
        return;
    }
    
    triggerInteraction();
    playBeep(2000, 0.05);
    
    // Update state and URL
    state.roomId = newRoom;
    window.history.pushState({}, '', `?room=${encodeURIComponent(newRoom)}`);
    
    // Reset electricity stats when changing rooms
    state.kwhUsage = 0.0;
    state.costAccumulated = 0.0;
    
    // Clear other active users list when entering a new room
    activeUsers = {};
    activeUsers[mySenderId] = Date.now();
    
    // Connect to the new room topic
    connectMultiplayer();
});

// Keypress enter on room input
dom.roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        dom.roomInput.blur();
    }
});

// Copy Invite Link to Clipboard
dom.btnCopyRoom.addEventListener('click', () => {
    triggerInteraction();
    playBeep(2200, 0.05);
    
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(state.roomId)}`;
    
    navigator.clipboard.writeText(inviteUrl).then(() => {
        const originalIcon = dom.btnCopyRoom.textContent;
        dom.btnCopyRoom.textContent = '✔️';
        setTimeout(() => {
            dom.btnCopyRoom.textContent = originalIcon;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy room invite url:', err);
    });
});


// --- REMOTE ACTION HANDLERS ---

// Power toggles
dom.btnPower.addEventListener('click', () => {
    triggerInteraction();
    state.isOn = !state.isOn;
    
    if (state.isOn) {
        playBeep(1000, 0.08);
        setTimeout(() => playBeep(1400, 0.10), 80);
        
        // Disable turbo & eco initially
        state.isEco = false;
        state.isTurbo = false;
    } else {
        playBeep(1400, 0.08);
        setTimeout(() => playBeep(1000, 0.10), 80);
    }
    
    updateUI();
    publishState();
});

// Temp Up
dom.btnTempUp.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    if (state.targetTemp < 30) {
        state.targetTemp++;
        playBeep(2100, 0.06);
        updateUI();
        publishState();
    } else {
        playBeep(800, 0.15, 'triangle'); // Error tone
    }
});

// Temp Down
dom.btnTempDown.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    if (state.targetTemp > 16) {
        state.targetTemp--;
        playBeep(1700, 0.06);
        updateUI();
        publishState();
    } else {
        playBeep(800, 0.15, 'triangle'); // Error tone
    }
});

// Mode switcher
dom.btnMode.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    const modes = ['cool', 'dry', 'fan', 'heat'];
    let idx = modes.indexOf(state.mode);
    state.mode = modes[(idx + 1) % modes.length];
    
    playBeep(1900, 0.06);
    updateUI();
    publishState();
});

// Fan speed cycle
dom.btnSpeed.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    const speeds = ['auto', 'low', 'medium', 'high'];
    let idx = speeds.indexOf(state.fanSpeed);
    state.fanSpeed = speeds[(idx + 1) % speeds.length];
    
    playBeep(1900, 0.06);
    updateUI();
    publishState();
});

// Swing flap
dom.btnSwing.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    state.isSwing = !state.isSwing;
    playBeep(1900, 0.06);
    updateUI();
    publishState();
});

// Eco Mode
dom.btnEco.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    state.isEco = !state.isEco;
    if (state.isEco) {
        state.isTurbo = false; // Disable conflicting turbo
    }
    
    playBeep(2000, 0.06);
    updateUI();
    publishState();
});

// Turbo Mode
dom.btnTurbo.addEventListener('click', () => {
    triggerInteraction();
    if (!state.isOn) return;
    
    state.isTurbo = !state.isTurbo;
    if (state.isTurbo) {
        state.isEco = false; // Disable conflicting eco
    }
    
    playBeep(2200, 0.06);
    updateUI();
    publishState();
});

// Ambient sound toggles
dom.btnAmbient.addEventListener('click', () => {
    triggerInteraction();
    const ambients = ['off', 'rain', 'crickets', 'campfire'];
    let idx = ambients.indexOf(state.activeAmbient);
    state.activeAmbient = ambients[(idx + 1) % ambients.length];
    
    playBeep(1800, 0.06);
    
    if (state.activeAmbient === 'off') {
        stopAmbient();
    } else {
        startAmbient(state.activeAmbient);
    }
    
    updateAmbientButtonText();
});

// Pet Interactions (Synced meow)
dom.catContainer.addEventListener('click', () => {
    triggerInteraction();
    playMeow();
    
    // Animate cat click locally
    const body = document.querySelector('.cat-body');
    if (body) {
        body.style.transform = 'scale(0.9) translateY(5px)';
        setTimeout(() => {
            body.style.transform = 'scale(1) translateY(0)';
        }, 150);
    }
    
    // Broadcast meow to other clients
    if (client && client.connected) {
        client.publish(`online-air-conditioner/rooms/${state.roomId}`, JSON.stringify({
            type: 'meow',
            senderId: mySenderId
        }));
    }
});


// ROOM SIMULATION LOOP (Runs every 1 second)
let simSeconds = 0;
setInterval(() => {
    simSeconds++;
    
    // 1. Outdoor Temp fluctuations
    // Fluctuate outdoor temp using a slow sine wave based on runtime
    const baseOutdoor = 31.5;
    const wave = Math.sin(simSeconds / 60) * 0.8;
    state.outdoorTemp = baseOutdoor + wave + (Math.random() * 0.1 - 0.05);
    
    // 2. Room Temp adjustment logic
    // Thermal leakage: Room naturally leaks towards outdoor temperature
    const leakageFactor = 0.012; // Speed of thermal exchange with outside
    let tempDiffOutdoor = state.outdoorTemp - state.currentRoomTemp;
    let leakageChange = tempDiffOutdoor * leakageFactor;
    
    let coolingChange = 0;
    
    if (state.isOn) {
        // cooling/heating capacity calculations
        let powerFactor = 0.06; // cooling speed base
        
        if (state.fanSpeed === 'low') powerFactor *= 0.65;
        else if (state.fanSpeed === 'high') powerFactor *= 1.35;
        
        if (state.isTurbo) powerFactor *= 1.6;
        else if (state.isEco) powerFactor *= 0.6;
        
        if (state.mode === 'cool') {
            // Cool mode: pushes room temp down towards target
            if (state.currentRoomTemp > state.targetTemp) {
                coolingChange = -powerFactor * (state.currentRoomTemp - state.targetTemp + 0.5);
            }
        } else if (state.mode === 'heat') {
            // Heat mode: pushes room temp up towards target
            if (state.currentRoomTemp < state.targetTemp) {
                coolingChange = powerFactor * (state.targetTemp - state.currentRoomTemp + 0.5);
            }
        } else if (state.mode === 'dry') {
            // Dry mode: cools slightly, maintains lower humidity
            if (state.currentRoomTemp > state.targetTemp) {
                coolingChange = -powerFactor * 0.5 * (state.currentRoomTemp - state.targetTemp + 0.5);
            }
        }
        // Fan mode does no temperature modification
    }
    
    // Net temperature delta
    state.currentRoomTemp += leakageChange + coolingChange;
    
    // Bounds check
    if (state.currentRoomTemp > 45) state.currentRoomTemp = 45;
    if (state.currentRoomTemp < 10) state.currentRoomTemp = 10;
    
    // 3. Electricity accumulation calculations
    // Speedup factor: 1 real second represents 60 seconds of simulation runtime (1 minute)
    // kWh += (Power (W) / 1000 kW) * (60s / 3600s/h) = W / 60000
    const powerWatts = calculateCurrentPower();
    const stepKwh = powerWatts / 60000;
    
    // Accumulate locally for smooth display ticking
    state.kwhUsage += stepKwh;
    
    // Calculate cost based on currency
    if (state.lang === 'ko') {
        // KRW: ~150 Won per kWh
        state.costAccumulated += stepKwh * 150;
    } else {
        // USD: ~$0.15 per kWh
        state.costAccumulated += stepKwh * 0.15;
    }
    
    // Update elements
    updateUI();
    
}, 1000);

// Initialize UI and multiplayer setup
setLanguage('ko');
updateUI();
updateClock();
connectMultiplayer();
