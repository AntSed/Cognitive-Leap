<template>
<div ref="mountPoint" class="mind-map-container">

  <div v-if="selectedNode" class="panel properties-panel">
    <div class="prop-group">
      <input type="text" v-model="selectedNode.label" @input="updateNodeProperties" placeholder="Name">
    </div>
    <div class="prop-group">
      <textarea v-model="selectedNode.description" @input="updateNodeProperties" rows="4" placeholder="Description"></textarea>
    </div>
    <div class="prop-group">
      <input type="range" v-model.number="selectedNode.size" @input="updateNodeProperties" min="1" max="20" step="0.5" title="Size">
    </div>

    <div class="controls-row">
      <div class="prop-group">
        <input type="color" v-model="selectedNode.color" @input="updateNodeProperties" title="Color">
      </div>
      <div class="prop-group">
        <select v-model="selectedNode.shape" @change="updateNodeProperties" title="Shape">
          <option value="sphere">Sphere</option>
          <option value="box">Cube</option>
          <option value="cone">Pyramid</option>
          <option value="cylinder">Cylinder</option>
          <option value="octahedron">Diamond</option>
          <option value="torus">Torus</option>
          <option value="dodecahedron">Dodecahedron</option>
          <option value="icosahedron">Icosahedron</option>
          <option value="torusKnot">Torus Knot</option>
        </select>
      </div>
      <button @click="deleteSelected" class="btn btn-danger btn-delete-compact" title="Delete Node">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
      </button>
    </div>
  </div>
  
  <div v-if="selectedConnection" class="panel connection-properties-panel">
    <div class="prop-group">
      <input type="text" v-model="selectedConnection.label" @input="updateConnectionProperties" placeholder="Name">
    </div>
    <div class="prop-group">
      <input type="range" v-model.number="selectedConnection.width" @input="updateConnectionProperties" min="0.1" max="2" step="0.1" title="Width">
    </div>
    <div class="controls-row">
      <div class="prop-group">
        <input type="color" v-model="selectedConnection.color" @input="updateConnectionProperties" title="Color">
      </div>
      <button @click="deleteSelected" class="btn btn-danger btn-delete-compact" title="Delete Connection">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
      </button>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineEmits, defineExpose, reactive } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { debounce } from '~/utils/debounce'; 
// --- Component Events & State ---
const emit = defineEmits(['map-changed', 'ready', 'mode-changed']);
const selectedNode = ref(null);
const selectedConnection = ref(null);
const mountPoint = ref(null);
const emitMapChangedImmediately = () => emit('map-changed', serializeMapData());
const debouncedEmitMapChanged = debounce(emitMapChangedImmediately, 400);
// --- Three.js Scene Variables ---
let scene, camera, renderer, labelRenderer, controls, raycaster;
let animationFrameId;
const pointer = new THREE.Vector2();
let nodes = [];
let connections = [];

// --- Internal Component State ---
let isDragging = false;
let isConnectionMode = false;
let connectionStartNode = null;
const plane = new THREE.Plane();
const intersection = new THREE.Vector3();
const useCurvedLines = ref(true);
let potentialTarget = null; 
const pointerDownTime = ref(0); 
let lastSelectedNodeRef = null;

// --- Lifecycle Hooks ---
onMounted(() => {
  init();
  animate();
  emit('ready');
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer && renderer.domElement) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.dispose();
  }
  if (labelRenderer && labelRenderer.domElement && labelRenderer.domElement.parentNode) {
      labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
  }
  clearMap(false);
});

// --- Core Three.js Setup ---
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, mountPoint.value.clientWidth / mountPoint.value.clientHeight, 0.1, 2000);
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setSize(mountPoint.value.clientWidth, mountPoint.value.clientHeight);
  mountPoint.value.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(mountPoint.value.clientWidth, mountPoint.value.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  mountPoint.value.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  
  scene.add(new THREE.GridHelper(200, 50));
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  scene.add(directionalLight);
  
  raycaster = new THREE.Raycaster();
  
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  window.addEventListener('resize', onWindowResize);
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

// --- Event Handlers ---
function onWindowResize() {
  if (!mountPoint.value || !renderer) return;
  camera.aspect = mountPoint.value.clientWidth / mountPoint.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(mountPoint.value.clientWidth, mountPoint.value.clientHeight);
  labelRenderer.setSize(mountPoint.value.clientWidth, mountPoint.value.clientHeight);
}
function onPointerDown(event) {
  if (event.target !== renderer.domElement) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (isConnectionMode) {
    const intersectedNodeObj = raycaster.intersectObjects(nodes.map(n => n.mesh), false)[0];
    const targetNode = intersectedNodeObj ? nodes.find(n => n.mesh === intersectedNodeObj.object) : null;

    if (targetNode) {
      if (!connectionStartNode) {
        connectionStartNode = targetNode;
        connectionStartNode.mesh.material.color.set(0x00aaff);
      } else if (connectionStartNode !== targetNode) {
        const existing = connections.some(c => (c.start === connectionStartNode && c.end === targetNode) || (c.start === targetNode && c.end === connectionStartNode));
        if (!existing) {
          _createConnection(connectionStartNode, targetNode);
          emitMapChangedImmediately();
        }
        connectionStartNode.mesh.material.color.copy(connectionStartNode.mesh.userData.originalColor);
        connectionStartNode = null; 
      }
    } else {
      if (connectionStartNode) {
        connectionStartNode.mesh.material.color.copy(connectionStartNode.mesh.userData.originalColor);
        connectionStartNode = null;
      }
      toggleConnectionMode(false);
    }
    return; 
  }

  _deselectAll();

  const intersectedNodeObj = raycaster.intersectObjects(nodes.map(n => n.mesh), false)[0];
  const targetNode = intersectedNodeObj ? nodes.find(n => n.mesh === intersectedNodeObj.object) : null;
  
  if (targetNode) {
    potentialTarget = { type: 'node', object: targetNode };
    controls.enabled = false;
    isDragging = true;
    pointerDownTime.value = Date.now();
  } else {
    const intersectedConnObj = raycaster.intersectObjects(connections.map(c => c.line))[0];
    const targetConn = intersectedConnObj ? connections.find(c => c.line === intersectedConnObj.object) : null;
    if (targetConn) {
      potentialTarget = { type: 'connection', object: targetConn };
      pointerDownTime.value = Date.now();
    }
  }
}

function onPointerMove(event) {
  if (!isDragging || !potentialTarget || potentialTarget.type !== 'node') return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  
  plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), potentialTarget.object.mesh.position);
  if (raycaster.ray.intersectPlane(plane, intersection)) {
    potentialTarget.object.mesh.position.copy(intersection);
    _updateNodeConnections(potentialTarget.object);
  }
}

function onPointerUp() {
  // Если было долгое нажатие (перетаскивание), сохраняем изменения
  if (isDragging) {
    emitMapChangedImmediately();
  }

  // Проверяем, был ли это короткий "тап"
  if (potentialTarget) {
    const pressDuration = Date.now() - pointerDownTime.value;
    if (pressDuration < 200) {
      if (potentialTarget.type === 'node') {
        _selectNode(potentialTarget.object);
      } else if (potentialTarget.type === 'connection') {
        _selectConnection(potentialTarget.object);
      }
    }
  }

  // Сбрасываем все временные состояния
  isDragging = false;
  controls.enabled = true;
  potentialTarget = null;
}

// --- Object Creation & Manipulation ---
function createGeometry(shape, size) {
    switch(shape) {
        case 'box': return new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
        case 'cone': return new THREE.ConeGeometry(size, size * 2, 4);
        case 'cylinder': return new THREE.CylinderGeometry(size, size, size * 2, 32);
        case 'octahedron': return new THREE.OctahedronGeometry(size);
        case 'torus': return new THREE.TorusGeometry(size, size / 2.5, 16, 100);
        case 'dodecahedron': return new THREE.DodecahedronGeometry(size);
        case 'icosahedron': return new THREE.IcosahedronGeometry(size);
        case 'torusKnot': return new THREE.TorusKnotGeometry(size * 0.8, size / 3, 100, 16);
        case 'sphere': default: return new THREE.SphereGeometry(size, 32, 32);
    }
}

function _createNode(options) {
    const { id = THREE.MathUtils.generateUUID(), label = `Node`, position, color = 0xffffff, size = 5, shape = 'sphere' } = options;
    const geometry = createGeometry(shape, size);
    const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position instanceof THREE.Vector3 ? position : new THREE.Vector3(position.x, position.y, position.z));
    scene.add(mesh);
    mesh.userData.originalColor = new THREE.Color(color);
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = label;
    const nodeLabel = new CSS2DObject(labelDiv);
    nodeLabel.position.set(0, size + 2, 0);
    mesh.add(nodeLabel);
    const nodeObject = { id, mesh, label: nodeLabel, connections: [], shape, size, description: options.description || '' };
    nodes.push(nodeObject);
    return nodeObject;
}

function _createConnection(startNode, endNode, options = {}) {
    const { color = 0x888888, width = 0.5, label = '' } = options;
    const material = new THREE.MeshStandardMaterial({ color });
    const curve = new THREE.CatmullRomCurve3([startNode.mesh.position, endNode.mesh.position]);
    const geometry = new THREE.TubeGeometry(curve, 2, width, 8, false);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = label;
    const connLabel = new CSS2DObject(labelDiv);
    connLabel.visible = label.length > 0;
    mesh.add(connLabel);
    const connection = { line: mesh, start: startNode, end: endNode, label: connLabel, width };
    connections.push(connection);
    startNode.connections.push(connection);
    endNode.connections.push(connection);
    return connection;
}

// --- Start: New Helper Functions ---
function _updateSingleConnectionGeometry(conn) {
    const startPos = conn.start.mesh.position;
    const endPos = conn.end.mesh.position;
    
    let curve;

    if (useCurvedLines.value) {
        const midPos = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const distance = startPos.distanceTo(endPos);
        const curveIntensity = Math.max(0, 1 - Math.abs(startPos.y - endPos.y) / (distance + 0.01));
        midPos.y -= (distance / 5) * curveIntensity;
        curve = new THREE.CatmullRomCurve3([startPos, midPos, endPos]);
    } else {
        curve = new THREE.LineCurve3(startPos, endPos);
    }
    if (conn.line.geometry) conn.line.geometry.dispose();
    conn.line.geometry = new THREE.TubeGeometry(curve, 20, conn.width, 8, false);
    conn.label.position.copy(curve.getPoint(0.5));
}

function _updateNodeConnections(node) {
    node.connections.forEach(conn => {
        _updateSingleConnectionGeometry(conn);
    });
}

function updateConnections() {
    if (connections.length === 0) return;
    connections.forEach(conn => {
        _updateSingleConnectionGeometry(conn);
    });
}

function _selectNode(node) {
    _deselectAll();
    lastSelectedNodeRef = node;
    selectedNode.value = reactive({
        _ref: node, id: node.id, label: node.label.element.textContent,
        color: '#' + node.mesh.userData.originalColor.getHexString(),
        size: node.size, shape: node.shape, description: node.description
    });
    node.mesh.material.opacity = 0.5;
}

function _selectConnection(conn) {
    _deselectAll();
    selectedConnection.value = reactive({
        _ref: conn, startId: conn.start.id, endId: conn.end.id,
        label: conn.label.element.textContent, color: '#' + conn.line.material.color.getHexString(),
        width: conn.width,
    });
    conn.line.material.emissive.setHex(0xaaaaaa);
}

function _deselectAll() {
    if (selectedNode.value) selectedNode.value._ref.mesh.material.opacity = 1.0;
    if (selectedConnection.value) selectedConnection.value._ref.line.material.emissive.setHex(0x000000);
    selectedNode.value = null;
    selectedConnection.value = null;
}

function updateNodeProperties() {
    if (!selectedNode.value) return;
    const node = selectedNode.value._ref;
    const data = selectedNode.value;
    node.description = data.description;
    node.label.element.textContent = data.label;
    const color = new THREE.Color(data.color);
    node.mesh.material.color.set(color);
    node.mesh.userData.originalColor.set(color);
    if (node.size !== data.size || node.shape !== data.shape) {
        node.size = data.size;
        node.shape = data.shape;
        node.mesh.geometry.dispose();
        node.mesh.geometry = createGeometry(node.shape, node.size);
        node.label.position.set(0, node.size + 2, 0);
    }
    debouncedEmitMapChanged();
}

function updateConnectionProperties() {
    if (!selectedConnection.value) return;
    const conn = selectedConnection.value._ref;
    const data = selectedConnection.value;
    
    conn.label.element.textContent = data.label;
    conn.label.visible = data.label.length > 0;
    conn.line.material.color.set(data.color);
    
    if (conn.width !== data.width) {
        conn.width = data.width;
        _updateSingleConnectionGeometry(conn); 
    }
    
    debouncedEmitMapChanged();
}

function serializeMapData() {
    return {
        nodes: nodes.map(n => ({
            id: n.id, label: n.label.element.textContent, position: n.mesh.position.clone(),
            color: '#' + n.mesh.userData.originalColor.getHexString(), size: n.size, shape: n.shape, description: n.description,
        })),
        connections: connections.map(c => ({
            startId: c.start.id, endId: c.end.id, label: c.label.element.textContent,
            color: '#' + c.line.material.color.getHexString(), width: c.width,
        })),
    };
}



function deleteSelected() {
    if (selectedNode.value) {
        _deleteNodeById(selectedNode.value.id);
    } else if (selectedConnection.value) {
        _deleteConnectionByIds(selectedConnection.value.startId, selectedConnection.value.endId);
    }
    _deselectAll();
    emitMapChangedImmediately();
}

function _deleteNodeById(nodeId) {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;
    const nodeToDelete = nodes[nodeIndex];

    const connectionsToDelete = connections.filter(c => c.start === nodeToDelete || c.end === nodeToDelete);
    connectionsToDelete.forEach(conn => _deleteConnection(conn));
    
    scene.remove(nodeToDelete.mesh);
    nodeToDelete.mesh.geometry.dispose();
    nodeToDelete.mesh.material.dispose();
    nodeToDelete.label.element.remove();

    nodes.splice(nodeIndex, 1);
}

function _deleteConnectionByIds(startId, endId) {
    const connIndex = connections.findIndex(c => c.start.id === startId && c.end.id === endId);
    if (connIndex === -1) return;
    _deleteConnection(connections[connIndex]);
}

function _deleteConnection(connToDelete) {
    scene.remove(connToDelete.line);
    connToDelete.line.geometry.dispose();
    connToDelete.line.material.dispose();
    connToDelete.label.element.remove();

    if (connToDelete.start) {
        const startIndex = connToDelete.start.connections.indexOf(connToDelete);
        if (startIndex > -1) connToDelete.start.connections.splice(startIndex, 1);
    }
    if (connToDelete.end) {
        const endIndex = connToDelete.end.connections.indexOf(connToDelete);
        if (endIndex > -1) connToDelete.end.connections.splice(endIndex, 1);
    }

    const connIndex = connections.indexOf(connToDelete);
    if (connIndex > -1) connections.splice(connIndex, 1);
}

function clearMap(notify = true) {
    _deselectAll();
    [...connections].forEach(c => _deleteConnection(c));
    [...nodes].forEach(n => { // Call the primitive deleter to avoid loops
        scene.remove(n.mesh);
        n.mesh.geometry.dispose();
        n.mesh.material.dispose();
        n.label.element.remove();
    });
    nodes = [];
    connections = [];
    if (notify) emitMapChangedImmediately();
}
// Exposed API to Parent
function addNode() {
  _deselectAll();
  const propertiesReferenceNode = lastSelectedNodeRef;
  const positionReferenceNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
  const options = {};
  if (propertiesReferenceNode) {
    options.shape = propertiesReferenceNode.shape;
    options.size = propertiesReferenceNode.size;
    options.color = propertiesReferenceNode.mesh.userData.originalColor.clone();
  }
  if (positionReferenceNode) {

    options.position = positionReferenceNode.mesh.position.clone().add(new THREE.Vector3(0, 12, 0));
  } else {
    options.position = new THREE.Vector3(0, 12, 0);
  }
  options.label = nodes.length.toString();
  _createNode(options);
  emitMapChangedImmediately();
}

function toggleConnectionMode(forceState) {
    isConnectionMode = typeof forceState === 'boolean' ? forceState : !isConnectionMode;
    _deselectAll();
    if (connectionStartNode) {
        connectionStartNode.mesh.material.color.copy(connectionStartNode.mesh.userData.originalColor);
        connectionStartNode = null;
    }
    controls.enabled = !isConnectionMode;
    emit('mode-changed', isConnectionMode);
    return isConnectionMode;
}

function toggleLineStyle() {
  useCurvedLines.value = !useCurvedLines.value;
  updateConnections();
  emitMapChangedImmediately(); 
  return useCurvedLines.value;
}

function loadNewMap(data) {
    clearMap(false);
    if (data && data.nodes) data.nodes.forEach(nodeData => _createNode(nodeData));
    if (data && data.connections) {
        data.connections.forEach(connData => {
            const startNode = nodes.find(n => n.id === connData.startId);
            const endNode = nodes.find(n => n.id === connData.endId);
            if (startNode && endNode) _createConnection(startNode, endNode, connData);
        });
    }
    updateConnections();
    emitMapChangedImmediately();
}

defineExpose({ addNode, deleteSelected, toggleConnectionMode, loadNewMap, serializeMapData, toggleLineStyle });
</script>

<style scoped> 
.mind-map-container {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
}
.mind-map-container:active {
  cursor: grabbing;
}

.panel {
  position: absolute;
  top: 50px;
  right: 30px;
  z-index: 102;
  background-color: rgba(40, 40, 40, 0.9);
  border: 1px solid #555;
  border-radius: 8px;
  padding: 15px;
  width: 250px;
}

.prop-group {
  margin-bottom: 15px;
}

/* Общие стили для всех элементов управления */
.prop-group input[type="text"],
.prop-group input[type="range"],
.prop-group select,
.prop-group textarea {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  background-color: #333;
  border: 1px solid #555;
  color: #f0f0f0;
  border-radius: 4px;
  font-size: 14px;
}

.prop-group input[type="range"] {
  padding: 0;
}

.prop-group textarea {
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

/* Стили для плейсхолдеров */
.prop-group input::placeholder,
.prop-group textarea::placeholder {
  color: #888;
}

/* Нижний ряд с элементами управления */
.controls-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #555;
}

.controls-row .prop-group {
  flex-grow: 1;
  margin-bottom: 0;
}

.controls-row input[type="color"] {
  width: 100%;
  min-width: 35px;
  height: 37px;
  padding: 2px; /* Небольшой внутренний отступ для рамки */
  border: 1px solid #555; /* Убираем стандартную рамку и ставим свою */
  border-radius: 4px; /* Добавляем наше закругление */
  background: transparent;
}

.btn-delete-compact {
  flex-shrink: 0;
  width: 35px;
  height: 35px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px; /* Добавляем наше закругление */
}

.btn-delete-compact svg {
  width: 20px;
  height: 20px;
}

/* Стили кнопки "Удалить" */
.btn.btn-danger {
  background-color: #6e2b2b;
  border-color: #863f3f;
}
.btn.btn-danger:hover {
  background-color: #863f3f;
}
</style>
<style>
/* Global styles for CSS2DRenderer labels */
.label { color: #fff; padding: 2px 5px; background: rgba(0, 0, 0, 0.6); border-radius: 4px; font-size: 14px; text-shadow: 0 0 5px black; pointer-events: none; }
</style>