<template>
  <div class="scene-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef"></canvas>
    <component :is="uiComponent" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, shallowRef } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { useModalStore } from '~/composables/useModalStore';

// --- PROPS ---
const props = defineProps({
  skinId: { type: String, required: true },
  isActive: { type: Boolean, default: false }
});

// --- VUE REACTIVE STATE ---
const canvasRef = ref(null);
const wrapperRef = ref(null);
const modalStore = useModalStore();
const supabase = useSupabaseClient();
let sceneKitApp = null;
const uiComponent = shallowRef(null);
const hasInitialized = ref(false);

const initializeScene = async () => {
  if (import.meta.server || hasInitialized.value) return;
  hasInitialized.value = true;

  const { data: skinData, error } = await supabase.from('skins').select('*').eq('id', props.skinId).single();
  if (error) { console.error("SceneKit Error: Failed to load skin data.", error); return; }

  if (skinData.ui_component_name) {
    try {
      const componentModule = await import(`./ui/${skinData.ui_component_name}.vue`);
      uiComponent.value = componentModule.default;
    } catch (e) { console.error(`SceneKit Error: Failed to load UI component: ./ui/${skinData.ui_component_name}.vue`, e); }
  }

  sceneKitApp = new SceneKitApp(wrapperRef.value, canvasRef.value, skinData, supabase, modalStore);
  await sceneKitApp.init();

  if (props.isActive) {
    sceneKitApp.resume();
  }
};


// --- LIFECYCLE HOOKS ---
onMounted(() => {
  if (props.isActive) {
    initializeScene();
  }
});

onUnmounted(() => {
  if (sceneKitApp) sceneKitApp.destroy();
});

watch(() => props.isActive, (newVal) => {
  if (newVal && !hasInitialized.value) {
    initializeScene();
  } else if (newVal) {
    sceneKitApp?.resume();
  } else {
    sceneKitApp?.pause();
  }
});

watch(() => modalStore.isOpen.value, (isOpen) => {
  if (!sceneKitApp) return;
  if (props.isActive) {
    isOpen ? sceneKitApp.pause() : sceneKitApp.resume();
  }
});

// =================================================================================================
// --- UNIVERSAL 3D ENGINE ---
// =================================================================================================
class SceneKitApp {
  constructor(wrapper, canvas, skinData, supabase, modalStore) {
    this.wrapper = wrapper; this.canvas = canvas; this.skinData = skinData; this.supabase = supabase; this.modalStore = modalStore;
    this.renderer = null; this.scene = null; this.camera = null;
    this.mainGroup = new THREE.Group(); this.clock = new THREE.Clock();
    this.controls = null; this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
    this.font = null; this.geometryCache = {};
    this.gltfLoader = new GLTFLoader(); 
    this.stlLoader = new STLLoader(); 
    this.textureLoader = new THREE.TextureLoader();
    this.svgLoader = new SVGLoader();
    this.nodesData = []; this.assetsData = [];
    this.clickableObjects = []; 
    this.attentionNodes = []; 
    this.allNodeGroups = [];
    this.attentionEffectUpdater = null;
    this.globalEffectUpdater = null;
    this.billboardGroups = [];
    this.needsRender = true; this.animationFrameId = null; this.isPaused = true;
    this.isEditMode = false; this.isProcessingClick = false;
    this.draggedObject = null; this.dragPlane = new THREE.Plane(); this.dragOffset = new THREE.Vector3();
  }

  async init() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      const [nodesResult, assetsResult] = await Promise.all([
          this.supabase.rpc('get_layout_data', { p_skin_id: this.skinData.id, p_user_id: user?.id }),
          this.supabase.from('skin_assets').select('*').eq('skin_id', this.skinData.id)
      ]);
      if (nodesResult.error) throw nodesResult.error;
      if (assetsResult.error) throw assetsResult.error;
      this.nodesData = nodesResult.data || [];
      this.assetsData = assetsResult.data || [];
      
      this.initScene();
      this.initControls();
      this.initEventListeners();
      await this.initSharedAssets();
      await this.createAssets();
      this.createNodes();
      this.initGlobalEffect();
      this.initAttentionEffect();
    } catch (error) { console.error("SceneKit Error: Failed to initialize.", error); }
  }

    // --- EFFECT FACTORY: Central place for all visual effects ---
    effectFactory = {
        'pulse': (nodes) => ({
            update: (deltaTime, elapsed) => {
                const pulseAmount = 1.0 + Math.sin(elapsed * 5) * 0.05;
                nodes.forEach(node => {
                    const baseScale = node.userData.baseScale || 1.0;
                    const finalScale = baseScale * pulseAmount;
                    node.scale.set(finalScale, finalScale, finalScale);
                });
            }
        }),
        'color-shift': (nodes) => {
            const highlightColor = new THREE.Color(0xf1c40f); // Bright yellow
            return {
                update: (deltaTime, elapsed) => {
                    const lerpFactor = (Math.sin(elapsed * 3) + 1) / 2; // Smoothly oscillates between 0 and 1
                    nodes.forEach(node => {
                        const iconMesh = node.children[0];
                        if (iconMesh && iconMesh.material && iconMesh.material.userData.originalColor) {
                            iconMesh.material.color.copy(iconMesh.material.userData.originalColor).lerp(highlightColor, lerpFactor);
                        }
                    });
                }
            };
        },
        'none': () => null,
    };

  SVG_PATHS = {
    'Icon_Mathematics': '<path d="M320-240h60v-80h80v-60h-80v-80h-60v80h-80v60h80v80Zm200-30h200v-60H520v60Zm0-100h200v-60H520v60Zm44-152 56-56 56 56 42-42-56-58 56-56-42-42-56 56-56-56-42 42 56 56-56 58 42 42Zm-314-70h200v-60H250v60Zm-50 472q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>',
    'Icon_Geography': '<path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm0-82q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/>',
    'Icon_History': '<path d="M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z"/>',
    'Icon_Chemistry': '<path d="M200-120q-51 0-72.5-45.5T138-250l222-270v-240h-40q-17 0-28.5-11.5T280-800q0-17 11.5-28.5T320-840h320q17 0 28.5 11.5T680-800q0 17-11.5 28.5T640-760h-40v240l222 270q32 39 10.5 84.5T760-120H200Zm80-120h400L544-400H416L280-240Zm-80 40h560L520-492v-268h-80v268L200-200Zm280-280Z"/>',
    'Icon_Astronomy': '<path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm457-560 21-89-71-59 94-8 36-84 36 84 94 8-71 59 21 89-80-47-80 47ZM480-481Z"/>',
    'Icon_Physics': '<path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z"/>',
    'Icon_Biology': '<path d="M600-80q-17 0-28.5-11.5T560-120v-43q-23-4-43.5-11.5T478-195l-40 40q-12 11-28.5 11.5T381-155q-12-12-12-28.5t12-28.5l41-41q-3-5-6-10.5t-6-10.5l-27-53-49 49q-12 11-28 11.5T278-278q-12-12-12-28t12-28l49-50-53-26q-5-2-9-4.5t-9-5.5l-36 36q-12 11-28.5 11.5T163-384q-12-12-12-28t12-28l35-35q-14-19-22.5-40.5T163-560h-43q-17 0-28.5-11.5T80-600q0-17 11.5-28.5T120-640h45q5-19 12-36t18-33l-35-35q-12-12-12-28t12-28q12-12 28-12t28 12l35 35q16-11 33-18t36-12v-45q0-17 11.5-28.5T360-880q17 0 28.5 11.5T400-840v43q24 4 45.5 13t40.5 23l35-35q12-12 28.5-12t28.5 12q12 12 12 28t-12 28l-37 37q2 4 4.5 8t4.5 9l25 50 46-46q12-12 28.5-12t28.5 12q12 12 12 28.5T678-625l-48 47 56 28q6 3 12.5 6.5T710-536l40-40q12-12 28-12t28 12q12 12 12 28.5T806-519l-40 39q12 18 19.5 38t11.5 42h43q17 0 28.5 11.5T880-360q0 17-11.5 28.5T840-320h-45q-5 19-12 35.5T765-252l34 34q12 12 12 28.5T799-161q-12 11-28.5 11.5T742-161l-33-34q-16 11-33 18t-36 12v45q0 17-11.5 28.5T600-80Zm-6-160q58 0 95.5-44T718-386q-5-30-22.5-54T650-478l-66-34q-23-12-41.5-30.5T512-584l-34-66q-16-32-46-51t-66-19q-58 0-95.5 44T242-574q5 30 22.5 54t45.5 38l66 34q23 12 41.5 30.5T448-376l34 66q16 32 46 51t66 19ZM380-540q25 0 42.5-17.5T440-600q0-25-17.5-42.5T380-660q-25 0-42.5 17.5T320-600q0 25 17.5 42.5T380-540Zm200 250q21 0 35.5-14.5T630-340q0-21-14.5-35.5T580-390q-21 0-35.5 14.5T530-340q0 21 14.5 35.5T580-290ZM480-480Z"/>',
    'Icon_Logic': '<path d="m234-480-12-60q-12-5-22.5-10.5T178-564l-58 18-40-68 46-40q-2-13-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T222-820l12-60h80l12 60q12 5 22.5 10.5T370-796l58-18 40 68-46 40q2 13 2 26t-2 26l46 40-40 68-58-18q-11 8-21.5 13.5T326-540l-12 60h-80Zm40-120q33 0 56.5-23.5T354-680q0-33-23.5-56.5T274-760q-33 0-56.5 23.5T194-680q0 33 23.5 56.5T274-600ZM592-40l-18-84q-17-6-31.5-14.5T514-158l-80 26-56-96 64-56q-2-18-2-36t2-36l-64-56 56-96 80 26q14-11 28.5-19.5T574-516l18-84h112l18 84q17 6 31.5 14.5T782-482l80-26 56 96-64 56q2 18 2 36t-2 36l64 56-56 96-80-26q-14 11-28.5 19.5T722-124l-18 84H592Zm56-160q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/>',
    'Icon_Psychology': '<path d="M390-120q-51 0-88-35.5T260-241q-60-8-100-53t-40-106q0-21 5.5-41.5T142-480q-11-18-16.5-38t-5.5-42q0-61 40-105.5t99-52.5q3-51 41-86.5t90-35.5q26 0 48.5 10t41.5 27q18-17 41-27t49-10q52 0 89.5 35t40.5 86q59 8 99.5 53T840-560q0 22-5.5 42T818-480q11 18 16.5 38.5T840-400q0 62-40.5 106.5T699-241q-5 50-41.5 85.5T570-120q-25 0-48.5-9.5T480-156q-19 17-42 26.5t-48 9.5Zm130-590v460q0 21 14.5 35.5T570-200q20 0 34.5-16t15.5-36q-21-8-38.5-21.5T550-306q-10-14-7.5-30t16.5-26q14-10 30-7.5t26 16.5q11 16 28 24.5t37 8.5q33 0 56.5-23.5T760-400q0-5-.5-10t-2.5-10q-17 10-36.5 15t-40.5 5q-17 0-28.5-11.5T640-440q0-17 11.5-28.5T680-480q33 0 56.5-23.5T760-560q0-33-23.5-56T680-640q-11 18-28.5 31.5T613-587q-16 6-31-1t-20-23q-5-16 1.5-31t22.5-20q15-5 24.5-18t9.5-30q0-21-14.5-35.5T570-760q-21 0-35.5 14.5T520-710Zm-80 460v-460q0-21-14.5-35.5T390-760q-21 0-35.5 14.5T340-710q0 16 9 29.5t24 18.5q16 5 23 20t2 31q-6 16-21 23t-31 1q-21-8-38.5-21.5T279-640q-32 1-55.5 24.5T200-560q0 33 23.5 56.5T280-480q17 0 28.5 11.5T320-440q0 17-11.5 28.5T280-400q-21 0-40.5-5T203-420q-2 5-2.5 10t-.5 10q0 33 23.5 56.5T280-320q20 0 37-8.5t28-24.5q10-14 26-16.5t30 7.5q14 10 16.5 26t-7.5 30q-14 19-32 33t-39 22q1 20 16 35.5t35 15.5q21 0 35.5-14.5T440-250Zm40-230Z"/>',
    'Icon_CompSci': '<path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z"/>',
    'Icon_Civics': '<path d="M80-120v-80h360v-447q-26-9-45-28t-28-45H240l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280h-80v-80h247q12-35 43-57.5t70-22.5q39 0 70 22.5t43 57.5h247v80h-80l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280H593q-9 26-28 45t-45 28v447h360v80H80Zm585-320h150l-75-174-75 174Zm-520 0h150l-75-174-75 174Zm335-280q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z"/>',
    'Icon_Economics': '<path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Zm36 120q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>'
  };

  _createSVGGeometry(shapeName) {
      if (this.geometryCache[shapeName]) {
          return this.geometryCache[shapeName].clone();
      }
      const svgPath = this.SVG_PATHS[shapeName];
      if (!svgPath) return null;
      
      const fullSvg = `<svg viewBox="0 -960 960 960">${svgPath}</svg>`;
      const data = this.svgLoader.parse(fullSvg);
      const paths = data.paths;
      const shapes = [];
      for (let i = 0; i < paths.length; i++) {
          shapes.push(...SVGLoader.createShapes(paths[i]));
      }
      const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 150, bevelEnabled: false });

      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const size = new THREE.Vector3();
      box.getSize(size);

      const scaleFactor = 3 / Math.max(size.x, size.y); 

      geometry.scale(scaleFactor, -scaleFactor, scaleFactor);
      geometry.center();

      this.geometryCache[shapeName] = geometry;
      return geometry.clone();
  }

  controlFactory = {
      'orbit': (camera, canvas) => { const c = new OrbitControls(camera, canvas); c.enableDamping = true; return c; },
      'pan': (camera, canvas) => {
        const c = new OrbitControls(camera, canvas);
        c.enableDamping = true; c.enableRotate = false;
        c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
        c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
        return c;
      },
      'static': () => ({ enabled: false, update: () => false, dispose: () => {} }),
    };

  initScene() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    this.scene = new THREE.Scene();
    this.scene.add(this.mainGroup);
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const initialPos = this.skinData.camera_initial_position?.position || [0, 0, 50];
    this.camera.position.set(...initialPos);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 30);
    this.scene.add(directionalLight);

    this.resize();
  }

  initControls() {
    const controlType = this.skinData.control_type || 'static';
    const initializer = this.controlFactory[controlType];
    this.controls = initializer ? initializer(this.camera, this.canvas) : this.controlFactory['static']();
  }

  async initSharedAssets() {
    const fontLoader = new FontLoader();
    this.font = await fontLoader.loadAsync('https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/helvetiker_regular.typeface.json');
    this.geometryCache['Box'] = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    this.geometryCache['Sphere'] = new THREE.SphereGeometry(1, 32, 16);
    this.geometryCache['Circle'] = new THREE.CircleGeometry(1.2, 64);
  }

  initEventListeners() {
    this.onWindowResize = this.resize.bind(this);
    window.addEventListener('resize', this.onWindowResize);
    let clickTimer = null;
    let activePointers = 0;
    const pointerDownCoords = new THREE.Vector2();
    const onPointerMove = (moveEvent) => {
        if (pointerDownCoords.distanceTo(new THREE.Vector2(moveEvent.clientX, moveEvent.clientY)) > 10) {
            clearTimeout(clickTimer);
            window.removeEventListener('pointermove', onPointerMove);
        }
    };
    this.onPointerDown = (e) => {
        if (this.isEditMode) {
            this.startDragging(e);
        } else {
            activePointers++;
            if (activePointers > 1) {
                clearTimeout(clickTimer);
                window.removeEventListener('pointermove', onPointerMove); 
                return;
            }
            pointerDownCoords.set(e.clientX, e.clientY);
            const eventCopy = { clientX: e.clientX, clientY: e.clientY };
            clickTimer = setTimeout(() => {
                this.handleClick(eventCopy);
                window.removeEventListener('pointermove', onPointerMove);
            }, 200);
            window.addEventListener('pointermove', onPointerMove);
        }
    };
    this.onPointerUp = (e) => {
        if (activePointers > 0) activePointers--;
        window.removeEventListener('pointermove', onPointerMove);
        if (this.draggedObject) {
            this.stopDragging();
        }
    };
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.onKeyDown = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === 'e') {
          this.isEditMode = !this.isEditMode;
          this.wrapper.style.border = this.isEditMode ? '2px solid #00ff00' : 'none';
          console.log(`Edit mode: ${this.isEditMode ? 'ON' : 'OFF'}`);
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
    this.controls.addEventListener('change', () => { this.needsRender = true; });
  }

 
  async createAssets() {
    const assetPromises = this.assetsData.map(assetData => {
        const url = assetData.url;
        if (!url) return Promise.resolve();
        let modelPromise;
        const params = assetData.parameters || {};

        if (url.endsWith('.stl')) {
            modelPromise = this.stlLoader.loadAsync(url).then(geometry => {
                geometry.computeVertexNormals();
                let material;
                const materialType = params.material || 'standard';

                if (materialType === 'phong') {
                    material = new THREE.MeshPhongMaterial({
                        color: new THREE.Color(params.color || 0x87ceeb),
                        shininess: params.shininess || 30,
                        transparent: params.transparent || false,
                        opacity: params.opacity || 1.0,
                    });
                } else if (materialType === 'basic_transparent') {
                    material = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(params.color || 0xffffff),
                        transparent: true,
                        opacity: params.opacity || 0.5,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    });
                } else { // 'standard' by default
                    material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(params.color || 0x87ceeb),
                        roughness: params.roughness || 0.5,
                        metalness: params.metalness || 0.1,
                        transparent: params.transparent || false,
                        opacity: params.opacity || 1.0,
                    });
                }
                return new THREE.Mesh(geometry, material);
            });
        } else if (url.endsWith('.glb') || url.endsWith('.gltf')) {
            modelPromise = this.gltfLoader.loadAsync(url).then(gltf => {
                const model = gltf.scene;
                if (params.transparent) {
                    model.traverse(child => {
                        if (child.isMesh) {
                            child.material.transparent = true;
                            child.material.opacity = params.opacity;
                        }
                    });
                }
                return model;
            });
        } else if (assetData.asset_type === 'image_plane') {
            return this.textureLoader.loadAsync(url).then(texture => {
                const geometry = new THREE.PlaneGeometry(params.width || 100, params.height || 100);
                const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
                const plane = new THREE.Mesh(geometry, material);
                plane.position.set(assetData.position.x, assetData.position.y, assetData.position.z);
                this.mainGroup.add(plane);
            });
        } else {
            console.warn(`Unknown asset type or file extension for url: ${url}`);
            return Promise.resolve();
        }

        return modelPromise.then(model => {
            model.position.set(assetData.position.x, assetData.position.y, assetData.position.z);
            model.scale.set(assetData.scale.x, assetData.scale.y, assetData.scale.z);
            model.rotation.set(assetData.rotation.x, assetData.rotation.y, assetData.rotation.z);
            this.mainGroup.add(model);
        });
    });
    await Promise.all(assetPromises);
    this.needsRender = true;
  }  
 
  createNodes() {
    this.nodesData.forEach(nodeData => {
        const nodeGroup = new THREE.Group();
        nodeGroup.userData.isNodeGroup = true;
        
        const shapeName = nodeData.shape;
        let geometry;

        if (this.geometryCache[shapeName]) {
            geometry = this.geometryCache[shapeName].clone();
        } else if (shapeName && shapeName.startsWith('Icon_')) {
            geometry = this._createSVGGeometry(shapeName);
        } else {
            geometry = (this.geometryCache['Circle'] || new THREE.CircleGeometry(1.2, 64)).clone();
        }
        
        if (!geometry) {
             console.error(`Could not create geometry for shape: "${shapeName}". Skipping node.`);
             return;
        }

      const baseColor = new THREE.Color(nodeData.base_color || '#FFFFFF');
      let initialColor;

      // Если урок в процессе (не 0% и не 100%), интерполируем цвет
      if (nodeData.lesson.progress > 0 && nodeData.lesson.progress < 100) {
          const startColor = new THREE.Color(0x555555);
          initialColor = new THREE.Color().lerpColors(startColor, baseColor, nodeData.lesson.progress / 100);
      } else {
          // Если урок доступен (0%) или пройден (100%), он должен быть ярким
          initialColor = baseColor;
      }

      const iconMaterial = new THREE.MeshStandardMaterial({ color: initialColor.clone() });
      
      // Базой для анимации ВСЕГДА будет яркий цвет, а не серый
      iconMaterial.userData.originalColor = baseColor.clone();
      
      const iconMesh = new THREE.Mesh(geometry, iconMaterial);
      nodeGroup.add(iconMesh);
        
        const textShapes = this.font.generateShapes(nodeData.lesson.game_id.toString(), 0.5);
        const textGeometry = new THREE.ShapeGeometry(textShapes);
        textGeometry.center();
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.y = -2.5; // Position text below the icon
        nodeGroup.add(textMesh);

        const hitboxSize = 5;
        const hitboxGeom = new THREE.PlaneGeometry(hitboxSize, hitboxSize);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false, depthWrite: false });
        const hitboxMesh = new THREE.Mesh(hitboxGeom, hitboxMat);
        hitboxMesh.userData = { lessonId: nodeData.lesson.id, layoutId: nodeData.layout_id };
        nodeGroup.add(hitboxMesh);

        nodeGroup.position.set(nodeData.coordinates.x, nodeData.coordinates.y, nodeData.coordinates.z);
        
        const scale = nodeData.scale_multiplier || 1.0;
        nodeGroup.scale.set(scale, scale, scale);
        nodeGroup.userData.baseScale = scale;
        
        nodeGroup.userData.isLocked = nodeData.lesson.prerequisites_met === false;
        
        this.mainGroup.add(nodeGroup);
        this.billboardGroups.push(nodeGroup);
        this.clickableObjects.push(hitboxMesh); 
        this.allNodeGroups.push(nodeGroup);
        if (nodeGroup.userData.isLocked) {
            iconMaterial.color.set(0x333333);
            iconMaterial.transparent = true;
            iconMaterial.opacity = 0.5;
            textMaterial.opacity = 0.5;
        } else if (nodeData.lesson.progress < 100) {
            this.attentionNodes.push(nodeGroup);
        }
    });
  }

  initGlobalEffect() {
    this.globalEffectUpdater = null;
    const effectType = this.skinData.visual_effect || 'none';
    const effectInitializer = this.effectFactory[effectType];
    
    if (effectInitializer) {
      const effect = effectInitializer(this.allNodeGroups);
      if (effect && effect.update) {
        this.globalEffectUpdater = (delta) => effect.update(delta, this.clock.getElapsedTime());
      }
    }
  }

  initAttentionEffect() {
    this.attentionEffectUpdater = null;
    const effectType = this.skinData.attention_effect || 'none';
    const effectInitializer = this.effectFactory[effectType];
    
    if (effectInitializer) {
      const effect = effectInitializer(this.attentionNodes);
      if (effect && effect.update) {
        this.attentionEffectUpdater = (delta) => effect.update(delta, this.clock.getElapsedTime());
      }
    }
  }

  handleClick(e) {
    if (this.isProcessingClick) return;
    this.isProcessingClick = true;
    setTimeout(() => { this.isProcessingClick = false; }, 300);

    const rect = this.wrapper.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / this.wrapper.clientWidth) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / this.wrapper.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const lessonId = clickedObject.userData.lessonId;
        
        let parentGroup = clickedObject.parent;
        while(parentGroup && parentGroup.parent !== this.mainGroup) {
             parentGroup = parentGroup.parent;
        }
        
        if (lessonId && !(parentGroup && parentGroup.userData.isLocked)) {
             this.modalStore.openLesson(lessonId);
        }
    }
  }
  onKeyDown = (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 'e') {
        this.isEditMode = !this.isEditMode;
        this.wrapper.style.border = this.isEditMode ? '2px solid #00ff00' : 'none';
        console.log(`Edit mode: ${this.isEditMode ? 'ON' : 'OFF'}`);
    }
  };
  startDragging(e) {
    const rect = this.wrapper.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / this.wrapper.clientWidth) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / this.wrapper.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (intersects.length > 0) {
      this.controls.enabled = false;
      let objectToDrag = intersects[0].object;
      while (objectToDrag.parent && objectToDrag.parent !== this.mainGroup) { 
          objectToDrag = objectToDrag.parent; 
      }
      this.draggedObject = objectToDrag;
      
      this.dragPlane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(this.dragPlane.normal), intersects[0].point);
      const intersectionPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
      this.dragOffset.copy(intersectionPoint).sub(this.draggedObject.position);
      
      this.onDragMove = (moveEvent) => {
        const moveRect = this.wrapper.getBoundingClientRect();
        this.mouse.x = ((moveEvent.clientX - moveRect.left) / this.wrapper.clientWidth) * 2 - 1;
        this.mouse.y = -((moveEvent.clientY - moveRect.top) / this.wrapper.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const point = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, point);
        this.draggedObject.position.copy(point.sub(this.dragOffset));
        this.needsRender = true;
      };
      window.addEventListener('pointermove', this.onDragMove);
    }
  }

  async stopDragging() {
    window.removeEventListener('pointermove', this.onDragMove);
    this.controls.enabled = true;
    if (this.draggedObject) {
      const hitbox = this.draggedObject.children.find(child => child.userData.layoutId);
      if (hitbox) {
        const newCoords = { x: this.draggedObject.position.x, y: this.draggedObject.position.y, z: this.draggedObject.position.z };
        const layoutId = hitbox.userData.layoutId;
        const { error } = await this.supabase.from('skin_layouts').update({ coordinates: newCoords }).eq('id', layoutId);
        if (error) console.error("Editor Error: Failed to save coordinates.", error);
        else console.log("Coordinates saved.");
      }
    }
    this.draggedObject = null;
    this.needsRender = true;
  }
  resize() {
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.needsRender = true;
  }

animate() {
    if (this.isPaused) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    
    if (this.globalEffectUpdater) {
      this.globalEffectUpdater(deltaTime);
      this.needsRender = true;
    }
    
    if (this.attentionEffectUpdater) {
      this.attentionEffectUpdater(deltaTime);
      this.needsRender = true;
    }

    const controlsUpdated = this.controls.update ? this.controls.update() : false;
    
    if (controlsUpdated || this.needsRender) {
        for(const group of this.billboardGroups) {
            group.quaternion.copy(this.camera.quaternion);
        }
        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
    }
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
 
  resume() {
    if (!this.isPaused) return;
    this.resize();
    
    this.isPaused = false;
    this.needsRender = true;
    this.initAttentionEffect();
    this.clock.getDelta(); 
    
    if (!this.animationFrameId) {
      this.animate();
    }
  }

  destroy() {
    this.pause();
    
    if (this.controls) this.controls.dispose();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    
    this.scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                 if (object.material.map) object.material.map.dispose();
                 object.material.dispose();
            }
        }
    });
    this.renderer.dispose();
  }
}
</script>

<style scoped>
/* Стили остаются без изменений */
.scene-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

