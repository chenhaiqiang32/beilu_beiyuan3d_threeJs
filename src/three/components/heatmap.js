import * as THREE from "three";

export class Heatmap extends THREE.Mesh {
  constructor(points,config) {
    super();

    const heatmap = this.createHeatmap(points,config);
    this.geometry = heatmap.geometry;
    this.material = heatmap.material;
  }
  createHeatmap(points,config) {
    // 获取点位范围，确定生成平面的大小
    const { width,height } = this.#getLimit(points,config.radius);

    // 初始化数据
    this.initData(points,width,height);

    const container = config.container;
    container.style.width = `${width * 2}px`;
    container.style.height = `${height * 2}px`;
    document.body.appendChild(container);

    var heatmap = h337.create(config);

    heatmap.setData({
      max: 2,
      data: points,
    });

    const texture = new THREE.CanvasTexture(heatmap._config.container.children[0]);
    texture.needUpdate = true;

    const geometry = new THREE.PlaneGeometry(width * 2,height * 2,500,500);

    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    const shaderMaterial = new THREE.ShaderMaterial({
      transparent: true,
      // side: THREE.DoubleSide,
      // forceSinglePass: true,
      depthTest: false,
      uniforms: {
        heatmap: {
          value: texture,
        },
      },
      vertexShader: `
      uniform sampler2D heatmap;
      varying vec2 vUv;
      varying vec4 heatTexture;

      void main() {
          vUv = uv;
          heatTexture = texture2D(heatmap,vUv);
          vec3 pos = position;
          pos.y = heatTexture.r * 10.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
      }
      `,
      fragmentShader: `
      uniform sampler2D heatmap;
      varying vec2 vUv;
      varying vec4 heatTexture;
      void main() {
          vec4 color = heatTexture;
          gl_FragColor = color;
      }
      `,
    });
    document.body.removeChild(container);

    return new THREE.Mesh(geometry,shaderMaterial);
  }
  createHeightMap(points) { }
  #getLimit(points,delta) {
    let xMax = -Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const { x,y } = points[i];
      xMax = Math.max(xMax,Math.abs(x));
      yMax = Math.max(yMax,Math.abs(y));
    }

    return { width: xMax + delta,height: yMax + delta };
  }

  initData(points,deltaX,deltaY) {
    for (let i = 0; i < points.length; i++) {
      points[i].x = points[i].x + deltaX;
      points[i].y = points[i].y + deltaY;
    }
  }
}
