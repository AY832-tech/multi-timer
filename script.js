// 音声を管理する変数を外に出しておく
let audioCtx = null;

function initAudio() {
    // ユーザーの操作（クリックなど）の中でこれを一度実行すると、音が許可される
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // もし停止（suspended）状態なら再開させる
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function createTimerList() {
    initAudio(); // リスト作成ボタンを押した時に音を準備
    const count = document.getElementById('timerCount').value;
    const list = document.getElementById('timerList');
    list.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'timer-row';
        row.innerHTML = `
            <input type="checkbox" class="timer-check" checked>
            <span>No.${i + 1}</span>
            <input type="number" class="timer-val" value="${(i + 1) * 5}" style="width:60px">
            <select class="timer-unit">
                <option value="1">秒</option>
                <option value="60">分</option>
                <option value="3600">時間</option>
            </select>
            <span class="status">待機中</span>
        `;
        list.appendChild(row);
    }
}

function startSelected() {
    initAudio(); // スタートボタンを押した時にも音を準備（重要！）
    const rows = document.querySelectorAll('.timer-row');
    rows.forEach(row => {
        const isChecked = row.querySelector('.timer-check').checked;
        const statusLabel = row.querySelector('.status');
        
        if (isChecked && statusLabel.innerText === '待機中') {
            const val = parseFloat(row.querySelector('.timer-val').value);
            const unit = parseInt(row.querySelector('.timer-unit').value);
            startCountdown(val * unit, statusLabel);
        }
    });
}

function startCountdown(seconds, label) {
    let timeLeft = seconds;
    const timer = setInterval(() => {
        timeLeft--;
        
        const h = Math.floor(timeLeft / 3600);
        const m = Math.floor((timeLeft % 3600) / 60);
        const s = timeLeft % 60;
        label.innerText = `残り ${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            label.innerText = "終了！";
            label.style.color = "orange";
            playBeep();
            // スマホならバイブレーションも追加（おまけ）
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }, 1000);
}

function playBeep() {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}