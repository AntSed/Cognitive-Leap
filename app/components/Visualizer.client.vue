<!-- File: components/Visualizer.client.vue -->
<template>
  <div class="sv-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef"></canvas>
    <!-- Кнопка смены 3D-модели (появляется только в режиме "Голова") -->
    <div v-if="skin.navigation_mode === 2" class="sv-controls">
        <button @click="switchModel" class="sv-button" aria-label="Switch Model">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/>
            </svg>
        </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as THREE from 'three';
// Общие импорты для обоих режимов
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { useModalStore } from '~/composables/useModalStore';

// --- PROPS ---
const props = defineProps({
  skin: {
    type: Object,
    required: true,
  }
});

// --- CONFIGURATION ---
const CONFIG = {
  CAMERA_INITIAL_POSITION_TREE: [0, 0, 70],
  CAMERA_INITIAL_POSITION_HEAD: [80, 0, 5],
  LESSON_NODE_TEXT_SIZE: 0.25,
  FONT_URL: 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/helvetiker_regular.typeface.json',
  PROGRESS_COLORS: { start: 0x197a0c, end: 0xFF0000 },
  TREE: {
    PAN_SENSITIVITY: 0.1,
    ZOOM_SENSITIVITY: 0.05,
    IMAGE_URL: 'https://cdopmabluqeueagtsjlv.supabase.co/storage/v1/object/public/3d/tree.png',
    NODE_SCALE: 0.5,
  },
  HEAD: {
    ROTATION_SENSITIVITY: 0.005,
    ZOOM_SENSITIVITY: 0.05,
    MODELS: [
        { name: 'Stoya', url: 'https://cdopmabluqeueagtsjlv.supabase.co/storage/v1/object/public/3d/Stoya.stl', scale: 0.75, position: [0, -13, -2], rotation: [-Math.PI / 2, 0, 0] },
        { name: 'Lee Perry Smith', url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb', scale: 8, position: [0, -16, 0], rotation: [0, 0, 0] }
    ]
  }
};

// --- VUE REACTIVE STATE ---
const canvasRef = ref(null);
const wrapperRef = ref(null);
let threeApp = null;
const supabase = useSupabaseClient();
const modalStore = useModalStore();

// --- ОСНОВНАЯ ЛОГИКА ---
const initializeScene = async () => {
    if (threeApp) {
        threeApp.destroy();
        threeApp = null;
    }
    if (process.server || !wrapperRef.value || !props.skin) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        let userId = user?.id;
        if (!userId) {
            const { data: anonUser, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            userId = anonUser?.user?.id;
        }

        const { data: skinData, error } = await supabase.rpc('get_layout_data', { 
            p_skin_id: props.skin.id, 
            p_user_id: userId 
        });
        
        if (error) throw error;
        if (!skinData || skinData.length === 0) {
             console.warn(`No layout data for skin ID: ${props.skin.id}`);
             return;
        }

        threeApp = new ThreeApp(wrapperRef.value, canvasRef.value, skinData, props.skin.navigation_mode, CONFIG, modalStore, supabase);
        threeApp.init();

    } catch (e) {
        console.error(`An unexpected error occurred: ${e.message}`);
    }
};

// --- LIFECYCLE HOOKS ---
onMounted(initializeScene);
onUnmounted(() => { if (threeApp) threeApp.destroy(); });
watch(() => props.skin.id, initializeScene);

// --- UI HANDLERS ---
const switchModel = () => {
    if (threeApp && typeof threeApp.switchModel === 'function') {
        threeApp.switchModel();
    }
};

// --- IconFactory ---
const IconFactory = {
    _loader: new SVGLoader(),
    _cache: {},
    createGeometry(shapeName) {
        if (this._cache[shapeName]) return this._cache[shapeName].clone();
        const svgPaths = {
            'Coin': '<path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Zm36 120q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>',
            'Lightning': '<path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z"/>',
            'Flask': '<path d="M200-120q-51 0-72.5-45.5T138-250l222-270v-240h-40q-17 0-28.5-11.5T280-800q0-17 11.5-28.5T320-840h320q17 0 28.5 11.5T680-800q0 17-11.5 28.5T640-760h-40v240l222 270q32 39 10.5 84.5T760-120H200Zm80-120h400L544-400H416L280-240Zm-80 40h560L520-492v-268h-80v268L200-200Zm280-280Z"/>',
            'Cell': '<path d="M600-80q-17 0-28.5-11.5T560-120v-43q-23-4-43.5-11.5T478-195l-40 40q-12 11-28.5 11.5T381-155q-12-12-12-28.5t12-28.5l41-41q-3-5-6-10.5t-6-10.5l-27-53-49 49q-12 11-28 11.5T278-278q-12-12-12-28t12-28l49-50-53-26q-5-2-9-4.5t-9-5.5l-36 36q-12 11-28.5 11.5T163-384q-12-12-12-28t12-28l35-35q-14-19-22.5-40.5T163-560h-43q-17 0-28.5-11.5T80-600q0-17 11.5-28.5T120-640h45q5-19 12-36t18-33l-35-35q-12-12-12-28t12-28q12-12 28-12t28 12l35 35q16-11 33-18t36-12v-45q0-17 11.5-28.5T360-880q17 0 28.5 11.5T400-840v43q24 4 45.5 13t40.5 23l35-35q12-12 28.5-12t28.5 12q12 12 12 28t-12 28l-37 37q2 4 4.5 8t4.5 9l25 50 46-46q12-12 28.5-12t28.5 12q12 12 12 28.5T678-625l-48 47 56 28q6 3 12.5 6.5T710-536l40-40q12-12 28-12t28 12q12 12 12 28.5T806-519l-40 39q12 18 19.5 38t11.5 42h43q17 0 28.5 11.5T880-360q0 17-11.5 28.5T840-320h-45q-5 19-12 35.5T765-252l34 34q12 12 12 28.5T799-161q-12 11-28.5 11.5T742-161l-33-34q-16 11-33 18t-36 12v45q0 17-11.5 28.5T600-80Zm-6-160q58 0 95.5-44T718-386q-5-30-22.5-54T650-478l-66-34q-23-12-41.5-30.5T512-584l-34-66q-16-32-46-51t-66-19q-58 0-95.5 44T242-574q5 30 22.5 54t45.5 38l66 34q23 12 41.5 30.5T448-376l34 66q16 32 46 51t66 19ZM380-540q25 0 42.5-17.5T440-600q0-25-17.5-42.5T380-660q-25 0-42.5 17.5T320-600q0 25 17.5 42.5T380-540Zm200 250q21 0 35.5-14.5T630-340q0-21-14.5-35.5T580-390q-21 0-35.5 14.5T530-340q0 21 14.5 35.5T580-290ZM480-480Z"/>',
            'Calculator': '<path d="M320-240h60v-80h80v-60h-80v-80h-60v80h-80v60h80v80Zm200-30h200v-60H520v60Zm0-100h200v-60H520v60Zm44-152 56-56 56 56 42-42-56-58 56-56-42-42-56 56-56-56-42 42 56 56-56 58 42 42Zm-314-70h200v-60H250v60Zm-50 472q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>',
            'Globe': '<path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm0-82q26-36 45-75t31-83H404q12 44 31 83t45 75Zm-104-16q-18-33-31.5-68.5T322-320H204q29 50 72.5 87t99.5 55Zm208 0q56-18 99.5-55t72.5-87H638q-9 38-22.5 73.5T584-178ZM170-400h136q-3-20-4.5-39.5T300-480q0-21 1.5-40.5T306-560H170q-5 20-7.5 39.5T160-480q0 21 2.5 40.5T170-400Zm216 0h188q3-20 4.5-39.5T580-480q0-21-1.5-40.5T574-560H386q-3 20-4.5 39.5T380-480q0 21 1.5 40.5T386-400Zm268 0h136q5-20 7.5-39.5T800-480q0-21-2.5-40.5T790-560H654q3 20 4.5 39.5T660-480q0 21-1.5 40.5T654-400Zm-16-240h118q-29-50-72.5-87T584-782q18 33 31.5 68.5T638-640Zm-234 0h152q-12-44-31-83t-45-75q-26 36-45 75t-31 83Zm-200 0h118q9-38 22.5-73.5T376-782q-56 18-99.5 55T204-640Z"/>',
            'Terminal': '<path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z"/>',
            'Clock': '<path d="M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z"/>',
            'Gears': '<path d="m234-480-12-60q-12-5-22.5-10.5T178-564l-58 18-40-68 46-40q-2-13-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T222-820l12-60h80l12 60q12 5 22.5 10.5T370-796l58-18 40 68-46 40q2 13 2 26t-2 26l46 40-40 68-58-18q-11 8-21.5 13.5T326-540l-12 60h-80Zm40-120q33 0 56.5-23.5T354-680q0-33-23.5-56.5T274-760q-33 0-56.5 23.5T194-680q0 33 23.5 56.5T274-600ZM592-40l-18-84q-17-6-31.5-14.5T514-158l-80 26-56-96 64-56q-2-18-2-36t2-36l-64-56 56-96 80 26q14-11 28.5-19.5T574-516l18-84h112l18 84q17 6 31.5 14.5T782-482l80-26 56 96-64 56q2 18 2 36t-2 36l64 56-56 96-80-26q-14 11-28.5 19.5T722-124l-18 84H592Zm56-160q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/>',
            'Stars': '<path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm457-560 21-89-71-59 94-8 36-84 36 84 94 8-71 59 21 89-80-47-80 47ZM480-481Z"/>',
            'Scales': '<path d="M80-120v-80h360v-447q-26-9-45-28t-28-45H240l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280h-80v-80h247q12-35 43-57.5t70-22.5q39 0 70 22.5t43 57.5h247v80h-80l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280H593q-9 26-28 45t-45 28v447h360v80H80Zm585-320h150l-75-174-75 174Zm-520 0h150l-75-174-75 174Zm335-280q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z"/>',
            'Brain': '<path d="M390-120q-51 0-88-35.5T260-241q-60-8-100-53t-40-106q0-21 5.5-41.5T142-480q-11-18-16.5-38t-5.5-42q0-61 40-105.5t99-52.5q3-51 41-86.5t90-35.5q26 0 48.5 10t41.5 27q18-17 41-27t49-10q52 0 89.5 35t40.5 86q59 8 99.5 53T840-560q0 22-5.5 42T818-480q11 18 16.5 38.5T840-400q0 62-40.5 106.5T699-241q-5 50-41.5 85.5T570-120q-25 0-48.5-9.5T480-156q-19 17-42 26.5t-48 9.5Zm130-590v460q0 21 14.5 35.5T570-200q20 0 34.5-16t15.5-36q-21-8-38.5-21.5T550-306q-10-14-7.5-30t16.5-26q14-10 30-7.5t26 16.5q11 16 28 24.5t37 8.5q33 0 56.5-23.5T760-400q0-5-.5-10t-2.5-10q-17 10-36.5 15t-40.5 5q-17 0-28.5-11.5T640-440q0-17 11.5-28.5T680-480q33 0 56.5-23.5T760-560q0-33-23.5-56T680-640q-11 18-28.5 31.5T613-587q-16 6-31-1t-20-23q-5-16 1.5-31t22.5-20q15-5 24.5-18t9.5-30q0-21-14.5-35.5T570-760q-21 0-35.5 14.5T520-710Zm-80 460v-460q0-21-14.5-35.5T390-760q-21 0-35.5 14.5T340-710q0 16 9 29.5t24 18.5q16 5 23 20t2 31q-6 16-21 23t-31 1q-21-8-38.5-21.5T279-640q-32 1-55.5 24.5T200-560q0 33 23.5 56.5T280-480q17 0 28.5 11.5T320-440q0 17-11.5 28.5T280-400q-21 0-40.5-5T203-420q-2 5-2.5 10t-.5 10q0 33 23.5 56.5T280-320q20 0 37-8.5t28-24.5q10-14 26-16.5t30 7.5q14 10 16.5 26t-7.5 30q-14 19-32 33t-39 22q1 20 16 35.5t35 15.5q21 0 35.5-14.5T440-250Zm40-230Z"/>'
        };
        const svgMarkup = `<svg viewBox="0 -960 960 960">${svgPaths[shapeName] || svgPaths['default']}</svg>`;
        const svgData = this._loader.parse(svgMarkup);
        const geometries = svgData.paths.flatMap(path => SVGLoader.createShapes(path).map(shape => new THREE.ShapeGeometry(shape)));
        if (geometries.length === 0) return new THREE.PlaneGeometry(1, 1);
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        mergedGeometry.center();
        const scale = 1.3 / 960;
        mergedGeometry.scale(scale, -scale, scale);
        this._cache[shapeName] = mergedGeometry;
        return mergedGeometry.clone();
    }
};

// =================================================================================================
// --- CORE THREE.JS APPLICATION CLASS ---
// =================================================================================================
class ThreeApp {
    constructor(wrapper, canvas, skinData, navigationMode, config, modalStore, supabase) {
        this.wrapper = wrapper;
        this.canvas = canvas;
        this.skinData = skinData;
        this.navigationMode = navigationMode;
        this.config = config;
        this.modalStore = modalStore;
        this.supabase = supabase;
        
        this.font = null;
        this.clickableObjects = [];
        this.instancedMeshes = [];
        this.textMeshes = [];
        this.currentHeadModel = null;
        this.currentModelIndex = 0;
        this.animationFrameId = null;

        this.isEditMode = false;
        this.draggedObject = null;
        this.dragPlane = new THREE.Plane();
        this.dragOffset = new THREE.Vector3();
        this.touchMoved = false;
        this.initialPinchDistance = 0;
        this.isProcessingClick = false;
        this.needsRender = true;
    }

    init() {
        this.initScene();
        this.initSharedAssets(() => {
            this.initModels();
            this.animate();
        });
        this.initControls();
    }
    
    initSharedAssets(callback) {
        const fontLoader = new FontLoader();
        fontLoader.load(this.config.FONT_URL, (font) => {
            this.font = font;
            callback();
        });
    }

    initScene() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas, alpha: true });
        this.renderer.setSize(this.wrapper.clientWidth, this.wrapper.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.wrapper.clientWidth / this.wrapper.clientHeight, 0.1, 1000);
        
        const initialPos = this.navigationMode === 1 ? this.config.CAMERA_INITIAL_POSITION_TREE : this.config.CAMERA_INITIAL_POSITION_HEAD;
        this.camera.position.set(...initialPos);
        this.camera.lookAt(this.scene.position);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(10, 20, 30);
        this.scene.add(directionalLight);
        this.renderer.shadowMap.enabled = false;
        
        this.mainGroup = new THREE.Group();
        this.scene.add(this.mainGroup);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    initModels() {
        if (this.navigationMode === 1) {
            this.createTreePlane();
            this.createTreeLessonNodes();
        } else if (this.navigationMode === 2) {
            this.loadHeadModel(this.config.HEAD.MODELS[this.currentModelIndex]);
            this.createHeadLessonNodes();
        }
    }

    initControls() {
        this.mouseMoved = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);

        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('wheel', this.onWheel);
        window.addEventListener('resize', this.onWindowResize);
    }
    
    getColorForProgress(progress) {
        const startColor = new THREE.Color(this.config.PROGRESS_COLORS.start);
        const endColor = new THREE.Color(this.config.PROGRESS_COLORS.end);
        const color = new THREE.Color();
        color.lerpColors(startColor, endColor, progress / 100);
        return color;
    }

    createTreePlane() {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(this.config.TREE.IMAGE_URL, (texture) => {
            this.needsRender = true; 
            const geometry = new THREE.PlaneGeometry(60, 60);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(0, 0, -0.1);
            this.mainGroup.add(plane);
        });
    }

    createTreeLessonNodes() {
        this.skinData.forEach(item => {
            const group = new THREE.Group();
            group.position.set(item.coordinates.x, item.coordinates.y, item.coordinates.z);
            group.scale.setScalar(this.config.TREE.NODE_SCALE);
            if (item.rotation) {
                group.rotation.z = item.rotation * (Math.PI / 180);
            }
            group.userData = item;

            // --- 1. Создаем невидимый ХИТБОКС, который на 50% больше ---
            const hitboxGeometry = new THREE.CircleGeometry(1.2 * 1.5, 32); // 1.2 - радиус яблока, * 1.5 = +50%
            const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false }); // Делаем его невидимым
            const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
            
            // --- 2. Добавляем хитбокс в группу ---
            // Он будет первым и главным объектом для raycaster'а
            group.add(hitboxMesh);

            // --- Все видимые части остаются без изменений ---
            const fruitColor = this.getColorForProgress(item.lesson.progress);
            const fruitMaterial = new THREE.MeshBasicMaterial({ color: fruitColor });
            const fruitGeometry = new THREE.CircleGeometry(1.2, 64);
            const fruitMesh = new THREE.Mesh(fruitGeometry, fruitMaterial);
            group.add(fruitMesh);

            const iconGeometry = IconFactory.createGeometry(item.shape);
            const iconMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
            const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
            iconMesh.position.set(0, 0.3, 0.01);
            iconMesh.scale.setScalar(0.8);
            group.add(iconMesh);

            const shapes = this.font.generateShapes(item.lesson.game_id.toString(), this.config.LESSON_NODE_TEXT_SIZE);
            const textGeometry = new THREE.ShapeGeometry(shapes);
            textGeometry.center();
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(0, -0.6, 0.01);
            group.add(textMesh);
            
            this.mainGroup.add(group);
            this.clickableObjects.push(group);
        });
    }
    
    loadHeadModel(modelInfo) {
        if (this.currentHeadModel) {
            this.mainGroup.remove(this.currentHeadModel);
        }
        const material = new THREE.MeshBasicMaterial({
            color: 0x87ceeb, transparent: true, opacity: 0.1, roughness: 0.1, metalness: 0.2, transmission: 0.9, ior: 1.5, side: THREE.DoubleSide, depthWrite: false
        });
        const onModelLoaded = (object) => {
            this.needsRender = true; 
            this.currentHeadModel = object;
            this.currentHeadModel.scale.setScalar(modelInfo.scale);
            this.currentHeadModel.position.set(...modelInfo.position);
            if (modelInfo.rotation) {
                this.currentHeadModel.rotation.set(...modelInfo.rotation);
            }
            this.currentHeadModel.traverse((child) => { if (child.isMesh) { child.material = material; } });
            this.mainGroup.add(this.currentHeadModel);
        };
        if (modelInfo.url.endsWith('.stl')) {
            const loader = new STLLoader();
            loader.load(modelInfo.url, (geometry) => onModelLoaded(new THREE.Mesh(geometry, material)));
        } else {
            const loader = new GLTFLoader();
            loader.load(modelInfo.url, (gltf) => onModelLoaded(gltf.scene));
        }
    }

    switchModel() {
        this.needsRender = true; 
        this.currentModelIndex = (this.currentModelIndex + 1) % this.config.HEAD.MODELS.length;
        this.loadHeadModel(this.config.HEAD.MODELS[this.currentModelIndex]);
    }

    createHeadLessonNodes() {
        // Очищаем массивы перед новым созданием
        this.instancedMeshes = [];
        this.hitboxMeshes = []; // Массив для невидимых хитбоксов
        this.textMeshes = [];

        // Словарь с готовыми геометриями для разных форм
        const geometries = { 
            'Sphere': new THREE.SphereGeometry(0.5, 16, 16), 
            'Box': new THREE.BoxGeometry(0.8, 0.8, 0.8), 
            'Tetrahedron': new THREE.TetrahedronGeometry(0.7), 
            'Octahedron': new THREE.OctahedronGeometry(0.6), 
            'Dodecahedron': new THREE.DodecahedronGeometry(0.5), 
            'Icosahedron': new THREE.IcosahedronGeometry(0.5, 0), 
            'Torus': new THREE.TorusGeometry(0.4, 0.15, 16, 100), 
            'TorusKnot': new THREE.TorusKnotGeometry(0.4, 0.1, 100, 16), 
            'Cylinder': new THREE.CylinderGeometry(0.4, 0.4, 0.8, 32), 
            'Cone': new THREE.ConeGeometry(0.4, 0.8, 32), 
            'Capsule': new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), 
            'Ring': new THREE.RingGeometry(0.3, 0.5, 32), 
            'default': new THREE.IcosahedronGeometry(0.5, 0) 
        };

        // Группируем уроки по форме для создания одного InstancedMesh на каждую форму
        const lessonsByShape = this.skinData.reduce((acc, item) => { 
            const shape = item.shape || 'default'; 
            if (!acc[shape]) acc[shape] = []; 
            acc[shape].push(item); 
            return acc; 
        }, {});
        
        // Проходимся по каждой группе форм
        for (const shape in lessonsByShape) {
            const group = lessonsByShape[shape];
            const geometry = geometries[shape] || geometries['default'];
            
            // 1. Создаем видимую сетку, которую будет видеть пользователь
            const visibleMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
            const visibleMesh = new THREE.InstancedMesh(geometry, visibleMaterial, group.length);
            
            // 2. Создаем невидимую сетку хитбоксов, которая будет на 100% больше
            const hitboxGeometry = geometry.clone().scale(2, 2, 2);
            const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
            const hitboxMesh = new THREE.InstancedMesh(hitboxGeometry, hitboxMaterial, group.length);
            
            // Используем один объект-пустышку для установки позиций
            const dummy = new THREE.Object3D();
            
            group.forEach((item, index) => {
                dummy.position.set(item.coordinates.x, item.coordinates.y, item.coordinates.z);
                dummy.scale.set(item.scale || 1, item.scale || 1, item.scale || 1);
                dummy.updateMatrix();

                // Применяем одинаковые трансформации и к видимой части, и к хитбоксу
                visibleMesh.setMatrixAt(index, dummy.matrix);
                hitboxMesh.setMatrixAt(index, dummy.matrix);

                // Данные урока привязываем к хитбоксу, так как кликать будем по нему
                hitboxMesh.userData[index] = item; 

                // Цвет в зависимости от прогресса устанавливаем только для видимой части
                const progress = item.lesson.progress || 0;
                const instanceColor = this.getColorForProgress(progress);
                visibleMesh.setColorAt(index, instanceColor);
            });
                
                // Помечаем, что матрицы и цвета нужно обновить
                visibleMesh.instanceMatrix.needsUpdate = true;
                visibleMesh.instanceColor.needsUpdate = true;
                hitboxMesh.instanceMatrix.needsUpdate = true;
                
                // Добавляем в сцену только видимую часть
                this.mainGroup.add(visibleMesh);
                
                // Сохраняем обе сетки в соответствующие массивы
                this.instancedMeshes.push(visibleMesh);
                this.hitboxMeshes.push(hitboxMesh);
            }

        // Создание текстовых меток остается без изменений
        this.skinData.forEach(item => {
            const shapes = this.font.generateShapes(item.lesson.game_id.toString(), this.config.LESSON_NODE_TEXT_SIZE);
            const textGeometry = new THREE.ShapeGeometry(shapes);
            textGeometry.center();
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(item.coordinates.x, item.coordinates.y - (item.scale || 1) * 0.8, item.coordinates.z);
            this.mainGroup.add(textMesh);
            this.textMeshes.push(textMesh);
        });
    }
    
    onKeyDown(e) {
        if (e.shiftKey && e.key.toLowerCase() === 'e') {
            this.isEditMode = !this.isEditMode;
            this.canvas.style.cursor = this.isEditMode ? 'grab' : 'default';
            this.wrapper.style.border = this.isEditMode ? '2px solid #00ff00' : 'none';
            console.log(`Edit mode: ${this.isEditMode ? 'ON' : 'OFF'}`);
        }
    }

    onMouseDown(e) {
        this.mouseMoved = false;
        this.previousMousePosition.x = e.clientX;
        this.previousMousePosition.y = e.clientY;
        if (this.isEditMode) {
            this.startDragging(e);
        }
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    }

    onMouseMove(e) {
        this.needsRender = true; 
        this.mouseMoved = true;
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        if (this.isEditMode && this.draggedObject) {
            this.dragObject(e);
        } else if (this.navigationMode === 1) { // Pan for Tree
            this.mainGroup.position.x += deltaX * this.config.TREE.PAN_SENSITIVITY;
            this.mainGroup.position.y -= deltaY * this.config.TREE.PAN_SENSITIVITY;
        } else if (this.navigationMode === 2) { // Orbit for Head
            const rotXMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), -deltaX * this.config.HEAD.ROTATION_SENSITIVITY);
            this.camera.position.applyMatrix4(rotXMatrix);
            // --- ИСПРАВЛЕНИЕ: Инвертируем движение по вертикали ---
            const rotYMatrix = new THREE.Matrix4().makeRotationAxis(this.camera.position.clone().cross(new THREE.Vector3(0,1,0)).normalize(), deltaY * this.config.HEAD.ROTATION_SENSITIVITY);
            this.camera.position.applyMatrix4(rotYMatrix);
            this.camera.lookAt(this.scene.position);
        }

        this.previousMousePosition.x = e.clientX;
        this.previousMousePosition.y = e.clientY;
    }

    async onMouseUp(e) {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        if (this.isEditMode && this.draggedObject) {
            await this.stopDragging();
        }
        if (!this.mouseMoved && !this.isEditMode) {
            this.handleClick(e);
        }
    }

    onWheel(e) {
        this.needsRender = true; 
        if (this.navigationMode === 1) { // Zoom for Tree
            const zoomAmount = e.deltaY * this.config.TREE.ZOOM_SENSITIVITY;
            const newScale = this.mainGroup.scale.x - zoomAmount * 0.1;
            this.mainGroup.scale.setScalar(THREE.MathUtils.clamp(newScale, 1.0, 10.0));
        } else if (this.navigationMode === 2) { // Zoom for Head
            const zoomAmount = e.deltaY * this.config.HEAD.ZOOM_SENSITIVITY;
            const currentDistance = this.camera.position.length();
            const newDistance = THREE.MathUtils.clamp(currentDistance + zoomAmount, 10, 60);
            this.camera.position.setLength(newDistance);
        }
    }
    
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    onTouchStart(e) {
        e.preventDefault();
        this.touchMoved = false;
        const touches = e.touches;
        if (touches.length > 0) {
            this.touchStartPosition = { x: touches[0].clientX, y: touches[0].clientY };
        }

        if (touches.length === 1) {
            this.previousMousePosition.x = touches[0].clientX;
            this.previousMousePosition.y = touches[0].clientY;
            if (this.isEditMode) {
                this.startDragging(touches[0]);
            }
        } else if (touches.length === 2) {
            this.initialPinchDistance = this.getTouchDistance(touches);
        }
    }

    onTouchMove(e) {
        this.needsRender = true; 
        e.preventDefault();
        const touches = e.touches;
        if (!this.touchMoved && touches.length > 0) {
            const touch = touches[0];
            const dx = touch.clientX - this.touchStartPosition.x;
            const dy = touch.clientY - this.touchStartPosition.y;
            if (Math.sqrt(dx * dx + dy * dy) > 5) {
                this.touchMoved = true;
            }
        }
        if (this.touchMoved) {
        if (this.isEditMode && this.draggedObject) {
            this.dragObject(touches[0]);
        } else if (touches.length === 1) {
            // Движение одним пальцем (панорамирование/вращение)
            this.onMouseMove({ clientX: touches[0].clientX, clientY: touches[0].clientY });
        } else if (touches.length === 2) {
            // Движение двумя пальцами (зум)
            const newPinchDistance = this.getTouchDistance(touches);
            const deltaDistance = newPinchDistance - this.initialPinchDistance;
            if (this.navigationMode === 1) {
                const newScale = this.mainGroup.scale.x + deltaDistance * 0.01;
                this.mainGroup.scale.setScalar(THREE.MathUtils.clamp(newScale, 1.0, 10.0));
            } else {
                const currentDistance = this.camera.position.length();
                const newCamDistance = THREE.MathUtils.clamp(currentDistance - deltaDistance * 0.1, 10, 60);
                this.camera.position.setLength(newCamDistance);
            }
            this.initialPinchDistance = newPinchDistance;
            }
        }
    }

    async onTouchEnd(e) {
        e.preventDefault();
        if (this.isEditMode && this.draggedObject) {
            await this.stopDragging();
        }
        if (!this.touchMoved && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            this.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    onWindowResize() {
        this.needsRender = true; 
        this.camera.aspect = this.wrapper.clientWidth / this.wrapper.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.wrapper.clientWidth, this.wrapper.clientHeight);
    }

    handleClick(e) {
        if (this.isProcessingClick) return; 
        this.isProcessingClick = true; 
        setTimeout(() => { this.isProcessingClick = false; }, 200); 
        this.mouse.x = (e.clientX / this.wrapper.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - this.wrapper.getBoundingClientRect().top) / this.wrapper.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const targets = this.navigationMode === 1 
            ? this.clickableObjects 
            : [...this.hitboxMeshes, ...this.textMeshes]; // <--- Используем hitboxMeshes
    
        const intersects = this.raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
            let lessonData;
            if (this.navigationMode === 1) {
                let clickedObject = intersects[0].object;
                while (clickedObject.parent && !clickedObject.userData.lesson) {
                    clickedObject = clickedObject.parent;
                }
                lessonData = clickedObject.userData;
            } else {
                const intersection = intersects[0];
                if (intersection.object.isInstancedMesh) {
                    lessonData = intersection.object.userData[intersection.instanceId];
                } else {
                    const textPos = intersection.object.position;
                    let closestItem = null;
                    let minDistance = Infinity;
                    this.skinData.forEach(item => {
                        const itemPos = new THREE.Vector3(item.coordinates.x, item.coordinates.y, item.coordinates.z);
                        const distance = textPos.distanceTo(itemPos);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestItem = item;
                        }
                    });
                    lessonData = closestItem;
                }
            }
            
            if (lessonData && lessonData.lesson && lessonData.lesson.id) {
                this.modalStore.open(lessonData.lesson.id);
            }
        }
    }

    startDragging(e) {
        this.mouse.x = (e.clientX / this.wrapper.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - this.wrapper.getBoundingClientRect().top) / this.wrapper.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const targets = this.navigationMode === 1 ? this.clickableObjects : this.instancedMeshes;
        const intersects = this.raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
            let objectToDrag;
            let intersectionPoint;

            if (this.navigationMode === 1) {
                let obj = intersects[0].object;
                while (obj.parent && !obj.userData.lesson) {
                    obj = obj.parent;
                }
                objectToDrag = obj;
                intersectionPoint = intersects[0].point;
            } else {
                const intersection = intersects[0];
                objectToDrag = { 
                    mesh: intersection.object, 
                    instanceId: intersection.instanceId,
                    isInstanced: true
                };
                intersectionPoint = intersection.point;
            }
            this.draggedObject = objectToDrag;
            
            this.dragPlane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(this.dragPlane.normal), intersectionPoint);
            
            const objectWorldPos = new THREE.Vector3();
            if (this.draggedObject.isInstanced) {
                const instanceMatrix = new THREE.Matrix4();
                this.draggedObject.mesh.getMatrixAt(this.draggedObject.instanceId, instanceMatrix);
                objectWorldPos.setFromMatrixPosition(instanceMatrix);
            } else {
                this.draggedObject.getWorldPosition(objectWorldPos);
            }
            this.dragOffset.copy(intersectionPoint).sub(objectWorldPos);

            this.canvas.style.cursor = 'grabbing';
        }
    }

    dragObject(e) {
        this.needsRender = true; 
        if (!this.draggedObject) return;
        this.mouse.x = (e.clientX / this.wrapper.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - this.wrapper.getBoundingClientRect().top) / this.wrapper.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectionPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
        const newWorldPosition = intersectionPoint.sub(this.dragOffset);
        
        if (this.draggedObject.isInstanced) {
            const inverseGroupMatrix = this.mainGroup.matrixWorld.clone().invert();
            const newLocalPosition = newWorldPosition.clone().applyMatrix4(inverseGroupMatrix);
            const dummy = new THREE.Object3D();
            this.draggedObject.mesh.getMatrixAt(this.draggedObject.instanceId, dummy.matrix);
            const scale = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            dummy.matrix.decompose(new THREE.Vector3(), quaternion, scale);
            dummy.matrix.compose(newLocalPosition, quaternion, scale);
            this.draggedObject.mesh.setMatrixAt(this.draggedObject.instanceId, dummy.matrix);
            this.draggedObject.mesh.instanceMatrix.needsUpdate = true;
        } else {
            this.mainGroup.worldToLocal(this.draggedObject.position.copy(newWorldPosition));
        }
    }

    async stopDragging() {
        this.needsRender = true; 
        if (!this.draggedObject) return;
        
        let newCoords;
        let lessonData;

        if (this.draggedObject.isInstanced) {
            const dummy = new THREE.Object3D();
            this.draggedObject.mesh.getMatrixAt(this.draggedObject.instanceId, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            newCoords = { x: dummy.position.x, y: dummy.position.y, z: dummy.position.z };
            lessonData = this.draggedObject.mesh.userData[this.draggedObject.instanceId];
        } else {
            newCoords = { x: this.draggedObject.position.x, y: this.draggedObject.position.y, z: this.draggedObject.position.z };
            lessonData = this.draggedObject.userData;
        }

        console.log(`Saving new coordinates for layout ${lessonData.layout_id}:`, newCoords);
        const { data, error } = await this.supabase.from('skin_layouts').update({ coordinates: newCoords }).eq('id', lessonData.layout_id).select();
        
        if (error) {
            console.error("Error updating coordinates:", error);
        } else {
            lessonData.coordinates = newCoords;
            console.log("Save successful! Response from DB:", data);
        }

        this.draggedObject = null;
        this.canvas.style.cursor = 'grab';
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        if (!this.needsRender) {
            return;
        }

        if (this.navigationMode === 2 && this.textMeshes.length > 0) {
            this.textMeshes.forEach(textMesh => {
                // Создаем точку для "взгляда" текста: она на той же высоте,
                // что и сам текст, но с X/Z координатами камеры.
                const targetPosition = new THREE.Vector3(
                    this.camera.position.x,
                    textMesh.position.y,
                    this.camera.position.z
                );
                textMesh.lookAt(targetPosition);
            });
        }

        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
    }

    destroy() {
        if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); }
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('resize', this.onWindowResize);
        
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        this.renderer.dispose();
    }
}
</script>
