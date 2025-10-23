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
  isActive: { type: Boolean, default: false },
  programId: { type: String, default: null }
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

  sceneKitApp = new SceneKitApp(wrapperRef.value, canvasRef.value, skinData, supabase, modalStore, props.programId);
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
  constructor(wrapper, canvas, skinData, supabase, modalStore, programId) {
    this.wrapper = wrapper; this.canvas = canvas; this.skinData = skinData; this.supabase = supabase; this.modalStore = modalStore;
    this.renderer = null; this.scene = null; this.programId = programId; this.camera = null;
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
    // Шаг 1: Используем getSession(), он надежнее при инициализации
    let { data: { session } } = await this.supabase.auth.getSession();

    // Шаг 2: Если сессии нет ВООБЩЕ (даже анонимной), создаем её принудительно.
    // Это наша страховка, которая гарантирует наличие user.id.
    if (!session) {
      const { data: anonSessionData, error: anonError } = await this.supabase.auth.signInAnonymously();
      if (anonError) throw anonError; // Если даже анонимный вход не удался, прекращаем работу
      session = anonSessionData.session;
    }
    
    // Теперь мы на 100% уверены, что session и session.user существуют
    const user = session.user;

    // Шаг 3: Выполняем запросы, теперь уже без '?' у user.id
    const [nodesResult, assetsResult] = await Promise.all([
        this.supabase.rpc('get_layout_data', { p_skin_id: this.skinData.id, p_user_id: user.id, p_program_id: this.programId }),
        this.supabase.from('skin_assets').select('*').eq('skin_id', this.skinData.id)
    ]);

    if (nodesResult.error) throw nodesResult.error;
    if (assetsResult.error) throw assetsResult.error;

    this.nodesData = nodesResult.data || [];
    this.assetsData = assetsResult.data || [];
    
    // Остальная часть твоей функции инициализации
    this.initScene();
    this.initControls();
    this.initEventListeners();
    await this.initSharedAssets();
    await this.createAssets();
    this.createNodes();
    this.initGlobalEffect();
    this.initAttentionEffect();

  } catch (error) { 
    console.error("SceneKit Error: Failed to initialize.", error); 
  }
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

// СТАЛО
  _createSVGGeometry(shapeName, svgPath) { // <-- Новые аргументы
      // Кэш по-прежнему проверяется по имени
      if (this.geometryCache[shapeName]) {
          return this.geometryCache[shapeName].clone();
      }
      
      // Теперь мы проверяем не наличие в SVG_PATHS, а переданные данные
      if (!svgPath) {
          console.warn(`No SVG path data provided for shape: ${shapeName}`);
          return null; // Возвращаем null, если данных нет
      }
      
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

      // Кэшируем геометрию по-прежнему по имени
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
        } else if (nodeData.svg_path) {
        geometry = this._createSVGGeometry(shapeName, nodeData.svg_path);
                
        } else {
        geometry = (this.geometryCache[shapeName] || this.geometryCache['Circle']).clone();
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
                 this.modalStore.open('modals/LessonDetails', { lessonId: lessonId });
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

