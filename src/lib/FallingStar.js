import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";

export default class FallingStar {
  constructor(vec3Arr, option) {
    this.timer = null;
    this.pointNum = option.num ? option.num : 700; // 线条的点的个数
    this.duration = option.duration ? option.duration : 13;
    this.size = option.size ? option.size : 1.0;
    this.delay = option.delay ? option.delay : 0;
    this.color = option.color ? option.color : 0xffff00;
    this.x = option.x ? option.x : [0, 0];
    this.y = option.y ? option.y : [0, 0];
    this.z = option.z ? option.z : [0, 0];
    this.rotate = option.rotate ? option.rotate : "x";
    this.lineCurve = new THREE.CatmullRomCurve3(vec3Arr);
    const points = this.lineCurve.getPoints(this.pointNum);
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);
    // 给每一个顶点设置属性 大小与他们的index成正比，越后面越大
    const pointSizeArray = new Float32Array(points.length);
    for (let i = 0; i < pointSizeArray.length; i++) {
      pointSizeArray[i] = i;
    }
    // 给几何体设置属性，该属性可以在着色器中通过attribute拿到
    this.geometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(pointSizeArray, 1),
    );

    // 创建材质
    this.shaderMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: {
          value: 0,
        },
        uColor: {
          value: new THREE.Color(this.color),
        },
        uLength: {
          value: points.length,
        },
        uPointNum: {
          value: this.pointNum,
        },
        uPointSize: {
          value: this.size, // 尺寸系数
        },
      },
      vertexShader: `
            attribute float aSize;
            varying float vSize;
            uniform float uTime;
            uniform vec3 uColor;
            uniform float uLength;
            uniform float uPointNum;
            uniform float uPointSize;

            void main() {
                vec4 viewPosition = viewMatrix * modelMatrix * vec4(position,1.0);
                gl_Position = projectionMatrix * viewPosition;
                vSize = aSize / 2.0 - uTime;
                if(vSize < 0.0) {
                    vSize = vSize + uLength;
                }
                vSize = (vSize - uPointNum / 1.5) * uPointSize;
                gl_PointSize = (-vSize / viewPosition.z);
            }
            `,
      fragmentShader: `
            varying float vSize;
            uniform vec3 uColor;

            void main() {
                float distanceToCenter = distance(gl_PointCoord, vec2(0.5,0.5));
                float strenght = 1.0 - (distanceToCenter * 2.0);
                if(vSize <= 0.0 ) {
                gl_FragColor= vec4(1.0,0.0,0.0,0.0);
                } else {
                gl_FragColor= vec4(uColor,strenght * 0.1);
                }
            }
            `,
    });
    this.mesh = new THREE.Points(this.geometry, this.shaderMaterial);
    this.genearteAnimate();
  }
  genearteAnimate() {
    const delay = this.delay + this.getRandomNum(0, 3);
    const duration = this.getRandomNum(0.8, 2);
    const animate = new TWEEN.Tween(this.shaderMaterial.uniforms.uTime);
    animate
      .to(
        {
          value: this.pointNum,
        },
        duration * 1000,
      )
      // .repeat(Infinity)
      .delay(delay * 1000);
    animate.onComplete(() => {
      this.mesh.position.x = this.getRandomNum(this.x[0], this.x[1]);
      this.mesh.position.y = this.getRandomNum(this.y[0], this.y[1]);
      this.mesh.position.z = this.getRandomNum(this.z[0], this.z[1]);
      this.mesh.rotation[this.rotate] = Math.PI * this.getRandomNum(0, 2);
      this.shaderMaterial.uniforms.uTime.value = 0;
      this.genearteAnimate();
    });
    animate.start();
  }
  getRandomNum(min, max) {
    return Math.random() * (max - min) + min;
  }
  remove() {
    this.mesh.remove();
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
