/**
 * Lynq Voice Widget
 * Embeddable voice call widget for Lynq workflows
 * Version: 1.0.0
 */

(function() {
  'use strict';

  // Widget configuration defaults
  const DEFAULT_CONFIG = {
    position: 'bottom-right',
    autoStart: false,
    apiBaseUrl: window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : ''
  };

  // Widget state
  const state = {
    config: {},
    isInitialized: false,
    isOpen: false,
    pc: null,
    ws: null,
    stream: null,
    sessionToken: null,
    workflowRunId: null,
    connectionStatus: 'idle', // idle, connecting, connected, failed
    audioElement: null,
    turnCredentials: null, // TURN server credentials
    callStartedAt: null, // Timestamp when call connected (for duration tracking)
    _pingInterval: null, // setInterval handle for data channel keepalives
    _idleTimeout: null,  // setTimeout handle for idle auto-end
    callbacks: {
      onReady: null,
      onCallStart: null,
      onCallConnected: null,
      onCallDisconnected: null,
      onCallEnd: null,
      onError: null,
      onStatusChange: null
    }
  };

  /**
   * Initialize the widget
   */
  async function init() {
    if (state.isInitialized) return;

    // Get token from script URL
    const script = document.currentScript || document.querySelector('script[src*="lynq-widget.js"]');
    if (!script) {
      console.error('Lynq Widget: Script not found');
      return;
    }

    // Extract parameters from URL
    const scriptUrl = new URL(script.src);
    const token = scriptUrl.searchParams.get('token');
    const apiEndpoint = scriptUrl.searchParams.get('apiEndpoint');
    const environment = scriptUrl.searchParams.get('environment');

    if (!token) {
      console.error('Lynq Widget: No token found in script URL');
      return;
    }

    // Determine API base URL
    let apiBaseUrl = DEFAULT_CONFIG.apiBaseUrl;
    if (apiEndpoint) {
      // Use the apiEndpoint from URL parameter if provided
      // Ensure it has a protocol
      if (!apiEndpoint.startsWith('http://') && !apiEndpoint.startsWith('https://')) {
        // Default to https for production endpoints
        apiBaseUrl = 'https://' + apiEndpoint.replace(/\/+$/, '');
      } else {
        apiBaseUrl = apiEndpoint.replace(/\/+$/, ''); // Remove trailing slashes
      }
    } else if (scriptUrl.origin.includes('localhost')) {
      apiBaseUrl = 'http://localhost:8000';
    } else {
      apiBaseUrl = scriptUrl.origin.replace(/:\d+$/, ':8000');
    }

    // Store base configuration
    state.config = {
      ...DEFAULT_CONFIG,
      token: token,
      apiBaseUrl: apiBaseUrl,
      environment: environment || 'production',
      // Allow data attributes to override fetched config
      contextVariables: parseContextVariables(script.getAttribute('data-lynq-context'))
    };

    try {
      // Fetch configuration from API
      const configResponse = await fetch(`${state.config.apiBaseUrl}/api/v1/public/embed/config/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (!configResponse.ok) {
        throw new Error(`Failed to fetch config: ${configResponse.status}`);
      }

      const configData = await configResponse.json();

      // Merge fetched configuration with defaults
      state.config = {
        ...state.config,
        workflowId: configData.workflow_id,
        embedMode: configData.settings?.embedMode || 'floating',
        containerId: configData.settings?.containerId || 'lynq-inline-container',
        position: configData.position || DEFAULT_CONFIG.position,
        buttonColor: configData.settings?.buttonColor || '#10b981',
        buttonText: configData.settings?.buttonText || 'Talk to Agent',
        callToActionText: configData.settings?.callToActionText || 'Click to start voice conversation',
        autoStart: configData.auto_start || false
      };
    } catch (error) {
      console.error('Lynq Widget: Failed to fetch configuration', error);
      return;
    }

    state.isInitialized = true;

    // Create widget UI based on mode
    if (state.config.embedMode === 'inline') {
      injectStyles();
      createInlineWidget();
    } else if (state.config.embedMode === 'headless') {
      createHeadlessWidget();
    } else {
      injectStyles();
      createFloatingWidget();
    }

    // Trigger ready callback
    if (state.callbacks.onReady) {
      state.callbacks.onReady();
    }

    // Auto-start if configured
    if (state.config.autoStart) {
      setTimeout(() => startCall(), 1000);
    }
  }

  /**
   * Parse context variables from JSON string
   */
  function parseContextVariables(contextStr) {
    if (!contextStr) return {};
    try {
      return JSON.parse(contextStr);
    } catch (e) {
      console.warn('Lynq Widget: Invalid context variables', e);
      return {};
    }
  }

  /**
   * Inject widget styles
   */
  function injectStyles() {
    if (document.getElementById('lynq-widget-styles')) return;

    const styles = `
      .lynq-widget-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      .lynq-widget-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .lynq-widget-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .lynq-widget-container.top-right {
        top: 20px;
        right: 20px;
      }

      .lynq-widget-container.top-left {
        top: 20px;
        left: 20px;
      }

      .lynq-widget-cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 9999px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        max-width: calc(100vw - 40px);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        transition: filter 150ms ease, transform 100ms ease, box-shadow 200ms ease;
        animation: lynq-cta-in 220ms ease-out;
      }

      .lynq-widget-cta:hover {
        filter: brightness(1.08);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      }
      .lynq-widget-cta:active { transform: scale(0.98); }

      .lynq-widget-cta.lynq-state-connecting { background: #f59e0b !important; animation: lynq-pulse 1.6s infinite; }
      .lynq-widget-cta.lynq-state-connected  { background: #ef4444 !important; }
      .lynq-widget-cta.lynq-state-failed     { background: #ef4444 !important; opacity: 0.85; }

      @keyframes lynq-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      @keyframes lynq-cta-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'lynq-widget-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  function ctaLabelForStatus(status) {
    switch (status) {
      case 'connecting': return 'Connecting…';
      case 'connected':  return 'End Call';
      case 'failed':     return 'Retry';
      default:           return state.config.buttonText || 'Talk to Agent';
    }
  }

  /**
   * Create floating widget UI — a single CTA pill button anchored to the
   * configured corner of the viewport.
   */
  function createFloatingWidget() {
    const container = document.createElement('div');
    container.className = `lynq-widget-container ${state.config.position}`;
    container.id = 'lynq-widget-root';

    const audio = document.createElement('audio');
    audio.id = 'lynq-widget-audio';
    audio.autoplay = true;
    audio.style.display = 'none';
    container.appendChild(audio);
    state.audioElement = audio;

    document.body.appendChild(container);
    renderFloating();
  }

  /**
   * Render the floating CTA pill. Re-renders preserve the hidden audio
   * element so an in-progress call is not interrupted on status changes.
   */
  function renderFloating() {
    const container = document.getElementById('lynq-widget-root');
    if (!container) return;

    Array.from(container.children).forEach((child) => {
      if (child !== state.audioElement) container.removeChild(child);
    });

    const status = state.connectionStatus || 'idle';

    const button = document.createElement('button');
    button.id = 'lynq-widget-cta';
    button.type = 'button';
    button.className = `lynq-widget-cta lynq-state-${status}`;
    // Idle uses configured color; status states use CSS-defined colors.
    if (status === 'idle') {
      button.style.backgroundColor = state.config.buttonColor;
    }
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      <span></span>
    `;
    button.querySelector('span').textContent = ctaLabelForStatus(status);
    button.onclick = toggleCall;

    container.appendChild(button);
  }

  /**
   * Create headless widget (no UI — host page drives everything via window.LynqWidget API)
   */
  function createHeadlessWidget() {
    const audio = document.createElement('audio');
    audio.id = 'lynq-widget-audio';
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    state.audioElement = audio;
  }

  /**
   * Toggle call (start or stop based on current state)
   */
  function toggleCall() {
    if (state.connectionStatus === 'idle' || state.connectionStatus === 'failed') {
      startCall();
    } else {
      stopCall();
    }
  }

  function updateFloatingButton(status) {
    state.connectionStatus = status;
    renderFloating();
  }

  /**
   * Create inline widget UI
   */
  function createInlineWidget() {
    // Find container element
    const container = document.getElementById(state.config.containerId);
    if (!container) {
      console.error(`Lynq Widget: Container element with id "${state.config.containerId}" not found`);
      if (state.callbacks.onError) {
        state.callbacks.onError(new Error('Container element not found'));
      }
      return;
    }

    // Clear container
    container.innerHTML = '';
    container.className = 'lynq-inline-container';

    // Add minimal inline styles
    const inlineStyles = `
      .lynq-inline-container {
        min-height: 200px;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .lynq-inline-status {
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .lynq-inline-status-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 20px;
      }

      .lynq-inline-status-text {
        font-size: 18px;
        font-weight: 500;
        margin: 0 0 8px;
        color: #111827;
      }

      .lynq-inline-status-subtext {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 20px;
      }

      .lynq-inline-button-container {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 20px;
      }

      .lynq-inline-btn {
        padding: 12px 32px;
        border-radius: 8px;
        border: none;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .lynq-inline-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .lynq-inline-btn:active {
        transform: translateY(0);
      }

      .lynq-inline-btn-start {
        background: #10b981;
      }

      .lynq-inline-btn-start:hover {
        background: #059669;
      }

      .lynq-inline-btn-end {
        background: #ef4444;
      }

      .lynq-inline-btn-end:hover {
        background: #dc2626;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .lynq-inline-pulse {
        animation: pulse 2s infinite;
      }
    `;

    // Add inline styles if not already added
    if (!document.getElementById('lynq-inline-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'lynq-inline-styles';
      styleSheet.textContent = inlineStyles;
      document.head.appendChild(styleSheet);
    }

    // Create initial status display
    updateInlineStatus('idle');

    // Store audio element (hidden)
    state.audioElement = document.createElement('audio');
    state.audioElement.autoplay = true;
    state.audioElement.style.display = 'none';
    container.appendChild(state.audioElement);

    // Mark widget as open (for inline mode, it's always "open")
    state.isOpen = true;
  }

  /**
   * Update inline widget status
   */
  function updateInlineStatus(status, text, subtext) {
    const container = document.getElementById(state.config.containerId);
    if (!container) return;

    // Update state
    state.connectionStatus = status;

    // Determine display text
    const displayText = text || {
      idle: 'Ready to Connect',
      connecting: 'Connecting...',
      connected: 'Call Active',
      failed: 'Connection Failed'
    }[status];

    const displaySubtext = subtext || {
      idle: state.config.callToActionText,
      connecting: 'Please wait while we establish connection',
      connected: 'You can speak now',
      failed: 'Please check your microphone and try again'
    }[status];

    // Simple button design: green to start, red to end
    let buttonHTML = '';
    if (status === 'idle' || status === 'failed') {
      // Button to start with configured color
      buttonHTML = `
        <button class="lynq-inline-btn lynq-inline-btn-start" id="lynq-inline-start-btn" style="background: ${state.config.buttonColor};">
          ${status === 'failed' ? 'Retry' : state.config.buttonText}
        </button>
      `;
    } else if (status === 'connecting' || status === 'connected') {
      // Red button to end
      buttonHTML = `
        <button class="lynq-inline-btn lynq-inline-btn-end" id="lynq-inline-end-btn">
          End Call
        </button>
      `;
    }

    // Update container content (preserve audio element)
    const audioElement = state.audioElement;
    container.innerHTML = `
      <div class="lynq-inline-status">
        <div class="lynq-inline-status-icon ${status === 'connecting' ? 'lynq-inline-pulse' : ''}">
          ${getStatusIcon(status)}
        </div>
        <p class="lynq-inline-status-text">${displayText}</p>
        <p class="lynq-inline-status-subtext">${displaySubtext}</p>
        <div class="lynq-inline-button-container">
          ${buttonHTML}
        </div>
      </div>
    `;

    // Re-append audio element
    if (audioElement) {
      container.appendChild(audioElement);
    }

    // Attach event handlers
    const startBtn = document.getElementById('lynq-inline-start-btn');
    if (startBtn) startBtn.onclick = startCall;

    const endBtn = document.getElementById('lynq-inline-end-btn');
    if (endBtn) endBtn.onclick = stopCall;

    // Trigger status change callback
    if (state.callbacks.onStatusChange) {
      state.callbacks.onStatusChange(status, displayText, displaySubtext);
    }
  }

  /**
   * Get status icon SVG
   */
  function getStatusIcon(status) {
    const icons = {
      idle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>`,
      connecting: `<svg class="lynq-widget-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4"/>
        <path d="M12 18v4"/>
        <path d="M4.93 4.93l2.83 2.83"/>
        <path d="M16.24 16.24l2.83 2.83"/>
        <path d="M2 12h4"/>
        <path d="M18 12h4"/>
        <path d="M4.93 19.07l2.83-2.83"/>
        <path d="M16.24 7.76l2.83-2.83"/>
      </svg>`,
      connected: `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
        <path d="M15 7a2 2 0 0 1 2 2"/>
        <path d="M15 3a6 6 0 0 1 6 6"/>
      </svg>`,
      failed: `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`
    };
    return icons[status] || icons.idle;
  }

  /**
   * Update widget status
   */
  function updateStatus(status, text, subtext) {
    state.connectionStatus = status;

    // Use appropriate update function based on mode
    if (state.config.embedMode === 'inline') {
      updateInlineStatus(status, text, subtext);
    } else if (state.config.embedMode === 'headless') {
      if (state.callbacks.onStatusChange) {
        state.callbacks.onStatusChange(status, text, subtext);
      }
    } else {
      updateFloatingButton(status);
    }
  }

  /**
   * Open widget (deprecated - kept for backwards compatibility)
   */
  function openWidget() {
    // No-op since we removed the modal
  }

  /**
   * Close widget (deprecated - kept for backwards compatibility)
   */
  function closeWidget() {
    // Stop call if active
    if (state.connectionStatus === 'connected' || state.connectionStatus === 'connecting') {
      stopCall();
    }
  }

  /**
   * Start voice call
   */
  async function startCall() {
    updateStatus('connecting', 'Connecting...', 'Please wait while we establish the connection');

    if (state.callbacks.onCallStart) {
      state.callbacks.onCallStart();
    }

    try {
      // Initialize session if using embed token
      if (state.config.token) {
        await initializeEmbedSession();
      } else {
        // Direct mode with workflow and run IDs
        state.sessionToken = 'direct-mode';
        state.workflowRunId = state.config.runId;
      }

      // Request microphone permission with explicit constraints.
      // echoCancellation: removes AI audio echo from the mic signal so
      //   Gemini doesn't mistake its own voice for user speech (interruptions).
      // noiseSuppression: reduces background noise for cleaner VAD detection.
      // autoGainControl: keep false — AGC can cause volume pumping that
      //   confuses Gemini's VAD and makes it think the user is always speaking.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: 16000,
          }
        });
        state.stream = stream;
      } catch (micError) {
        // Handle specific microphone permission errors
        let errorMessage = 'Please check your microphone and try again';

        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access to start the call.';
        } else if (micError.name === 'NotFoundError' || micError.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (micError.name === 'NotReadableError' || micError.name === 'TrackStartError') {
          errorMessage = 'Microphone is already in use by another application.';
        }

        throw new Error(errorMessage);
      }

      // Create WebRTC connection
      await createWebRTCConnection();

      // Connect WebSocket
      await connectWebSocket();

      // Start negotiation
      await negotiate();

    } catch (error) {
      console.error('Lynq Widget: Failed to start call', error);
      updateStatus('failed', 'Connection failed', error.message || 'Please check your microphone and try again');

      // Trigger error callback
      if (state.callbacks.onError) {
        state.callbacks.onError(error);
      }
    }
  }

  /**
   * Initialize embed session
   */
  async function initializeEmbedSession() {
    const response = await fetch(`${state.config.apiBaseUrl}/api/v1/public/embed/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({
        token: state.config.token,
        context_variables: state.config.contextVariables
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initialize session');
    }

    const data = await response.json();
    state.sessionToken = data.session_token;
    state.workflowRunId = data.workflow_run_id;
    state.workflowId = data.config.workflow_id;

    // Fetch TURN credentials after session initialization
    await fetchTurnCredentials();
  }

  /**
   * Fetch TURN credentials for WebRTC connection
   */
  async function fetchTurnCredentials() {
    if (!state.sessionToken) {
      console.warn('Lynq Widget: No session token available for TURN credentials');
      return;
    }

    try {
      const response = await fetch(`${state.config.apiBaseUrl}/api/v1/public/embed/turn-credentials/${state.sessionToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });

      if (response.ok) {
        state.turnCredentials = await response.json();
        console.log(`TURN credentials obtained, TTL: ${state.turnCredentials.ttl}s`);
      } else if (response.status === 503) {
        // TURN not configured on server - this is OK, we'll use STUN only
        console.log('TURN server not configured, using STUN only');
      } else {
        console.warn(`Failed to fetch TURN credentials: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to fetch TURN credentials, continuing without TURN:', error);
    }
  }

  /**
   * Create WebRTC peer connection
   */
  function createWebRTCConnection() {
    // Build ICE servers list
    const iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];

    // Add TURN server if credentials are available
    if (state.turnCredentials && state.turnCredentials.uris && state.turnCredentials.uris.length > 0) {
      iceServers.push({
        urls: state.turnCredentials.uris,
        username: state.turnCredentials.username,
        credential: state.turnCredentials.password
      });
      console.log(`TURN server configured with ${state.turnCredentials.uris.length} URIs`);
    }

    const config = {
      iceServers: iceServers
    };

    state.pc = new RTCPeerConnection(config);

    // Create a data channel so Pipecat's keepalive mechanism works.
    // Without this, the server logs "Data channel not established within 10s"
    // and its is_connected() check falls back to connectionState only.
    // With this, ping messages keep _last_received_time fresh.
    const dataChannel = state.pc.createDataChannel('pipecat-audio');
    dataChannel.onopen = () => {
      console.log('Pipecat data channel open');
      // Send periodic pings so the server knows the connection is alive
      state._pingInterval = setInterval(() => {
        if (dataChannel.readyState === 'open') {
          dataChannel.send('ping');
        }
      }, 5000);
    };
    dataChannel.onclose = () => {
      if (state._pingInterval) {
        clearInterval(state._pingInterval);
        state._pingInterval = null;
      }
    };

    // Add audio track
    if (state.stream) {
      state.stream.getTracks().forEach(track => {
        state.pc.addTrack(track, state.stream);
      });
    }

    // Handle incoming audio
    state.pc.ontrack = (event) => {
      if (event.track.kind === 'audio' && state.audioElement) {
        state.audioElement.srcObject = event.streams[0];
        // Explicitly call play() — setting srcObject alone may not trigger
        // autoplay in all browsers when the audio element was created before
        // the user gesture that started the call.
        state.audioElement.play().catch(err => {
          console.warn('Lynq Widget: audio play() failed:', err);
        });
        console.log('Lynq audio attached');

        // Reset idle timeout whenever audio is actively playing.
        state.audioElement.addEventListener('timeupdate', () => {
          if (state.connectionStatus === 'connected') resetIdleTimeout();
        });
      }
    };

    // Monitor connection state
    state.pc.oniceconnectionstatechange = () => {
      if (!state.pc) return;
      console.log('ICE connection state:', state.pc.iceConnectionState);

      if (state.pc.iceConnectionState === 'connected' || state.pc.iceConnectionState === 'completed') {
        const wasAlreadyConnected = state.callStartedAt !== null;
        updateStatus('connected', 'Connected', 'Your voice call is now active');
        if (!wasAlreadyConnected) {
          state.callStartedAt = Date.now();
          if (state.callbacks.onCallConnected) {
            state.callbacks.onCallConnected({
              agentId: state.config.workflowId || null,
              token: state.config.token || null,
              workflowRunId: state.workflowRunId || null
            });
          }
          // Start idle timeout — auto-end if no audio activity for 90 seconds.
          // The server will usually send call-ended first; this is a fallback.
          resetIdleTimeout();
        }
        // Re-trigger play() now that ICE is up and audio data can flow.
        // ontrack may have called play() while ICE was still in 'checking',
        // before any RTP packets could arrive, causing some browsers to stall.
        if (state.audioElement && state.audioElement.srcObject) {
          state.audioElement.play().catch(() => {});
        }
      } else if (state.pc.iceConnectionState === 'failed' || state.pc.iceConnectionState === 'closed') {
        // 'failed' is unrecoverable. 'closed' means the remote peer shut down the session.
        updateStatus('failed', 'Connection lost', 'The call has been disconnected');
        stopCall();
      }
      // 'disconnected' is transient; ICE will attempt to reconnect automatically.
      // Do NOT call stopCall() here — the browser recovers to 'connected' or 'failed'.
    };

    // Also watch the overall connection state — catches 'closed' from remote hangup
    // even when ICE doesn't go through 'failed' first.
    state.pc.onconnectionstatechange = () => {
      if (!state.pc) return;
      const cs = state.pc.connectionState;
      if ((cs === 'failed' || cs === 'closed') && state.connectionStatus === 'connected') {
        console.log('RTCPeerConnection state:', cs, '— ending call');
        stopCall();
      }
    };

    // Handle ICE candidates for trickling
    state.pc.onicecandidate = (event) => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'ice-candidate',
          payload: {
            candidate: event.candidate ? {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex
            } : null,
            pc_id: state.pcId
          }
        };
        state.ws.send(JSON.stringify(message));
      }
    };
  }

  /**
   * Connect WebSocket for signaling
   */
  async function connectWebSocket() {
    return new Promise((resolve, reject) => {
      // Use public signaling endpoint for embed tokens
      const wsUrl = `${state.config.apiBaseUrl.replace('http', 'ws')}/api/v1/ws/public/signaling/${state.sessionToken}`;

      state.ws = new WebSocket(wsUrl);
      state.pcId = generatePeerId();

      state.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      state.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      state.ws.onclose = () => {
        console.log('WebSocket closed');
        if (state.connectionStatus === 'connected') {
          updateStatus('failed', 'Connection lost', 'The call has been disconnected');
        }
      };

      state.ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          await handleWebSocketMessage(message);
        } catch (e) {
          console.error('Failed to handle WebSocket message:', e);
        }
      };
    });
  }

  /**
   * Handle WebSocket messages
   */
  async function handleWebSocketMessage(message) {
    switch (message.type) {
      case 'answer':
        const answer = message.payload;
        console.log('Received answer from server');

        await state.pc.setRemoteDescription({
          type: 'answer',
          sdp: answer.sdp
        });
        break;

      case 'ice-candidate':
        const candidate = message.payload.candidate;
        if (candidate) {
          try {
            await state.pc.addIceCandidate({
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex
            });
            console.log('Added remote ICE candidate');
          } catch (e) {
            console.error('Failed to add ICE candidate:', e);
          }
        }
        break;

      case 'call-ended':
        // Server pipeline finished (workflow reached endCall node, idle timeout, etc.)
        console.log('Server ended call:', message.reason || 'pipeline_finished');
        stopCall();
        break;

      case 'error':
        console.error('Server error:', message.payload);
        updateStatus('failed', 'Server error', message.payload.message || 'An error occurred');
        break;

      default:
        // Silently ignore unknown real-time feedback messages (latency, node transitions, etc.)
        break;
    }
  }

  /**
   * Negotiate WebRTC connection
   */
  async function negotiate() {
    const offer = await state.pc.createOffer();
    await state.pc.setLocalDescription(offer);

    const message = {
      type: 'offer',
      payload: {
        sdp: offer.sdp,
        type: 'offer',
        pc_id: state.pcId,
        workflow_id: parseInt(state.config.workflowId),
        workflow_run_id: parseInt(state.workflowRunId),
        call_context_vars: state.config.contextVariables || {}
      }
    };

    state.ws.send(JSON.stringify(message));
    console.log('Sent offer via WebSocket');
  }

  /**
   * Reset (or start) the 90-second idle timeout.
   * Called when the call first connects and whenever audio activity is detected.
   */
  function resetIdleTimeout() {
    if (state._idleTimeout) clearTimeout(state._idleTimeout);
    // 90 seconds of silence → auto-end. Server usually sends call-ended first.
    state._idleTimeout = setTimeout(() => {
      if (state.connectionStatus === 'connected') {
        console.log('Lynq Widget: idle timeout — ending call automatically');
        stopCall();
      }
    }, 90000);
  }

  /**
   * Stop voice call
   */
  function stopCall() {
    // Fire onCallDisconnected only if the call had actually connected, with
    // identifiers and duration. Must run before we clear callStartedAt.
    if (state.callStartedAt && state.callbacks.onCallDisconnected) {
      const durationSeconds = Math.round((Date.now() - state.callStartedAt) / 1000);
      state.callbacks.onCallDisconnected({
        agentId: state.config.workflowId || null,
        token: state.config.token || null,
        workflowRunId: state.workflowRunId || null,
        durationSeconds
      });
    }
    state.callStartedAt = null;

    updateStatus('idle', 'Call ended', 'Click below to start a new call');

    if (state.callbacks.onCallEnd) {
      state.callbacks.onCallEnd();
    }

    // Clear data channel ping interval
    if (state._pingInterval) {
      clearInterval(state._pingInterval);
      state._pingInterval = null;
    }

    // Clear idle timeout
    if (state._idleTimeout) {
      clearTimeout(state._idleTimeout);
      state._idleTimeout = null;
    }

    // Close WebSocket
    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }

    // Stop media tracks
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      state.stream = null;
    }

    // Close peer connection
    if (state.pc) {
      state.pc.close();
      state.pc = null;
    }

    // Clear audio
    if (state.audioElement) {
      state.audioElement.srcObject = null;
    }
  }

  /**
   * Retry connection
   */
  function retryCall() {
    updateStatus('idle', 'Ready to start', 'Click below to begin your voice call');
    setTimeout(() => startCall(), 500);
  }

  /**
   * Generate unique peer ID
   */
  function generatePeerId() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return 'PC-' + Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Public API
  window.LynqWidget = {
    // Core methods
    init: init,
    start: startCall,
    stop: stopCall,
    end: stopCall, // Alias for stop
    retry: retryCall,

    // Floating widget specific
    open: openWidget,
    close: closeWidget,

    // State and callbacks
    getState: () => state,
    onReady: (callback) => { state.callbacks.onReady = callback; },
    onCallStart: (callback) => { state.callbacks.onCallStart = callback; },
    onCallConnected: (callback) => { state.callbacks.onCallConnected = callback; },
    onCallDisconnected: (callback) => { state.callbacks.onCallDisconnected = callback; },
    onCallEnd: (callback) => { state.callbacks.onCallEnd = callback; },
    onError: (callback) => { state.callbacks.onError = callback; },
    onStatusChange: (callback) => { state.callbacks.onStatusChange = callback; },

    // Check if inline mode
    isInlineMode: () => state.config.embedMode === 'inline',

    // Re-render the inline widget (useful when React component remounts)
    refresh: () => {
      if (state.config.embedMode === 'inline') {
        // Re-render inline widget with current status
        updateInlineStatus(state.connectionStatus);
      }
    },

    // Initialize inline mode manually (for advanced use cases)
    initInline: (options) => {
      if (options.container) {
        state.config.containerId = options.container.id || 'lynq-inline-container';
      }
      state.config.embedMode = 'inline';

      // Set callbacks if provided
      if (options.onReady) state.callbacks.onReady = options.onReady;
      if (options.onCallStart) state.callbacks.onCallStart = options.onCallStart;
      if (options.onCallConnected) state.callbacks.onCallConnected = options.onCallConnected;
      if (options.onCallDisconnected) state.callbacks.onCallDisconnected = options.onCallDisconnected;
      if (options.onCallEnd) state.callbacks.onCallEnd = options.onCallEnd;
      if (options.onError) state.callbacks.onError = options.onError;
      if (options.onStatusChange) state.callbacks.onStatusChange = options.onStatusChange;

      // Initialize
      if (!state.isInitialized) {
        init();
      }
    }
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
