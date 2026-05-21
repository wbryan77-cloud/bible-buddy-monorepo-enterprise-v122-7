/* Bible Buddy Realtime Voice Client
 * Browser-side WebRTC transport foundation.
 * Safe by default: mic only starts after user action/permission.
 */

(function () {
  const state = {
    active: false,
    connecting: false,
    peer: null,
    dataChannel: null,
    localStream: null,
    remoteAudio: null,
    audioContext: null,
    analyser: null,
    animationFrame: null,
    amplitude: 0,
    transcript: [],
    lastUserSpeechAt: null,
    sessionStartedAt: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function emitStatus(text) {
    const el = $('voiceStatus');
    if (el) el.textContent = text;
  }

  function appendTranscript(role, text, partial = false) {
    const el = $('liveTranscript');
    if (!el) return;

    if (partial) {
      let partialEl = $('partialTranscript');
      if (!partialEl) {
        partialEl = document.createElement('div');
        partialEl.id = 'partialTranscript';
        partialEl.className = 'transcript-line partial';
        el.appendChild(partialEl);
      }
      partialEl.textContent = `${role}: ${text}`;
      el.scrollTop = el.scrollHeight;
      return;
    }

    const partialEl = $('partialTranscript');
    if (partialEl) partialEl.remove();

    const line = document.createElement('div');
    line.className = `transcript-line ${role.toLowerCase()}`;
    line.textContent = `${role}: ${text}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function safeSetOrb(mode) {
    if (typeof window.setOrb === 'function') {
      window.setOrb(mode);
    }
  }

  function setOrbAmplitude(value) {
    const orb = document.querySelector('.orb');
    if (!orb) return;
    const scale = 1 + Math.min(0.18, value * 0.35);
    const glow = 40 + Math.min(70, value * 120);
    orb.style.transform = `scale(${scale})`;
    orb.style.boxShadow = `0 0 ${glow}px rgba(61,183,255,0.95), 0 0 ${glow * 2}px rgba(61,183,255,0.32), inset 0 0 28px rgba(255,255,255,0.28)`;
  }

  async function setupMicAnalyser(stream) {
    cleanupAnalyserOnly();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      emitStatus('Mic connected. Audio waveform not supported in this browser.');
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    state.audioContext = audioContext;
    state.analyser = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      if (!state.active || !state.analyser) return;

      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / data.length);
      state.amplitude = rms;

      if (rms > 0.035) {
        state.lastUserSpeechAt = Date.now();
        safeSetOrb('listening');
      } else if (state.active && Date.now() - (state.lastUserSpeechAt || 0) > 1400) {
        safeSetOrb('idle');
      }

      setOrbAmplitude(rms);
      state.animationFrame = requestAnimationFrame(tick);
    }

    tick();
  }

  function cleanupAnalyserOnly() {
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;

    if (state.audioContext) {
      try { state.audioContext.close(); } catch (_) {}
    }
    state.audioContext = null;
    state.analyser = null;
    setOrbAmplitude(0);
  }

  async function requestMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support microphone capture.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    state.localStream = stream;
    await setupMicAnalyser(stream);
    return stream;
  }

  function extractClientSecret(sessionResponse) {
    const session = sessionResponse?.session || sessionResponse;
    return (
      session?.client_secret?.value ||
      session?.client_secret ||
      session?.secret?.value ||
      session?.ephemeral_key ||
      null
    );
  }

  async function createRealtimeSession() {
    const res = await fetch('/api/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user' }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.fallback || 'Realtime session could not be created.');
    }

    return data;
  }

  function handleRealtimeEvent(event) {
    let payload = null;
    try {
      payload = JSON.parse(event.data);
    } catch (_) {
      return;
    }

    const type = payload.type || '';

    if (type.includes('speech_started')) {
      safeSetOrb('listening');
      emitStatus('Listening…');
    }

    if (type.includes('speech_stopped')) {
      safeSetOrb('thinking');
      emitStatus('Thinking…');
    }

    if (type.includes('response.created')) {
      safeSetOrb('thinking');
      emitStatus('Buddy is preparing a response…');
    }

    if (type.includes('audio_transcript.delta') || type.includes('transcript.delta')) {
      const delta = payload.delta || payload.text || '';
      if (delta) appendTranscript('Buddy', delta, true);
      safeSetOrb('speaking');
    }

    if (type.includes('audio_transcript.done') || type.includes('transcript.done')) {
      const text = payload.transcript || payload.text || '';
      if (text) appendTranscript('Buddy', text, false);
      safeSetOrb('speaking');
      emitStatus('Buddy is speaking…');
    }

    if (type.includes('input_audio_buffer.committed')) {
      emitStatus('Voice captured. Buddy is thinking…');
      safeSetOrb('thinking');
    }

    if (type.includes('response.done')) {
      emitStatus('Voice session active. You can speak again.');
      setTimeout(() => safeSetOrb('idle'), 900);
    }

    if (type.includes('error')) {
      emitStatus(`Realtime event error: ${payload.error?.message || 'Unknown error'}`);
      safeSetOrb('idle');
    }
  }

  async function connectWebRTC(sessionResponse, stream) {
    const clientSecret = extractClientSecret(sessionResponse);
    if (!clientSecret) {
      throw new Error('Realtime session did not include a usable client secret. Check /api/realtime/session response format.');
    }

    const model = sessionResponse.model || 'gpt-4o-realtime-preview';
    const realtimeUrl = sessionResponse.realtimeUrl || `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

    const peer = new RTCPeerConnection();
    state.peer = peer;

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;
    remoteAudio.id = 'buddyRemoteAudio';
    document.body.appendChild(remoteAudio);
    state.remoteAudio = remoteAudio;

    peer.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
      safeSetOrb('speaking');
      emitStatus('Buddy audio connected.');
    };

    peer.onconnectionstatechange = () => {
      emitStatus(`Voice connection: ${peer.connectionState}`);
      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
        safeSetOrb('idle');
      }
    };

    const dataChannel = peer.createDataChannel('oai-events');
    state.dataChannel = dataChannel;

    dataChannel.onopen = () => {
      emitStatus('Realtime voice is live. Speak naturally.');
      safeSetOrb('listening');
      sendSessionUpdate();
    };

    dataChannel.onmessage = handleRealtimeEvent;
    dataChannel.onerror = () => emitStatus('Realtime data channel error.');
    dataChannel.onclose = () => emitStatus('Realtime voice data channel closed.');

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    const sdpResponse = await fetch(realtimeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!sdpResponse.ok) {
      const text = await sdpResponse.text();
      throw new Error(`Realtime SDP exchange failed: ${sdpResponse.status} ${text}`);
    }

    const answerSdp = await sdpResponse.text();
    await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  function sendSessionUpdate() {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') return;

    state.dataChannel.send(JSON.stringify({
      type: 'session.update',
      session: {
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
        instructions: 'You are Bible Buddy. Keep realtime voice responses warm, concise, non-pushy, Scripture-grounded when appropriate, and emotionally safe. Listen first. Ask one gentle follow-up at a time.',
      },
    }));
  }

  function interruptBuddy() {
    if (state.dataChannel && state.dataChannel.readyState === 'open') {
      state.dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
      emitStatus('Interrupted. Buddy is listening again.');
      safeSetOrb('listening');
    }
  }

  async function startVoiceSession() {
    if (state.active || state.connecting) return;
    state.connecting = true;
    emitStatus('Requesting microphone permission…');
    safeSetOrb('listening');

    try {
      const stream = await requestMic();
      emitStatus('Creating realtime session…');
      const session = await createRealtimeSession();
      emitStatus('Connecting WebRTC voice transport…');
      await connectWebRTC(session, stream);

      state.active = true;
      state.sessionStartedAt = Date.now();
      emitStatus('Voice session active. Speak naturally.');
      safeSetOrb('listening');
      appendTranscript('System', 'Voice session started. Mic is only active for this session.', false);
    } catch (error) {
      console.error('Voice session error:', error);
      emitStatus(error.message || 'Voice session failed.');
      appendTranscript('System', `Voice session could not start: ${error.message}`, false);
      stopVoiceSession();
    } finally {
      state.connecting = false;
    }
  }

  function stopVoiceSession() {
    state.active = false;
    state.connecting = false;

    if (state.dataChannel) {
      try { state.dataChannel.close(); } catch (_) {}
    }
    state.dataChannel = null;

    if (state.peer) {
      try { state.peer.close(); } catch (_) {}
    }
    state.peer = null;

    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => track.stop());
    }
    state.localStream = null;

    if (state.remoteAudio) {
      try { state.remoteAudio.remove(); } catch (_) {}
    }
    state.remoteAudio = null;

    cleanupAnalyserOnly();
    emitStatus('Voice session stopped. Mic is off.');
    safeSetOrb('idle');
  }

  function initRealtimeControls() {
    const start = $('startVoiceBtn');
    const stop = $('stopVoiceBtn');
    const interrupt = $('interruptVoiceBtn');

    if (start) start.addEventListener('click', startVoiceSession);
    if (stop) stop.addEventListener('click', stopVoiceSession);
    if (interrupt) interrupt.addEventListener('click', interruptBuddy);
  }

  window.BibleBuddyRealtime = {
    startVoiceSession,
    stopVoiceSession,
    interruptBuddy,
    state,
  };

  document.addEventListener('DOMContentLoaded', initRealtimeControls);
})();
