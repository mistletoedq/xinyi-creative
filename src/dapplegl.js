// haoqi 首页背景管线·忠实迁移(vignette → swirl → sine → bokeh → output,0.3 分辨率)
// 参数与色值取其 light 主题原值,仅本地测试学习,致谢 Haoqi Wen
import * as THREE from 'three';
import { PARAMS, REDUCED } from './params.js';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// —— Pass 1 · vignette(径向渐变底色,与 haoqi 完全一致)——
const FRAG_VIGNETTE = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform float uRadius, uFalloff, uDisplace, uSkew, uAngle, uEdgeIntensity;
  uniform vec3 uVignetteColor, uClearColor;
  uniform vec2 uPos, uResolution;
  mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
  void main(){
    vec2 uv = vUv;
    vec4 color = vec4(vec3(1.), 0.);
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float displacement = (luma - 0.5) * uDisplace * 0.5;
    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 skew = vec2(uSkew, 1.0 - uSkew);
    float halfRadius = uRadius * 0.5;
    float innerEdge = halfRadius - uFalloff * halfRadius * 0.5;
    float outerEdge = halfRadius + uFalloff * halfRadius * 0.5;
    vec2 pos = uPos;
    vec2 scaledUV = uv * aspectRatio * rot(uAngle * 6.28318530718) * skew;
    vec2 scaledPos = pos * aspectRatio * rot(uAngle * 6.28318530718) * skew;
    float radius = distance(scaledUV, scaledPos);
    float falloff = smoothstep(innerEdge + displacement, outerEdge + displacement, radius);
    float brighten = max(uEdgeIntensity, 0.0);
    float darken = max(-uEdgeIntensity, 0.0);
    falloff = mix(falloff, 0.0, brighten);
    falloff = mix(falloff, 1.0, darken);
    vec3 mixed = mix(uClearColor, uVignetteColor, falloff);
    gl_FragColor = vec4(mixed, falloff);
  }`;

// —— Pass 2 · swirl(旋涡)——
const FRAG_SWIRL = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform vec2 uResolution, uPos;
  uniform sampler2D tInput;
  uniform float uRadius, uAngle, uPhase, uTime, uMix;
  void main(){
    vec2 uv = vUv;
    float angle = uAngle * 10.;
    vec2 originalUV = uv;
    vec2 pos = uPos;
    uv -= pos;
    vec2 R = vec2(uv.x * uResolution.x / uResolution.y, uv.y);
    float distanceToCenter = length(R);
    if (distanceToCenter <= uRadius) {
      float rot = atan(R.y, R.x) + angle * smoothstep(uRadius, 0., distanceToCenter);
      uv = vec2(cos(rot + uTime / 20. + uPhase * 6.28318530718), sin(rot + uTime / 20. + uPhase * 6.28318530718));
      uv = distanceToCenter * uv + pos;
    }
    float t = smoothstep(0., uRadius, distanceToCenter);
    vec2 mixedUV = mix(uv, originalUV, t);
    gl_FragColor = texture2D(tInput, mix(vUv, mixedUV, uMix));
  }`;

// —— Pass 3 · sine(正弦波扭曲,流动感主来源)——
const FRAG_SINE = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tInput;
  uniform float uMixRadius, uFrequency, uAmplitude, uRotation, uTime, uTrackMouse;
  uniform vec2 uPos, uResolution, uMousePos;
  void main(){
    vec2 uv = vUv;
    vec2 waveCoord = vUv.xy * 2.0 - 1.0;
    float time = uTime * 0.25;
    float frequency = 20.0 * uFrequency;
    float amp = uAmplitude * 0.2;
    float waveX = sin((waveCoord.y + uPos.y) * frequency + (time)) * amp;
    float waveY = sin((waveCoord.x - uPos.x) * frequency + (time)) * amp;
    waveCoord.xy += vec2(mix(waveX, 0., uRotation), mix(0., waveY, uRotation));
    vec2 finalUV = waveCoord * 0.5 + 0.5;
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 mPos = uPos + mix(vec2(0.), (uMousePos - 0.5), uTrackMouse);
    float dist = (max(0., 1. - distance(uv * vec2(aspectRatio, 1.), mPos * vec2(aspectRatio, 1.)) * 4. * (1. - uMixRadius)));
    uv = mix(uv, finalUV, dist);
    gl_FragColor = texture2D(tInput, uv);
  }`;

// —— Pass 4 · bokeh(黄金角柔焦 + 亮部加权,波光来源)——
const FRAG_BOKEH = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tInput, tBlueNoise;
  uniform float uAmount, uTilt, uTime, uTrackMouse, uChroma;
  uniform vec2 uPos, uResolution, uBlueNoiseResolution, uMousePos;
  #define PI2 6.28318530718
  #define ITERATIONS 32.0
  #define GOLDEN_ANGLE 2.39996323
  vec2 Sample(in float theta, inout float r){
    r += 1.0 / r;
    return (r - 1.0) * vec2(cos(theta), sin(theta));
  }
  float getBlueNoiseOffset(vec2 st){
    vec2 texSize = uBlueNoiseResolution;
    vec2 uv = fract(st * (uResolution / texSize) * vec2(texSize.x / texSize.y, 1.0));
    vec4 blueNoise = texture2D(tBlueNoise, uv);
    return mod((blueNoise.r - 0.5) * PI2, PI2);
  }
  vec4 Bokeh(sampler2D tex, vec2 uv, float blurRadius){
    vec3 accumulatedColor = vec3(0.0);
    vec3 accumulatedWeights = vec3(0.0);
    float accumulatedAlpha = 0.0;
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 basePixelSize = vec2(1.0 / aspectRatio, 1.0) * 0.04 * 0.075;
    float r = 1.0;
    float noiseOffset = (getBlueNoiseOffset(uv) - 0.5) * 0.01;
    float noiseAngle = noiseOffset * PI2;
    mat2 rotationMatrix = mat2(cos(noiseAngle), -sin(noiseAngle), sin(noiseAngle), cos(noiseAngle));
    for (float j = 0.0; j < GOLDEN_ANGLE * ITERATIONS; j += GOLDEN_ANGLE) {
      vec2 offset = Sample(j, r) * basePixelSize * blurRadius;
      float jitterAmount = 0.05 * (sin(j * 0.1) * 0.5 + 0.5);
      offset *= 1.0 + jitterAmount * sin(j * 0.7 + noiseOffset);
      vec2 sampleOffset = rotationMatrix * offset;
      // 光谱分离:通道间微小错位采样,亮带边缘出彩虹边(hhaoqi 玻璃折射观感的替代)
      vec3 caDir = normalize(sampleOffset + 1e-6) * (0.0018 * uChroma);
      vec4 colorSample;
      colorSample.r = texture2D(tex, uv + sampleOffset + caDir).r;
      colorSample.g = texture2D(tex, uv + sampleOffset).g;
      colorSample.b = texture2D(tex, uv + sampleOffset - caDir).b;
      colorSample.a = 1.0;
      vec3 linearSample = colorSample.rgb;
      vec3 bokehWeight = vec3(5.0) + pow(linearSample, vec3(9.0)) * 150.0;
      accumulatedAlpha += colorSample.a;
      accumulatedColor += linearSample * bokehWeight;
      accumulatedWeights += bokehWeight;
    }
    vec3 linearOut = accumulatedColor / accumulatedWeights;
    return vec4(linearOut, accumulatedAlpha / ITERATIONS);
  }
  void main(){
    vec2 uv = vUv;
    if (uAmount == 0.0) { gl_FragColor = vec4(0.0); return; }
    vec2 pos = uPos + mix(vec2(0.0), (uMousePos - 0.5), uTrackMouse);
    float dis = distance(uv, pos) * 1000.0;
    float tilt = mix(1.0 - dis * 0.001, dis * 0.001, uTilt);
    float blurRadius = uAmount * tilt;
    gl_FragColor = Bokeh(tInput, uv, blurRadius);
  }`;

// —— Pass 5 · output(底色 overlay + tint 合成)——
const FRAG_OUTPUT = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tInput;
  uniform vec3 uBgColor, uOutputColor;
  uniform float uOutputMix;
  vec3 overlay(vec3 base, vec3 blend){
    return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
  }
  void main(){
    vec3 bgTex = vec3(1.0);
    vec3 base = mix(uBgColor, overlay(uBgColor, bgTex), 0.61);
    vec4 inTex = texture2D(tInput, vUv);
    vec3 tint = uOutputColor * 0.35;
    vec3 blend = clamp(inTex.rgb + tint, 0.0, 1.0);
    vec3 finalColor = base * mix(vec3(1.0), blend, clamp(uOutputMix, 0.0, 1.0));
    gl_FragColor = vec4(finalColor, 1.0);
    #include <colorspace_fragment>
  }`;

let renderer, quadScene, cam, quad, mats = [], rtA, rtB;
let mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
let running = false, last = 0;

function makeRT(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  });
}

function makeNoiseTex() {
  const N = 128, data = new Uint8Array(N * N * 4);
  let s = 99;
  for (let i = 0; i < N * N * 4; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = s & 0xff;
  }
  const tex = new THREE.DataTexture(data, N, N);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const s = PARAMS.dapple.resScale;
  rtA?.dispose(); rtB?.dispose();
  rtA = makeRT(Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s)));
  rtB = makeRT(Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s)));
  for (const m of mats) m.uniforms.uResolution?.value.set(rtA.width, rtA.height);
}

function pass(mat, inputTex, target) {
  quad.material = mat;
  if (mat.uniforms.tInput) mat.uniforms.tInput.value = inputTex;
  renderer.setRenderTarget(target);
  renderer.render(quadScene, cam);
}

function frame(now) {
  const dt = Math.min(0.05, last ? now - last : 0.016);
  last = now;
  mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 4);
  mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 4);
  const mx = mouse.x, my = 1 - mouse.y;

  for (const m of mats) {
    if (m.uniforms.uTime) m.uniforms.uTime.value = now;
    if (m.uniforms.uPos) m.uniforms.uPos.value.set(mx, my);
    if (m.uniforms.uMousePos) m.uniforms.uMousePos.value.set(mx, my);
  }
  mats[3].uniforms.uAmount.value = 3.125 * PARAMS.dapple.bokeh;
  mats[3].uniforms.uChroma.value = PARAMS.dapple.chroma;
  pass(mats[0], null, rtA);          // vignette
  pass(mats[1], rtA.texture, rtB);   // swirl
  pass(mats[2], rtB.texture, rtA);   // sine
  pass(mats[3], rtA.texture, rtB);   // bokeh
  pass(mats[4], rtB.texture, null);  // output → 屏
}

function loop(tms) {
  if (!running) return;
  requestAnimationFrame(loop);
  frame(tms / 1000);
}

export const dapplegl = {
  init() {
    if (REDUCED) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'dapplegl';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
    document.body.prepend(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    quadScene = new THREE.Scene();
    cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const noiseTex = makeNoiseTex();

    // —— haoqi light 主题原值 ——
    const mVignette = new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: 0.354 }, uFalloff: { value: 1 }, uDisplace: { value: 0 },
        uSkew: { value: 0.54 }, uAngle: { value: 0 }, uEdgeIntensity: { value: -0.16 },
        uVignetteColor: { value: new THREE.Color('#6196ff') },
        uClearColor: { value: new THREE.Color('#ffead6') },
        uPos: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: VERT, fragmentShader: FRAG_VIGNETTE, depthTest: false, depthWrite: false,
    });
    const mSwirl = new THREE.ShaderMaterial({
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) }, uPos: { value: new THREE.Vector2(0.5, 0.5) },
        tInput: { value: null },
        uRadius: { value: 0.25 }, uAngle: { value: 0.1 }, uPhase: { value: 0 },
        uTime: { value: 0 }, uMix: { value: 0.5 },
      },
      vertexShader: VERT, fragmentShader: FRAG_SWIRL, depthTest: false, depthWrite: false,
    });
    const mSine = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uMixRadius: { value: 1 }, uFrequency: { value: 0.35 }, uAmplitude: { value: 1.18 },
        uRotation: { value: 0 }, uTime: { value: 0 }, uTrackMouse: { value: 0 },
        uPos: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: VERT, fragmentShader: FRAG_SINE, depthTest: false, depthWrite: false,
    });
    const mBokeh = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null }, tBlueNoise: { value: noiseTex },
        uAmount: { value: 3.125 * PARAMS.dapple.bokeh }, uTilt: { value: 0.5 },
        uTime: { value: 0 }, uTrackMouse: { value: 0 }, uChroma: { value: PARAMS.dapple.chroma },
        uPos: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uBlueNoiseResolution: { value: new THREE.Vector2(128, 128) },
        uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: VERT, fragmentShader: FRAG_BOKEH, depthTest: false, depthWrite: false,
    });
    const mOutput = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uBgColor: { value: new THREE.Color('#ffead6') },
        uOutputColor: { value: new THREE.Color('#acffb9') },
        uOutputMix: { value: 0.65 },
      },
      vertexShader: VERT, fragmentShader: FRAG_OUTPUT, depthTest: false, depthWrite: false,
    });
    mats = [mVignette, mSwirl, mSine, mBokeh, mOutput];

    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mats[0]);
    quad.frustumCulled = false;
    quadScene.add(quad);

    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', (e) => {
      mouse.tx = e.clientX / innerWidth;
      mouse.ty = e.clientY / innerHeight;
    }, { passive: true });

    running = true;
    requestAnimationFrame(loop);
  },

  setEnabled(on) {
    const c = document.getElementById('dapplegl');
    if (c) c.style.display = on ? 'block' : 'none';
    if (on && !running) { running = true; requestAnimationFrame(loop); }
    if (!on) running = false;
  },
};
