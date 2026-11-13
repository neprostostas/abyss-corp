import * as T from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
const scene = new T.Scene();
scene.background = new T.Color('#033b51');
scene.fog = new T.FogExp2('#07516a', 0.018);
const camera = new T.OrthographicCamera(-7, 7, 5, -5, 0.1, 140);
// Antialiasing is already provided by the 4-sample scene target below.
const renderer = new T.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const pmrem = new T.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
room.dispose();
pmrem.dispose();
scene.environmentIntensity = 0.38;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.53;
controls.minZoom = 0.55;
controls.maxZoom = 3;
controls.autoRotateSpeed = 1.5;
function fit() {
  const aspect = innerWidth / innerHeight;
  const halfWidth = Math.max(aspect < 0.75 ? 5.5 : 6.6, 3.7 * aspect);
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfWidth / aspect;
  camera.bottom = -halfWidth / aspect;
  camera.updateProjectionMatrix();
}
function reset() {
  controls.autoRotate = false;
  document.querySelector('#rotate').textContent = 'Автообертання';
  document.querySelector('#rotate').setAttribute('aria-pressed', 'false');
  camera.zoom = 1;
  controls.target.set(-0.15, -0.18, 0.55);
  camera.position.set(8.85, 9.82, 15.55);
  fit();
  controls.update();
}
reset();
document.querySelector('#reset').onclick = reset;
document.querySelector('#rotate').onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  document.querySelector('#rotate').textContent = controls.autoRotate
    ? 'Зупинити обертання'
    : 'Автообертання';
  document
    .querySelector('#rotate')
    .setAttribute('aria-pressed', String(controls.autoRotate));
};
scene.add(new T.HemisphereLight('#71d0df', '#063342', 0.8));
const sun = new T.DirectionalLight('#fff0d0', 3.2);
sun.position.set(-3, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -12,
  right: 12,
  top: 12,
  bottom: -12,
  far: 40,
});
sun.shadow.bias = -0.001;
sun.shadow.radius = 4;
sun.shadow.intensity = 0.62;
scene.add(sun);
const caustic = { value: 0 };
new GLTFLoader().load(
  '/prototype-3d-scene/scene.glb',
  (g) => {
    const materials = new Map();
    g.scene.traverse((o) => {
      if (o.isLight) o.intensity = 0;
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          const materialKey = `${o.material.uuid}:${o.name === 'Ocean_backdrop'}:${o.name.startsWith('Distant') || o.name.startsWith('Background')}:${o.name.startsWith('Domed')}`;
          if (materials.has(materialKey)) {
            o.material = materials.get(materialKey);
            return;
          }
          o.material = o.material.clone();
          materials.set(materialKey, o.material);
          o.material.customProgramCacheKey = () =>
            `abyss10-${o.material.name.includes('deep teal')}-${o.material.name.includes('turquoise')}-${o.name.startsWith('Domed')}`;
          if (o.name === 'Ocean_backdrop') {
            o.material.color.set('#023446');
            o.material.emissive.set(0);
            o.material.roughness = 1;
          }
          if (o.material.name.includes('deep teal')) {
            o.material.color.set(
              o.name.startsWith('Distant') || o.name.startsWith('Background')
                ? '#082d40'
                : '#155660',
            );
            o.material.roughness = 0.85;
          }
          if (o.material.name.includes('seaweed')) {
            o.material.color.set('#19866a');
            o.material.roughness = 0.65;
          }
          if (o.material.name.includes('ivory'))
            o.material.color.set('#ffe1a4');
          if (o.material.name.includes('warm sand')) {
            o.material.color.set('#edc77e');
            o.material.emissive.set(0);
          }
          if (o.material.name.includes('golden')) {
            o.material.color.set('#ff9e00');
            o.material.roughness = 0.4;
          }
          if (o.material.name.includes('turquoise')) {
            o.material.color.set('#00aebd');
            o.material.metalness = 0;
            o.material.roughness = 0.13;
            if ('clearcoat' in o.material) {
              o.material.clearcoat = 0.35;
              o.material.clearcoatRoughness = 0.16;
            }
          }
          o.material.onBeforeCompile = (s) => {
            s.uniforms.waterTime = caustic;
            s.vertexShader =
              'varying vec3 waterWorld;varying vec3 paintCoord;\n' +
              s.vertexShader.replace(
                '#include <worldpos_vertex>',
                '#include <worldpos_vertex>\nwaterWorld=(modelMatrix*vec4(transformed,1.)).xyz;paintCoord=position;',
              );
            s.fragmentShader =
              'uniform float waterTime;varying vec3 waterWorld;varying vec3 paintCoord;\n' +
              s.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
float w=sin(waterWorld.x*3.6+sin(waterWorld.z*2.8+waterTime*.35))+sin(waterWorld.z*4.2-waterTime*.26+sin(waterWorld.x*2.7));float c=pow(max(0.,1.-abs(w)*2.8),8.);diffuseColor.rgb*=1.+c*.20;
${o.material.name.includes('deep teal') ? 'diffuseColor.rgb*=mix(.45,1.05,smoothstep(-2.,.1,waterWorld.y));' : ''}
${o.material.name.includes('turquoise') ? 'float f=pow(abs(dot(normalize(vNormal),normalize(vViewPosition))),.65);diffuseColor.rgb*=mix(vec3(.08,.42,.65),vec3(.15,1.,1.12),f);' : ''}
`,
              );
            if (o.material.name.includes('turquoise'))
              s.fragmentShader = s.fragmentShader.replace(
                '#include <opaque_fragment>',
                `float faceGlass=pow(max(dot(normal,vec3(0.,0.,1.)),0.),.45);
vec3 glassTint=mix(vec3(.001,.12,.19),vec3(.001,.60,.68),faceGlass);
float glint=pow(max(dot(normal,normalize(vec3(-.38,.58,1.))),0.),45.);
float glint2=pow(max(dot(normal,normalize(vec3(.65,-.45,.8))),0.),100.);
glassTint+=vec3(.42,.8,.82)*glint*.8+vec3(.05,.38,.41)*glint2*.45;
${o.name.startsWith('Domed') ? 'vec2 q=(paintCoord.xy-vec2(-.32,.43))/vec2(.25,.17);float paintedGlint=exp(-dot(q,q)*3.);glassTint=mix(glassTint,vec3(.38,.94,.96),paintedGlint*.9);' : ''}
outgoingLight=mix(outgoingLight,glassTint,.97);
#include <opaque_fragment>`,
              );
          };
        }
      }
    });
    scene.add(g.scene);
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => {
      if (o.name.startsWith('Lamp_lens')) {
        const p = new T.Vector3();
        o.getWorldPosition(p);
        const lamp = new T.SpotLight('#ffe4a0', 28, 8, 0.32, 0.8, 1.4);
        lamp.position.copy(p);
        lamp.target.position.copy(p).add(new T.Vector3(3, -1.8, 0.8));
        scene.add(lamp, lamp.target);
        // Keep both the light and its aim in the moving lens coordinate frame.
        o.attach(lamp);
        o.attach(lamp.target);
      }
    });
    window.abyss = { scene, camera, controls, renderer, sun, loaded: true };
    window.dispatchEvent(new Event('abyss-ready'));
    // Interaction has now moved every animated/selectable machine into its own group.
    // Batch only the remaining static, opaque surfaces, preserving every vertex.
    const batches = new Map();
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => {
      if (
        !o.isMesh ||
        Array.isArray(o.material) ||
        o.material.transparent ||
        o.userData.asset
      )
        return;
      const key = `${o.material.uuid}:${Object.keys(o.geometry.attributes).sort().join(',')}:${!!o.geometry.index}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(o);
    });
    let batchedMeshes = 0;
    for (const objects of batches.values()) {
      if (objects.length < 2) continue;
      const geometries = objects.map((o) =>
        o.geometry.clone().applyMatrix4(o.matrixWorld),
      );
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!geometry) continue;
      const batch = new T.Mesh(geometry, objects[0].material);
      batch.name = 'Static_batch';
      batch.castShadow = true;
      batch.receiveShadow = true;
      scene.add(batch);
      objects.forEach((o) => o.removeFromParent());
      batchedMeshes += objects.length - 1;
    }
    window.abyss.batchedMeshes = batchedMeshes;
    document.querySelector('#status').textContent =
      'Сцена завантажена · об’єм води за глибиною сцени · анімована каустика';
  },
  undefined,
  (e) => {
    document.querySelector('#status').textContent =
      'Помилка завантаження: ' + e.message;
    console.error(e);
  },
);
// Depth-limited integration through world-space water. Geometry depth terminates each ray.
scene.fog = null;
const target = new T.WebGLRenderTarget(
  renderer.domElement.width,
  renderer.domElement.height,
  {
    depthTexture: new T.DepthTexture(innerWidth, innerHeight),
    type: T.HalfFloatType,
    samples: 4,
  },
);
const waterScene = new T.Scene(),
  waterCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const waterMaterial = new T.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  uniforms: {
    colorBuffer: { value: target.texture },
    depthBuffer: { value: target.depthTexture },
    inverseProjection: { value: camera.projectionMatrixInverse },
    cameraWorld: { value: camera.matrixWorld },
    eye: { value: camera.position },
    waterTime: caustic,
  },
  vertexShader:
    'varying vec2 uvWater;void main(){uvWater=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: `
 varying vec2 uvWater;uniform sampler2D colorBuffer,depthBuffer;uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye;uniform float waterTime;
 vec3 worldAt(float d){vec4 p=inverseProjection*vec4(uvWater*2.-1.,d*2.-1.,1.);p/=p.w;return (cameraWorld*p).xyz;}
 void main(){vec3 surface=texture2D(colorBuffer,uvWater).rgb;float depth=texture2D(depthBuffer,uvWater).x;vec3 end=worldAt(depth);vec3 origin=worldAt(0.);vec3 ray=normalize(end-origin);float distanceToSurface=min(length(end-origin),60.);float stepLength=distanceToSurface/32.;vec3 scattered=vec3(0.);vec3 transmission=vec3(1.);
 for(int i=0;i<32;i++){vec3 p=origin+ray*(float(i)+.5)*stepLength;float density=.012*(1.-smoothstep(5.,12.,p.y));vec2 surfacePoint=p.xz+vec2(.16,-.08)*(10.-p.y);float pattern=sin(surfacePoint.x*1.8+sin(surfacePoint.y*1.4+waterTime*.09))*sin(surfacePoint.y*1.7+sin(surfacePoint.x*1.2));vec2 q1=(surfacePoint-vec2(-4.,-2.))/vec2(.50,1.8);vec2 q2=(surfacePoint-vec2(-.5,2.))/vec2(.55,2.0);vec2 q3=(surfacePoint-vec2(3.4,1.))/vec2(.6,1.7);float shaft=pow(max(pattern,0.),8.)*.20+exp(-dot(q1,q1))+exp(-dot(q2,q2))+exp(-dot(q3,q3));float overhead=exp(-max(0.,10.-p.y)*.045);vec3 extinction=vec3(1.4,.7,.52)*density;vec3 absorbed=vec3(1.)-exp(-extinction*stepLength);vec3 illumination=vec3(.004,.055,.09)+vec3(.025,.24,.31)*overhead*.35+vec3(.14,.6,.64)*overhead*shaft*2.;scattered+=transmission*absorbed*illumination;transmission*=vec3(1.)-absorbed;}
 gl_FragColor=vec4(surface*transmission+scattered,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
});
waterScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), waterMaterial));
const count = 600,
  positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 30;
  positions[i * 3 + 1] = Math.random() * 12;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
}
const particles = new T.BufferGeometry();
particles.setAttribute('position', new T.BufferAttribute(positions, 3));
scene.add(
  new T.Points(
    particles,
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {},
      vertexShader:
        'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(18./-p.z,1.,3.);}',
      fragmentShader:
        'void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.5,.8,.7,.20*(1.-smoothstep(.2,1.,r)));}',
    }),
  ),
);
addEventListener('resize', () => {
  fit();
  renderer.setSize(innerWidth, innerHeight);
  target.setSize(renderer.domElement.width, renderer.domElement.height);
});
renderer.setAnimationLoop((t) => {
  if (document.hidden) return;
  caustic.value = t * 0.001;
  if (window.prototypeFrame) window.prototypeFrame(t);
  else controls.update();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(waterScene, waterCamera);
});

document.querySelector('#compare').onclick = () => {
  document.body.classList.toggle('comparing');
  document
    .querySelector('#compare')
    .setAttribute(
      'aria-pressed',
      String(document.body.classList.contains('comparing')),
    );
};

// Capture the actual WebGL frame, including integrated water, at display resolution.
document.querySelector('#capture').onclick = () => {
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(waterScene, waterCamera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abyss-shallows-v10.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
};

import './interaction.js';
