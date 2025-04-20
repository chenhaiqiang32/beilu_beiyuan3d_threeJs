import { Scene,Camera,WebGLRenderer,Object3D } from "three";
import {
  EffectPass,
  SelectiveBloomEffect,
  EffectComposer,
  RenderPass,
  BlendFunction,
  OutlineEffect,
  HueSaturationEffect,
  BrightnessContrastEffect,
} from "postprocessing";

export class Postprocessing {
  #renderer;
  #scene;
  #camera;
  /**
   * @param { WebGLRenderer } render
   * @param { Scene } scene
   * @param { Camera } camera
   */
  constructor(renderer,scene,camera) {
    this.#renderer = renderer;
    this.#scene = scene;
    this.#camera = camera;
    this.noSelection = []; // 不清除的辉光
    this.#init();
  }

  resize = (width,height) => {
    this.composer.setSize(width,height,true);
  };

  #init() {
    this.#initComposer();
    this.#initRenderPass();
    this.#initBloomEffect();
    this.#initOutLineEffect1();
    this.#initOutLineEffect2();
    this.#initEffectPass();
  }

  #initComposer() {
    // msaa anti-aliasing 多重采样抗锯齿
    const multisampling = this.#renderer.capabilities.maxSamples;
    this.composer = new EffectComposer(this.#renderer,{ multisampling });
  }

  #initRenderPass() {
    this.renderPass = new RenderPass(this.#scene,this.#camera);
    this.composer.addPass(this.renderPass);
  }

  #initBloomEffect() {
    this.bloomEffect = new SelectiveBloomEffect(this.#scene,this.#camera,{
      blendFunction: BlendFunction.ADD,
      luminanceThreshold: 0.01,
      luminanceSmoothing: 0.6,
      intensity: 0.9,
    });
    this.bloomEffect.inverted = false;
    this.bloomEffect.ignoreBackground = true;
    this.bloomEffect.selection.set([]);
  }

  #initOutLineEffect1() {
    this.outlineEffect1 = new OutlineEffect(this.#scene,this.#camera,{
      blendFunction: BlendFunction.ADD,
      edgeStrength: 3,
      pulseSpeed: 0,
      visibleEdgeColor: 0x00ced1,
      hiddenEdgeColor: 0x00ced1,
      blur: false,
      xRay: true,
      usePatternTexture: false,
    });
  }

  #initOutLineEffect2() {
    this.outlineEffect2 = new OutlineEffect(this.#scene,this.#camera,{
      blendFunction: BlendFunction.ADD,
      edgeStrength: 3,
      patternScale: 5,
      // pulseSpeed: 0.2,
      visibleEdgeColor: 0x00ced1,
      hiddenEdgeColor: 0x00ced1,
      blur: false,
      xRay: true,
      usePatternTexture: false,
    });
  }

  #initEffectPass() {
    // 色调通道
    this.hueSaturationEffect = new HueSaturationEffect({ saturation: 0.08 });
    this.brightnessContrastEffect = new BrightnessContrastEffect({
      contrast: 0.2,
    });
    // 创建通道
    const effectPass = new EffectPass(
      this.#camera,
      this.bloomEffect,
      this.outlineEffect1,
      this.outlineEffect2,
      this.hueSaturationEffect,
      this.brightnessContrastEffect,
    );
    this.composer.addPass(effectPass);
  }
  addBloom = obj => {
    const selection = this.bloomEffect.selection;
    if (obj instanceof Object3D) {
      selection.add(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(this.addBloom);
    }
  };
  clearBloom = obj => {
    const selection = this.bloomEffect.selection;
    if (obj instanceof Object3D) {
      selection.delete(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(this.clearBloom);
    }
  };
  addOutline = (obj,channel = 1) => {
    let pass = channel === 1 ? this.outlineEffect1 : this.outlineEffect2;
    if (obj instanceof Object3D) {
      obj.traverse(child => {
        if (child.isMesh) {
          pass.selection.add(child);
        }
      });
    } else if (Array.isArray(obj)) {
      obj.forEach(child => this.addOutline(child,channel));
    }
  };
  clearOutline = (obj,channel = 1) => {
    let pass = channel === 1 ? this.outlineEffect1 : this.outlineEffect2;
    if (obj instanceof Object3D) {
      obj.traverse(child => {
        if (child.isMesh) {
          pass.selection.delete(child);
        }
      });
    } else if (Array.isArray(obj)) {
      obj.forEach(child => this.clearOutline(child,channel));
    }
  };
  setNoSelection = (obj) => { // 设置清除时候不处理外轮廓光
    this.noSelection.push(obj);
  };
  clearNoSelection = () => { // 清空不清除的轮廓
    this.noSelection = [];
  };
  clearOutlineAll(channel) {
    let pass = channel === 1 ? this.outlineEffect1 : this.outlineEffect2;
    pass.selection.set([]);
    this.noSelection.forEach(child => {
      this.addOutline(child);
    });

  }
}
