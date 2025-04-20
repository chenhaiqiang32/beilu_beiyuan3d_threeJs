import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { elapsedTime } from "./../../../shader/parameters";

export class HistoryAvatar {
    constructor() {
        this.avatarGroup = new THREE.Group();
        this.avatarGroup.name = "人物模型组";
        this.isShow = false; // 判断模型是否被看见,如果没有被看见则历史轨迹没有被开启
        const models = [
            "./models/others/ren_cheng.glb",
            "./models/others/ren_lan.glb",
            "./models/others/ren_huang.glb",
        ];
        this.outlineEffectMesh = [];
        this.avatarType = 1; //todo 工人类型,如果项目只有1种人员类型,则默认为1
        this.animateData = {}; // 模型轨迹动画相关数据

        this.mixer = null; // 模型轨迹动画mixer

        this.initModel(models); // 模型加载后不加入组中,等轨迹初始化后再设置模型setModel

        this.lastTimeIndex = 0;
    }
    initModel(models) {
        // 加载模型
        const promises = [];
        const gltfLoader = new GLTFLoader();
        this.avatars = [{}, {}, {}];
        models.forEach((path, index) => {
            const promise = gltfLoader.loadAsync(path).then(gltf => {
                gltf.scene.traverse(child => {
                    if (child.isMesh) {
                        this.outlineEffectMesh.push(child);
                    }
                });
                const obj = {};
                obj.avatar = gltf.scene;
                obj.avatar.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
                obj.avatarMixer = new THREE.AnimationMixer(obj.avatar);
                obj.avatarAction = obj.avatarMixer.clipAction(gltf.animations[1]);
                obj.avatarAction.play();
                this.avatars[index] = obj;
            });
        });
        Promise.all(promises).then(this.afterLoaded.bind(this));
    }
    upPaused() {
        this.action.paused = false;
    }
    paused() {
        this.action.paused = true;
    }
    speedUp(speed) {
        this.action.timeScale = speed;
    }
    speedDown(speed) {
        if (this.action.timeScale > 1 && this.action.timeScale <= 10) {
            this.action.timeScale -= 1;
        }
    }
    trackProgress(progress) {
        // 切换到特定进度
        this.action.time = progress;
        this.lastTimeIndex = progress;
    }
    resetAnimate() {
        // 停止加重置
        this.action.stop();
    }

    resetModel() {
        this.isShow = false;
        this.avatarGroup.remove(this.avatars[this.avatarType].avatar);
        this.avatarGroup.visible = false;
        this.avatarGroup.position.set(0, -100, 0);
    }
    setModel(type = 1, data) {
        this.avatarType = type;
        this.avatarGroup.add(this.avatars[type].avatar);
        this.avatarGroup.visible = true;

        this.initAnimate(data);

        this.isShow = true;
    }
    initAnimate(data) {
        const points = data;
        // 加工曲线均分曲线
        const spaceCurve = new THREE.CatmullRomCurve3(data);
        spaceCurve.curveType = "catmullrom";
        spaceCurve.tension = 0.2; //catmullrom 类型的张力

        this.animateData.points = points; //曲线点的集合
        this.animateData.curve = spaceCurve; // 曲线

        this.mixer = new THREE.AnimationMixer(this.avatarGroup);

        //生成模型轨迹动画
        let posArr = [];
        let timeArr = [];

        for (let i = 0; i < points.length; i++) {
            timeArr.push(i); // 时间序列
            posArr.push(points[i].x, points[i].y, points[i].z); //位移坐标序列
        }

        // 生成时间序列
        let times = new Float32Array(timeArr);
        // 创建一个和时间序列相对应的位置坐标序列
        let posValues = new Float32Array(posArr);
        // 创建旋转四元素的序列
        let quaternionValues = this.calculateQuaternion(points);

        // 位移动画track
        let posTrack = new THREE.KeyframeTrack(".position", times, posValues);
        // 旋转动画track
        let rotateTrack = new THREE.QuaternionKeyframeTrack(".quaternion", times, quaternionValues);

        let duration = points.length;
        this.avatarGroup.position.set(posArr[0], posArr[1], posArr[2]);

        this.clip = new THREE.AnimationClip("default", duration, [posTrack, rotateTrack]);
        this.action = this.mixer.clipAction(this.clip);
        this.action.clampWhenFinished = true;
        this.action.loop = THREE.LoopOnce; // 只执行一次
        this.action.timeScale = 1; // 设定速度
        this.action.play();
        this.action.paused = true;
    }

    // 计算旋转四元数
    calculateQuaternion(points) {
        const length = points.length;
        const quaternionArr = [];
        const up = new THREE.Vector3(0, 1, 0);
        let toRotate;
        for (let i = 0; i < length; i++) {
            // 下一个点作为朝向
            if (i < length - 1) {
                const position = points[i];
                const target = points[i + 1];
                let mtx = new THREE.Matrix4();
                mtx.lookAt(position, target, up);
                toRotate = new THREE.Quaternion().setFromRotationMatrix(mtx);
            } else {
                // 最后一个点时,没有下一个点作为朝向,取i-1的方向,也就是保持不动
                toRotate = quaternionArr[i - 1].clone();
            }
            quaternionArr.push(toRotate);
        }
        const quaternionRawArr = [];

        quaternionArr.forEach(q => {
            // quaternionRawArr.push(q.x, q.y, q.z, q.w);
            quaternionRawArr.push(0, q.y, 0, q.w); // 欧拉角只保存y轴旋转角度，否则人物模型会在上下坡时模型垂直于斜面
        });
        return new Float32Array(quaternionRawArr);
    }
    afterLoaded() {
        // console.log("历史轨迹模型加载完毕");
    }
    getPathLength(num = 10) {
        return Math.floor(this.animateData.curve.getLength()) / 10;
    }
    mixerUpdate(deltaTime) {
        this.mixer && this.mixer.update(deltaTime);
        this.avatars[this.avatarType].avatarMixer.update(deltaTime);
        // 如果模型原地踏步,则暂停动画
        let index = Math.floor(this.lastTimeIndex); // lastTimeIndex有可能为0.1的情况,所以需要取整
        const current = this.animateData.points[index];
        const next = this.animateData.points[index + 1];
        if (next && current.x === next.x && current.y === next.y && current.z === next.z) {
            this.avatars[this.avatarType].avatarAction.paused = true;
        } else {
            this.avatars[this.avatarType].avatarAction.paused = false;
        }
    }
    updateEachSecond(callback) {
        const currentIndex = Math.floor(this.action.time);

        // 下面步骤为了目的时为了告知前端正确的动画进度 每秒执行一次
        if (currentIndex === 0 && this.lastTimeIndex === 0) {
            callback(Math.floor(this.action.time));
            this.lastTimeIndex = 0.1; // 等于0.1只是为了让该方法只执行一次
        }
        if (currentIndex > this.lastTimeIndex) {
            callback(Math.floor(this.action.time));
            this.lastTimeIndex = currentIndex;
        }
    }
    clear() {
        if (!this.mixer || !this.action) return;
        this.mixer.uncacheAction(this.action);
        this.mixer.uncacheClip(this.clip);
        this.resetModel();
        this.action = null;
        this.clip = null;
        this.lastTimeIndex = 0;
        this.animateData.points = null;
        this.animateData.curve = null;
    }
    update(deltaTime, elapsedTime, callbackEachSecond = () => {}, callback = () => {}) {
        if (!this.isShow) return;
        if (this.avatars.length === 0) {
            console.log("不存在模型");
            return;
        } // 静态资源(模型)没有加载出来
        if (this.action.isRunning()) {
            callback(); // 每一帧的回调函数
            this.mixerUpdate(deltaTime);
            this.updateEachSecond(callbackEachSecond);
        } else {
            this.avatars[this.avatarType].avatarAction.paused = this.action.paused;
        }
    }
}
