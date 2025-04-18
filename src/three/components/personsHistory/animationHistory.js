import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import { FrameAnimation } from "./FrameAnimationCommon";
import { createCSS2DObject } from "../../../lib/CSSObject";
import MemoryManager from "../../../lib/memoryManager";
import { toGatherIndex } from "../../../message/postMessage";
import { dangerHistoryData } from "../dataProgress";

class AnimationHistory {
  constructor(core) {
    this.core = core;
    this.create();
    this.loader = new GLTFLoader();
    this.mixers = [];
    this.animateType = "Idle";
    this.outlineMesh = [];
    this.memoryManager = new MemoryManager();
    this.historyAnimations = new Map(); // 模型动画信息
    this.roadPersonAnimate = new Map(); // 帧动画的信息
    this.testObj = [
      {
        name: "人的名字1",
        id: 0,
        type: 0,
        tracks: [
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 0,y: 0,z: 0 },
            quaternion: { x: 0,y: 0,z: 0 },
            index: 0,
            id: 0,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            // move: null,
          },
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 4,y: 0,z: 4 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 2,
            id: 1,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            // move: null,
          },
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 12,y: 0,z: 12 },
            quaternion: { x: 0,y: 0,z: 0 },
            index: 4,
            id: 2,
            dataTime: "2023-04-08 12:15:48",
            visible: false,
            // move: null,
          },
          {
            sceneType: 0,
            id: 3,
            originId: "A23423",
            position: { x: 8,y: 0,z: 8 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 6,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            // move: true,
          },
          {
            id: 4,
            sceneType: 0,
            originId: "A23423",
            position: { x: 16,y: 0,z: 16 },
            quaternion: { x: 0,y: 0,z: 0 },
            index: 12,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            // move: true,
          },
        ],
      },
      {
        name: "人的名字2",
        id: 1,
        type: 1,
        tracks: [
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 0,y: 4,z: 0 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 0,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            id: 5,
            // move: true,
          },
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 4,y: 4,z: 4 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 2,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            id: 6,
            // move: true,
          },
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 8,y: 4,z: 8 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 4,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            id: 7,
            // move: false,
          },
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 8,y: 4,z: 8 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 6,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            id: 8,
            // move: true,
          },
          {
            sceneType: 0,
            originId: "A23423",
            position: { x: 16,y: 4,z: 16 },
            quaternion: { x: 0,y: Math.PI / 2,z: 0 },
            index: 12,
            dataTime: "2023-04-08 12:15:48",
            visible: true,
            id: 9,
            // move: true,
          },
        ],
      },
    ];
    this.isPaused = false; // 是否暂停
    this.typeToAnimation = {
      0: "/models/others/ren_lan.glb",
      1: "/models/others/ren_cheng.glb",
      2: "/models/others/ren_huang.glb",
    };
    this.core.onRenderQueue.set("AnimationHistory",this.update.bind(this));
    // setTimeout(() => {
    //   let toData = dangerHistoryData({
    //     personList: [{
    //       name: "人的名字",
    //       id: "234",
    //       type: 0,
    //       tracks: [{  // 轨迹
    //         sceneType: 1,
    //         originId: "A01B001F01",
    //         coordinate: { x: 435,y: 5345,z: 453453 },
    //         dataTime: "2023-04-08 12:15:48",
    //         index: 0 // 播放器的下标
    //       }]
    //     },{
    //       name: "人的名字",
    //       id: "234",
    //       type: 0,
    //       tracks: [{  // 轨迹
    //         sceneType: 1,
    //         originId: "A01B001F01",
    //         coordinate: { x: 435,y: 5345,z: 653453 },
    //         dataTime: "2023-04-08 12:15:58",
    //         index: 1 // 播放器的下标
    //       }]
    //     }],
    //     indexList: [{ index: 0,dataTime: "2023-04-08 12:15:00" },{ index: 1,dataTime: "2023-04-08 12:15:58" },{ index: 2,dataTime: "2023-04-08 12:16:58" }] // 完整下标列表}
    //   });
    //   this.init(toData);
    // },12000);
  }
  todoData(data) {
    // 处理数据
    let newArray = [];
    data.forEach(child => {
      let objects = child.newTracks;
      objects.forEach((child,i) => {
        const currentObj = child;
        const nextObj = objects[i + 1];
        if (!nextObj) {
          currentObj.move = false;
        } else {
          const currentObjPosition = currentObj.position;
          const nextObjPosition = nextObj.position;

          if (
            currentObjPosition.x !== nextObjPosition.x ||
            currentObjPosition.y !== nextObjPosition.y ||
            currentObjPosition.z !== nextObjPosition.z
          ) {
            currentObj.move = true;
          } else {
            currentObj.move = false;
          }
        }
      });

      let newObj = {
        id: child.id,
        name: child.name,
        type: child.type,
        tracks: objects,
      };
      newArray.push(newObj);
      this.init2(newObj);
    });
  }
  create() {
    var geometry = new THREE.BoxGeometry(1,1,1);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry,material);
    material.visible = false;
  }
  init(data) {
    this.todoData(data);
  }
  async init2(array) {
    const { name } = array;
    let cube = this.cube.clone();
    let positions = [];
    let times = [];
    let visible = [];
    array.tracks.forEach(child => {
      positions.push(Object.values(child.position));
      times.push(child.index);
      visible.push(child.visible);
    });
    let animateObj = FrameAnimation.bindFrameFromData(cube,"createAnimate",{
      times,
      visible,
      positions,
    });
    const { action,mixer,clip } = animateObj;
    action.play(); // 帧动画的生成
    let board = this.setPersonBoard({ name: name,id: array.id },true,() => {
      alert(4234);
    });
    this.roadPersonAnimate.set(array.id,{
      model: cube,
      action,
      clip,
      mixer,
      tracks: array.tracks,
      name,
    });
    // array.tracks.forEach(val => {
    //   this.roadPersonAnimate.get(array.id).tracks.set(val.index, val);
    // });
    let animatePerson = await this.loadModelAndAnimations(this.typeToAnimation[array.type],"Idle",array.id,board); // "Idle", "walk"
    animatePerson.traverse(child => {
      if (child.isMesh) {
        this.outlineMesh.push(child);
      }
    });
    this.core.postprocessing.addOutline(this.outlineMesh,1);
    this.animateType = "Idle";
    /**@type {THREE.Object3D} */
    let cb = cube;
    cb.add(board);
    cb.add(animatePerson);
    this.mixers.push(mixer);
    this.core.scene.add(cube);
  }
  setPersonBoard(child,visible = false,fun) {
    let color = { 1: "yellow",2: "orange",3: "red" };
    let labelEle = document.createElement("div");
    let labelBottomDown = document.createElement("div");
    let labelEleOut = document.createElement("div");
    labelEleOut.append(labelEle);
    labelEleOut.append(labelBottomDown);
    labelEleOut.draggable = false;
    labelEleOut.className = `beilu_three_Board_text_person_blue`;
    labelBottomDown.className = `beilu_three_Board_text_person_bottom_down_blue`;
    labelEle.append(child.name);
    if (fun) {
      labelEle.onclick = () => {
        fun();
      };
    }
    let css2d = createCSS2DObject(labelEleOut,"board" + child.id);
    css2d.visible = visible;
    return css2d;
  }
  positionClip(array) {
    // 获取自定义帧动画
    var keyframes = [];
    array.tracks.forEach(child => {
      keyframes.push({
        time: child.index,
        value: child.position,
      });
    });
    let positionArr = [];
    keyframes.map(kf => {
      return (positionArr = positionArr.concat(Object.values(kf.value)));
    });
    var positionTrack = new THREE.KeyframeTrack(
      ".position",
      keyframes.map(kf => {
        return kf.time;
      }),
      positionArr,
    );
    return positionTrack;
  }
  booleanClip(array) {
    // 获取自定义帧动画
    var keyframes = [];
    array.tracks.forEach(child => {
      keyframes.push({
        time: child.index,
        value: child.visible,
      });
    });
    var booleanTrack = new THREE.BooleanKeyframeTrack(
      ".visible",
      keyframes.map(kf => {
        return kf.time;
      }),
      keyframes.map(kf => {
        return kf.value;
      }),
    );
    return booleanTrack;
  }

  quaternionClip(array) {
    var keyframes = [];
    array.tracks.forEach(child => {
      keyframes.push({
        time: child.index,
        value: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(child.quaternion.x,child.quaternion.y,child.quaternion.z),
        ),
      });
    });
    let positionArr = [];
    keyframes.map(kf => {
      return (positionArr = positionArr.concat([kf.value._x,kf.value._y,kf.value._z,kf.value.x]));
    });
    var quaternionTrack = new THREE.KeyframeTrack(
      ".quaternion",
      keyframes.map(kf => {
        return kf.time;
      }),
      positionArr,
    );
    return quaternionTrack;
  }

  // 加载模型和动画
  loadModelAndAnimations(modelFile,animation,id,board) {
    return new Promise(resolve => {
      this.loader.load(modelFile,gltf => {
        const model = gltf.scene;

        const mixer = new THREE.AnimationMixer(model);
        this.mixers.push(mixer);
        let action = {};
        let clips = [];
        gltf.animations.forEach(clip => {
          action[clip.name] = mixer.clipAction(clip);
          clips.push(clip);
        });
        action[animation].play();
        this.historyAnimations.set(id,{
          model: gltf.scene,
          mixer,
          action,
          moved: false,
          clips,
          board,
        });
        console.log(this.historyAnimations,"historyAnimations");
        resolve(gltf.scene,mixer,action);
      });
    });
  }
  getAnimatePersonAction(id) {
    return this.historyAnimations.get(id).action;
  }
  getAnimatePersonMixer(id) {
    return this.historyAnimations.get(id).mixer;
  }
  getGenerateAnimationAction(id) {
    return this.roadPersonAnimate.get(id).action;
  }
  getGenerateAnimationMixer(id) {
    return this.roadPersonAnimate.get(id).mixer;
  }

  // 切换到另一个动作
  switchAnimation(id,oldAction,newAction) {
    // 过渡到第二个动作
    const action1 = this.getAnimatePersonAction(id)[oldAction];
    const action2 = this.getAnimatePersonAction(id)[newAction];
    action1.crossFadeTo(action2,0.1,true); // 过渡时间为0.5秒

    // 停止第一个动作
    action1.stop();

    // 播放第二个动作
    action2.play();
    let moved = newAction === "Idle" ? false : true;
    this.historyAnimations.get(id).moved = moved;
    this.animateType = newAction;
  }
  setTime(time) {
    // 拖动所有人员时间
    this.roadPersonAnimate.forEach((child,key) => {
      let action = this.getGenerateAnimationAction(key);
      action.time = time;
    });
  }
  pause(status) {
    // 所有人员暂停
    this.isPaused = status;
    this.roadPersonAnimate.forEach((child,key) => {
      let action = this.getGenerateAnimationAction(key);
      action.paused = status;
    });
    this.setAllPersonAnimatePause(status);
  }
  changeSpeed(number) {
    this.roadPersonAnimate.forEach((child,key) => {
      let action = this.getGenerateAnimationAction(key);
      action.setEffectiveTimeScale(number);
    });
  }
  setAllPersonAnimatePause(status) {
    // 所有模型执行停止动作
    if (status) {
      this.historyAnimations.forEach((value,key) => {
        let action = value.mixer._actions.find(action => action.isRunning());
        let actionName = action._clip.name;
        if (actionName === "Walk") {
          this.switchAnimation(key,"Walk","Idle");
        }
      });
    }
    if (!status) {
      this.setPersonAnimate();
    }
  }

  setPersonAnimate() {
    // 处理人员正常情况下的动作
    let currentTime = this.roadPersonAnimate.entries().next().value[1].action.time;
    this.roadPersonAnimate.forEach((child,key) => {
      let currentPerson = this.roadPersonAnimate.get(key); // 当前人员
      let closestKey = null;
      closestKey = Math.floor(currentTime);
      console.log(closestKey,currentTime,"closestKey");
      toGatherIndex(closestKey);
      let animateStatus = currentPerson.tracks.get(closestKey).move; // 获取模型运行状态
      let animateVisible = currentPerson.tracks.get(closestKey).visible; // 获取模型运行状态
      let animateDataTime = currentPerson.tracks.get(closestKey).dataTime; // 获取模型运行状态
      if (!this.historyAnimations.get(key)) {
        return console.log(`id${key}的人员不存在`);
      }
      let board = this.historyAnimations.get(key).board;
      board.visible = animateVisible;
      board.element.innerText = currentPerson.name + "(" + animateDataTime + ")";
      let currentModelMove = this.historyAnimations.get(key).moved;
      let nextPosition = currentPerson.tracks.get(closestKey + 1).position;
      let currentPosition = currentPerson.tracks.get(closestKey).position;
      let newQuaternion = this.calculateQuaternion(currentPosition,nextPosition);
      this.historyAnimations.get(key).model.quaternion.copy(newQuaternion);

      // this.historyAnimations.get(key).model.lookAt(new THREE.Vector3(nextPosition.x,nextPosition.y,nextPosition.z));

      if (animateStatus !== currentModelMove) {
        // 运行状态不动
        console.log(currentTime,closestKey,"closestKey1",animateStatus,currentModelMove);
        let animateName = animateStatus ? "Walk" : "Idle";
        let oldAnimateName = currentModelMove ? "Walk" : "Idle";
        this.historyAnimations.get(key).moved = animateStatus;
        this.switchAnimation(key,oldAnimateName,animateName); // 切换模型动作
      }
    });
  }

  // 计算旋转四元数
  calculateQuaternion(position,target) {
    const up = new THREE.Vector3(0,1,0);
    let mtx = new THREE.Matrix4();
    mtx.lookAt(target,position,up);
    return new THREE.Quaternion().setFromRotationMatrix(mtx);
  }

  disposeAnimatePerson() {
    // 人物模型动画销毁
    this.historyAnimations.forEach((value,key) => {
      const { model,mixer,action,clips,board } = value;
      clips.forEach(clip => {
        mixer.uncacheClip(clip); // 移除动画资源
      });
      Object.values(action).forEach(child => {
        child.stop();
        mixer.uncacheAction(child); // 移除动作
      });
      this.memoryManager.track(model);
      this.memoryManager.track(board);
      this.memoryManager.dispose();
      this.core.scene.remove(model);
    });
    this.historyAnimations = new Map();
    this.historyAnimations.clear();
    this.isPaused = false;
    this.mixers = [];
    this.animateType = "Idle";
  }

  disposeCreateAnimate() {
    // 销毁生成的帧动画
    this.roadPersonAnimate.forEach((value,key) => {
      const { action,clip,mixer,tracks,model } = value;
      mixer.uncacheClip(clip);
      mixer.uncacheAction(action);
      model.geometry.dispose();
      model.material.dispose();
      tracks.clear();
      this.core.scene.remove(model);
    });
    this.roadPersonAnimate.clear();
    this.roadPersonAnimate.clear();
  }
  dispose() {
    if (this.mixers.length === 0) return false;
    this.disposeAnimatePerson();
    this.disposeCreateAnimate();
  }
  update(elapsed) {
    this.mixers.forEach(mixer => {
      mixer.update(0.01);
    });
    if (!this.isPaused && this.mixers.length) this.setPersonAnimate(); // 渲染人员动作
  }
}
export default AnimationHistory;
