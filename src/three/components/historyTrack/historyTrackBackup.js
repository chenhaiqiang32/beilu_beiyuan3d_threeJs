import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import Store3D from "../homeIndex";
import { PathPointList } from "../lib/PathPointList";
import { PathGeometry } from "../lib/PathGeometry";
import { getCurrentPosition } from "./commonFun";

export default class HistoryTrack {
  constructor(_scene,option) {
    this.scene = _scene;
    this.actionObj = {
      isRun: false,
    };
    this.loop = option.loop ? option.loop : THREE.LoopOnce;
    this.speed = option.speed ? option.speed : 1;
    this.buildings = []; // 当前路径经过的建筑模型 需要改变透明度
    this.raycaster = new THREE.Raycaster();
    this.outlineMesh = [];
    this.closeAngle = false;
    this.actionEnd = false;
    this.distance = 0;
    this.elapsedTime = {
      value: 0,
    };
    this.modelPosition = {
      value: 0,
    };
    this.segment = {
      value: 36,
    };
    this.lastTimeIndex = 0;
    this.models = ["./models/others/ren_cheng.glb","./models/others/ren_lan.glb","./models/others/ren_huang.glb"];
    this.workerType = 1;
    this.canFollow = false;
    this.initModel();
  }
  terrainDetect(data) {
    let a = [
      {
        coordinate: { x: -82200,y: -50000,z: 0 },
        dataTime: "2023-07-11 09:00:00",
        originId: "原点_A01B001F01",
        sceneType: 1,
      },
      {
        coordinate: { x: -101200,y: -53000,z: 0 },
        dataTime: "2023-07-11 09:00:00",
        originId: "原点_A01B001F01",
        sceneType: 1,
      },

      {
        coordinate: { x: 0,y: 0,z: 0 },
        dataTime: "2023-07-11 09:00:00",
        originId: "原点_A04B011F05",
        sceneType: 0,
      },
      {
        coordinate: { x: 1000,y: 300,z: 0 },
        dataTime: "2023-07-11 09:00:00",
        originId: "原点_A04B011F05",
        sceneType: 0,
      },
      {
        coordinate: { x: 0,y: 0,z: 0 },
        dataTime: "2023-07-11 09:00:00",
        originId: "原点_A04B029F01",
        sceneType: 0,
      },
    ];
    const _scene = this.scene;
    const pointWIthHeight = []; // 有高度的点集合
    const pointsForPath = []; // 用来绘制路径的点，y轴比人员定位的点高
    // const track = a; // todo
    const track = data;
    if (track.length === 1) {
      let item = JSON.parse(JSON.stringify(track[0]));
      track.push(item);
    }
    for (let i = 0; i < track.length; i++) {
      if (track[i].sceneType === 0 && track[i].originId.includes("F")) {
        // 收集路径经过的建筑
        let id = track[i].originId.split("F")[0];
        !this.buildings.includes(id) && this.buildings.push(id);
      }
      let position = track[i];
      let point = new THREE.Vector3(position.x,position.y + i * 0.00003,position.z);
      let pointForPath = point.clone();
      pointForPath.y = pointForPath.y + 0.4; // 增加路径高度
      pointWIthHeight.push(point);
      pointsForPath.push(pointForPath);
    }
    // 加工曲线均分曲线
    const spaceCurve = new THREE.CatmullRomCurve3(pointWIthHeight);
    spaceCurve.curveType = "catmullrom";
    spaceCurve.tension = 0.2; //catmullrom 类型的张力

    this.line = this.createPath(pointsForPath);
    _scene.add(this.line);
    Store3D.modelManager.addBloom(this.line);
    this.actionObj.points = pointWIthHeight; // 曲线点集合
    this.actionObj.curve = spaceCurve; //曲线
    let defautNum = 10;
    this.segment.value = Math.floor(this.actionObj.curve.getLength() / defautNum); //路径条纹数取决于路径长度,默认为6,数值越大箭头越稀疏
    this.capsuleGroup.add(this.workers[this.workerType].worker);
    this.capsuleGroup.visible = true;
    this.mixer = new THREE.AnimationMixer(this.capsuleGroup);

    // 绘制起点和终点棱形模型
    const startV = this.actionObj.points[0];
    const endV = this.actionObj.points[this.actionObj.points.length - 1];
    this.startPoint.position.set(startV.x,startV.y + 5.6,startV.z);
    this.endPoint.position.set(endV.x,endV.y + 5.6,endV.z);
    this.startPoint.visible = true;
    this.endPoint.visible = true;
    Store3D.historyOutlineEffect.selection.set(this.outlineMesh);
    this.createAnimate();
    this.buildingOpacity();
  }
  // 绘制路径
  createPath(points) {
    const up = new THREE.Vector3(0,1,0);
    const pathPointList = new PathPointList();
    pathPointList.set(points,0.5,10,up,false);
    const geometry = new PathGeometry();
    geometry.update(pathPointList,{
      width: 1.4,
      arrow: false,
      side: "both",
    });
    const material = new THREE.MeshStandardMaterial({
      color: 0xfffff,
      depthWrite: true,
      transparent: true,
      opacity: 1,
      // depthTest: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
    const mesh = new THREE.Mesh(geometry,material);
    mesh.material.onBeforeCompile = shader => {
      shader.uniforms.uElapseTime = this.elapsedTime;
      shader.uniforms.modelPosition = this.modelPosition;
      shader.uniforms.seg = this.segment;
      shader.uniforms.rColor = { value: new THREE.Color("#28F0BD") }; // 路中间颜色
      // shader.uniforms.rColor = { value: new THREE.Color("#E5C015") }; // 路中间颜色
      shader.uniforms.uColor = { value: new THREE.Color("#0E5744") }; // 边缘颜色
      this.shaderModify(shader);
    };
    return mesh;
  }
  // 模型经过的建筑变为透明 并且记录原本材质的属性，有些是透明的有些不是
  buildingOpacity() {
    this.buildings.forEach(id => {
      let allMesh = Store3D.modelManager.buildingObj[id];
      allMesh.forEach(mesh => {
        if (mesh.isMesh) {
          if (mesh.material.length) {
            mesh.renderOrder = 3;
            mesh.material.forEach(m => {
              m.isTransparent = m.transparent;
              m.transparent = true;
              m.opacity = 0.3;
            });
          }
        }
      });
    });
  }
  resetBuilding() {
    this.buildings.forEach(id => {
      let allMesh = Store3D.modelManager.buildingObj[id];
      allMesh.forEach(mesh => {
        if (mesh.isMesh) {
          if (mesh.material.length) {
            mesh.renderOrder = 0;
            mesh.material.forEach(m => {
              m.transparent = m.isTransparent;
              m.opacity = 1;
            });
          }
        }
      });
    });
    this.buildings = [];
  }
  shaderModify(shader) {
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
      uniform vec3 uColor;
      uniform vec3 rColor;
      uniform float seg;
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
      vec2 nst = (st * 2.0)-1.0;
      vec2 vSt = vec2(fract(nst.x * p- uElapseTime), nst.y);
          vec3 col;
          float a = arrow(vSt) ;
          vec3 cola = uColor;  //底色
          vec3 colb = rColor;
          col = mix(cola,colb,a);

          float al = 1.0;
          // float al = a;
          if(abs(0.5 - st.y) >= 0.4){
            float s = smoothstep(0.4, 0.5,abs(0.5 - st.y));
            col = mix(cola,colb,s);
            al = 1.0;
          }
          gl_FragColor = vec4(col,al);
      `,
    );
  }
  // 创建动画
  createAnimate() {
    const points = this.actionObj.points;
    // 动画
    let posArr = [];
    let timeArr = [];
    for (let i = 0; i < points.length; i++) {
      timeArr.push(i); // 时间序列
      posArr.push(points[i].x,points[i].y,points[i].z); //位移坐标序列
    }
    // 生成时间序列
    let times = new Float32Array(timeArr);
    // 创建一个和时间序列相对应的位置坐标序列
    let posValues = new Float32Array(posArr);
    // 创建旋转四元素的序列
    let quaternionValues = this.calculateQuaternion();

    // 位移动画track
    let posTrack = new THREE.KeyframeTrack(".position",times,posValues);
    // 旋转动画track
    let rotateTrack = new THREE.QuaternionKeyframeTrack(".quaternion",times,quaternionValues);
    let duration = this.actionObj.points.length;
    this.clip = new THREE.AnimationClip("default",duration,[posTrack,rotateTrack]);
    this.action = this.mixer.clipAction(this.clip);
    this.action.clampWhenFinished = true;
    this.action.loop = this.loop; // 只执行一次
    this.action.timeScale = this.speed; // 设定速度
    this.action.play();
    this.action.paused = true;
    window.parent.postMessage(
      {
        cmd: "histroyTrackDone",
      },
      "*",
    );
    const timer = setTimeout(() => {
      // 添加时钟防止获取不到胶囊位置
      this.handleFollow(true);
      clearTimeout(timer);
    },80);
  }
  // 计算旋转四元数
  calculateQuaternion() {
    const length = this.actionObj.points.length;
    const quaternionArr = [];
    const up = new THREE.Vector3(0,1,0);
    for (let i = 0; i < length; i++) {
      // 切线作为朝向
      // const position = this.actionObj.curve.getPointAt((i + 1) / length);
      // const tangent = this.actionObj.curve.getTangentAt((i + 1) / length);
      // const target = tangent.add(position);
      // 下一个点作为朝向
      const position = this.actionObj.points[i];
      const index = i < length - 1 ? i + 1 : i;
      const target = this.actionObj.points[index];
      let mtx = new THREE.Matrix4();
      mtx.lookAt(position,target,up);
      let toRotate = new THREE.Quaternion().setFromRotationMatrix(mtx);
      quaternionArr.push(toRotate);
    }
    const quaternionRawArr = [];

    quaternionArr.forEach(q => {
      // quaternionRawArr.push(q.x, q.y, q.z, q.w);
      quaternionRawArr.push(0,q.y,0,q.w); // 欧拉角只保存y轴旋转角度，否则人物模型会在上下坡时模型垂直于斜面
    });
    return new Float32Array(quaternionRawArr);
  }
  // 通讯指令
  historyTrackAnimate(param) {
    const cmd = param.cmd;

    switch (cmd) {
      case "trackInit":
        // 真实数据在此处传入
        const data = param.param.data;
        this.workerType = param.param.type || 0;
        this.terrainDetect(data);
        Store3D.currentMode = "historyTrack";
        Store3D.setControlerMove(25);
        break;
      case "trackStart": // 开始动画
        this.action.paused = false;
        break;
      case "trackStop": // 暂停动画
        this.action.paused = true;
        break;
      case "trackSpeedUp": // 加速
        const speed = param.param.val;
        this.action.timeScale = speed;
        break;
      case "trackSpeedDown": // 减速
        if (this.action.timeScale > 1 && this.action.timeScale <= 10) {
          this.action.timeScale -= 1;
        }
        break;
      case "trackProgress": // 拖动进度条
        const progress = param.param.progress;
        this.action.time = progress;
        this.lastTimeIndex = progress;
        break;
      case "trackAngleSwitch": // 改变视角
        this.angleSwitch();
        break;
      case 9: // 停止加重置
        this.action.stop();
        break;
      case "trackClear": // 清除
        this.clear();
        Store3D.currentMode = "";
        Store3D.setControlerMove();
        break;
    }
  }
  createRaycaster(point,terrain) {
    const p = point.coordinate;
    let start = new THREE.Vector3(p.x,100,p.z);
    let direction = new THREE.Vector3(0,-1,0);
    this.raycaster.set(start,direction);
    this.intersects = this.raycaster.intersectObject(terrain,true);
    return this.intersects[0].point;
  }
  initModel() {
    this.capsuleGroup = new THREE.Group();
    this.workerCamera = new THREE.PerspectiveCamera(50,window.innerWidth / window.innerHeight,0.1,1000);
    this.workerCamera.position.set(0,30,40);
    this.workerCamera.lookAt(0,0,0);
    this.capsuleGroup.add(this.workerCamera);
    this.scene.add(this.capsuleGroup);
    const gltfLoader = new GLTFLoader();
    this.workers = [{},{},{}];
    const promises = [];
    this.models.forEach((path,index) => {
      const promise = gltfLoader.loadAsync(path).then(gltf => {
        gltf.scene.traverse(child => {
          if (child.isMesh) {
            // child.material.depthTest = false;
            // child.renderOrder = 1;
            this.outlineMesh.push(child);
          }
        });
        const obj = {};
        obj.worker = gltf.scene;
        obj.worker.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
        obj.workerMixer = new THREE.AnimationMixer(obj.worker);
        obj.workerMixer.name = gltf.animations[1].name;
        obj.workerAction = obj.workerMixer.clipAction(gltf.animations[1]);
        obj.workerAction.play();
        this.workers[index] = obj;
      });
      promises.push(promise);
    });
    Promise.all(promises).then(this.afterLoaded.bind(this));
    const geometry = new THREE.ConeGeometry(1,2.6,6);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI));
    const materialStart = new THREE.MeshStandardMaterial({ color: "#34B050" });
    const materialEnd = new THREE.MeshStandardMaterial({ color: "#E64811" });
    this.startPoint = new THREE.Mesh(geometry,materialStart);
    this.scene.add(this.startPoint);
    this.endPoint = new THREE.Mesh(geometry,materialEnd);
    this.scene.add(this.endPoint);
    this.outlineMesh.push(this.startPoint);
    this.outlineMesh.push(this.endPoint);
    this.startSprite();
    this.modelReset();
  }
  // 绘制起点
  startSprite() {
    const map = new THREE.TextureLoader().load("/start.png");
    map.colorSpace = Store3D.colorSpace;
    const material = new THREE.SpriteMaterial({ map: map,sizeAttenuation: false });
    this.startImg = new THREE.Sprite(material);
    this.startImg.position.y = 25;
    this.startImg.scale.set(0.07,0.07,0.07);
    this.startImg.renderOrder = 1;
    this.startPoint.add(this.startImg);
  }
  mixerUpdate(time) {
    this.mixer.update(time);
    this.workers[this.workerType].workerMixer.update(time);
    if (this.action.isRunning()) {
      // 如果模型原地踏步,则暂停动画
      const current = this.actionObj.points[this.lastTimeIndex];
      const next = this.actionObj.points[this.lastTimeIndex + 1];
      if (next && current.x === next.x && current.y === next.y && current.z === next.z) {
        this.workers[this.workerType].workerAction.paused = true;
      } else {
        this.workers[this.workerType].workerAction.paused = false;
      }
    } else {
      this.workers[this.workerType].workerAction.paused = this.action.paused;
    }
    // console.log(this.actionObj.points[this.lastTimeIndex]);
  }
  modelReset() {
    this.capsuleGroup.visible = false;
    this.capsuleGroup.position.set(0,-100,0);
    this.startPoint.position.set(0,-100,0);
    this.startPoint.visible = false;
    this.endPoint.position.set(0,-100,0);
    this.endPoint.visible = false;
  }
  clear() {
    if (this.mixer && this.action) {
      this.mixer.uncacheAction(this.action);
      this.mixer.uncacheClip(this.clip);
      if (this.closeAngle) {
        // 如果视角贴近
        this.angleSwitch();
      }
      Store3D.modelManager.deleteBloom(this.line);
      Store3D.historyOutlineEffect.selection.set([]);
      this.line.geometry.dispose();
      this.line.material.dispose();
      this.line.clear();
      this.scene.remove(this.line);
      this.capsuleGroup.remove(this.workers[this.workerType].worker);
      this.modelReset();
      this.resetBuilding();
      this.line = null;
      this.clip = null;
      this.action = null;
      this.actionObj.points = null;
      this.actionObj.curve = null;
      this.lastTimeIndex = 0;
      this.distance = 0;
      this.canFollow = false;
    }
  }
  afterLoaded() {
    // console.log("历史轨迹模型加载完毕");
  }
  angleSwitch() {
    if (!this.closeAngle) {
      Store3D.composer.setMainCamera(this.workerCamera);
      this.closeAngle = true;
    } else {
      Store3D.composer.setMainCamera(Store3D.camera);
      this.closeAngle = false;
    }
  }
  handleFollow(allow) {
    if (allow) {
      let camera = Store3D.camera;
      let controls = Store3D.controls;
      let target = this.capsuleGroup.position;
      let position = new THREE.Vector3(target.x,target.y + 60,target.z + 60);
      // 镜头切换到对应的物体
      Store3D.tweenManager._moveTo({
        camera: camera,
        controls: controls,
        target: target,
        position: position,
        onComplete: () => {
          this.canFollow = true;
        },
      });
    }
  }
  follow() {
    let camera = Store3D.camera;
    let control = Store3D.controls;
    let position = this.capsuleGroup.position;
    camera.lookAt(position.x,position.y,position.z);
    control.target.set(position.x,position.y,position.z);
    camera.updateProjectionMatrix();
  }
  update(deltaTime,elapsedTime) {
    if (this.mixer && this.action) {
      this.modelPosition.value = this.action.time / this.actionObj.points.length;
      this.elapsedTime.value = elapsedTime;
      this.startPoint.position.y += Math.sin(elapsedTime) * 0.005;
      this.endPoint.position.y += Math.sin(elapsedTime) * 0.005;
      this.startPoint.rotateY(-deltaTime);
      this.endPoint.rotateY(-deltaTime);
      this.mixerUpdate(deltaTime);
      const currentIndex = Math.floor(this.action.time);
      if (this.action.isRunning()) {
        this.canFollow && this.follow();
        // this.actionEnd = false;
        if (currentIndex === 0 && this.lastTimeIndex === 0) {
          window.parent.postMessage(
            {
              cmd: "histroyTrackRunning",
              time: Math.floor(this.action.time),
            },
            "*",
          );
          this.lastTimeIndex = 0.1;
        }
        if (currentIndex > this.lastTimeIndex) {
          window.parent.postMessage(
            {
              cmd: "histroyTrackRunning",
              time: Math.floor(this.action.time),
            },
            "*",
          );
          this.lastTimeIndex = currentIndex;
        }
      }
    }
  }
}
