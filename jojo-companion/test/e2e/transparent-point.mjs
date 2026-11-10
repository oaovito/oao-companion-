// Candidatos em DIPs locais, afastados do pet e de toda a interface visível.
// O ensaio Windows ainda confere DOM/pixels e entrega o clique por user32.
export function transparentPointCandidates({ bounds, workArea, regions }, margin = 8) {
  const left = Math.ceil(Math.max(margin, workArea.x - bounds.x + margin));
  const top = Math.ceil(Math.max(margin, workArea.y - bounds.y + margin));
  const right = Math.floor(Math.min(bounds.width - margin, workArea.x + workArea.width - bounds.x - margin));
  const bottom = Math.floor(Math.min(bounds.height - margin, workArea.y + workArea.height - bounds.y - margin));
  const points = [];
  for (let y = top; y <= bottom; y += margin * 2) {
    for (let x = left; x <= right; x += margin * 2) {
      const blocked = regions.some((r) => r && x + margin >= r.x && x - margin <= r.x + r.width && y + margin >= r.y && y - margin <= r.y + r.height);
      if (!blocked) points.push({ x, y });
    }
  }
  return points;
}
