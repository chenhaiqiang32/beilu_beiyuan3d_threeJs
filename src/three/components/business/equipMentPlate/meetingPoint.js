
import * as THREE from "three";
import { getCurrentPosition } from "../../Orientation/personCommon";
export class MeetingPointPlate {
  constructor(scene,core) {
    this.core = core;
    this.scene = scene;
    this.cherryArray = [];
    this.spriteObject = {}; // 牌子对象
    this.equipSprite = this.generateLabel("/equip/road.png");
    this.equipGroup = new THREE.Group();
    this.scene._add(this.equipGroup);
  }
  setCherryArray(data) { // 筛选
    this.cherryArray = data;
  }
  cherryPick() {
    // 筛选设备
    this.equipGroup.traverse(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = this.cherryArray.includes('meetingPoint');
      }
    });
  }
  create(param) {
    // 坐标
    const { id,position,name } = param;
    if (this.spriteObject[id]) {
      console.log('集合点已存在');
      // 围栏已经存在
      return false;
    }
    let sprite = this.equipSprite.clone();
    sprite.name = name;
    let relPosition = getCurrentPosition({ sceneType: 1,originId: "",coordinate: position });
    sprite.position.set(relPosition.x,relPosition.y,relPosition.z);
    sprite.visible = this.cherryArray.includes('meetingPoint');
    this.spriteObject[id] = sprite;
    this.equipGroup.add(sprite);
  }
  generateLabel(picture,scale = 0.048) {
    const map = new THREE.TextureLoader().load(picture);
    const material = new THREE.SpriteMaterial({
      map: map,
      sizeAttenuation: false,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 1;
    sprite.scale.set(scale,scale,scale);
    sprite.center = new THREE.Vector2(0.5,0);
    return sprite;
  }
  dispose() {
    this.clearFence();
  }
  update(scope) {
  }
}
