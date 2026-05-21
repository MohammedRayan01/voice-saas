import { WidgetUI } from './ui'

interface VoiceWidgetOptions {
  token: string
  apiEndpoint?: string
  workflowId?: string
  contextVariables?: Record<string, unknown>
}

interface EmbedConfig {
  buttonColor: string
  buttonText: string
  position: 'bottom-right' | 'bottom-left'
  theme: 'light' | 'dark'
}

class VoiceWidgetInstance {
  private opts: VoiceWidgetOptions
  private apiBase: string
  private ui: WidgetUI | null = null
  private pc: RTCPeerConnection | null = null
  private sessionToken: string | null = null
  private workflowRunId: number | null = null

  constructor(opts: VoiceWidgetOptions) {
    this.opts = opts
    this.apiBase = (opts.apiEndpoint || '').replace(/\/$/, '')
    this.init()
  }

  private async init() {
    try {
      const res = await fetch(`${this.apiBase}/api/v1/public/embed/config/${this.opts.token}`, {
        headers: { Origin: window.location.origin },
      })
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`)
      const config: EmbedConfig = await res.json()

      this.ui = new WidgetUI(
        {
          buttonColor: config.buttonColor,
          buttonText: config.buttonText,
          position: config.position,
          theme: config.theme,
        },
        () => this.startCall(),
        () => this.endCall()
      )
      this.ui.setState('idle')
    } catch (err) {
      console.error('[VoiceWidget] Init failed:', err)
    }
  }

  private async startCall() {
    if (!this.ui) return
    this.ui.setState('connecting', 'Starting...')

    try {
      // 1. Initialize embed session
      const initRes = await fetch(`${this.apiBase}/api/v1/public/embed/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
        body: JSON.stringify({
          token: this.opts.token,
          context_variables: this.opts.contextVariables || {},
        }),
      })
      if (!initRes.ok) throw new Error(`Session init failed: ${initRes.status}`)
      const session = await initRes.json()
      this.sessionToken = session.session_token
      this.workflowRunId = session.workflow_run_id

      // 2. Get TURN credentials
      const turnRes = await fetch(
        `${this.apiBase}/api/v1/public/embed/turn-credentials/${this.sessionToken}`,
        { headers: { Origin: window.location.origin } }
      )
      const iceServers = turnRes.ok ? (await turnRes.json()).ice_servers || [] : []

      // 3. Set up WebRTC
      this.pc = new RTCPeerConnection({ iceServers })
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => this.pc!.addTrack(t, stream))

      this.pc.ontrack = (e) => {
        const audio = document.createElement('audio')
        audio.autoplay = true
        audio.srcObject = e.streams[0]
        document.body.appendChild(audio)
      }

      this.pc.oniceconnectionstatechange = () => {
        if (this.pc?.iceConnectionState === 'connected') {
          this.ui?.setState('active', 'Connected')
        } else if (['failed', 'disconnected', 'closed'].includes(this.pc?.iceConnectionState || '')) {
          this.endCall()
        }
      }

      // 4. Signal via WebSocket
      const wsUrl = `${this.apiBase.replace(/^http/, 'ws')}/api/v1/webrtc/signaling/${this.workflowRunId}?token=${this.sessionToken}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = async () => {
        const offer = await this.pc!.createOffer()
        await this.pc!.setLocalDescription(offer)
        ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }))
      }

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'answer') {
          await this.pc!.setRemoteDescription(new RTCSessionDescription(msg))
        } else if (msg.type === 'ice-candidate' && msg.candidate) {
          await this.pc!.addIceCandidate(new RTCIceCandidate(msg.candidate))
        }
      }

      this.pc.onicecandidate = (e) => {
        if (e.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate }))
        }
      }

      this.ui.setState('connecting', 'Waiting for AI...')
    } catch (err) {
      console.error('[VoiceWidget] Call start failed:', err)
      this.ui.setState('error', String(err))
    }
  }

  private endCall() {
    this.pc?.close()
    this.pc = null
    this.sessionToken = null
    this.workflowRunId = null
    this.ui?.setState('idle')
  }

  destroy() {
    this.endCall()
    this.ui?.destroy()
  }
}

// Global API
const VoiceWidget = {
  init(opts: VoiceWidgetOptions): VoiceWidgetInstance {
    return new VoiceWidgetInstance(opts)
  },
}

// Auto-init from script tag data attributes
document.addEventListener('DOMContentLoaded', () => {
  const script = document.querySelector('script[data-vs-token]') as HTMLScriptElement | null
  if (script) {
    VoiceWidget.init({
      token: script.dataset.vsToken!,
      apiEndpoint: script.dataset.vsApi,
    })
  }
})

;(window as any).VoiceWidget = VoiceWidget
export default VoiceWidget
