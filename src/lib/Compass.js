

import * as THREE from "three";
import { CoreBase } from "../three/core/CoreBase";

const mat4 = new THREE.Matrix4();

export class Compass {

  get theta() {
    return this.#plane.rotation.z;
  }

  set theta(value) {
    this.#plane.rotation.z = -value / 180 * Math.PI;
  }

  #plane;

  constructor(core) {
    this.renderer = core.renderer;
    const texture = new THREE.TextureLoader().load("./textures/compass.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(10,10);

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      map: texture
    });
    const plane = new THREE.Mesh(geometry,material);
    plane.rotateX(-Math.PI / 2);
    this.#plane = plane;

    const camera = new THREE.PerspectiveCamera(45,1,1,20);
    camera.updateProjectionMatrix();
    this.camera = camera;

    const scene = new THREE.Scene();
    scene.add(plane);
    this.scene = scene;

    const radius = this.radius = 120;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.upViewport = new THREE.Vector4(width * 0.65,(height * 0.94) - radius,radius,radius);
    this.saveViewport = new THREE.Vector4(0,0,width,height);

  }


  resize = (width,height) => {

    const radius = this.radius;

    this.upViewport.set(width * 0.65,(height * 0.94) - radius,radius,radius);
    this.saveViewport.set(0,0,width,height);

  };

  /**
   * @param {CoreBase} core
   */
  update(core) {

    const renderer = core.renderer;
    const coreCamera = core.camera;

    const camera = this.camera;

    const { upViewport,saveViewport } = this;


    camera.position.set(0,0,12);
    mat4.extractRotation(coreCamera.matrix);

    camera.position.applyMatrix4(mat4);
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();

    renderer.setViewport(upViewport);
    renderer.setScissor(upViewport);
    renderer.render(this.scene,camera);

    renderer.setViewport(saveViewport);
    renderer.setScissor(saveViewport);
  }
}
