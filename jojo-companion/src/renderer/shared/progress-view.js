import { node } from './todo-view.js';
export class ProgressView {
  constructor(root) {
    this.root = root; root.classList.add('jojo-progress');
    this.label = node('span'); this.bar = node('div', 'jojo-xp-track'); this.fill = node('span', 'jojo-xp-fill'); this.bar.append(this.fill);
    this.feedback = node('span', 'jojo-xp-feedback'); this.feedback.setAttribute('role', 'status');
    root.append(this.label, this.bar, this.feedback); this.sequence = null;
  }
  render(s, { quiet = false, animations = true } = {}) {
    if (!s) return;
    const width = s.xpPorNivel || 60;
    this.label.textContent = `Nível ${s.nivel} · ${s.xp} XP`;
    this.fill.style.width = `${s.percentXP ?? Math.min(100, (s.xp % width) / width * 100)}%`;
    this.root.classList.toggle('no-animation', !animations);
    const event = s.reward;
    if (this.sequence !== null && event && event.sequence > this.sequence && !quiet) {
      this.feedback.textContent = `+${event.amount} XP · ${event.label}${event.levelUp ? ` · Nível ${event.level}!` : ''}`;
      this.root.classList.remove('xp-received', 'xp-level-up'); void this.root.offsetWidth;
      this.root.classList.add(event.levelUp ? 'xp-level-up' : 'xp-received');
      clearTimeout(this.timer); this.timer = setTimeout(() => { this.feedback.textContent = ''; this.root.classList.remove('xp-received', 'xp-level-up'); }, 6000);
    }
    this.sequence = event?.sequence || 0;
  }
}
