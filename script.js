document.addEventListener('DOMContentLoaded', () => {

    // --- Tab Switching Logic ---
    const tabs = {
        generate: document.getElementById('tab-generate'),
        scan: document.getElementById('tab-scan')
    };
    const contents = {
        generate: document.getElementById('content-generate'),
        scan: document.getElementById('content-scan')
    };

    // --- Generate Section Elements ---
    const qrTypeSelect = document.getElementById('qr-type');
    const formInputs = document.getElementById('form-inputs');
    const allFormSections = formInputs.querySelectorAll('.form-section');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const qrcodeDisplayContainer = document.getElementById('qrcode-display-container');
    const qrcodeDisplay = document.getElementById('qrcode-display');
    const generateError = document.getElementById('generate-error');
    let qrCodeInstance = null;

    // --- Scan Section Elements ---
    const startScanBtn = document.getElementById('start-scan-btn');
    const scannerUI = document.getElementById('scanner-ui');
    const scannerLoadingMsg = document.getElementById('scanner-loading-message');
    const video = document.getElementById('scan-video');
    const stopScanBtn = document.getElementById('stop-scan-btn');
    const canvas = document.getElementById('scan-canvas');
    const ctx = canvas.getContext('2d');
    const scanError = document.getElementById('scan-error');
    const scanResultContainer = document.getElementById('scan-result-container');
    const scanResult = document.getElementById('scan-result');
    const copyBtn = document.getElementById('copy-btn');
    const scanAgainBtn = document.getElementById('scan-again-btn');
    const callBtn = document.getElementById('call-btn');
    
    const scanOptions = document.getElementById('scan-options');
    const uploadScanBtn = document.getElementById('upload-scan-btn');
    const qrFileInput = document.getElementById('qr-file-input');
    const uploadLoadingMsg = document.getElementById('upload-loading-message');

    let videoStream = null;
    let scanAnimationLoop = null;


    // --- Functions ---

    function switchTab(tabName) {
        if (tabName !== 'scan') {
            stopScanner();
        }

        for (const [key, tab] of Object.entries(tabs)) {
            if (key === tabName) {
                tab.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
                tab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300', 'hover:border-gray-400');
            } else {
                tab.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
                tab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300', 'hover:border-gray-400');
            }
        }

        for (const [key, content] of Object.entries(contents)) {
            if (key === tabName) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        }
    }

    function updateFormInputs() {
        const selectedType = qrTypeSelect.value;
        allFormSections.forEach(section => {
            if (section.id === `form-${selectedType}`) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    }

    function getFormattedQRData() {
        const type = qrTypeSelect.value;
        try {
            switch (type) {
                case 'text':
                    const text = document.getElementById('qr-text').value;
                    if (!text) throw new Error('Text field is empty.');
                    return text;
                case 'url':
                    const url = document.getElementById('qr-url').value;
                    if (!url) throw new Error('URL field is empty.');
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        throw new Error('URL must start with http:// or https://');
                    }
                    return url;
                case 'phone':
                    const phone = document.getElementById('qr-phone').value;
                    if (!phone) throw new Error('Phone number field is empty.');
                    return `tel:${phone}`;
                case 'sms':
                    const smsPhone = document.getElementById('qr-sms-phone').value;
                    const smsMsg = document.getElementById('qr-sms-message').value;
                    if (!smsPhone) throw new Error('Phone number field is empty.');
                    return `SMSTO:${smsPhone}:${smsMsg}`;
                case 'email':
                    const emailTo = document.getElementById('qr-email-to').value;
                    const emailSub = document.getElementById('qr-email-subject').value;
                    const emailBody = document.getElementById('qr-email-body').value;
                    if (!emailTo) throw new Error('Email address field is empty.');
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
                        throw new Error('Invalid email address format.');
                    }
                    return `mailto:${emailTo}?subject=${encodeURIComponent(emailSub)}&body=${encodeURIComponent(emailBody)}`;
                case 'wifi':
                    const ssid = document.getElementById('qr-wifi-ssid').value;
                    const pass = document.getElementById('qr-wifi-pass').value;
                    const enc = document.getElementById('qr-wifi-enc').value;
                    if (!ssid) throw new Error('SSID (Network Name) is empty.');
                    if (enc === 'nopass') {
                        return `WIFI:T:nopass;S:${ssid};;`;
                    }
                    return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
                default:
                    throw new Error('Invalid QR type selected.');
            }
        } catch (error) {
            generateError.textContent = error.message;
            generateError.classList.remove('hidden');
            return null;
        }
    }

    function generateQRCode() {
        qrcodeDisplay.innerHTML = '';
        qrCodeInstance = null;
        generateError.classList.add('hidden');
        qrcodeDisplayContainer.classList.add('hidden');

        const data = getFormattedQRData();
        if (!data) return;

        try {
            qrCodeInstance = new QRCode(qrcodeDisplay, {
                text: data,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            qrcodeDisplayContainer.classList.remove('hidden');
        } catch (error) {
            generateError.textContent = 'Failed to generate QR code. Data may be too long.';
            generateError.classList.remove('hidden');
        }
    }

    function clearFields() {
        const selectedType = qrTypeSelect.value;
        const activeForm = document.getElementById(`form-${selectedType}`);
        activeForm.querySelectorAll('input, textarea').forEach(input => input.value = '');
        activeForm.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
        
        qrcodeDisplay.innerHTML = '';
        qrCodeInstance = null;
        qrcodeDisplayContainer.classList.add('hidden');
        generateError.classList.add('hidden');
    }

    function downloadQRCode() {
        if (!qrCodeInstance) return;
        const canvas = qrcodeDisplay.querySelector('canvas');
        const img = qrcodeDisplay.querySelector('img');
        
        let dataUrl = '';
        if (canvas) {
            dataUrl = canvas.toDataURL('image/png');
        } else if (img) {
            dataUrl = img.src;
        } else {
            alert('Could not find QR code image to download.');
            return;
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    function handleScanSuccess(scannedText) {
        stopScanner();
        uploadLoadingMsg.classList.add('hidden');
        
        scanResult.value = scannedText;
        scanResultContainer.classList.remove('hidden');
        scannerUI.classList.add('hidden');

        const phoneRegex = /^(tel:)?(\+?[\d\s\-\(\)]{7,})$/i;

        if (phoneRegex.test(scannedText)) {
            callBtn.classList.remove('hidden');
            
            let rawNumber = scannedText;
            if (rawNumber.toLowerCase().startsWith('tel:')) {
                rawNumber = rawNumber.substring(4);
            }
            
            callBtn.onclick = () => {
                window.location.href = `tel:${rawNumber}`;
            };
        } else {
            callBtn.classList.add('hidden');
            callBtn.onclick = null;
        }
    }

    async function startScanner() {
        scanOptions.classList.add('hidden');
        scanError.classList.add('hidden');
        scanResultContainer.classList.add('hidden');
        scannerUI.classList.remove('hidden');
        scannerLoadingMsg.classList.remove('hidden');
        video.classList.add('hidden');
        stopScanBtn.classList.add('hidden');

        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            
            video.srcObject = videoStream;
            video.setAttribute('playsinline', true);
            video.play();

            video.onloadedmetadata = () => {
                scannerLoadingMsg.classList.add('hidden');
                video.classList.remove('hidden');
                stopScanBtn.classList.remove('hidden');
                scanAnimationLoop = requestAnimationFrame(scanFrame);
            };

        } catch (err) {
            console.error("Camera Error:", err);
            scanError.textContent = 'Camera access denied. Please enable camera permissions in your browser settings.';
            scanError.classList.remove('hidden');
            scannerUI.classList.add('hidden');
            scanOptions.classList.remove('hidden');
        }
    }

    function scanFrame() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                handleScanSuccess(code.data); 
            } else {
                if (scanAnimationLoop) {
                    scanAnimationLoop = requestAnimationFrame(scanFrame);
                }
            }
        } else {
            if (scanAnimationLoop) {
                scanAnimationLoop = requestAnimationFrame(scanFrame);
            }
        }
    }

    function stopScanner() {
        if (scanAnimationLoop) {
            cancelAnimationFrame(scanAnimationLoop);
            scanAnimationLoop = null;
        }
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        video.pause();
        video.srcObject = null;
        video.classList.add('hidden');
        stopScanBtn.classList.add('hidden');
        scannerUI.classList.add('hidden');
    }

    function resetScanner() {
        stopScanner();
        scanResultContainer.classList.add('hidden');
        scanError.classList.add('hidden');
        scanOptions.classList.remove('hidden');
        uploadLoadingMsg.classList.add('hidden');
        scanResult.value = '';
        callBtn.classList.add('hidden'); 
    }

    function copyResult() {
        if (!navigator.clipboard) {
            scanResult.select();
            document.execCommand('copy');
        } else {
            navigator.clipboard.writeText(scanResult.value).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }

        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.disabled = true;
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.disabled = false;
        }, 2000);
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        scanError.classList.add('hidden');
        scanResultContainer.classList.add('hidden');
        scanOptions.classList.add('hidden');
        uploadLoadingMsg.classList.remove('hidden');

        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    handleScanSuccess(code.data);
                } else {
                    uploadLoadingMsg.classList.add('hidden');
                    scanError.textContent = 'No QR code found in the uploaded image.';
                    scanError.classList.remove('hidden');
                    scanOptions.classList.remove('hidden');
                }
                qrFileInput.value = null;
            };

            img.onerror = () => {
                uploadLoadingMsg.classList.add('hidden');
                scanError.textContent = 'Failed to load the image. Please try another file.';
                scanError.classList.remove('hidden');
                scanOptions.classList.remove('hidden');
                qrFileInput.value = null;
            };
            img.src = e.target.result;
        };

        reader.onerror = () => {
            uploadLoadingMsg.classList.add('hidden');
            scanError.textContent = 'Failed to read the file.';
            scanError.classList.remove('hidden');
            scanOptions.classList.remove('hidden');
            qrFileInput.value = null;
        };
        reader.readAsDataURL(file);
    }

    // --- Event Listeners ---
    
    qrTypeSelect.addEventListener('change', updateFormInputs);
    generateBtn.addEventListener('click', generateQRCode);
    clearBtn.addEventListener('click', clearFields);
    downloadBtn.addEventListener('click', downloadQRCode);

    startScanBtn.addEventListener('click', startScanner);
    stopScanBtn.addEventListener('click', resetScanner);
    scanAgainBtn.addEventListener('click', resetScanner);
    copyBtn.addEventListener('click', copyResult);
    uploadScanBtn.addEventListener('click', () => qrFileInput.click());
    qrFileInput.addEventListener('change', handleFileSelect);

    tabs.generate.addEventListener('click', () => switchTab('generate'));
    tabs.scan.addEventListener('click', () => switchTab('scan'));

    // --- Initialization ---
    switchTab('generate');
    updateFormInputs();
});