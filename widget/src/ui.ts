export type WidgetState = 'idle' | 'connecting' | 'active' | 'error'

export interface WidgetConfig {
  buttonColor: string
  buttonText: string
  position: 'bottom-right' | 'bottom-left'
  theme: 'light' | 'dark'
}

const DEFAULT_CONFIG: WidgetConfig = {
  buttonColor: '#3B82F6',
  buttonText: 'Talk to AI',
  position: 'bottom-right',
  theme: 'light',
}

export class WidgetUI {
  private container: HTMLDivElement
  private button: HTMLButtonElement
  private panel: HTMLDivElement
  private statusText: HTMLSpanElement
  private config: WidgetConfig
  private onStartCall: () => void
  private onEndCall: () => void

  constructor(
    config: Partial<WidgetConfig>,
    onStartCall: () => void,
    onEndCall: () => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.onStartCall = onStartCall
    this.onEndCall = onEndCall
    this.container = this.createContainer()
    this.button = this.createButton()
    this.panel = this.createPanel()
    this.statusText = this.panel.querySelector('.vs-status')!
    this.container.appendChild(this.panel)
    this.container.appendChild(this.button)
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'vs-widget'
    const side = this.config.position === 'bottom-right' ? 'right' : 'left'
    el.style.cssText = `
      position: fixed; bottom: 24px; ${side}: 24px;
      z-index: 999999; font-family: -apple-system, sans-serif;
      display: flex; flex-direction: column; align-items: ${side === 'right' ? 'flex-end' : 'flex-start'};
      gap: 12px;
    `
    return el
  }

  private createButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      <span>${this.config.buttonText}</span>
    `
    btn.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      background: ${this.config.buttonColor}; color: white;
      border: none; border-radius: 50px; padding: 12px 20px;
      font-size: 15px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      transition: transform 0.15s, box-shadow 0.15s;
    `
    btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)' }
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)' }
    btn.onclick = () => this.onStartCall()
    return btn
  }

  private createPanel(): HTMLDivElement {
    const isDark = this.config.theme === 'dark'
    const panel = document.createElement('div')
    panel.style.cssText = `
      display: none; flex-direction: column; align-items: center; gap: 16px;
      background: ${isDark ? '#1f2937' : '#ffffff'};
      color: ${isDark ? '#f9fafb' : '#111827'};
      border-radius: 16px; padding: 24px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.2);
      min-width: 220px; text-align: center;
    `
    panel.innerHTML = `
      <div class="vs-orb" style="
        width: 64px; height: 64px; border-radius: 50%;
        background: ${this.config.buttonColor};
        display: flex; align-items: center; justify-content: center;
        animation: vs-pulse 1.5s infinite;
      ">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        </svg>
      </div>
      <span class="vs-status" style="font-size: 14px; font-weight: 500;">Connecting...</span>
      <button class="vs-end-btn" style="
        background: #ef4444; color: white; border: none; border-radius: 50px;
        padding: 8px 20px; font-size: 14px; cursor: pointer; font-weight: 500;
      ">End Call</button>
    `
    const style = document.createElement('style')
    style.textContent = `@keyframes vs-pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.08)} }`
    document.head.appendChild(style)

    panel.querySelector('.vs-end-btn')!.addEventListener('click', () => this.onEndCall())
    return panel
  }

  setState(state: WidgetState, message?: string) {
    switch (state) {
      case 'idle':
        this.panel.style.display = 'none'
        this.button.style.display = 'flex'
        break
      case 'connecting':
        this.panel.style.display = 'flex'
        this.button.style.display = 'none'
        this.statusText.textContent = message || 'Connecting...'
        break
      case 'active':
        this.panel.style.display = 'flex'
        this.button.style.display = 'none'
        this.statusText.textContent = message || 'Call active'
        break
      case 'error':
        this.panel.style.display = 'none'
        this.button.style.display = 'flex'
        console.error('[VoiceWidget]', message)
        break
    }
  }

  destroy() {
    this.container.remove()
  }
}
