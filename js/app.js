const CLIENT_ID = "436189187519-uc16c9p1m6hasf64cqe0fqgb61pql6uc.apps.googleusercontent.com";
const TOKEN_KEY = "google_auth_token";
const URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbwyg9cIy80U4bjtSulbdBGrRwNOR0Ql6W4TPgc3SX0pgNmu9HFQX6UMrYQjpYdvDyk/exec'

// 1. Запуск при загрузке страницы
window.onload = function () {
    checkAuthStatus();
};

// 2. Проверка: есть ли сохраненный токен?
function checkAuthStatus() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
        // Если токен есть, проверяем его валидность
        if (!isTokenExpired(token)) {
            const user = decodeJwt(token);
            showProfile(user);
            showScaner();
            return; // Прерываем выполнение, не показываем кнопку входа
        } else {
            // Токен истек, удаляем его
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    // Если токена нет или он истек — инициализируем Google кнопку
    initGoogleAuth();
}

// 3. Инициализация Google SDK
function initGoogleAuth() {
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true // Пытаться войти автоматически
    });

    // Рендерим кнопку
    google.accounts.id.renderButton(
        document.getElementById("buttonContainer"),
        { theme: "outline", size: "large", width: "300" }
    );

    // Показываем всплывающее окно (One Tap), если авто-вход не сработал
    google.accounts.id.prompt();
}

// 4. Обработка успешного входа
function handleCredentialResponse(response) {
    console.log("Token получен:", response.credential);

    // Сохраняем токен в браузер
    localStorage.setItem(TOKEN_KEY, response.credential);

    const user = decodeJwt(response.credential);

    showProfile(user);
    showScaner();
}

// 5. Выход из системы
function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    google.accounts.id.disableAutoSelect(); // Запретить авто-вход в следующий раз

    // Перезагружаем страницу для сброса состояния
    location.reload();
}

function showScaner() {
    document.getElementById("scaner-container").style.display = "block";
}

function showProfile(user) {
    document.getElementById("login-block").style.display = "none";
    document.getElementById("user-profile").style.display = "flex";

    document.getElementById("user-name").innerText = user.name;
    document.getElementById("user-email").innerText = user.email;
    document.getElementById("user-img").src = user.picture;
}


// Декодирование JWT
function decodeJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Проверка истечения срока действия токена
function isTokenExpired(token) {
    try {
        const payload = decodeJwt(token);
        const now = Date.now() / 1000;
        return payload.exp < now;
    } catch (e) {
        return true;
    }
}


// SCANER
let html5QrcodeScanner = null;
let isScanning = false;
let currentCamera = 'environment'; // Задняя камера по умолчанию

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupCameraSwitch();
});

// Настройка переключателя камер
function setupCameraSwitch() {
    const buttons = document.querySelectorAll('.camera-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCamera = btn.dataset.camera;

            if (isScanning) {
                stopScanner();
                setTimeout(startScanner, 300);
            }
        });
    });
}

// Запуск сканера
function startScanner() {
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const cameraSwitch = document.getElementById('cameraSwitch');

    statusEl.textContent = '🔄 Инициализация камеры...';
    statusEl.className = 'status scanning';
    startBtn.disabled = true;

    html5QrcodeScanner = new Html5Qrcode("reader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrcodeScanner.start(
        { facingMode: currentCamera },
        config,
        onScanSuccess,
        onScanFailure
    )
        .then(() => {
            isScanning = true;
            statusEl.textContent = '✅ Сканирование активно';
            statusEl.className = 'status active';
            startBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            cameraSwitch.style.display = 'flex';
            document.getElementById('resultBox').classList.remove('show');
        })
        .catch(err => {
            console.error("Ошибка запуска:", err);
            statusEl.textContent = '❌ Ошибка: ' + (err.message || 'Не удалось запустить камеру');
            statusEl.className = 'status inactive';
            startBtn.disabled = false;

            // Частые ошибки и решения
            if (err.name === 'NotAllowedError') {
                statusEl.textContent = '❌ Доступ к камере запрещен';
            } else if (err.name === 'NotFoundError') {
                statusEl.textContent = '❌ Камера не найдена';
            }
        });
}

// Остановка сканера
function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop()
            .then(() => {
                isScanning = false;
                document.getElementById('status').textContent = '⏹️ Камера выключена';
                document.getElementById('status').className = 'status inactive';
                document.getElementById('startBtn').style.display = 'flex';
                document.getElementById('startBtn').disabled = false;
                document.getElementById('stopBtn').style.display = 'none';
                document.getElementById('cameraSwitch').style.display = 'none';

                // Очищаем область сканера
                html5QrcodeScanner.clear();
            })
            .catch(err => {
                console.error("Ошибка остановки:", err);
            });
    }
}

// Успешное сканирование
function onScanSuccess(decodedText, decodedResult) {
    // Останавливаем сканирование после успешного результата
    stopScanner();

    // Воспроизводим звук успеха (опционально)
    playBeep();

    // Показываем результат
    showResult(decodedText, decodedResult);
}

// Ошибка сканирования (игнорируем большинство)
function onScanFailure(error) {
    // Не показываем ошибки постоянно, это нормально при сканировании
    // console.warn(`Scan failure: ${error}`);
}

// Отображение результата
function showResult(text, result) {
    const resultBox = document.getElementById('resultBox');
    const resultValue = document.getElementById('resultValue');
    const resultType = document.getElementById('resultType');

    resultValue.textContent = text;

    // Определяем тип кода
    let type = 'QR Code';
    if (result.result?.format?.formatName) {
        type = result.result.format.formatName;
    } else if (text.startsWith('http')) {
        type = 'URL';
    } else if (text.length > 20) {
        type = 'Штрихкод';
    }

    resultType.textContent = `Тип: ${type}`;
    resultBox.classList.add('show');

    // Сохраняем в историю (localStorage)
    saveToHistory(text, type);
}

// Копирование результата
function copyResult() {
    const text = document.getElementById('resultValue').textContent;
    navigator.clipboard.writeText(text)
        .then(() => {
            const btn = document.querySelector('.btn-copy');
            const originalText = btn.textContent;
            btn.textContent = '✅ Скопировано!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            alert('Не удалось скопировать: ' + err);
        });
}

// Повторное сканирование
function scanAgain() {
    document.getElementById('resultBox').classList.remove('show');
    startScanner();
}

// Звуковой сигнал при успешном сканировании
function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Игнорируем ошибки аудио
    }
}

// Сохранение в историю
function saveToHistory(text, type) {
    const history = JSON.parse(localStorage.getItem('scanHistory') || '[]');
    history.unshift({
        text: text,
        type: type,
        timestamp: new Date().toISOString()
    });

    // Храним последние 50 записей
    if (history.length > 50) {
        history.pop();
    }

    localStorage.setItem('scanHistory', JSON.stringify(history));
}

// Проверка поддержки HTTPS (требуется для камеры)
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    alert('⚠️ Для работы камеры требуется HTTPS или localhost');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js', {
            scope: './'
        })
            .then(registration => {
                console.log('Service Worker зарегистрирован:', registration);
            })
            .catch(error => {
                console.log('Ошибка регистрации Service Worker:', error);
            });
    });
} else {
    console.log('Браузер не поддерживает Service Worker');
}

// Функция для показа уведомления
function showNotification() {


    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Привет из PWA!', {
                    body: 'Это уведомление из вашего PWA приложения',
                    icon: './images/icon.png'
                });
            }
        });
    }
}

const sendData = async (data) => {
    try {
        const response = await fetch(URL_SCRIPT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // Проверяем статус ответа
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Сервер вернул ошибку ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            alert(`✅ ${result.message}\nПользователь: ${result.user}`);
        } else {
            throw new Error(result.error || 'Неизвестная ошибка сервера');
        }

    } catch (error) {
        console.error('Ошибка отправки:', error);
    }
};