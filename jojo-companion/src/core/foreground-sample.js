// Respostas nativas só valem para a topologia/janelas atuais e a consulta mais nova.
export class ForegroundSample {
  constructor(now = () => Date.now()) { this.now = now; this.epoch = 0; this.sequence = 0; this.last = null; }
  invalidate() { this.epoch++; this.last = null; }
  begin() { return { epoch: this.epoch, sequence: ++this.sequence, startedAt: this.now() }; }
  accept(ticket, sample) {
    const age = this.now() - sample?.capturedAt;
    if (ticket.epoch !== this.epoch || ticket.sequence !== this.sequence || !Number.isFinite(age) || age < -250 || age > 2000 || sample.capturedAt < ticket.startedAt - 250) return false;
    this.last = sample; return true;
  }
}
