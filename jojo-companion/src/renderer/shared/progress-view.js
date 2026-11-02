import { node } from './todo-view.js';
export class ProgressView {
  constructor(root) {
    this.root = root; root.classList.add('jojo-progress');
    this.label = node('span'); this.bar = node('div', 'jojo-xp-track'); this.fill = node('span', 'jojo-xp-fill'); this.bar.append(this.fill);
    this.feedback = node('span', 'jojo-xp-feedback'); this.feedback.setAttribute('role', 'status');
    root.append(this.label, this.bar, this.feedback); this.sequence = null; this.pending = []; this.showing = false;
  }
  next() {
    const event = this.pending.shift();
    if (!event) { this.showing = false; this.feedback.textContent = ''; this.root.classList.remove('xp-received', 'xp-level-up'); return; }
    this.showing = true;
    this.feedback.textContent = `+${event.amount} XP · ${event.label}${event.levelUp ? ` · Nível ${event.level}!` : ''}`;
    this.root.classList.remove('xp-received', 'xp-level-up'); void this.root.offsetWidth;
    this.root.classList.add(event.levelUp ? 'xp-level-up' : 'xp-received');
    this.timer = setTimeout(() => this.next(), 3000);
  }
  render(s, { quiet = false, animations = true } = {}) {
    if (!s) return;
    const width = s.xpPorNivel || 60;
    this.label.textContent = `Nível ${s.nivel} · ${s.xp} XP`;
    this.fill.style.width = `${s.percentXP ?? Math.min(100, (s.xp % width) / width * 100)}%`;
    this.root.classList.toggle('no-animation', !animations || quiet);
    const event = s.reward;
    if (quiet) {
      clearTimeout(this.timer); this.pending = []; this.showing = false; this.feedback.textContent = ''; this.root.classList.remove('xp-received', 'xp-level-up');
    } else if (this.sequence !== null && event?.sequence > this.sequence) {
      // Uma tarefa e uma descoberta podem premiar no mesmo quadro. Preservar ambas.
      const events = (s.rewardHistory?.length ? s.rewardHistory : [event]).filter(e => e.sequence > this.sequence).sort((a, b) => a.sequence - b.sequence);
      this.pending = [...this.pending, ...events].slice(-10);
      if (!this.showing) this.next();
    }
    this.sequence = Math.max(this.sequence ?? 0, event?.sequence || 0);
  }
}
