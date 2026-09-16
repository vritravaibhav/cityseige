import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * SceneManager - Sets up Three.js scene, cameras, lighting, shadows,
 * city ground grid, and rendering pipeline.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    // Crisp, clear daytime sky (Zero fog on city map!)
    this.scene.background = new THREE.Color(0x385c7e);
    this.scene.fog = null;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    // Image-based lighting. Without an environment map every metalness>0.7 material
    // (steel, ironDark, gold, carPaintRed) has nothing to reflect and renders as a dead grey
    // slab - which was most of the city. This is the single biggest visual win per line.
    this._initEnvironment();

    // Cameras
    this._initCameras();

    // Lighting
    this._initLights();

    // Atmospheric sky, driven by the same sun vector as the key light
    this._initSky();

    // Ground & Environment
    this._initGround();

    // Post-processing chain (needs activeCamera, so it comes after _initCameras)
    this._initComposer();

    // Resize listener
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  _initCameras() {
    const aspect = window.innerWidth / window.innerHeight;

    // 1. Builder Isometric Camera
    this.builderZoom = 68;
    this.builderTarget = new THREE.Vector3(0, 0, 0);
    this.builderCamera = new THREE.OrthographicCamera(-this.builderZoom * aspect, this.builderZoom * aspect, this.builderZoom, -this.builderZoom, 1, 1200);
    this.builderCamera.position.set(90, 105, 90);
    this.builderCamera.lookAt(this.builderTarget);

    // 2. Combat / TPP Chase Camera
    this.combatCamera = new THREE.PerspectiveCamera(65, aspect, 0.5, 600);
    this.combatCamera.position.set(0, 15, -25);
    this.combatCamera.lookAt(0, 2, 0);

    // 3. Tactical Recon Camera (High-Altitude Satellite Perspective)
    this.reconCamera = new THREE.PerspectiveCamera(54, aspect, 1, 800);
    this.reconCamera.position.set(0, 155, 85);
    this.reconCamera.lookAt(0, 0, 0);

    // Active camera pointer
    this.activeCamera = this.builderCamera;

    // Cinematic Camera Swoop Transition
    this.swoopTween = null;

    this._initBuilderCameraControls();
  }

  panBy(dxPx, dyPx) {
    if (this.activeCamera !== this.builderCamera) return;

    // Convert pixel delta to world units based on orthographic zoom
    const worldUnitsPerPixel = (2 * this.builderZoom) / window.innerHeight;
    const dxWorld = dxPx * worldUnitsPerPixel;
    const dyWorld = dyPx * worldUnitsPerPixel;

    // Isometric projection mapping:
    // Dragging right moves target left along (-1, 0, 1)
    // Dragging down moves target up along (-1, 0, -1)
    const moveX = (-dxWorld * 0.707 - dyWorld * 0.707 * 1.3);
    const moveZ = (dxWorld * 0.707 - dyWorld * 0.707 * 1.3);

    this.builderTarget.x += moveX;
    this.builderTarget.z += moveZ;

    // Generous exploration bounds across the map
    this.builderTarget.x = Math.max(-85, Math.min(85, this.builderTarget.x));
    this.builderTarget.z = Math.max(-85, Math.min(85, this.builderTarget.z));

    this.builderCamera.position.set(this.builderTarget.x + 70, 80, this.builderTarget.z + 70);
    this.builderCamera.lookAt(this.builderTarget);
  }

  setZoom(newZoom) {
    this.builderZoom = Math.max(15, Math.min(100, newZoom));
    const aspect = window.innerWidth / window.innerHeight;
    this.builderCamera.left = -this.builderZoom * aspect;
    this.builderCamera.right = this.builderZoom * aspect;
    this.builderCamera.top = this.builderZoom;
    this.builderCamera.bottom = -this.builderZoom;
    this.builderCamera.updateProjectionMatrix();
  }

  _initBuilderCameraControls() {
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    window.addEventListener('contextmenu', (e) => {
      if (this.activeCamera === this.builderCamera) {
        e.preventDefault();
      }
    });

    // Right / Middle mouse panning fallback
    window.addEventListener('pointerdown', (e) => {
      if (this.activeCamera !== this.builderCamera) return;
      if (e.button === 2 || e.button === 1) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPanning || this.activeCamera !== this.builderCamera) return;
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.panBy(dx, dy);
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 2 || e.button === 1) {
        this.isPanning = false;
      }
    });

    // Mouse wheel / Trackpad pinch zoom (PREVENT BROWSER ZOOMING THE DOM!)
    window.addEventListener('wheel', (e) => {
      if (this.activeCamera === this.builderCamera) {
        e.preventDefault();
        const factor = e.ctrlKey ? 3 : 5;
        const deltaZoom = Math.sign(e.deltaY) * factor;
        this.setZoom(this.builderZoom + deltaZoom);
      }
    }, { passive: false });

    // Touch pinch-to-zoom for touchscreens / mobile (prevents DOM zooming)
    let initialPinchDist = 0;
    let initialZoom = this.builderZoom;

    window.addEventListener('touchstart', (e) => {
      if (this.activeCamera !== this.builderCamera) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialZoom = this.builderZoom;
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.activeCamera !== this.builderCamera) return;
      if (e.touches.length === 2 && initialPinchDist > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        if (currentDist > 5) {
          const ratio = initialPinchDist / currentDist;
          this.setZoom(initialZoom * ratio);
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDist = 0;
      }
    });

    // Keyboard Zoom Shortcuts (Ctrl +/-) & Arrow Pan
    window.addEventListener('keydown', (e) => {
      if (this.activeCamera !== this.builderCamera) return;

      // Intercept browser zoom keys so ONLY the 3D map zooms, NEVER the buttons!
      if (e.ctrlKey && (['+', '=', '-', '_', '0'].includes(e.key))) {
        e.preventDefault();
        if (['+', '='].includes(e.key)) {
          this.setZoom(this.builderZoom - 6);
        } else if (['-', '_'].includes(e.key)) {
          this.setZoom(this.builderZoom + 6);
        } else if (e.key === '0') {
          this.setZoom(48); // default view
        }
        return;
      }

      const panStep = 22;
      if (e.key === 'ArrowLeft') this.panBy(panStep, 0);
      else if (e.key === 'ArrowRight') this.panBy(-panStep, 0);
      else if (e.key === 'ArrowUp') this.panBy(0, panStep);
      else if (e.key === 'ArrowDown') this.panBy(0, -panStep);
    });
  }

  _initEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();
  }

  _initSky() {
    // A real scattering sky replaces the flat colour fill, so the horizon reads as atmosphere
    // instead of a hard seam where flat blue meets flat green.
    this.nightBackdrop = new THREE.Color(0x1a2634);
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 8.0;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;

    // Drive the sky's sun from the SAME vector as the key light so they always agree.
    const sunDir = this.sunLight.position.clone().normalize();
    u.sunPosition.value.copy(sunDir);
    this.scene.add(this.sky);
    this.scene.background = null;
  }

  _initComposer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = this.renderer.getPixelRatio();

    // Rendering to a target drops the context's MSAA, so request samples on the target itself.
    // HalfFloat prevents banding in the bloom accumulation.
    const rt = new THREE.WebGLRenderTarget(w * dpr, h * dpr, {
      samples: 4,
      type: THREE.HalfFloatType
    });

    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(dpr);

    // Kept as a field: setCameraMode() must repoint it or the composer renders the wrong camera.
    this.renderPass = new RenderPass(this.scene, this.activeCamera);
    this.composer.addPass(this.renderPass);

    // 11 materials set emissive up to intensity 2.0 (neon, sirens, molten iron, nitro).
    // With no bloom they clamped to flat pastel and read as painted-on, not glowing.
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.45, 0.5, 0.92);
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new OutputPass());
  }

  _initLights() {
    // Soft Ambient Light
    this.hemiLight = new THREE.HemisphereLight(0xbcd8ff, 0x2e4632, 0.30);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    // Sun / Main Directional Shadow Light (Crisp, warm daylight)
    this.sunLight = new THREE.DirectionalLight(0xfff2d0, 2.6);
    // ~37deg raking key light, deliberately OFF-AXIS from the builder camera at (90,105,90).
    // The old sun sat at the same ~45deg azimuth as the camera, so every shadow fell directly
    // behind its own building and was invisible; combined with a near-overhead angle the city
    // read as flat colour blocks. Now shadows rake across the view and give the city depth.
    this.sunLight.position.set(-70, 75, 70);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 300;
    // Tighter frustum = ~2x the effective shadow resolution for free.
    const shadowD = 95;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Alarm / City Siren Light (Dynamic red/blue strobing during siege)
    this.alarmLight = new THREE.PointLight(0xff0000, 0, 120);
    this.alarmLight.position.set(0, 25, 0);
    this.scene.add(this.alarmLight);
  }

  _initGround() {
    const groundSize = 340;

    // Grass & Terrain Plane (Lush, vibrant countryside landscape)
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d7034,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.3
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Subtle Grid Overlay for City Architect (Bounded strictly to 165m city diameter)
    this.gridHelper = new THREE.GridHelper(165, 30, 0x00e5ff, 0x243b2f);
    this.gridHelper.position.y = 0.02;
    this.gridHelper.visible = false; // Hidden on home screen by default!
    this.scene.add(this.gridHelper);

    // City Boundary Ring (visual glowing border at radius 82.5m)
    const ringGeo = new THREE.RingGeometry(82.0, 83.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    this.cityBorderRing = new THREE.Mesh(ringGeo, ringMat);
    this.cityBorderRing.rotation.x = -Math.PI / 2;
    this.cityBorderRing.position.y = 0.03;
    this.cityBorderRing.visible = false;
    this.scene.add(this.cityBorderRing);

    // Perimeter Wall / Natural Countryside Boundary (82.5m radius to connect directly to Main Gates)
    this._initPerimeter(82.5);
  }

  _initPerimeter(radius) {
    this.perimeterGroup = new THREE.Group();
    this.perimeterGroup.name = 'city_perimeter';

    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
    const wallHeight = 3.5;
    const segments = 36;
    const step = (Math.PI * 2) / segments;
    const wallWidth = (Math.PI * 2 * radius / segments) * 1.05; // 14.5m wide segments

    // Openings aligned with the 3 Main Gates: East (angle 0), South (angle PI/2), North (angle 3PI/2)
    for (let i = 0; i < segments; i++) {
      const angle = i * step;
      const isNorthGate = Math.abs(angle - (3 * Math.PI) / 2) < 0.22;
      const isEastGate = Math.abs(angle - 0) < 0.22 || Math.abs(angle - Math.PI * 2) < 0.22;
      const isSouthGate = Math.abs(angle - Math.PI / 2) < 0.22;

      if (isNorthGate || isEastGate || isSouthGate) {
        continue; // Keep opening for Main Gates!
      }

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, wallHeight, 1.2), fenceMat);
      wall.position.set(x, wallHeight / 2, z);
      wall.rotation.y = -angle + Math.PI / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.perimeterGroup.add(wall);
    }

    this.scene.add(this.perimeterGroup);
  }

  setAlarmLighting(active, elapsed = 0) {
    if (!active) {
      this.alarmLight.intensity = 0;
      return;
    }
    const flash = Math.sin(elapsed * 10);
    this.alarmLight.color.setHex(flash > 0 ? 0xff0044 : 0x0066ff);
    this.alarmLight.intensity = 2.5 + Math.abs(flash) * 3.0;
  }

  /**
   * Daylight scattering sky for the city/builder view, flat dark backdrop for the night raid.
   * The scene now uses a Sky mesh, so scene.background is null in daylight - writing
   * background.setHex() directly would throw.
   */
  _setSkyMood(isDaylight) {
    if (this.sky) this.sky.visible = isDaylight;
    this.scene.background = isDaylight ? null : this.nightBackdrop;
  }

  setCameraMode(mode) {
    if (mode === 'builder') {
      this.activeCamera = this.builderCamera;
      this.scene.fog = null; // Always 100% clear for home and city builder!
      this._setSkyMood(true);
    } else if (mode === 'recon') {
      this.activeCamera = this.reconCamera;
      this.scene.fog = null;
      this._setSkyMood(false);
      this.setDesignGridVisible(false);
    } else if (mode === 'combat') {
      this.activeCamera = this.combatCamera;
      this.scene.fog = new THREE.Fog(0x1a2634, 160, 340);
      this._setSkyMood(false);
      this.setDesignGridVisible(false);
    }
  }

  setDesignGridVisible(visible) {
    if (this.gridHelper) this.gridHelper.visible = visible;
    if (this.cityBorderRing) this.cityBorderRing.visible = visible;
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    // Update Builder Ortho Cam
    const d = 50;
    this.builderCamera.left = -d * aspect;
    this.builderCamera.right = d * aspect;
    this.builderCamera.top = d;
    this.builderCamera.bottom = -d;
    this.builderCamera.updateProjectionMatrix();

    // Update Perspective Cams
    this.combatCamera.aspect = aspect;
    this.combatCamera.updateProjectionMatrix();

    this.reconCamera.aspect = aspect;
    this.reconCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setSize(width, height);
      this.bloomPass.setSize(width, height);
    }
  }

  startCameraSwoop(startPos, startLook, endPos, endLook, duration = 1.5, onComplete = null) {
    this.swoopTween = {
      startPos: startPos.clone(),
      startLook: startLook.clone(),
      endPos: endPos.clone(),
      endLook: endLook.clone(),
      duration,
      elapsed: 0,
      onComplete
    };
    this.combatCamera.position.copy(startPos);
    this.combatCamera.lookAt(startLook);
    this.activeCamera = this.combatCamera;
    this.gridHelper.visible = false;
  }

  update(delta) {
    if (this.swoopTween) {
      const t = this.swoopTween;
      t.elapsed += delta;
      const progress = Math.min(1.0, t.elapsed / t.duration);
      // Smooth easeInOutCubic curve
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentPos = new THREE.Vector3().lerpVectors(t.startPos, t.endPos, ease);
      currentPos.y += Math.sin(progress * Math.PI) * 12; // swooping arc
      const currentLook = new THREE.Vector3().lerpVectors(t.startLook, t.endLook, ease);

      this.combatCamera.position.copy(currentPos);
      this.combatCamera.lookAt(currentLook);

      if (progress >= 1.0) {
        const cb = t.onComplete;
        this.swoopTween = null;
        if (cb) cb();
      }
    }
  }

  render() {
    if (this.composer) {
      this.renderPass.camera = this.activeCamera;
      this.composer.render();
      return;
    }
    this.renderer.render(this.scene, this.activeCamera);
  }
}
