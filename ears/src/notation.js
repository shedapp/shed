/* ============================================================
   EARS — Notation (SVG): rhythm engraver on a single-line staff, piano keyboard.
   Ticks: 480 per whole note. Event: {nv, dots, rest, tie, tup:{n,of}, d}
   ============================================================ */
(function (E) {
  const LINE_Y = 44, STEM = 30, HEAD_RX = 5.6, HEAD_RY = 3.9;
  const ticksDur = ev => ev.d;
  function slotWidth(d) { return 14 + 26 * Math.sqrt(d / 120); }

  function restGlyph(x, y, nv, col) {
    if (nv >= 480) return `<rect x="${x - 5}" y="${y}" width="10" height="4" fill="${col}"/>`;
    if (nv >= 240) return `<rect x="${x - 5}" y="${y - 4}" width="10" height="4" fill="${col}"/>`;
    if (nv >= 120) return `<path d="M${x - 3},${y - 13} l5.5,6.5 l-5.5,6 l5.5,6.5 c-4.5,-2.5 -7.5,0 -4,4.5" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (nv >= 60) return `<circle cx="${x - 2.5}" cy="${y - 6}" r="2.2" fill="${col}"/><path d="M${x - 2.5},${y - 6} q3,2 5.5,-1 L${x - 1},${y + 8}" fill="none" stroke="${col}" stroke-width="1.6"/>`;
    return `<circle cx="${x - 2.5}" cy="${y - 9}" r="2" fill="${col}"/><circle cx="${x - 4}" cy="${y - 3}" r="2" fill="${col}"/><path d="M${x - 2.5},${y - 9} q3,2 5.5,-1 L${x - 1},${y + 9} M${x - 4},${y - 3} q3,2 5,-1" fill="none" stroke="${col}" stroke-width="1.5"/>`;
  }
  function flagPath(sx, sy, k, col) {
    let s = '';
    for (let i = 0; i < k; i++) {
      const y = sy + i * 6.5;
      s += `<path d="M${sx},${y} c1,5 7,7 6.5,16 c1.5,-7 -2,-10 -6.5,-11.5 z" fill="${col}"/>`;
    }
    return s;
  }

  /* pattern: {measures:[{meter:{num,den,groups:[ticks]}, events:[ev]}]} */
  function rhythmSVG(pattern, opts) {
    opts = opts || {};
    const col = opts.color || 'currentColor', dim = opts.dim || 'rgba(128,128,128,0.75)';
    const hl = opts.highlightGroup; // {measure, group} to highlight
    let x = 10; const parts = []; const beamParts = []; const over = [];
    let prevMeter = null; const positions = []; // for ties
    const beatMarks = [];
    pattern.measures.forEach((meas, mi) => {
      const meter = meas.meter;
      const showTS = mi === 0 || !prevMeter || prevMeter.num !== meter.num || prevMeter.den !== meter.den;
      if (showTS) {
        parts.push(`<text x="${x + 8}" y="${LINE_Y - 4}" font-size="17" font-weight="700" text-anchor="middle" fill="${col}" font-family="Georgia,serif">${meter.num}</text><text x="${x + 8}" y="${LINE_Y + 15}" font-size="17" font-weight="700" text-anchor="middle" fill="${col}" font-family="Georgia,serif">${meter.den}</text>`);
        x += 22;
      }
      prevMeter = meter;
      const mStart = x;
      // beat group boundaries
      const bounds = []; let acc = 0; meter.groups.forEach(g => { bounds.push(acc); acc += g; });
      let tick = 0; const evs = meas.events; const evInfo = [];
      evs.forEach((ev, ei) => {
        const gi = (() => { let g = 0; for (let i = 0; i < bounds.length; i++) if (tick >= bounds[i]) g = i; return g; })();
        const isGroupStart = bounds.includes(tick);
        const w = slotWidth(ev.d);
        const nx = x + 9;
        if (isGroupStart) beatMarks.push({ x: nx, n: gi + 1, mi, gi });
        const hlOn = hl && hl.measure === mi && hl.group === gi;
        if (hlOn) parts.push(`<rect x="${x + 1}" y="${LINE_Y - 42}" width="${w - 2}" height="78" rx="6" fill="rgba(255,180,60,0.18)"/>`);
        evInfo.push({ ev, x: nx, gi, tick, w, ei });
        tick += ev.d; x += w;
      });
      // draw events
      evInfo.forEach(info => {
        const { ev, x: nx } = info;
        if (ev.rest) { parts.push(restGlyph(nx, LINE_Y, ev.nv, col)); }
        else {
          const filled = ev.nv <= 120;
          parts.push(`<ellipse cx="${nx}" cy="${LINE_Y}" rx="${HEAD_RX}" ry="${HEAD_RY}" transform="rotate(-22 ${nx} ${LINE_Y})" fill="${filled ? col : 'none'}" stroke="${col}" stroke-width="${filled ? 1 : 1.9}"/>`);
          if (ev.nv <= 240) parts.push(`<line x1="${nx + 5}" y1="${LINE_Y - 1}" x2="${nx + 5}" y2="${LINE_Y - STEM}" stroke="${col}" stroke-width="1.5"/>`);
        }
        for (let k = 0; k < (ev.dots || 0); k++) parts.push(`<circle cx="${nx + 10 + k * 5}" cy="${LINE_Y - 4}" r="1.9" fill="${col}"/>`);
        positions.push({ x: nx, ev, mi });
      });
      // beams
      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          const x1 = run[0].x + 5, x2 = run[run.length - 1].x + 5, y = LINE_Y - STEM;
          beamParts.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="4"/>`);
          // secondary beams (16ths)
          for (let i = 0; i < run.length; i++) {
            const a = run[i]; if (a.ev.nv > 30) continue;
            const nxt = run[i + 1], prv = run[i - 1];
            if (nxt && nxt.ev.nv <= 30) { beamParts.push(`<line x1="${a.x + 5}" y1="${y + 6.5}" x2="${nxt.x + 5}" y2="${y + 6.5}" stroke="${col}" stroke-width="3.6"/>`); }
            else if (!(prv && prv.ev.nv <= 30)) {
              const dir = (i === 0) ? 1 : -1;
              beamParts.push(`<line x1="${a.x + 5}" y1="${y + 6.5}" x2="${a.x + 5 + dir * 8}" y2="${y + 6.5}" stroke="${col}" stroke-width="3.6"/>`);
            }
          }
        } else if (run.length === 1) {
          const a = run[0]; const k = a.ev.nv <= 15 ? 3 : a.ev.nv <= 30 ? 2 : 1;
          parts.push(flagPath(a.x + 5, LINE_Y - STEM, k, col));
        }
        run = [];
      };
      let curG = -1;
      evInfo.forEach(info => {
        const beamable = !info.ev.rest && info.ev.nv <= 60;
        if (info.gi !== curG) { flush(); curG = info.gi; }
        if (beamable) run.push(info); else flush();
      });
      flush();
      // tuplet brackets
      let ti = 0;
      while (ti < evInfo.length) {
        if (evInfo[ti].ev.tup) {
          let tj = ti; while (tj + 1 < evInfo.length && evInfo[tj + 1].ev.tup && evInfo[tj + 1].ev.tupId === evInfo[ti].ev.tupId) tj++;
          const x1 = evInfo[ti].x - 2, x2 = evInfo[tj].x + 12, y = LINE_Y - STEM - 9;
          over.push(`<path d="M${x1},${y + 5} V${y} H${x2} V${y + 5}" fill="none" stroke="${col}" stroke-width="1.3"/><rect x="${(x1 + x2) / 2 - 7}" y="${y - 7}" width="14" height="12" fill="${opts.bg || 'var(--card, #16181d)'}"/><text x="${(x1 + x2) / 2}" y="${y + 3}" font-size="11" font-style="italic" font-weight="700" text-anchor="middle" fill="${col}">${evInfo[ti].ev.tup.n}</text>`);
          ti = tj + 1;
        } else ti++;
      }
      // barline
      x += 6;
      const last = mi === pattern.measures.length - 1;
      parts.push(`<line x1="${x}" y1="${LINE_Y - 15}" x2="${x}" y2="${LINE_Y + 15}" stroke="${col}" stroke-width="${last ? 1.4 : 1.2}"/>`);
      if (last) parts.push(`<line x1="${x + 4}" y1="${LINE_Y - 15}" x2="${x + 4}" y2="${LINE_Y + 15}" stroke="${col}" stroke-width="3"/>`);
      x += last ? 14 : 12;
    });
    // ties
    for (let i = 0; i < positions.length - 1; i++) {
      const p = positions[i];
      if (p.ev.tie && !p.ev.rest) {
        const q = positions[i + 1];
        const x1 = p.x + 3, x2 = q.x - 3, y = LINE_Y + 5;
        over.push(`<path d="M${x1},${y} Q${(x1 + x2) / 2},${y + 13} ${x2},${y}" fill="none" stroke="${col}" stroke-width="1.6"/>`);
      }
    }
    const width = x + 4;
    const beats = opts.beatNumbers === false ? '' : beatMarks.map(b => `<text x="${b.x}" y="${LINE_Y + 36}" font-size="10" text-anchor="middle" fill="${dim}" font-family="system-ui,sans-serif">${b.n}</text>`).join('');
    return `<svg viewBox="0 0 ${width} 92" width="100%" style="max-width:${Math.round(width * 1.15)}px;display:block" xmlns="http://www.w3.org/2000/svg" aria-label="rhythm notation">` +
      `<line x1="4" y1="${LINE_Y}" x2="${width - 4}" y2="${LINE_Y}" stroke="${dim}" stroke-width="1"/>` +
      parts.join('') + beamParts.join('') + over.join('') + beats + `</svg>`;
  }

  /* ---- Piano keyboard ---- */
  function keyboardSVG(lo, hi, highlights, opts) {
    opts = opts || {};
    highlights = highlights || {};
    const isBlack = m => [1, 3, 6, 8, 10].includes(E.mod12(m));
    // align to white keys
    while (isBlack(lo)) lo--; while (isBlack(hi)) hi++;
    const WW = 16, WH = 54, BW = 10, BH = 34;
    let whites = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
    const width = whites.length * WW + 2;
    const colors = { root: '#f2b544', note: '#5ac8fa', wrong: '#ff6b6b', ok: '#54d98c', chrom: '#c084fc', soft: 'rgba(255,255,255,0.35)' };
    let s = `<svg viewBox="0 0 ${width} ${WH + 2}" width="100%" style="max-width:${width * 1.4}px;display:block" xmlns="http://www.w3.org/2000/svg">`;
    whites.forEach((m, i) => {
      const h = highlights[m];
      s += `<rect x="${i * WW + 1}" y="1" width="${WW - 1}" height="${WH}" rx="2" fill="${h ? colors[h] || h : '#f4f1ea'}" stroke="#777" stroke-width="0.6"/>`;
      if (E.mod12(m) === 0 && opts.labels !== false) s += `<text x="${i * WW + WW / 2}" y="${WH - 4}" font-size="7" text-anchor="middle" fill="#666" font-family="system-ui,sans-serif">C${Math.floor(m / 12) - 1}</text>`;
    });
    whites.forEach((m, i) => {
      const b = m + 1; if (b > hi || !isBlack(b)) return;
      const h = highlights[b];
      s += `<rect x="${i * WW + WW - BW / 2 + 1}" y="1" width="${BW}" height="${BH}" rx="1.5" fill="${h ? colors[h] || h : '#23242a'}" stroke="#111" stroke-width="0.6"/>`;
    });
    return s + '</svg>';
  }

  Object.assign(E, { Notation: { rhythmSVG, keyboardSVG, slotWidth } });
})(window.EARS = window.EARS || {});
