// evaluated in the page: samples every channel of the playing player for ~4 s
(async () => {
  const p = window.__players.find((x) => x.playing);
  if (!p) return "nothing playing";
  const ids = p.channelIds();
  const buf = new Float32Array(2048);
  const acc = Object.fromEntries([...ids, "MASTER"].map((id) => [id, { sum: 0, n: 0, peak: 0 }]));
  for (let k = 0; k < 160; k++) {
    for (const id of [...ids, "MASTER"]) {
      const a = id === "MASTER" ? window.__probe : p.channel(id).analyser;
      a.getFloatTimeDomainData(buf);
      for (let i = 0; i < buf.length; i++) {
        acc[id].sum += buf[i] * buf[i];
        acc[id].peak = Math.max(acc[id].peak, Math.abs(buf[i]));
      }
      acc[id].n += buf.length;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  return Object.fromEntries(Object.entries(acc).map(([id, v]) => [id, `rms ${(10 * Math.log10(v.sum / v.n + 1e-12)).toFixed(1)} dB · peak ${(20 * Math.log10(v.peak + 1e-12)).toFixed(1)} dB`]));
})()
