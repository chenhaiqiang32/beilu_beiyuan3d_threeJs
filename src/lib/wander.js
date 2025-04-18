import { Clock, PerspectiveCamera, Object3D, Vector3 } from "three";

import { Octree } from "three/addons/math/Octree.js";

import { Capsule } from "three/addons/math/Capsule.js";

const MAXIMUM_ERROR = 10e-7;

export class Wander {
  constructor(position = new Vector3(0, 1, 0)) {
    this.defaultPosition = position;

    this.camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.rotation.order = "YXZ";

    this.clock = new Clock();

    this.isReady = false;
    this.GRAVITY = 30;

    this.STEPS_PER_FRAME = 5;

    this.worldOctree = new Octree();

    this.playerCollider = new Capsule(
      this.defaultPosition,
      this.defaultPosition.clone().add(new Vector3(0, 0.9, 0)),
      0.4,
    );

    this.playerVelocity = new Vector3();
    this.playerDirection = new Vector3();

    this.playerOnFloor = false;

    this.keyStates = {};
  }

  set collisions(object) {
    if (object instanceof Object3D) {
      this.worldOctree.fromGraphNode(object);
      this.isReady = true;
    } else {
      this.isReady = false;
    }
  }

  start() {
    this.addEvents();
  }

  end() {
    this.removeEvents();
  }

  addEvents() {
    this.bindPointermove = this.onPointermove.bind(this);
    this.bindKeydown = this.onKeydown.bind(this);
    this.bindKeyup = this.onKeyup.bind(this);

    document.body.addEventListener("pointermove", this.bindPointermove);
    document.body.addEventListener("keydown", this.bindKeydown);
    document.body.addEventListener("keyup", this.bindKeyup);
  }
  removeEvents() {
    document.body.removeEventListener("pointermove", this.bindPointermove);
    document.body.removeEventListener("keydown", this.bindKeydown);
    document.body.removeEventListener("keyup", this.bindKeyup);

    this.bindPointermove = null;
    this.bindKeydown = null;
    this.bindKeyup = null;
  }
  onPointermove(event) {
    if (event.buttons === 2) {
      this.camera.rotation.y -= event.movementX / 500;
      this.camera.rotation.x -= event.movementY / 500;
    }
  }
  onKeydown(event) {
    this.keyStates[event.code] = true;
  }
  onKeyup(event) {
    this.keyStates[event.code] = false;
  }
  update() {
    if (!this.isReady) return;

    const deltaTime = Math.min(0.05, this.clock.getDelta()) / this.STEPS_PER_FRAME;

    for (let i = 0; i < this.STEPS_PER_FRAME; i++) {
      this.controls(deltaTime);

      this.updatePlayer(deltaTime);

      this.teleportPlayerIfOob();
    }
  }

  playerCollisions() {
    const result = this.worldOctree.capsuleIntersect(this.playerCollider);

    this.playerOnFloor = false;

    if (result) {
      const { normal, depth } = result;

      if (normal.y < MAXIMUM_ERROR) normal.y = 0;

      this.playerOnFloor = normal.y > 0;

      normal.normalize();

      if (!this.playerOnFloor) {
        this.playerVelocity.addScaledVector(normal, -normal.dot(this.playerVelocity));
      }

      this.playerCollider.translate(normal.multiplyScalar(depth));
    }
  }

  updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.playerOnFloor) {
      this.playerVelocity.y -= this.GRAVITY * deltaTime;

      // small air resistance
      damping *= 0.1;
    }

    this.playerVelocity.addScaledVector(this.playerVelocity, damping);

    const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
    this.playerCollider.translate(deltaPosition);

    this.playerCollisions();

    this.camera.position.copy(this.playerCollider.end);
  }

  getForwardVector() {
    this.camera.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();

    return this.playerDirection;
  }

  getSideVector() {
    this.camera.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();
    this.playerDirection.cross(this.camera.up);

    return this.playerDirection;
  }

  controls(deltaTime) {
    // gives a bit of air control
    const speedDelta = deltaTime * (this.playerOnFloor ? 25 : 8);

    if (this.keyStates["KeyW"]) {
      this.playerVelocity.add(this.getForwardVector().multiplyScalar(speedDelta));
    }

    if (this.keyStates["KeyS"]) {
      this.playerVelocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
    }

    if (this.keyStates["KeyA"]) {
      this.playerVelocity.add(this.getSideVector().multiplyScalar(-speedDelta));
    }

    if (this.keyStates["KeyD"]) {
      this.playerVelocity.add(this.getSideVector().multiplyScalar(speedDelta));
    }

    if (this.playerOnFloor) {
      if (this.keyStates["Space"]) {
        this.jump();
      }
    }
  }
  jump = throttle(() => {
    this.playerVelocity.y = 4;
  }, 700);

  teleportPlayerIfOob() {
    if (this.camera.position.y <= -25) {
      this.playerCollider.start.set(this.defaultPosition);
      this.playerCollider.end.set(this.defaultPosition.clone().add(new Vector3(0, 0.9, 0)));
      this.playerCollider.radius = 0.4;
      this.camera.position.copy(this.playerCollider.end);
      this.camera.rotation.set(0, 0, 0);
    }
  }
}

function throttle(func, wait) {
  var previous = 0;
  return function () {
    let now = Date.now();
    if (now - previous > wait) {
      func();
      previous = now;
    }
  };
}
