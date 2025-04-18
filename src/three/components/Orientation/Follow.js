import * as THREE from "three";
import { Updatable } from "./Updatable";
import { Orientation } from "./Orientation.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PathPointList } from "../../../lib/PathPointList.js";
import { PathGeometry } from "../../../lib/PathGeometry.js";
import { elapsedTime } from "../../../shader/parameters";
import MemoryManager from './../../../lib/memoryManager';
import { createCSS2DObject,createDom } from "../../../lib/CSSObject";
import { HighlightCircle } from "../../../lib/blMeshes";



export class Follow extends Updatable {

  /**
   * @param {Orientation} orientation
   */
  constructor(orientation) {
    super();

    this.order = 2;

    this.id = null;

    this.orientation = orientation;
    this.core = orientation.core;
    this.postprocessing = this.core.postprocessing;
    this.camera = this.core.camera;
    this.controls = this.core.controls;

    this.tweenControl = this.core.tweenControl;

    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();

    this.startTime = null; // 轨迹开始时间
    this.percent = { value: 0 };
    this.curve = null; // 曲线线条
    this.lastLineNum = 0; // 上个线段余数

    this.animationPerson = new AnimationPerson(this.core); // 初始动画
    this.paths = [];
    this.InterPoints = []; // 计算轨迹数据
    this.singleBuildingLabel = null; // 进入独栋牌子

    this.orientation.addUpdatable(this);
    this.core.onRenderQueue.set("animate person",() => this.onRender());
    this.singleBuildingId = ""; // 独栋编号
  }

  startFollow() {

    this.updateVisible(false);

    if (!this.id) return;

    this.setNameLabelHeight(1.48);

    const item = this.orientation.get(this.id);

    //
    this.from.copy(item.position);

    this.animationPerson.set(this.core.scene);
    this.animationPerson.target.position.copy(item.position);

    this.tweenControl.lerpTo(item.position,10,1000);

    if (this.core.sceneType === 1) {
      this.core.ground.removeEventListener();
    }
    if (this.core.sceneType === 0) {
      // 移除事件监听
      this.core.indoorSubsystem.removeEventListener();
    }
    this.postprocessing.clearOutlineAll();

    this.postprocessing.addOutline(this.animationPerson.outlineMesh);
  }

  cancelFollow() { // 取消跟踪

    this.updateVisible(true);

    this.setNameLabelHeight(0);
    //

    this.id = null;
    this.animationPerson.cancelFollow();
    MemoryManager.dispose(this.paths);
    this.paths.length = 0;
    this.postprocessing.clearOutlineAll();

    this.curve = null;

    this.from.set(0,0,0);
    this.to.set(0,0,0);

  }

  createPath(data) {

    const { originId,sceneType,position } = data;

    if (this.singleBuildingLabel) {
      MemoryManager.dispose(this.singleBuildingLabel);
    }
    if (sceneType === 0 && originId.indexOf("F") === -1) { // 进入未建模的建筑
      this.singleBuildingId = originId;
      const nameDom = createDom({ innerText: `${data.name}进入独栋建筑`,id: `singleBuilding` });
      const container = createDom({ id: "person-sprite-container",children: [nameDom] },"click",() => {
      });
      this.singleBuildingLabel = createCSS2DObject(container);
      this.singleBuildingLabel.position.y = 3.2;
      this.animationPerson.target.add(this.singleBuildingLabel);

      let buildingPosition = this.core.ground.buildingNameLabelMap[originId].position;
      this.animationPerson.target.position.set(buildingPosition.x,position.y,buildingPosition.z);
      this.curve = null;
      if (this.core.ground.singleBuildingGroup[originId]) {
        // 找到了建筑
        this.core.ground.singleBuildingGroup[originId].traverse(child => {
          if (child instanceof THREE.Mesh) {

            const temMaterial = [];
            child.material.forEach((m,index) => {
              const cloneMaterial = m.clone();
              cloneMaterial.transparent = true;
              cloneMaterial.opacity = 0.4;
              temMaterial.push(cloneMaterial);
            });

            child.originMaterial = child.material;
            child.material = temMaterial;
          }
        });
      }

      const { camera,controls } = this.core;

      camera.lookAt(this.animationPerson.target.position);
      controls.target.copy(this.animationPerson.target.position);

      return;
    } else {
      if (this.core.ground.singleBuildingGroup[this.singleBuildingId]) {
        //找到模型
        this.core.ground.singleBuildingGroup[this.singleBuildingId].traverse(child => {
          if (child instanceof THREE.Mesh) {

            child.material = child.originMaterial;
            delete child.originMaterial;

          }
        });
      }
      const { camera,controls } = this.core;

      camera.lookAt(this.animationPerson.target.position);
      controls.target.copy(this.animationPerson.target.position);
      this.singleBuildingId = "";
    }

    this.animationPerson.set(this.core.scene);

    // 搜索的人离开当前场景了
    const { sceneType: currentType,originId: currentOrigin } = this.core.getCurrentOriginId();
    if ((sceneType !== currentType) || (sceneType === 0 && (originId !== currentOrigin))) {

      this.animationPerson.target.position.set(position);

      this.curve = null;
      return;
    }

    this.startTime = Date.now(); // 轨迹开始时间的时间戳
    this.percent = { value: 0 };

    const path = new TraceLine(this.from,this.to,this.lastLineNum,);

    this.curve = path.curve;
    // this.paths.push(path);
    this.core.scene.add(path);
  }

  changePosition(t) {
    this.lastLineNum = (this.curve.getLength() - (1 - this.lastLineNum)) % 1;

    const item = this.orientation.get(this.id);

    const position = this.curve.getPointAt(t); // t: 当前点在线条上的位置百分比，后面计算
    item.object3d.position.copy(position);
    this.from.copy(position);

    this.animationPerson.target.position.copy(position);

    const tangent = this.curve.getTangentAt(t);
    tangent.y = 0;
    const lookAtVec = tangent.add(position); // 位置向量和切线向量相加即为所需朝向的点向量
    this.animationPerson.target.lookAt(lookAtVec);

    // 更新相机位置
    const direction = new THREE.Vector3().subVectors(this.camera.position,this.controls.target).normalize();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const newCameraPosition = position.clone().addScaledVector(direction,distance);
    this.camera.position.copy(newCameraPosition);

    this.camera.lookAt(position);
    this.controls.target.copy(position);

    this.setNameLabelHeight(1.8);

  }

  /**
   * @param {Orientation} orientation
   */
  updateVisible(bool) {
    const followPerson = this.orientation.get(this.id);
    if (!followPerson) return;
    followPerson.object3d.traverse(child => {
      if (child.isSprite) {
        child.visible = bool;
      }
    });
  }


  setNameLabelHeight(height) {
    const followPerson = this.orientation.get(this.id);
    if (!followPerson) return;
    followPerson.object3d.traverse(child => {
      if (child.isCSS2DObject) {
        child.position.y = height;
      }
    });
  }

  dispose() {
    this.curve = null;
    this.paths.map(child => {
      child.deleteSelf();
    });
    if (this.animationPerson.target) {
      this.animationPerson.dispose();
    }
  }
  update(orientation) {
    if (this.id) {
      this.updateVisible(false);
    }
  }

  onRender() {

    if (!this.id) return;

    if (this.curve) {
      this.percent.value = (Date.now() - this.startTime) / 1900;
      this.percent.value = this.percent.value > 1 ? 1 : this.percent.value;
      if (this.percent.value === 1) {
        this.animationPerson.fadeToAction("Idle",1);
      } else {
        this.animationPerson.fadeToAction("Walk",1);
      }
      this.changePosition(this.percent.value);

      this.paths.forEach(path => path.update(this.percent));
    } else {

      this.animationPerson.fadeToAction("Idle",1);

    }

    this.animationPerson && this.animationPerson.update(this.core.delta,this.core.elapsedTime);
  }
}

class AnimationPerson {

  constructor() {
    this.actions = {};
    this.mixer = null;
    this.previousAction = null;
    this.activeAction = null;
    this.target = new THREE.Object3D(); // 动画的人
    this.highlightCircle = new HighlightCircle();
    this.highlightCircle.position.y += 0.01;
    this.highlightCircle.renderOrder = 2;

    this.outlineMesh = [];
    // this.core.onRenderQueue.set("highlightCircle",() => this.highlightCircle.update(this.core.elapsedTime));
    this.#load();

  }

  #load() {
    const loader = new GLTFLoader();

    loader.load(`/models/others/ren_lan.glb`,gltf => {
      // this.target.add(gltf.scene);
      this.target = gltf.scene;

      this.mixer = new THREE.AnimationMixer(this.target);

      const animations = gltf.animations;
      for (let i = 0; i < animations.length; i++) {
        const clip = animations[i];
        const action = this.mixer.clipAction(clip);
        this.actions[clip.name] = action;
      }


      // 添加高亮光圈
      this.target.add(this.highlightCircle);

      gltf.scene.traverse(child => {
        if (child.isMesh && child.name !== "高亮圆圈") {
          child.castShadow = true;
          this.outlineMesh.push(child);
        }
      });
      this.activeAction = this.actions["Idle"];
      this.activeAction.play();

    });
  }

  set(scene) {
    scene._add(this.target);
  }

  cancelFollow(item) {
    this.target.removeFromParent();
  }

  fadeToAction(name,duration,timeScale = 1) { // 切换动画
    this.previousAction = this.activeAction;
    this.activeAction = this.actions[name];

    if (this.previousAction !== this.activeAction) {
      this.previousAction.fadeOut(duration);
      this.activeAction.timeScale = timeScale;
      this.activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    }
  }

  update(delta,elapsedTime) {
    this.mixer && this.mixer.update(delta);
    this.highlightCircle && this.highlightCircle.update(elapsedTime);
  }
}

class TraceLine extends THREE.Mesh {
  /**
   * @param { THREE.Vector3[] } positions
   */
  constructor(p1,p2,lastLineNum = 0) {
    super();

    this.lastLineNum = lastLineNum;

    this.first = true;
    this.percent = {
      value: 0,
    };

    /* 下面处理轨迹线条 */
    let positions = this.createPoints(p1,p2);
    this.curve = new THREE.CatmullRomCurve3(positions);
    this.curve.curveType = "catmullrom";
    this.curve.tension = 0;
    this.geometry = this.createGeometry(positions);
    this.material = this.createMaterial();
  }
  createPoints(p1,p2) {
    let startVector = new THREE.Vector3().copy(p1);
    let endVector = new THREE.Vector3().copy(p2);
    let distance = startVector.distanceTo(endVector);
    let number = distance / 0.5 < 2 ? 2 : distance / 0.5; // 分的段数

    let points = [];
    for (let i = 0; i <= number; i++) {
      let percent = i / number;
      let point = new THREE.Vector3().lerpVectors(startVector,endVector,percent);
      points.push(point);
    }
    return points;
  }
  createGeometry(positions) {
    const up = new THREE.Vector3(0,1,0);
    const pathPointList = new PathPointList();
    pathPointList.set(positions,0.5,10,up,false);

    const geometry = new PathGeometry();
    geometry.update(pathPointList,{
      width: 1.4,
      arrow: false,
      side: "both",
    });
    return geometry;
  }
  createMaterial() {
    const material = new THREE.MeshStandardMaterial({
      color: 0xfffff,
      depthWrite: true,
      depthTest: false,
      transparent: true,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
    material.onBeforeCompile = shader => {
      shader.uniforms.uElapseTime = elapsedTime;
      shader.uniforms.modelPosition = this.percent;
      shader.uniforms.seg = { value: this.curve.getLength() };
      shader.uniforms.lastNum = {
        value: this.lastLineNum / this.curve.getLength(),
      };
      shader.uniforms.rColor = { value: new THREE.Color("#E5C015") }; // 路中间颜色
      this.shaderModify(shader);
    };
    return material;
  }

  shaderModify = shader => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
       #include <common>
       varying vec3 vPosition;
       varying vec2 st;
       `,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
       #include <begin_vertex>
       vPosition = position;
       st = uv;
       `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <common>`,
      `
     varying vec2 st;
     uniform float uElapseTime;
     uniform float modelPosition;
     uniform vec3 rColor;
     uniform float seg;
     uniform float lastNum;
     void rotate2d(inout vec2 v, float a) {
      mat2 m = mat2(cos(a), -sin(a), sin(a), cos(a));
      v = m * v;
     }
      float arrow(vec2 av) {
       float line1L = 0.5;
        float line1 = length(av - vec2(clamp(av.x, -line1L, line1L), 0.));
        line1 = smoothstep(0.06, 0.05, line1);

        vec2 rav = av;
        rav.x -= line1L + 0.03;
        rotate2d(rav, 3.1415/1.54);

        float arrowL = 0.39;
        float line2 = length(rav - vec2(clamp(rav.x, 0., arrowL), 0.));
        line2 = smoothstep(0.06, 0.05, line2);

        rotate2d(rav, -3.1415 * 1.3 );
        float line3 = length(rav - vec2(clamp(rav.x, 0., arrowL),0.));
        line3 = smoothstep(0.06, 0.05, line3);

        return clamp(line2 + line3 , 0., 1.);
       }
     #include <common>
     //
     `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <dithering_fragment>`,
      `#include <dithering_fragment>
     //#end
     `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      `//#end`,
      `
     //#end
     float p = seg; //线段段数
     float uNum = lastNum;

     float ak = step (st.x, modelPosition);
     vec2 vUvT = vec2(st.x + lastNum,st.y);  // 整体uv向右平移偏移
     vec2 vSt = vec2(fract(vUvT.x * p- uElapseTime), vUvT.y); // 整体分成p段
     vec2 vStp = (vSt * 2.0)-1.0; // 将每段uv范围分成 -1到 1
     float ad = arrow(vStp); // 每段形状
     gl_FragColor.a = ad * ak;
     `,
    );
  };

  update(percent) {
    if (percent.value >= 1) {
      this.first = false;
    }

    this.percent = this.first ? percent : 1;
  }
}
