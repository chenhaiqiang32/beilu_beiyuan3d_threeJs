import TWEEN from "three/examples/jsm/libs/tween.module";
import { Vector3 } from "three";
import Store3D from "../main";

const vec3$1 = new Vector3();

export class TweenControls {
  /** @param {Store3D} param*/
  constructor(param) {
    this.camera = param.camera;
    this.controls = param.controls;
  }

  lerpTo(position,distance = 100,time = 1000,offset = new Vector3()) {
    const _distance = this.camera.position.distanceTo(position);
    const alpha = (_distance - distance) / _distance;
    vec3$1.lerpVectors(this.camera.position,position,alpha);
    vec3$1.add(offset);
    this.changeTo({ start: this.camera.position,end: vec3$1,duration: time,onStart: () => this.controls.enabled = false,onComplete: () => this.controls.enabled = true });
    this.changeTo({
      start: this.controls.target,end: position,duration: time,onUpdate: () => {
        this.camera.lookAt(this.controls.target);
      }
    });
  }

  changeTo(options) {
    const { start,end,duration,onUpdate,onComplete,onStart } = options;

    if (!duration || !end || !start) return;

    return new TWEEN.Tween(start)
      .to(end,duration)
      .onStart(onStart)
      .onUpdate(onUpdate)
      .onComplete(onComplete)
      .start();
  }

  removeAll() {
    TWEEN.removeAll();
  }
}
