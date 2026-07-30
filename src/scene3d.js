// 三维场景:只有一颗完整苹果;滚动姿态是 t 的纯函数,about 段滑走是 u 的纯函数
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { PARAMS, remap, lerp, IS_MOBILE, IS_TOUCH, isPortrait, heroFit } from './params.js';

let renderer, scene, camera;
let whole;
let curve, look = new THREE.Vector3();
let t = 0, u = 0, floatTime = 0, visible = true;
// 拖拽旋转状态(userRot 为当前附加角;滚动接近 p2 时自动淡出归零)
let dragging = false, dragX = 0, dragY = 0, dragBaseX = 0, dragBaseY = 0;
const userRot = { x: 0, y: 0 };
// 苹果悬停(停浮+微放大)
const appleHover = { v: 0 };
let hovOn = false;
const _ray = new THREE.Raycaster();
const _ptr = new THREE.Vector2();
// 复古磨砂后处理:只作用于画布(即只作用于苹果)
let rt, postScene, postCam, postMat;
// 卡通手套光标(与 style.css 全局光标一致):悬停可拖=手掌(放大一号作强调),拖拽中=拳头
const CURSOR_OPEN = 'url("assets/img/cursor-hand-open-lg.png") 24 24, grab';
const CURSOR_FIST = 'url("assets/img/cursor-hand-fist-lg.png") 24 20, grabbing';
// 性能:触屏/低核设备降 DPR 上限与 MSAA(中端机保帧率)
const MAX_DPR = IS_TOUCH ? 1.5 : 2;
const MSAA_SAMPLES = IS_MOBILE ? 0 : 4;

const POST_FRAG = /* glsl */`
  uniform sampler2D u_tex;
  uniform float u_time, u_grain, u_desat, u_lift;
  varying vec2 vUv;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7)) + u_time * 61.7) * 43758.5453);
  }
  void main() {
    vec4 tex = texture2D(u_tex, vUv);
    vec3 c = tex.rgb;
    // 去饱和(复古感)
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(lum), u_desat);
    // 磨砂:抬黑、压对比
    c = c * (1.0 - u_lift * 0.5) + u_lift;
    // 胶片颗粒(亮部少、暗部多,透明背景不吃颗粒)
    float g = (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * u_grain * (1.2 - lum);
    gl_FragColor = vec4(c + g * tex.a, tex.a);
  }`;

const smooth = x => x * x * (3 - 2 * x);

function loadGlb(loader, url) {
  return new Promise((res, rej) => loader.load(url, res, undefined, rej));
}

export const scene3d = {
  async init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_DPR));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(PARAMS.cam.fov, 1, 0.1, 50);

    // 柔光棚:暖主光 + 环境 + 补光(强度面板可调)
    const hemi = new THREE.HemisphereLight(0xfff6e8, 0xd8c8b0, PARAMS.light.hemi);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1dd, PARAMS.light.key);
    key.position.set(-3, 4, 3.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, PARAMS.light.fill);
    fill.position.set(3.5, 1.5, -2.5);
    scene.add(fill);
    this._lights = { hemi, key, fill };

    // 相机轨迹(控制点对象保持引用,面板改参实时生效)
    this._p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    curve = new THREE.CatmullRomCurve3(this._p);

    // 模型:只加载完整苹果
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    const suffix = IS_MOBILE ? '-mobile' : '';
    const w = await loadGlb(loader, `assets/models/apple_whole${suffix}.glb`);
    whole = w.scene;
    scene.add(whole);

    // 苹果悬停拾取:射线命中则停浮+微放大(滑走段禁用;触屏整体跳过,让位给页面滚动)
    addEventListener('pointermove', (e) => {
      if (IS_TOUCH) return;
      if (!whole || u >= 0.5 || dragging) { if (!dragging) this._setAppleHover(false); }
      else {
        _ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        _ray.setFromCamera(_ptr, camera);
        this._setAppleHover(_ray.intersectObject(whole, true).length > 0);
      }
      // 拖拽旋转:悬停苹果时按下拖动,松手缓动自转回默认;滚动后自动失效回预设位
      if (dragging) {
        userRot.y = dragBaseY + (e.clientX - dragX) * 0.006;
        userRot.x = THREE.MathUtils.clamp(dragBaseX + (e.clientY - dragY) * 0.004, -0.4, 0.4);
      }
    }, { passive: true });
    addEventListener('pointerdown', (e) => {
      if (!hovOn || !whole || u >= 0.5) return;
      dragging = true;
      dragX = e.clientX; dragY = e.clientY;
      dragBaseX = userRot.x; dragBaseY = userRot.y;
      gsap.killTweensOf(userRot);
      canvas.style.cursor = CURSOR_FIST;
    });
    addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = hovOn ? CURSOR_OPEN : '';
      gsap.to(userRot, { x: 0, y: 0, duration: 2.4, ease: 'power3.out' });   // 缓缓自转回默认
    });

    // 复古磨砂后处理:渲染到 RT,再过颗粒 shader 上屏
    rt = new THREE.WebGLRenderTarget(2, 2, { samples: MSAA_SAMPLES });
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postMat = new THREE.ShaderMaterial({
      uniforms: {
        u_tex: { value: rt.texture },
        u_time: { value: 0 },
        u_grain: { value: PARAMS.filter.grain },
        u_desat: { value: PARAMS.filter.desat },
        u_lift: { value: PARAMS.filter.lift },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: POST_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

    this.resize();
    addEventListener('resize', () => this.resize());
    this.update(0);
    this.tick(0);
    return true;
  },

  resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rt?.setSize(w * Math.min(devicePixelRatio, MAX_DPR), h * Math.min(devicePixelRatio, MAX_DPR));
  },

  _setAppleHover(on) {
    if (on === hovOn) return;
    hovOn = on;
    gsap.to(appleHover, { v: on ? 1 : 0, duration: PARAMS.appleHover.ms / 1000, ease: 'power2.out' });
    if (renderer && !dragging) renderer.domElement.style.cursor = on ? CURSOR_OPEN : '';   // 悬停提示可拖拽
  },

  // ---- hero 段滚动姿态(漂浮 + 放大转视角):纯函数 ----
  update(nt) {
    t = nt;
    const P = PARAMS;
    const zoomP = smooth(t);

    this._p[0].set(P.cam.p0.x, P.cam.p0.y, P.cam.p0.z);
    this._p[1].set(P.cam.p1.x, P.cam.p1.y, P.cam.p1.z);
    this._p[2].set(P.cam.p2.x, P.cam.p2.y, P.cam.p2.z);
    camera.fov = P.cam.fov;
    camera.updateProjectionMatrix();

    look.set(
      lerp(P.cam.look0.x, P.cam.look2.x, zoomP),
      lerp(P.cam.look0.y, P.cam.look2.y, zoomP),
      lerp(P.cam.look0.z, P.cam.look2.z, zoomP),
    );
    curve.getPoint(Math.min(1, zoomP), camera.position);
    camera.lookAt(look);

    // 自转 + 常驻倾斜(随放大淡出)
    const tiltW = 1 - remap(t, 0, 0.4);
    if (whole) {
      whole.userData.baseRotY = P.apple.startRotY + P.apple.rotYEnd * zoomP;   // 预设朝向(p2 终值)
      whole.rotation.y = whole.userData.baseRotY;
      whole.userData.tiltZ = THREE.MathUtils.degToRad(P.apple.tiltZ) * tiltW;
      whole.userData.tiltX = THREE.MathUtils.degToRad(P.apple.tiltX) * tiltW;
      whole.userData.heroW = tiltW;
    }
  },

  // ---- about 段:苹果向右下角滑走;u∈[0,1] 纯函数 ----
  setAway(nu) {
    u = nu;
    const fade = remap(u, PARAMS.away.fadeStart, 1);
    renderer.domElement.style.opacity = String(1 - fade);
  },

  // ---- 时间驱动:段 A 呼吸漂浮 + 滑走叠加 ----
  tick(dt) {
    if (!renderer || !visible) return;
    floatTime += dt;
    const P = PARAMS;
    // 光照实时(面板)
    if (this._lights) {
      this._lights.hemi.intensity = P.light.hemi;
      this._lights.key.intensity = P.light.key;
      this._lights.fill.intensity = P.light.fill;
    }
    const w8 = 1 - remap(t, 0, P.seg.floatFadeEnd);   // 漂浮权重
    const ph = (floatTime / P.float.period) * Math.PI * 2;
    const bob = Math.sin(ph);
    if (whole) {
      const hw = whole.userData.heroW || 0;
      const hov = appleHover.v;                          // 悬停权重:停浮 + 微放大
      // hero 位置/大小调整:视口 % → 世界单位(随放大淡出);竖屏换用 appleMobile
      // 同步乘 heroFit.s:手绘层为不越灰线整体缩小时,苹果跟着缩
      const A = isPortrait() ? P.appleMobile : P.apple;
      const fit = heroFit.s;
      const wH = 2 * 8.45 * Math.tan(THREE.MathUtils.degToRad(P.cam.fov / 2));
      const heroX = (A.xPct / 100) * wH * camera.aspect * hw * fit;
      const heroY = (A.yPct / 100) * wH * hw * fit;
      // 滑走(u):向右下角 + 附带倾倒 + 略缩小
      const eu = smooth(u);
      const stillW = (1 - eu) * (1 - hov);
      whole.position.x = heroX + P.away.x * eu;
      whole.position.y = heroY + bob * P.float.ampY * w8 * stillW + P.away.y * eu;
      whole.scale.setScalar(
        lerp(1, A.scale * fit, hw) * lerp(1, P.away.scale, eu));
      whole.rotation.z = (whole.userData.tiltZ || 0)
        + Math.sin(ph + 1.2) * THREE.MathUtils.degToRad(P.float.swayZ) * w8 * stillW
        + P.away.rot * eu;
      // 拖拽附加角:滚动接近 p2 时淡出,保证 p2 纯预设位
      const urFade = 1 - remap(t, 0, 0.35);
      whole.rotation.y = (whole.userData.baseRotY ?? whole.rotation.y) + userRot.y * urFade;
      whole.rotation.x = (whole.userData.tiltX || 0)
        + Math.sin(ph + 2.4) * THREE.MathUtils.degToRad(P.float.swayX) * w8 * stillW
        + userRot.x * urFade;
    }
    // 复古磨砂后处理上屏(参数面板实时;关闭时直渲)
    if (postMat && PARAMS.filter.enabled) {
      postMat.uniforms.u_time.value = floatTime % 10;
      postMat.uniforms.u_grain.value = PARAMS.filter.grain;
      postMat.uniforms.u_desat.value = PARAMS.filter.desat;
      postMat.uniforms.u_lift.value = PARAMS.filter.lift;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    } else {
      renderer.render(scene, camera);
    }
  },

  setVisible(v) {
    visible = v;
    renderer.domElement.style.display = v ? 'block' : 'none';
  },
  get isVisible() { return visible; },

  // 苹果中心的屏幕投影(点阵消散的扩散中心)
  appleScreen() {
    if (!whole) return null;
    const v = whole.position.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  },

  debug() {
    return {
      t, u,
      cam: camera.position.toArray().map(v => +v.toFixed(2)),
      look: look.toArray().map(v => +v.toFixed(2)),
      whole: whole && { rotY: +whole.rotation.y.toFixed(2), pos: whole.position.toArray().map(v => +v.toFixed(2)) },
      tris: renderer.info.render.triangles,
    };
  },

  // 苹果中心的屏幕坐标(点阵消散的扫描锚点,随苹果移动)
  appleScreen() {
    if (!whole) return { x: innerWidth * 0.36, y: innerHeight * 0.5 };
    const v = whole.position.clone();
    v.y += 0.1 * whole.scale.x;
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  },

  // 同步渲染 + 像素回读(诊断用,绕开合成器)
  probePixels() {
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const out = [];
    for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.4], [0.7, 0.6], [0.5, 0.25]]) {
      const px = new Uint8Array(4);
      gl.readPixels((w * fx) | 0, (h * fy) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      out.push([...px]);
    }
    return { buffer: [w, h], samples: out };
  },
};
