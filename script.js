let audioCtx = null;
let timers = {}; 

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function saveSettings() {
    const timerCount = document.getElementById('timerCount').value;
    const globalSound = document.getElementById('globalSound').value;
    const rows = document.querySelectorAll('.timer-row');
    const timerData = [];

    rows.forEach(row => {
        timerData.push({
            val: row.querySelector('.timer-val').value,
            unit: row.querySelector('.timer-unit').value,
            sound: row.querySelector('.timer-sound').value,
            checked: row.querySelector('.timer-check').checked
        });
    });

    localStorage.setItem('myTimerConfigV4', JSON.stringify({
        count: timerCount, 
        globalSound: globalSound,
        timers: timerData
    }));
}

function loadSettings() {
    const saved = localStorage.getItem('myTimerConfigV4');
    return saved ? JSON.parse(saved) : null;
}

function changeAllSounds() {
    const globalSound = document.getElementById('globalSound').value;
    document.querySelectorAll('.timer-sound').forEach(select => {
        select.value = globalSound;
    });
    saveSettings();
}

function createTimerList(isInitial = false) {
    initAudio(); 
    resetAll();

    let savedData = isInitial ? loadSettings() : null;
    let count;
    let globalSound = "bell"; 

    if (savedData) {
        count = savedData.count;
        globalSound = savedData.globalSound || "bell";
        document.getElementById('timerCount').value = count;
        document.getElementById('globalSound').value = globalSound;
    } else {
        count = document.getElementById('timerCount').value;
        globalSound = document.getElementById('globalSound').value;
    }

    const list = document.getElementById('timerList');
    list.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const rowData = (savedData && savedData.timers[i]) ? savedData.timers[i] : {val: (i + 1) * 5, unit: "1", sound: globalSound, checked: true};
        
        const row = document.createElement('div');
        row.className = 'timer-row';
        row.id = `timer-row-${i}`;
        row.innerHTML = `
            <input type="checkbox" class="timer-check" ${rowData.checked ? 'checked' : ''} onchange="saveSettings()">
            <span style="font-size:12px; width:20px">#${i + 1}</span>
            <input type="number" class="timer-val" value="${rowData.val}" style="width:55px" onchange="saveSettings()">
            <select class="timer-unit" onchange="saveSettings()">
                <option value="1" ${rowData.unit == "1" ? 'selected' : ''}>秒</option>
                <option value="60" ${rowData.unit == "60" ? 'selected' : ''}>分</option>
                <option value="3600" ${rowData.unit == "3600" ? 'selected' : ''}>時</option>
            </select>
            <select class="timer-sound" onchange="saveSettings()" style="width:80px">
                <option value="bell" ${rowData.sound == "bell" ? 'selected' : ''}>ベル</option>
                <option value="beep" ${rowData.sound == "beep" ? 'selected' : ''}>電子音</option>
                <option value="alarm" ${rowData.sound == "alarm" ? 'selected' : ''}>警報</option>
            </select>
            <span class="status">待機中</span>
            <button class="reset-btn" onclick="resetSingleTimer(${i})">リセット</button>
        `;
        list.appendChild(row);
    }
    saveSettings();
}

function startSelected() {
    initAudio();
    saveSettings();
    const rows = document.querySelectorAll('.timer-row');
    rows.forEach((row, index) => {
        const isChecked = row.querySelector('.timer-check').checked;
        const statusLabel = row.querySelector('.status');
        const soundType = row.querySelector('.timer-sound').value;
        
        if (isChecked && (statusLabel.innerText === '待機中' || statusLabel.innerText === '終了！')) {
            const val = parseFloat(row.querySelector('.timer-val').value);
            const unit = parseInt(row.querySelector('.timer-unit').value);
            if (val > 0) startCountdown(index, Math.floor(val * unit), statusLabel, soundType);
        }
    });
}

function startCountdown(id, seconds, label, soundType) {
    if (timers[id]) clearInterval(timers[id]);
    let timeLeft = seconds;
    label.style.color = "#00e676";

    timers[id] = setInterval(() => {
        timeLeft--;
        const h = Math.floor(timeLeft / 3600);
        const m = Math.floor((timeLeft % 3600) / 60);
        const s = timeLeft % 60;
        label.innerText = `${h > 0 ? h + 'h ' : ''}${m > 0 || h > 0 ? m + 'm ' : ''}${s}s`;

        if (timeLeft <= 0) {
            clearInterval(timers[id]);
            delete timers[id];
            label.innerText = "終了！";
            label.style.color = "orange";
            playSelectedSound(soundType);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }, 1000);
}

// 【改良】学会のベル（卓上ベル）を模した音
function playSelectedSound(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (type === 'bell') {
        // 学会のベル特有の「非整数倍音」を再現するための4つの周波数
        const frequencies = [2000, 2800, 3500, 4200];
        
        frequencies.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            // 叩いた瞬間のアタックと、長い余韻
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2 / (i + 1), now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + 2.5);
        });
    } else if (type === 'beep') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.1, now);
        osc.start();
        osc.stop(now + 0.2);
    } else if (type === 'alarm') {
        for(let i=0; i<3; i++) {
            const t = now + (i * 0.2);
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(800, t);
            g.gain.setValueAtTime(0.1, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t); osc.stop(t + 0.15);
        }
    }
}

function resetSingleTimer(id) {
    if (timers[id]) { clearInterval(timers[id]); delete timers[id]; }
    const statusLabel = document.querySelector(`#timer-row-${id} .status`);
    if (statusLabel) { statusLabel.innerText = "待機中"; statusLabel.style.color = "#888"; }
}

function resetAll() {
    Object.keys(timers).forEach(id => { clearInterval(timers[id]); delete timers[id]; });
    document.querySelectorAll('.status').forEach(l => { l.innerText = "待機中"; l.style.color = "#888"; });
}

function toggleAll() {
    const checks = document.querySelectorAll('.timer-check');
    if (checks.length === 0) return;
    const state = checks[0].checked;
    checks.forEach(c => c.checked = !state);
    saveSettings();
}

createTimerList(true);