// 3D 제주 디오라마 (three.js) — 샘플(3dmap.html)의 장면 코드를 앱에 맞게 옮긴 것.
// 화면(React)과는 createJejuScene() 이 돌려주는 함수들로만 주고받는다.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// 샘플이 쓰던 옛 three(r128)와 색·밝기가 같게 보이도록 맞춘다
THREE.ColorManagement.enabled = false
const LIGHT = Math.PI

/* ---------- 좌표 / 지형 ---------- */
const SX = 27.81, SZ = 33.3
const lx = (lng) => (lng - 126.55) * SX
const lz = (lat) => -(lat - 33.385) * SZ
const COAST = [[33.555, 126.70], [33.535, 126.58], [33.51, 126.45], [33.47, 126.31], [33.41, 126.23], [33.33, 126.16], [33.27, 126.20], [33.235, 126.33], [33.235, 126.50], [33.25, 126.64], [33.30, 126.80], [33.38, 126.92], [33.44, 126.97], [33.50, 126.93], [33.545, 126.82]].map((p) => [lx(p[1]), lz(p[0])])
const HALLA = [lx(126.533), lz(33.362)]
const OREUMS = [[33.364, 126.358, .55, .5], [33.345, 126.30, .5, .45], [33.431, 126.69, .5, .5], [33.46, 126.82, .55, .45], [33.47, 126.80, .5, .4], [33.35, 126.77, .55, .5], [33.43, 126.72, .45, .45], [33.458, 126.937, .95, .3], [33.30, 126.50, .4, .5], [33.40, 126.42, .4, .5]].map((o) => [lx(o[1]), lz(o[0]), o[2], o[3]])
const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
function inside(x, z) { let c = false; for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) { const a = COAST[i], b = COAST[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c } return c }
function edgeDist(x, z) { let m = 1e9; for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) { const a = COAST[j], b = COAST[i]; const dx = b[0] - a[0], dz = b[1] - a[1]; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz); t = Math.max(0, Math.min(1, t)); const d = Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)); if (d < m) m = d } return m }
function heightAt(x, z) {
  const ins = inside(x, z), d = edgeDist(x, z)
  if (!ins) return -0.38 * sm(0, 1.4, d)
  const lf = sm(0, 0.9, d), r = Math.hypot(x - HALLA[0], z - HALLA[1])
  let m = 3.3 * Math.exp(-Math.pow(r / 2.7, 1.6))
  if (r < 0.45) m -= 0.22 * (1 - r / 0.45)
  for (const o of OREUMS) { const rr = Math.hypot(x - o[0], z - o[1]); m += o[2] * Math.exp(-Math.pow(rr / o[3], 2)) }
  m += 0.06 * Math.sin(x * 2.1) * Math.cos(z * 1.7)
  return lf * (0.18 + m)
}
function pullInside(x, z, minD = 0.8) { let k = 0; while ((!inside(x, z) || edgeDist(x, z) < minD) && k < 80) { x += (HALLA[0] - x) * 0.05; z += (HALLA[1] - z) * 0.05; k++ } return [x, z] }

/* ---------- 돌하르방 ---------- */
function makeDol(hatColor) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x8f8b86 }), dk = new THREE.MeshLambertMaterial({ color: 0x3a3430 }), hm = new THREE.MeshLambertMaterial({ color: hatColor })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.15, .21, .5, 8), m); body.position.y = .25
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), m); head.position.y = .64
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(.15, .21, .15, 8), hm); hat.position.y = .86
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .04, 10), hm); brim.position.y = .79
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 6), m); nose.position.set(0, .62, .2)
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 6), dk), e2 = e1.clone(); e1.position.set(-.075, .68, .17); e2.position.set(.075, .68, .17)
  const a1 = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 6), m), a2 = a1.clone(); a1.position.set(-.1, .34, .17); a2.position.set(.1, .34, .17)
  ;[body, head, hat, brim, nose, e1, e2, a1, a2].forEach((o) => { o.castShadow = true; g.add(o) })
  const hit = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = .55; g.add(hit)
  return g
}

/**
 * places: [{ type, lat, lng }]   types: { [type]: { color } }
 * 돌려주는 값: { select(i), clearSelection(), home(), setTypeOn(type, on), setNames(names[]), dispose() }
 */
export function createJejuScene({ container, labelsEl, places, types, names, background = '#ffd9b8', onSelect }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(background)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
  const HOME = new THREE.Vector3(0, 12.5, 17), HOME_T = new THREE.Vector3(0, 0.4, 0)
  camera.position.copy(HOME)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(HOME_T); controls.enableDamping = true; controls.maxPolarAngle = 1.45; controls.minDistance = 2.5; controls.maxDistance = 42
  controls.autoRotate = true; controls.autoRotateSpeed = 0.5; controls.update()
  let fly = null
  controls.addEventListener('start', () => { controls.autoRotate = false; fly = null; controls.enabled = true })

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xffc9a0, 0.95 * LIGHT))
  const sun = new THREE.DirectionalLight(0xffffff, 0.8 * LIGHT)
  sun.position.set(-9, 16, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -0.0006
  scene.add(sun)

  /* ---------- 땅·바다·파도 ---------- */
  const W = 28, D = 22
  let waveUpdate = () => {}
  {
    let g = new THREE.PlaneGeometry(W, D, 168, 132); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)))
    g = g.toNonIndexed(); g.computeVertexNormals()
    const stops = [[-0.4, '#ecc98e'], [-0.02, '#f6dba5'], [0.09, '#f8e6b8'], [0.2, '#b4e07a'], [0.9, '#8fd15e'], [1.6, '#6fbf5a'], [2.3, '#5ea558'], [3.0, '#a6b88f'], [3.6, '#d8d2c2']].map((s) => [s[0], new THREE.Color(s[1])])
    const col = new Float32Array(g.attributes.position.count * 3), pp = g.attributes.position, tmpC = new THREE.Color()
    for (let i = 0; i < pp.count; i += 3) {
      const h = (pp.getY(i) + pp.getY(i + 1) + pp.getY(i + 2)) / 3
      let k = 0; while (k < stops.length - 2 && h > stops[k + 1][0]) k++
      const a = stops[k], b = stops[k + 1], t = Math.min(1, Math.max(0, (h - a[0]) / (b[0] - a[0])))
      tmpC.copy(a[1]).lerp(b[1], t).multiplyScalar(1 + (Math.random() - .5) * 0.07)
      for (let j = 0; j < 3; j++) { col[(i + j) * 3] = tmpC.r; col[(i + j) * 3 + 1] = tmpC.g; col[(i + j) * 3 + 2] = tmpC.b }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const land = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); land.receiveShadow = true; land.castShadow = true; scene.add(land)
    const sm0 = new THREE.MeshPhongMaterial({ color: 0x5ec8e5, transparent: true, opacity: 0.72, shininess: 90, specular: 0xffffff })
    const sea = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, D), [sm0, sm0, new THREE.MeshBasicMaterial({ visible: false }), sm0, sm0, sm0])
    sea.position.y = -0.2; scene.add(sea)
    // 파도: 잔물결 + 해안에서 퍼져 나가는 하얀 물보라
    const wg = new THREE.PlaneGeometry(W, D, 90, 72); wg.rotateX(-Math.PI / 2)
    const wpos = wg.attributes.position, wn = wpos.count, wcol = new Float32Array(wn * 3), wfade = new Float32Array(wn)
    wg.setAttribute('color', new THREE.BufferAttribute(wcol, 3))
    for (let i = 0; i < wn; i++) wfade[i] = sm(0, 1.3, Math.min(W / 2 - Math.abs(wpos.getX(i)), D / 2 - Math.abs(wpos.getZ(i))))
    const seaTop = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.8, shininess: 90, specular: 0xffffff }))
    seaTop.position.y = 0.012; scene.add(seaTop)
    const wc1 = new THREE.Color(0x4fc0e0), wc2 = new THREE.Color(0xd4f6ff), wcc = new THREE.Color()
    const ring = []
    for (let i = 0; i < COAST.length; i++) { const a = COAST[i], b = COAST[(i + 1) % COAST.length]; for (let s = 0; s < 14; s++) ring.push([a[0] + (b[0] - a[0]) * s / 14, a[1] + (b[1] - a[1]) * s / 14]) }
    const RN = ring.length, nrm = []
    for (let i = 0; i < RN; i++) { let tx = 0, tz = 0; for (let k = -4; k <= 4; k++) { const a = ring[(i + k - 1 + RN * 2) % RN], b = ring[(i + k + 1 + RN * 2) % RN]; tx += b[0] - a[0]; tz += b[1] - a[1] } const l = Math.hypot(tx, tz) || 1; nrm.push([tz / l, -tx / l]) }
    let inCnt = 0; for (let i = 0; i < RN; i += 3) if (inside(ring[i][0] + nrm[i][0] * 0.15, ring[i][1] + nrm[i][1] * 0.15)) inCnt++
    if (inCnt > RN / 6) nrm.forEach((v) => { v[0] *= -1; v[1] *= -1 })
    const foam = [0, 1, 2].map(() => {
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 6), 3))
      const idx = []; for (let i = 0; i < RN; i++) { const a = i * 2, b = ((i + 1) % RN) * 2; idx.push(a, a + 1, b, a + 1, b + 1, b) } fg.setIndex(idx)
      const fm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      const mesh = new THREE.Mesh(fg, fm); mesh.position.y = 0.05; mesh.frustumCulled = false; mesh.renderOrder = 2; scene.add(mesh); return { fg, fm }
    })
    waveUpdate = (t) => {
      for (let i = 0; i < wn; i++) {
        const x = wpos.getX(i), z = wpos.getZ(i)
        const v = (Math.sin(x * 1.4 + t * 1.3) + Math.sin(z * 1.9 - t * 1.0) + Math.sin((x + z) * 1.0 + t * 1.6) + Math.sin(x * 3.1 - z * 2.3 + t * 2.0) * 0.5) / 3.5
        const k = v * 0.5 + 0.5
        wpos.setY(i, k * 0.05 * wfade[i])
        wcc.copy(wc1).lerp(wc2, Math.pow(k, 3) * 0.9)
        wcol[i * 3] = wcc.r; wcol[i * 3 + 1] = wcc.g; wcol[i * 3 + 2] = wcc.b
      }
      wpos.needsUpdate = true; wg.attributes.color.needsUpdate = true
      foam.forEach((r, ri) => {
        const ph = (t * 0.18 + ri / 3) % 1, off = 0.05 + ph * 0.9, wd = 0.05 + ph * 0.1, arr = r.fg.attributes.position.array
        for (let i = 0; i < RN; i++) {
          const px = ring[i][0] + nrm[i][0] * off, pz = ring[i][1] + nrm[i][1] * off
          arr[i * 6] = px; arr[i * 6 + 1] = 0; arr[i * 6 + 2] = pz; arr[i * 6 + 3] = px + nrm[i][0] * wd; arr[i * 6 + 4] = 0; arr[i * 6 + 5] = pz + nrm[i][1] * wd
        }
        r.fg.attributes.position.needsUpdate = true
        r.fm.opacity = 0.65 * Math.sin(Math.PI * ph) * (1 - ph * 0.4)
      })
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.9, D + 0.7), new THREE.MeshLambertMaterial({ color: 0xe0a06a })); base.position.y = -0.83; base.receiveShadow = true; scene.add(base)
    const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.12, D + 0.7), new THREE.MeshLambertMaterial({ color: 0xfff1dc })); rim.position.y = -0.4; scene.add(rim)
  }

  /* ---------- 구름 ---------- */
  const clouds = new THREE.Group(); scene.add(clouds)
  {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Group()
      ;[[0, 0, 0, .7], [.7, -.1, .1, .55], [-.7, -.1, 0, .5], [.2, .2, -.1, .5]].forEach((s) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s[3], 1), mat); m.position.set(s[0], s[1], s[2]); m.castShadow = true; c.add(m) })
      c.position.set(-14 + i * 7 + Math.random() * 2, 6.5 + Math.random() * 1.5, (Math.random() - .5) * 14)
      c.scale.setScalar(.9 + Math.random() * .6); c.userData.v = .15 + Math.random() * .15; clouds.add(c)
    }
  }

  /* ---------- 핀(돌하르방) ---------- */
  const pins = []
  places.forEach((d, i) => {
    const q = pullInside(lx(d.lng), lz(d.lat), d.type === 'mt' || d.type === 'forest' ? 0.4 : 0.8)
    pins.push({ i, type: d.type, x: q[0], z: q[1], y: 0, g: null, jump: 0, sc: .01, lbl: null, lw: 0 })
  })
  for (let it = 0; it < 40; it++) {
    for (let a = 0; a < pins.length; a++) for (let b = a + 1; b < pins.length; b++) {
      const dx = pins[b].x - pins[a].x, dz = pins[b].z - pins[a].z, d = Math.hypot(dx, dz)
      if (d < 0.6 && d > 0.0001) { const push = (0.6 - d) / 2, ux = dx / d, uz = dz / d; pins[a].x -= ux * push; pins[a].z -= uz * push; pins[b].x += ux * push; pins[b].z += uz * push }
    }
  }
  pins.forEach((p) => {
    const q = pullInside(p.x, p.z, 0.3); p.x = q[0]; p.z = q[1]; p.y = Math.max(heightAt(p.x, p.z), 0.02)
    p.g = makeDol(types[p.type].color); p.g.position.set(p.x, p.y, p.z); p.g.rotation.y = (Math.random() - .5) * .7; p.g.userData.pin = p
    scene.add(p.g)
  })

  /* ---------- 나무 ---------- */
  {
    const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
    const rand = rng(7), broad = [], pine = []; let tries = 0
    while (broad.length + pine.length < 620 && tries < 9000) {
      tries++
      const x = (rand() - .5) * 25, z = (rand() - .5) * 19
      if (!inside(x, z) || edgeDist(x, z) < 1.0) continue
      const h = heightAt(x, z); if (h > 2.1) continue
      if (pins.some((p) => Math.hypot(p.x - x, p.z - z) < 0.55)) continue
      ;(h > 1.05 ? pine : broad).push({ x, z, h, s: .7 + rand() * .7, t: rand() })
    }
    const o = new THREE.Object3D(), col = new THREE.Color(), trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a3a })
    const bt = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .05, .24, 5), trunkMat, broad.length)
    const bf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.21, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), broad.length)
    const ft = broad.filter((b) => b.t < .4), fr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.045, 0), new THREE.MeshLambertMaterial({ color: 0xff8a1f }), ft.length * 4)
    broad.forEach((b, i) => {
      o.position.set(b.x, b.h, b.z); o.rotation.set(0, b.t * 6, 0); o.scale.setScalar(b.s); o.updateMatrix(); bt.setMatrixAt(i, o.matrix)
      o.position.y = b.h + .34 * b.s; o.updateMatrix(); bf.setMatrixAt(i, o.matrix)
      col.set(b.t < .4 ? 0x4fae4a : 0x7cc95a).offsetHSL(0, 0, (b.t - .5) * .08); bf.setColorAt(i, col)
    })
    ft.forEach((b, i) => { for (let k = 0; k < 4; k++) { const a = k * 1.57 + b.t * 5; o.position.set(b.x + Math.cos(a) * .17 * b.s, b.h + (.3 + (k % 2) * .1) * b.s, b.z + Math.sin(a) * .17 * b.s); o.rotation.set(0, 0, 0); o.scale.setScalar(b.s); o.updateMatrix(); fr.setMatrixAt(i * 4 + k, o.matrix) } })
    const pt = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .04, .16, 5), trunkMat, pine.length)
    const pf = new THREE.InstancedMesh(new THREE.ConeGeometry(.18, .62, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), pine.length)
    pine.forEach((b, i) => {
      o.position.set(b.x, b.h, b.z); o.rotation.set(0, b.t * 6, 0); o.scale.setScalar(b.s); o.updateMatrix(); pt.setMatrixAt(i, o.matrix)
      o.position.y = b.h + .4 * b.s; o.updateMatrix(); pf.setMatrixAt(i, o.matrix)
      col.set(0x3f9a56).offsetHSL(0, 0, (b.t - .5) * .08); pf.setColorAt(i, col)
    })
    ;[bt, bf, fr, pt, pf].forEach((m) => { m.castShadow = true; scene.add(m) })
  }

  /* ---------- 이름표·선택·카메라 이동 ---------- */
  const typeOn = Object.fromEntries(Object.keys(types).map((k) => [k, true]))
  let selected = null, hovered = null
  pins.forEach((p) => {
    const el = document.createElement('div'); el.className = 'm3d-lbl'; labelsEl.appendChild(el); p.lbl = el
  })
  function setNames(list) {
    pins.forEach((p) => { const n = list[p.i] ?? ''; p.lbl.textContent = n; p.lw = n.length * 14 + 26 })
  }
  setNames(names)

  function startFly(pos, tgt) { controls.autoRotate = false; controls.enabled = false; fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt } }
  function select(i) {
    const p = pins[i]; if (!p) return
    selected = p; p.jump = 1
    const tgt = new THREE.Vector3(p.x, p.y + 0.4, p.z)
    startFly(tgt.clone().add(new THREE.Vector3(0, 3.4, 4.8)), tgt)
  }
  const clearSelection = () => { selected = null }
  const home = () => { selected = null; startFly(HOME.clone(), HOME_T.clone()) }
  function setTypeOn(type, on) { typeOn[type] = on; if (selected && !typeOn[selected.type]) selected = null }

  const raycaster = new THREE.Raycaster(), ptr = new THREE.Vector2()
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect()
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ptr, camera)
    const hits = raycaster.intersectObjects(pins.filter((p) => typeOn[p.type]).map((p) => p.g), true)
    for (const h of hits) { let o = h.object; while (o && !o.userData.pin) o = o.parent; if (o) return o.userData.pin }
    return null
  }
  const cv = renderer.domElement
  let down = null
  const onDown = (e) => { down = [e.clientX, e.clientY] }
  const onUp = (e) => { if (!down) return; const m = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (m > 6) return; const p = pick(e); if (p) { select(p.i); onSelect?.(p.i) } }
  const onMove = (e) => { if (e.pointerType !== 'mouse' || e.buttons) { hovered = null; return } hovered = pick(e); cv.style.cursor = hovered ? 'pointer' : '' }
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointermove', onMove)

  /* ---------- 루프 ---------- */
  const tmp = new THREE.Vector3(); let T = 0
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
  function update(dt) {
    T += dt * (RM ? 0.25 : 1); waveUpdate(T)
    clouds.children.forEach((c) => { c.position.x += c.userData.v * dt; if (c.position.x > 17) c.position.x = -17 })
    pins.forEach((p) => {
      const vis = typeOn[p.type]; p.g.visible = vis
      p.sc += ((vis ? 1.1 : 0.01) - p.sc) * Math.min(1, dt * 6)
      if (p.jump > 0) p.jump -= dt
      const hop = p.jump > 0 ? Math.abs(Math.sin(p.jump * 9)) * 0.35 * Math.min(1, p.jump * 2) : 0
      p.g.position.y = p.y + hop; p.g.scale.setScalar(p.sc * (p === selected ? 1.3 : (p === hovered ? 1.15 : 1)))
    })
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 1.1); const e = fly.t < .5 ? 4 * fly.t ** 3 : 1 - Math.pow(-2 * fly.t + 2, 3) / 2
      camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); camera.lookAt(controls.target)
      if (fly.t >= 1) { fly = null; controls.enabled = true; controls.update() }
    } else controls.update()
  }
  // 이름표 30개가 겹치지 않게: 선택·마우스를 올린 핀이 먼저, 나머지는 겹치지 않는 것만
  function updateLabels() {
    const w = container.clientWidth, h = container.clientHeight, rects = []
    const order = pins.filter((p) => typeOn[p.type]).sort((a, b) => (b === selected) - (a === selected) || (b === hovered) - (a === hovered) || a.i - b.i)
    pins.forEach((p) => { p.lbl.style.display = 'none' })
    order.forEach((p) => {
      tmp.set(p.x, p.y + 1.2 * p.sc, p.z).project(camera)
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) return
      const x = (tmp.x * .5 + .5) * w, y = (-tmp.y * .5 + .5) * h, lw = p.lw + (p === selected ? 16 : 0), r = [x - lw / 2, y - 28, x + lw / 2, y]
      const forced = p === selected || p === hovered
      if (!forced && rects.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return
      rects.push(r)
      p.lbl.classList.toggle('sel', p === selected)
      p.lbl.style.display = 'block'; p.lbl.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)'
    })
  }
  const clock = new THREE.Clock()
  let raf = 0
  function tick() { raf = requestAnimationFrame(tick); update(Math.min(clock.getDelta(), 0.05)); renderer.render(scene, camera); updateLabels() }
  function resize() { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
  const ro = new ResizeObserver(resize); ro.observe(container)
  resize(); tick()

  // 화면을 떠날 때: 반복 중지, 이벤트 해제, 그래픽 메모리 반환
  function dispose() {
    cancelAnimationFrame(raf); ro.disconnect()
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointermove', onMove)
    controls.dispose()
    scene.traverse((o) => {
      o.geometry?.dispose()
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose())
    })
    renderer.dispose()
    cv.remove()
    pins.forEach((p) => p.lbl.remove())
  }

  return { select, clearSelection, home, setTypeOn, setNames, dispose }
}
