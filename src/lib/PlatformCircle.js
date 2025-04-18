import * as THREE from "three";

const vertexShader = `
varying vec3 vPosition;
varying vec2 vUv;
void main() {
   vPosition = position;
   vUv = uv;
   vec4 modelPosition = modelMatrix * vec4 ( position, 1.0);
   gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

const fragmentShader = `
varying vec2 vUv;
      uniform sampler2D bg;
      uniform float opacity;
      void main() {
          vec4 col=texture2D(bg, vUv);
          gl_FragColor = vec4(col.xyz, col.a*opacity);
      }
`;
const bgFragment = `
varying vec2 vUv;
uniform vec3 uColor;
void main() {
vec2 uv=(vUv-vec2(0.5))*2.0;
float dis = length(uv);
float al = 1.0 - dis ;

gl_FragColor = vec4(uColor, al);
}
`;
export class PlatformCircle extends THREE.Group {
  /**@param {THREE.Object3D} object3d  */
  constructor(object3d) {
    super();

    const box = new THREE.Box3().setFromObject(object3d);
    const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 5;
    const geometry = new THREE.PlaneGeometry(width, width);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    this.createChild_1(geometry);
    this.createChild_2(geometry);
  }

  createChild_1(geometry) {
    const textureLoader = new THREE.TextureLoader();
    const bg = textureLoader.load("./textures/bg.png");
    bg.colorSpace = THREE.SRGBColorSpace;

    this.shaderMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uElapseTime: this.elapsedTime,
        glowFactor: {
          value: 1.0, // 扩撒圈的明暗程度
        },
        uColor: {
          value: new THREE.Color("#60C6FF"),
        },
        flowColor: {
          value: new THREE.Color("#EEF5F5"),
        },
        bg: {
          value: bg,
        },
        speed: {
          value: 0.8,
        },
        opacity: {
          value: 0.4,
        },
        alpha: {
          value: 2.5,
        },
      },
      vertexShader,
      fragmentShader,
    });

    this.children.push(new THREE.Mesh(geometry, this.shaderMaterial));
  }

  createChild_2(geometry) {
    const bgShaderMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uColor: {
          value: new THREE.Color("#323F54"),
        },
      },
      vertexShader,
      fragmentShader: bgFragment,
    });
    const mesh = new THREE.Mesh(geometry, bgShaderMaterial);
    this.children.push(mesh);
  }

  update(elapsedTime) {
    // this.elapsedTime = elapsedTime;
  }
}
