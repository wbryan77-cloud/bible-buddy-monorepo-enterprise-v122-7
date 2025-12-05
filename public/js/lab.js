// public/js/lab.js
// Bible Buddy Lab (tester):
// - Chat tab: /api/ai/tester-chat
// - Image tab: /api/ai/tester-image (description + optional base64 image)
// - Voice input (where supported) via Web Speech API
// - Text-to-speech for AI replies (where supported)

(function () {
  const sessionId = 'tester-' + Math.random().toString(16).slice(2);

  // Tabs
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panels.forEach((p) => {
        p.style.display = p.getAttribute('data-panel') === tabName ? 'flex' : 'none';
      });
    });
  });

  // Chat elements
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const voiceBtn = document.getElementById('voiceBtn');
  const voiceTip = document.getElementById('voiceTip');

  function appendMessage(text, who) {
    const div = document.createElement('div');
    div.className = 'msg ' + who;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;

    if (who === 'ai') {
      speak(text);
    }
  }

  // ---------- Text-to-speech ----------
  let ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function speak(text) {
    if (!ttsSupported || !text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // ---------- Send chat ----------
  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    chatInput.value = '';
    chatInput.focus();
    chatSend.disabled = true;

    try {
      const res = await fetch('/api/ai/tester-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: null,
          message: text,
        }),
      });
      const json = await res.json();
      if (json.error) {
        appendMessage('Error: ' + json.error, 'ai');
      } else {
        appendMessage(json.reply || '(no reply)', 'ai');
      }
    } catch (e) {
      appendMessage('Error talking to Bible Buddy: ' + e.message, 'ai');
    } finally {
      chatSend.disabled = false;
    }
  }

  if (chatSend) {
    chatSend.addEventListener('click', sendChat);
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // Initial greeting
  appendMessage('Hi! I’m Bible Buddy. Tell me about your notes or plans and I’ll help you shape them.', 'ai');

  // ---------- Voice input ----------
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

  let recognition = null;
  let listening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      listening = true;
      if (voiceBtn) voiceBtn.textContent = '■';
      if (voiceTip) voiceTip.textContent = 'Listening…';
    };
    recognition.onend = () => {
      listening = false;
      if (voiceBtn) voiceBtn.textContent = '🎤';
      if (voiceTip) voiceTip.textContent = '';
    };
    recognition.onerror = () => {
      listening = false;
      if (voiceBtn) voiceBtn.textContent = '🎤';
      if (voiceTip) voiceTip.textContent = 'Voice error – try again.';
    };
    recognition.onresult = (e) => {
      const result = e.results[0][0].transcript;
      if (chatInput) {
        chatInput.value = result;
      }
      sendChat();
    };

    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (!recognition) return;
        if (!listening) {
          recognition.start();
        } else {
          recognition.stop();
        }
      });
    }
    if (voiceTip) {
      voiceTip.textContent = 'Tap 🎤 to speak';
    }
  } else {
    // Voice not supported
    if (voiceBtn) {
      voiceBtn.style.display = 'none';
    }
    if (voiceTip) {
      voiceTip.textContent = 'Voice not supported in this browser';
    }
  }

  // ---------- Image tab ----------
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const descInput = document.getElementById('imageDescription');
  const imageSend = document.getElementById('imageSend');
  const imageResult = document.getElementById('imageResult');

  let chosenFile = null;

  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput && fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        chosenFile = file;
        dropZone.textContent = 'Selected: ' + file.name;
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file && file.type.startsWith('image/')) {
        chosenFile = file;
        dropZone.textContent = 'Selected: ' + file.name;
      }
    });
  }

  async function sendImage() {
    const description = (descInput && descInput.value.trim()) || '';
    if (!description && !chosenFile) {
      alert('Please either describe your notes or choose an image (or both).');
      return;
    }

    imageSend.disabled = true;
    imageSend.textContent = 'Thinking…';
    imageResult.style.display = 'block';
    imageResult.textContent = 'Sending to Bible Buddy...';

    let imageDataBase64 = null;
    let imageName = null;

    if (chosenFile) {
      imageName = chosenFile.name;
      imageDataBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1] || null;
          resolve(base64);
        };
        reader.readAsDataURL(chosenFile);
      });
    }

    try {
      const res = await fetch('/api/ai/tester-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: null,
          description,
          imageName,
          imageDataBase64,
        }),
      });
      const json = await res.json();
      if (json.error) {
        imageResult.textContent = 'Error: ' + json.error;
      } else {
        imageResult.textContent = json.reply || '(no suggestions returned)';
      }
    } catch (e) {
      imageResult.textContent = 'Error talking to Bible Buddy: ' + e.message;
    } finally {
      imageSend.disabled = false;
      imageSend.textContent = 'Ask Bible Buddy';
    }
  }

  if (imageSend) {
    imageSend.addEventListener('click', sendImage);
  }
})();
