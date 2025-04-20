import * as THREE from "three";
import { HistoryPath } from "./HistoryPath";
import { HistoryAvatar } from "./HistoryAvatar";
import { dataProcess } from "./dataProcess";
import { historyTrackTime,historyTrackDone } from "../../../message/postMessage";

//todo 建筑隐藏

const material = new THREE.MeshStandardMaterial({
  transparent: true,
  opacity: 0.2,
  color: "#6b90ff"
});
export default class HistoryTrack {
  constructor(core,scene) {
    this.core = core;
    this.trackGroup = new THREE.Group();
    this.trackGroup.name = "历史轨迹组";
    this._scene = scene;
    this._scene._add(this.trackGroup);
    this.buildingList = [];
    this.initAvatar();
    this.createMark();
  }
  initAvatar() {
    this.avatar = new HistoryAvatar();
    this.trackGroup.add(this.avatar.avatarGroup);
  }
  init(param) {
    const { pointForAvatar,pointsForPath,buildings } = dataProcess(param.param.data);
    const avatarType = param.param.type || 1;
    this.avatar.setModel(avatarType,pointForAvatar);
    this.avatar.avatarGroup.traverse(child => {
      if (child.isMesh) {
        this.core.postprocessing.addOutline(child,2);
      }
    });

    const seg = this.avatar.getPathLength();
    this.path = new HistoryPath(pointsForPath,{ seg: seg });
    this.trackGroup.add(this.path);
    this.setMark(pointsForPath[0],pointsForPath[pointsForPath.length - 1]);
    historyTrackDone();

    this.fadeBuilding(buildings);
    console.log("轨迹绘制完毕");
  }
  setPoints(points) {
    this.points = points;
  }

  /**建筑透明  */
  fadeBuilding(list) {
    if (this.buildingList.length !== 0) {
      // 防止上一次效果没有被清除,所以先清除一次
      this.clearBuildingFade();
    }
    this.buildingList = list;

    list.forEach((b) => {
      this.core.buildingMeshObj[b].traverse((child) => {
        if (child.isMesh) {

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
    });
  }

  clearBuildingFade() {
    this.buildingList.forEach((b) => {
      this.core.buildingMeshObj[b].traverse((child) => {

        if (child.isMesh && child.originMaterial) {

          child.material = child.originMaterial;

          delete child.originMaterial;
        }
      });
    });
  }
  command(param) {
    const cmd = param.cmd;
    switch (cmd) {
      case "trackInit":
        this.init(param);
        const timer = setTimeout(() => {
          // 添加时钟防止获取不到胶囊位置
          this.followAvatar(true);
          clearTimeout(timer);
        },80);
        break;
      case "trackStart": // 开始动画
        this.avatar.upPaused();
        break;
      case "trackStop": // 暂停动画
        this.avatar.paused();
        break;
      case "trackSpeedUp": // 加速
        const speed = param.param.val;
        this.avatar.speedUp(speed);
        break;
      case "trackSpeedDown": // 减速
        this.avatar.speedDown();
        break;
      case "trackProgress": // 拖动进度条
        const progress = param.param.progress;
        this.avatar.trackProgress(progress);
        break;
      case 9: // 停止加重置
        this.avatar.resetAnimate();
        break;
      case "trackClear": // 清除
        this.clear();
        break;
    }
  }
  clear() {
    // 如果this.path为undefined,则没有生成路径
    if (!this.path) return;
    this.clearPath();
    this.clearBuildingFade();
    this.core.postprocessing.clearOutlineAll(2);
    this.avatar.clear();
    this.resetMark();
  }
  setMark(start,end) {
    this.startPoint.position.set(start.x,start.y + 5.6,start.z);
    this.endPoint.position.set(end.x,end.y + 5.6,end.z);
    this.startPoint.visible = true;
    this.endPoint.visible = true;
    this.core.postprocessing.addOutline([this.startPoint,this.endPoint],2);
  }
  resetMark() {
    this.startPoint.position.set(0,-100,0);
    this.startPoint.visible = false;
    this.endPoint.position.set(0,-100,0);
    this.endPoint.visible = false;
  }
  clearPath() {
    // this.path.geometry.dispose();
    // this.path.material.dispose();
    // this.path.clear();
    // this.trackGroup.remove(this.path);
    this.path.deleteSelf();
    this.path = null;
  }
  followAvatar() {
    let target = this.avatar.avatarGroup.position;
    let offset = new THREE.Vector3(0,10,0);
    this.core.tweenControl.lerpTo(target,50,1000,offset);
  }
  animateCallback() {
    let camera = this.core.camera;
    let control = this.core.controls;
    let position = this.avatar.avatarGroup.position;

    const direction = new THREE.Vector3().subVectors(camera.position,control.target).normalize();
    const distance = camera.position.distanceTo(control.target);
    const newCameraPosition = position.clone().addScaledVector(direction,distance);
    camera.position.copy(newCameraPosition);

    camera.lookAt(position.x,position.y,position.z);
    control.target.set(position.x,position.y,position.z);
    camera.updateProjectionMatrix();
  }
  createMark() {
    const geometry = new THREE.ConeGeometry(1,2.6,6);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI));
    const materialStart = new THREE.MeshStandardMaterial({ color: "#34B050" });
    const materialEnd = new THREE.MeshStandardMaterial({ color: "#E64811" });
    this.startPoint = new THREE.Mesh(geometry,materialStart);
    this.trackGroup.add(this.startPoint);
    this.endPoint = new THREE.Mesh(geometry,materialEnd);
    this.trackGroup.add(this.endPoint);
    this.resetMark();
    this.startSprite();
  }
  // 绘制起点
  startSprite() {
    const map = new THREE.TextureLoader().load("/textures/start.png");
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: map,sizeAttenuation: false });
    this.startImg = new THREE.Sprite(material);
    this.startImg.position.y = 10;
    this.startImg.scale.set(0.07,0.07,0.07);
    this.startImg.renderOrder = 1;
    this.startPoint.add(this.startImg);
  }
  markUpdate(elapsedTime,deltaTime) {
    if (!this.startPoint.visible || !this.endPoint.visible) return;
    this.startPoint.position.y += Math.sin(elapsedTime) * 0.005;
    this.endPoint.position.y += Math.sin(elapsedTime) * 0.005;
    this.startPoint.rotateY(-deltaTime);
    this.endPoint.rotateY(-deltaTime);
  }
  update(elapsedTime,delta) {
    this.path && this.path.update(elapsedTime);
    this.avatar && this.avatar.update(delta,elapsedTime,historyTrackTime,this.animateCallback.bind(this));
    this.markUpdate(elapsedTime,delta);
  }
}
