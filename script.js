let audioCtx = null;
let timers = {}; // 稼働中のタイマー管理

// スマホの音声制限を解除する関数
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// リスト作成
function createTimerList() {
    initAudio(); 
    resetAll();
    const count = document.getElementById('timerCount').value;
    const list = document.getElementById('timerList');
    list.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'timer-row';
        row.id = `timer-row-${i}`;
        row.innerHTML = `
            <input type="checkbox" class="timer-check" checked>
            <span style="width:40px">No.${i + 1}</span>
            <input type="number" class="timer-val" value="${(i + 1) * 5}" style="width:65px">
            <select class="timer-unit">
                <option value="1">秒</option>
                <option value="60">分</option>
                <option value="3600">時間</option>
            </select>
            <span class="status">待機中</span>
            <button class="reset-btn" onclick="resetSingleTimer(${i})">リセット</button>
        `;
        list.appendChild(row);
    }
}

// 選択したタイマーを開始
function startSelected() {
    initAudio();
    const rows = document.querySelectorAll('.timer-row');
    rows.forEach((row, index) => {
        const isChecked = row.querySelector('.timer-check').checked;
        const statusLabel = row.querySelector('.status');
        
        // 待機中か終了済みのものだけ開始
        if (isChecked && (statusLabel.innerText === '待機中' || statusLabel.innerText === '終了！')) {
            const val = parseFloat(row.querySelector('.timer-val').value);
            const unit = parseInt(row.querySelector('.timer-unit').value);
            if (val > 0) {
                startCountdown(index, Math.floor(val * unit), statusLabel);
            }
        }
    });
}

// カウントダウン処理
function startCountdown(id, seconds, label) {
    if (timers[id]) clearInterval(timers[id]);

    let timeLeft = seconds;
    label.style.color = "#00e676"; // 動作中は緑色

    timers[id] = setInterval(() => {
        timeLeft--;
        
        const h = Math.floor(timeLeft / 3600);
        const m = Math.floor((timeLeft % 3600) / 60);
        const s = timeLeft % 60;
        
        let timeStr = "";
        if (h > 0) timeStr += `${h}h `;
        if (m > 0 || h > 0) timeStr += `${m}m `;
        timeStr += `${s}s`;
        
        label.innerText = timeStr;

        if (timeLeft <= 0) {
            clearInterval(timers[id]);
            delete timers[id];
            label.innerText = "終了！";
            label.style.color = "orange";
            playBeep();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // スマホ用振動
        }
    }, 1000);
}

// 個別リセット
function resetSingleTimer(id) {
    if (timers[id]) {
        clearInterval(timers[id]);
        delete timers[id];
    }
    const row = document.getElementById(`timer-row-${id}`);
    if (row) {
        const statusLabel = row.querySelector('.status');
        statusLabel.innerText = "待機中";
        statusLabel.style.color = "#888";
    }
}

// 全リセット
function resetAll() {
    Object.keys(timers).forEach(id => {
        clearInterval(timers[id]);
        delete timers[id];
    });
    document.querySelectorAll('.status').forEach(label => {
        label.innerText = "待機中";
        label.style.color = "#888";
    });
}

// 全選択・解除
function toggleAll() {
    const checks = document.querySelectorAll('.timer-check');
    if (checks.length === 0) return;
    const firstState = checks[0].checked;
    checks.forEach(c => c.checked = !firstState);
}

// アラーム音再生
function playBeep() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3); // 0.3秒鳴らす
}

// 初回起動
createTimerList();