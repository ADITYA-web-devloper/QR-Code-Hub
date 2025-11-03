// --- DOM Elements ---
const body = document.body;
const darkModeToggle = document.getElementById('darkModeToggle');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const globalMessage = document.getElementById('global-message');

// Generate QR Elements
const qrText = document.getElementById('qrText');
const generateBtn = document.getElementById('generateBtn');
const qrCodeDiv = document.getElementById('qrcode');
const qrStatus = document.getElementById('qr-status');
const downloadBtn = document.getElementById('downloadBtn');

// Scan QR Elements
const liveScanBtn = document.getElementById('liveScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrImageUpload = document.getElementById('qrImageUpload');
const readerDiv = document.getElementById('reader');
const scanStatus = document.getElementById('scan-status');
const scanResultBox = document.getElementById('scan-result-box');
const decodedText = document.getElementById('decodedText');
const copyBtn = document.getElementById('copyBtn');

let qrCodeInstance = null;
let html5QrCodeScanner = null;
const readerId = "reader"; // ID used for html5-qrcode

// --- Utility Functions ---

/**
 * Shows a temporary, styled message banner.
 * @param {string} message - The message content.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function showGlobalMessage(message, type = 'info') {
    globalMessage.textContent = message;
    globalMessage.className = 'fixed top-20 right-4 p-3 rounded-lg shadow-xl text-white font-medium z-50 glass-card'; // Added glass-card

    switch (type) {
        case 'success':
            globalMessage.classList.add('bg-green-500/80');
            break;
        case 'error':
            globalMessage.classList.add('bg-red-500/80');
            break;
        case 'info':
        default:
            globalMessage.classList.add('bg-blue-500/80');
            break;
    }

    globalMessage.classList.remove('hidden');
    setTimeout(() => {
        globalMessage.classList.add('hidden');
    }, 3000);
}

/**
 * Switches the visible content section.
 * @param {string} sectionId - The ID of the section to show ('generate', 'scan').
 */
function showSection(sectionId) {
    contentSections.forEach(section => {
        section.classList.add('hidden');
    });
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    // Stop camera when switching away from the scan section
    if (sectionId !== 'scan' && html5QrCodeScanner) {
        stopLiveScanner();
    }
}

// --- Dark Mode Logic ---

function applyDarkMode(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
    }
}

darkModeToggle.addEventListener('click', () => {
    applyDarkMode(!document.documentElement.classList.contains('dark'));
});

// --- Navigation Logic ---

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.target.getAttribute('data-section');
        showSection(sectionId);
    });
});

// --- QR Code Generator Logic ---

generateBtn.addEventListener('click', () => {
    const text = qrText.value.trim();

    if (!text) {
        showGlobalMessage('Please enter text or a URL.', 'error');
        return;
    }

    qrCodeDiv.innerHTML = '';
    qrCodeDiv.classList.add('hidden');
    qrStatus.classList.remove('hidden');
    qrStatus.textContent = 'Generating...';
    downloadBtn.classList.add('hidden');

    try {
        qrCodeInstance = new QRCode(qrCodeDiv, {
            text: text,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        qrCodeDiv.classList.remove('hidden');
        qrStatus.classList.add('hidden');
        downloadBtn.classList.remove('hidden');
        showGlobalMessage('QR Code generated!', 'success');

    } catch (e) {
        qrStatus.textContent = 'Error generating QR code.';
        showGlobalMessage('Error during generation.', 'error');
        console.error("QR Code Generation Error:", e);
    }
});

downloadBtn.addEventListener('click', () => {
    if (!qrCodeInstance) {
        showGlobalMessage('Generate a QR code first.', 'error');
        return;
    }

    const canvas = qrCodeDiv.querySelector('canvas');
    if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = 'qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showGlobalMessage('QR Code downloaded.', 'success');
    } else {
        showGlobalMessage('Download failed: Canvas not found.', 'error');
    }
});

// --- QR Code Scanner Logic ---

function stopLiveScanner() {
    if (html5QrCodeScanner && html5QrCodeScanner.getState() === 2) { // 2 = SCANNING
        html5QrCodeScanner.stop().then(() => {
            scanStatus.textContent = 'Camera stopped.';
            stopScanBtn.classList.add('hidden');
            liveScanBtn.classList.remove('hidden');
            readerDiv.innerHTML = '<p id="scan-status">Start scanning with the button above.</p>';
        }).catch(err => {
            console.error("Failed to stop scanner:", err);
            showGlobalMessage('Error stopping camera.', 'error');
        });
    }
}

const onScanSuccess = (decodedTextResult, decodedResult) => {
    stopLiveScanner();
    decodedText.value = decodedTextResult;
    scanResultBox.classList.remove('hidden');
    showGlobalMessage('QR Code decoded!', 'success');
};

const onScanError = (errorMessage) => {
    scanStatus.textContent = "Scanning... Align QR code in the box.";
};

liveScanBtn.addEventListener('click', () => {
    scanResultBox.classList.add('hidden');
    decodedText.value = '';

    if (!html5QrCodeScanner) {
        html5QrCodeScanner = new Html5Qrcode(readerId);
    }

    if (html5QrCodeScanner.getState() === 2) { // 2 = SCANNING
        showGlobalMessage('Scanner is already running.', 'info');
        return;
    }

    html5QrCodeScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
    ).then(() => {
        scanStatus.textContent = 'Camera started. Scanning...';
        liveScanBtn.classList.add('hidden');
        stopScanBtn.classList.remove('hidden');
        showGlobalMessage('Camera started.', 'info');
    }).catch(err => {
        scanStatus.textContent = 'Error: Camera access denied or not available.';
        showGlobalMessage('Failed to start camera. Check permissions.', 'error');
        console.error("Camera start error:", err);
    });
});

stopScanBtn.addEventListener('click', stopLiveScanner);

qrImageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    stopLiveScanner();
    scanStatus.textContent = 'Decoding image...';
    scanResultBox.classList.add('hidden');
    decodedText.value = '';
    
    if (!html5QrCodeScanner) {
        html5QrCodeScanner = new Html5Qrcode(readerId);
    }
    
    readerDiv.innerHTML = '';
    
    html5QrCodeScanner.scanFile(file, true)
        .then(decodedTextResult => {
            scanStatus.textContent = 'Image decoded!';
            decodedText.value = decodedTextResult;
            scanResultBox.classList.remove('hidden');
            showGlobalMessage('QR Code from image decoded!', 'success');
        })
        .catch(err => {
            scanStatus.textContent = 'No QR Code detected in the image.';
            showGlobalMessage('Decoding failed: No QR found.', 'error');
            console.error("Image Scan Error:", err);
        })
        .finally(() => {
            readerDiv.innerHTML = '<p id="scan-status">Start scanning with the button above.</p>';
            qrImageUpload.value = '';
        });
});

// Copy Button Logic
copyBtn.addEventListener('click', () => {
    if (decodedText.value) {
        navigator.clipboard.writeText(decodedText.value)
            .then(() => showGlobalMessage('Copied to clipboard!', 'success'))
            // THIS WAS THE LINE WITH THE ERROR
            .catch(() => showGlobalMessage('Failed to copy text.', 'error'));
    }
});

// Initial load: show the 'generate' section by default.
document.addEventListener('DOMContentLoaded', () => {
    showSection('generate');
    
    // Initialize dark mode
    if (localStorage.getItem('darkMode') === 'true' || (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});