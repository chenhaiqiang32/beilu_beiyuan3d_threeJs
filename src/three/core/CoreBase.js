import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module";

import { OrbitControls } from "../../lib/OrbitControls";

import { Postprocessing } from "../components/postprocessing";

import MemoryManager from "./../../lib/memoryManager";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min";

import { Compass } from "../../lib/Compass";



const memory = new MemoryManager();
THREE.Object3D.prototype.deleteSelf = function (removeFromParent) {
  memory.track(this);
  memory.dispose(removeFromParent);
};


const _$vec3 = new THREE.Vector3();
/**
 * @param {THREE.Sphere} sphere 将向量限制在球内
 */
THREE.Vector3.prototype.clampSphere = function (sphere) {
  if (this.distanceTo(sphere.center) > sphere.radius) {
    _$vec3.subVectors(this,sphere.center).normalize();
    _$vec3.setLength(sphere.radius);
    this.addVectors(sphere.center,_$vec3);
  }
};

//
const { innerWidth,innerHeight,devicePixelRatio } = window;

export class CoreBase {
  /**@type { THREE.Scene } 场景 */
  #scene;
  /**@type { THREE.WebGLRenderer } 渲染器 */
  #renderer;
  /**@type { THREE.PerspectiveCamera } 相机 */
  #camera;
  /**@type { THREE.PerspectiveCamera } 相机 */
  #baseCamera;
  /**@type { OrbitControls } 相机控制器 */
  #controls;

  /**@type { HTMLElement } DOM对象 */
  #domElement;
  /**@type { Postprocessing } 后处理 */
  #postprocessing;
  /**@type { THREE.Clock } 时钟 */
  clock;

  #renderEnabled;
  /**@type { THREE.AmbientLight} 平行光 */
  #ambientLight;
  /**@type { THREE.DirectionalLight} 平行光 */
  #directionLight;
  /**@type { Stats} 性能监视器 */
  #stats;

  /**@type { Map<string, ( width:number,height:number ) => void>} 窗口大小发生改变，执行的任务队列 */
  #onresizeQueue;
  /**@type { Map<string, ( param: this ) => void>} 渲染时，执行的任务队列 */
  #onRenderQueue;

  /**@type {Compass} */
  #compass;

  get onresizeQueue() {
    return this.#onresizeQueue;
  }

  /**@type {  Map<string, ( param: this ) => void>} 渲染时，执行的任务队列 */
  get onRenderQueue() {
    return this.#onRenderQueue;
  }

  get scene() {
    return this.#scene;
  }

  set scene(value) {
    if (!(value instanceof THREE.Scene)) return;
    // 切换场景释放上一个场景的内存

    this.#scene.dispose && this.#scene.dispose();

    this.#scene = value;

    if (this.#postprocessing) {
      this.#postprocessing.composer.setMainScene(value);
    }
  }

  get camera() {
    return this.#camera;
  }
  get baseCamera() {
    return this.#baseCamera;
  }

  set camera(value) {
    if (!(value instanceof THREE.Camera)) return;
    this.#camera = value;

    if (this.#postprocessing) {
      this.#postprocessing.composer.setMainCamera(value);
    }
  }

  get renderer() {
    return this.#renderer;
  }

  get controls() {
    return this.#controls;
  }

  get domElement() {
    return this.#domElement;
  }

  get ambientLight() {
    return this.#ambientLight;
  }

  get directionLight() {
    return this.#directionLight;
  }

  get postprocessing() {
    return this.#postprocessing;
  }

  /** @param {boolean} bool 设置缓存，默认为false*/
  set cache(bool) {
    THREE.Cache.enabled = bool;
  }

  #animationFrameCode;

  get renderEnabled() {
    return this.#renderEnabled;
  }

  /**
   * @constructor
   * @param {HTMLElement | HTMLCanvasElement | undefined} domElement
   */
  constructor(domElement) {
    this.#animationFrameCode = null;

    this.clock = new THREE.Clock();
    this.delta = 0;
    this.elapsedTime = 0;

    this.#onresizeQueue = new Map();
    this.#onRenderQueue = new Map();

    this.#domElement = domElement;

    this.#renderEnabled = false;

    this.#scene = new THREE.Scene();
    this.baseScene = this.#scene;

    this.#camera = new THREE.PerspectiveCamera(50,innerWidth / innerHeight,0.01,20000);
    this.#baseCamera = this.#camera;
    this.#camera.position.set(0,100,100);
    this.#camera.lookAt(0,0,0);

    this.#compass = new Compass(this);
    this.#compass.theta = 27.6;
    this.#onresizeQueue.set("compass",this.#compass.resize);

    /**@type {THREE.WebGLRendererParameters} */
    const webGLRendererParameters = {
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
    };
    if (domElement instanceof HTMLCanvasElement) {
      webGLRendererParameters.canvas = domElement;
    } else if (domElement instanceof HTMLElement) {
      const canvas = document.createElement("canvas");
      webGLRendererParameters.canvas = canvas;
      domElement.appendChild(this.renderer.domElement);
    } else {
      const canvas = document.createElement("canvas");
      webGLRendererParameters.canvas = canvas;
      document.body.appendChild(canvas);
      console.log("create canvas");
    }
    this.#domElement = webGLRendererParameters.canvas;
    this.#domElement.oncontextmenu = e => false;

    this.#renderer = new THREE.WebGLRenderer(webGLRendererParameters);
    this.#renderer.setSize(innerWidth,innerHeight);
    this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.setPixelRatio(devicePixelRatio);
    this.#renderer.domElement.removeAttribute("data-engine");
    this.#renderer.info.autoReset = false;

    this.#controls = new OrbitControls(this.#camera,this.#renderer.domElement);
    this.#controls.target.set(0,0,0);
    this.#controls.enableDamping = true;
    this.#controls.enableDolly = false;
    this.#controls.dampingFactor = 0.2;
    this.#controls.data = {};

    this.#onRenderQueue.set(Symbol(),param => param.controls.update());

    this.#initLight();

    document.oncontextmenu = () => false;

    window.addEventListener("resize",() => {
      const { innerWidth,innerHeight } = window;

      this.#camera.aspect = innerWidth / innerHeight;
      this.#camera.updateProjectionMatrix();
      this.#renderer.setSize(innerWidth,innerHeight);
      this.#renderer.setPixelRatio(window.devicePixelRatio);

      this.#onresizeQueue.forEach(fn => fn(innerWidth,innerHeight));
    });
  }

  #initLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff,0.55); // 线性SRG
    const directionalLight = new THREE.DirectionalLight(0xffffff,3);
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 1500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.mapSize.width = Math.pow(2,13); //8192;
    directionalLight.shadow.mapSize.height = Math.pow(2,13);
    directionalLight.shadow.blurSamples = 16;

    // directionalLight.shadow.radius = 1.1;
    directionalLight.shadow.bias = -0.00025;

    directionalLight.position.set(30,385,585);
    directionalLight.castShadow = true;

    this.#ambientLight = ambientLight;
    this.#scene.add(this.#ambientLight);
    const ch = new THREE.CameraHelper(directionalLight.shadow.camera);
    const hp = new THREE.DirectionalLightHelper(directionalLight);
    this.#directionLight = directionalLight;
    this.#scene.add(this.#directionLight);
  }

  /**@param {THREE.Scene} scene 设置默认灯光*/
  setDefaultLight(scene) {
    scene._add(this.#ambientLight.clone(),this.#directionLight.clone());
  }

  initComposer() {
    this.#postprocessing = new Postprocessing(this.#renderer,this.#scene,this.#camera);
    this.postprocessing.hueSaturationEffect.saturation = 0.25;
    this.postprocessing.brightnessContrastEffect.contrast = 0.25;

    // const gui = new GUI();

    // const param = {
    //   saturation: 0.25,
    //   contrast: 0.25,
    //   brightness: 0
    // };

    // gui.add(param,"saturation",0,1,0.001).onChange(value => {
    //   this.postprocessing.hueSaturationEffect.saturation = value;
    //   this.postprocessing.brightnessContrastEffect.contrast = value;
    // });

    this.#onresizeQueue.set(Symbol(),this.#postprocessing.resize);
  }

  initStats() {
    this.#stats = new Stats();
    document.body.appendChild(this.#stats.dom);
    // this.#stats.dom.style.left = "400px";
    // this.#stats.dom.style.top = "400px";
    this.#onRenderQueue.set(Symbol(),param => param.#stats.update());
  }
  initGridHelper() {
    const gridHelper = new THREE.GridHelper(100);
    this.#scene.add(gridHelper);
  }
  initAxesHelper() {
    const axesHelper = new THREE.AxesHelper(100);
    this.#scene.add(axesHelper);
  }

  animate() {
    this.#animationFrameCode = requestAnimationFrame(this.animate.bind(this));

    this.delta = this.clock.getDelta();
    this.elapsedTime = this.clock.getElapsedTime();

    this.#onRenderQueue.forEach(fn => fn(this));

    this.#renderer.info.reset();
    // console.log(this.#renderer.info);

    // this.logMemory();

    // render
    this.render();
  }

  logMemory() {
    console.log(this.#renderer.info.memory.geometries,this.#renderer.info.memory.textures);
  }

  render() {
    if (this.#postprocessing) {
      this.#postprocessing.composer.render();
    } else {
      this.#renderer.autoClear = true;
      this.#renderer.render(this.#scene,this.#camera);
    }

    this.#compass.update(this);
    // --------------------------------------------------------------------------------------
  }

  stopRender() {
    cancelAnimationFrame(this.#animationFrameCode);
    this.#renderEnabled = false;
    this.controls.enabled = false;
  }
  beginRender() {
    if (this.#renderEnabled) return;
    this.animate();
    this.controls.enabled = true;
    this.#renderEnabled = true;
  }
}
