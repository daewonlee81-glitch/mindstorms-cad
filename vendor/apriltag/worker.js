// AprilTag 36h11 검출 워커 — apriltag_wasm (arenaxr/apriltag-js-standalone, BSD-3 · AprilRobotics apriltag, BSD-2)
// 받는 것: { gray: Uint8Array(w*h), w, h, dec }  →  보내는 것: { dets: [{id, corners:[{x,y}×4], center:{x,y}}], ms }
importScripts('apriltag_wasm.js');
let M = null, detect, setBuf, setOpt, lastDec = -1;
AprilTagWasm().then(m => {
  M = m;
  m.cwrap('atagjs_init', 'number', [])();
  setOpt = m.cwrap('atagjs_set_detector_options', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
  setBuf = m.cwrap('atagjs_set_img_buffer', 'number', ['number', 'number', 'number']);
  detect = m.cwrap('atagjs_detect', 'number', []);
  postMessage({ ready: true });
});
onmessage = e => {
  const { gray, w, h, dec } = e.data;
  if (!M) { postMessage({ dets: [], ms: 0, err: 'not ready' }); return; }
  const t0 = performance.now();
  if (dec !== lastDec) { setOpt(dec || 2, 0, 1, 1, 0, 0, 0); lastDec = dec; }
  const ptr = setBuf(w, h, w);
  M.HEAPU8.set(gray, ptr);
  const sp = detect(), len = M.getValue(sp, 'i32');
  let dets = [];
  if (len > 0) {
    const s = M.getValue(sp + 4, 'i32');
    dets = JSON.parse(new TextDecoder().decode(new Uint8Array(M.HEAPU8.buffer, s, len).slice()));
  }
  postMessage({ dets, ms: performance.now() - t0 });
};
