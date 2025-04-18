import * as THREE from "three";
import { PathPointList } from "./PathPointList.js";
import { PathGeometry } from "./PathGeometry.js";
import { PathTubeGeometry } from "./PathTubeGeometry.js";
import { Water } from "three/examples/jsm/objects/Water";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { kdTree } from "./kdTree";

class FlowLight extends THREE.Mesh {
  constructor(vertices,config = {}) {
    super();

    const _config = {};
    _config.width = config.width || 1;
    _config.radius = config.radius || 1;
    _config.type = config.type || "line";
    _config.segments = config.segments || 2;

    if (Array.isArray(vertices)) {
      this.#createPath(vertices,_config);
    }
    this.type = "FlowLight";
  }

  #createPath(vertices,config) {
    const up = new THREE.Vector3(0,1,0);
    const pathPointList = new PathPointList();
    pathPointList.set(vertices,0.5,10,up,false);

    if (config.type === "line") {
      this.geometry = new PathGeometry();
      this.geometry.update(pathPointList,{
        width: config.width,
        arrow: false,
        side: "both",
      });
    } else if (config.type === "tube") {
      this.geometry = new PathTubeGeometry();
      this.geometry.update(pathPointList,{
        arrow: false,
        side: "both",
        radius: config.radius,
      });
    }

    const vertexShader = `
       varying vec2 vUv;
       uniform float uElapseTime;
       #include <logdepthbuf_pars_vertex>
       #include <common>
       // bool isPerspectiveMatrix(mat4) {
       //   return true;
       // }
       void main(){
         vUv = uv;
         // vec3 transformed = vec3(position);
         // vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
         // gl_Position = projectionMatrix * mvPosition;
         #include <begin_vertex>
         #include <project_vertex>
         #include <logdepthbuf_vertex>
       }
   `;
    const fragmentShader = `

   uniform float uElapseTime;
   uniform float uCount;
   varying vec2 vUv;


   #include <logdepthbuf_pars_fragment>
   void main() {
     vec3 origin = vec3(0.95,0.39,0.22);
     vec3 yellow = vec3(1.0,1.0,0.0);
     float a = 1.0;
     float p = uCount; //线段段数

     float al = fract(vUv.x * p - uElapseTime);

     vec3 color = mix(origin,yellow,pow(al,4.));

     float r = step(0.7, al) * al;

     float fade = (al * 2.0) - 1.0;

     a =  r * fade;

     gl_FragColor = vec4(color ,al*al+0.1);
    #include <logdepthbuf_fragment>
   }
   `;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uElapseTime: { value: 0 },
        uCount: { value: config.segments },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
  }
  update(elapseTime) {
    this.material.uniforms && (this.material.uniforms.uElapseTime.value = elapseTime);
  }
} // 雨天，雪天，效果范围

// 默认粒子范围
const BOX = new THREE.Box3(new THREE.Vector3(-100,0,-100),new THREE.Vector3(100,100,100));

class Rain extends THREE.Mesh {
  #time;
  #config;
  #box;
  /**
   * @param { THREE.Box3 } box 粒子范围
   * @param { { speed: number, count: number, size: number} } _config 粒子配置
   */
  constructor(box = BOX,_config) {
    super();
    this.#config = _config;
    this.#box = box;
    this.#time = 0;

    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.renderOrder = 10;
  }

  createMaterial() {
    //创建雨
    const rainMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
    });

    rainMaterial.onBeforeCompile = shader => {
      const getFoot = `
        uniform float top;
        uniform float bottom;
        uniform float time;

        varying vec2 vUv;

        #include <common>

        float angle(float x, float y){

            return atan(y,x);

        }

        vec2 getFoot(vec2 camera,vec2 normal,vec2 pos){

            vec2 position;

            float distanceLen = distance(pos, normal);

            float a = angle(camera.x - normal.x, camera.y - normal.y);

            pos.x > normal.x ? a -= 0.785 : a += 0.785;

            position.x = cos(a) * distanceLen;

            position.y = sin(a) * distanceLen;

            return position + normal;

        }

        `;

      const begin_vertex = `

        vUv = uv;

        vec2 foot = getFoot(vec2(cameraPosition.x, cameraPosition.z),  vec2(normal.x, normal.z), vec2(position.x, position.z));

        float height = top - bottom;

        float y = normal.y - bottom - height * time;

        y = y + (y < 0.0 ? height : 0.0);

        float ratio = (1.0 - y / height) * (1.0 - y / height);

        y = height * (1.0 - ratio);

        y += bottom;

        y += position.y - normal.y;

        vec3 transformed = vec3( foot.x, y, foot.y );

        `;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",

        getFoot,
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",

        begin_vertex,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",

        `

       #include <common>

       varying vec2 vUv;

       uniform vec3 uColor;

       `,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <dithering_fragment>`,

        `

       #include <dithering_fragment>

       float a = 0.0;

       float t = 0.25/sqrt(0.05);

       float x = vUv.x;

       float y = vUv.y;

       float z = pow(1.0 - vUv.y, 2.0);

       float distanceLen = distance(vUv,vec2(0.5,0.3));

       a = z * step(y,0.5) * step(distanceLen,0.3);

       if(a==0.0) a = z * step(0.5,y) * step(0.5,x) * step(y,-2.0*t*x+t+1.0);

       if(a==0.0) a = z * step(0.5,y) * step(x,0.5) * step(y,2.0*t*x+1.0-t);

       vec4 color = vec4(uColor,a);

       gl_FragColor = color;

       `,
      );

      shader.uniforms.cameraPosition = {
        value: new THREE.Vector3(0,200,0),
      };

      shader.uniforms.top = {
        value: this.#box.max.y,
      };

      shader.uniforms.bottom = {
        value: 0,
      };

      shader.uniforms.time = {
        value: 0,
      };

      shader.uniforms.uColor = {
        value: new THREE.Color(0xb8b8b8),
      };

      rainMaterial.uniforms = shader.uniforms;
    };

    return rainMaterial;
  }

  createGeometry() {
    const box = this.#box;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i < this.#config.count; i++) {
      const pos = new THREE.Vector3();
      pos.x = Math.random() * (box.max.x - box.min.x) + box.min.x;
      pos.y = Math.random() * (box.max.y - box.min.y) + box.min.y;
      pos.z = Math.random() * (box.max.z - box.min.z) + box.min.z;
      const height = (this.#config.size * (box.max.y - box.min.y)) / 80;
      const width = height / 80;
      vertices.push(
        pos.x + width,
        pos.y + height,
        pos.z,
        pos.x - width,
        pos.y + height,
        pos.z,
        pos.x - width,
        pos.y,
        pos.z,
        pos.x + width,
        pos.y,
        pos.z,
      );

      normals.push(
        pos.x,
        pos.y - height / 2,
        pos.z,
        pos.x,
        pos.y - height / 2,
        pos.z,
        pos.x,
        pos.y - height / 2,
        pos.z,
        pos.x,
        pos.y - height / 2,
        pos.z,
      );

      uvs.push(1,1,0,1,0,0,1,0);

      indices.push(i * 4 + 0,i * 4 + 1,i * 4 + 2,i * 4 + 0,i * 4 + 2,i * 4 + 3);
    }

    geometry.setAttribute(
      "position",

      new THREE.BufferAttribute(new Float32Array(vertices),3),
    );

    geometry.setAttribute(
      "normal",

      new THREE.BufferAttribute(new Float32Array(normals),3),
    );

    geometry.setAttribute(
      "uv",

      new THREE.BufferAttribute(new Float32Array(uvs),2),
    );

    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices),1));

    return geometry;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }

  update(deltaTime,cameraPosition) {
    this.#time = (this.#time + deltaTime * this.#config.speed) % 1;
    if (this.material && "uniforms" in this.material) {
      this.material.uniforms.cameraPosition.value = cameraPosition;
      this.material.uniforms.time.value = this.#time;
    }
  }
}

class Snow extends THREE.Points {
  config;
  box;
  positionBackup = [];
  /**
   * @param { THREE.Box3 } box 粒子范围
   * @param { { speed: number, count: number, size: number} } _config 粒子配置
   */
  constructor(box,_config) {
    super();
    this.config = _config;
    this.box = box;
    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.renderOrder = 10;
  }

  createMaterial() {
    const material = new THREE.PointsMaterial({
      size: this.config.size,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    material.onBeforeCompile = shader => {
      shader.uniforms.uColor = {
        value: new THREE.Color(0xffffff),
      };

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <common>`,
        `
         #include <common>
         uniform vec3 uColor;
         `,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <premultiplied_alpha_fragment>`,
        `
         #include <premultiplied_alpha_fragment>
               float strength = distance(gl_PointCoord, vec2(0.5));
               strength = 1.0 - strength;
               strength = pow(strength, 5.0);
               gl_FragColor = vec4(uColor, strength);
         `,
      );
    };
    return material;
  }

  createGeometry() {
    const box = this.box;
    const count = this.config.count;
    const geometry = new THREE.BufferGeometry();
    let positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = Math.random() * (box.max.x - box.min.x) + box.min.x;
      positions[i + 1] = Math.random() * (box.max.y - box.min.y) + box.min.y;
      positions[i + 2] = Math.random() * (box.max.z - box.min.z) + box.min.z;
      this.positionBackup.push(positions[i],positions[i + 1],positions[i + 2]);
    }

    geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    return geometry;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
  update() {
    if (this.geometry) {
      const positions = this.geometry.getAttribute("position").array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= this.config.speed;

        if (positions[i + 1] < this.box.min.y) {
          positions[i + 1] = this.box.max.y;
          positions[i] = this.positionBackup[i];
          positions[i + 2] = this.positionBackup[i + 2];
        }

        positions[i + 2] += Math.sin(i) * Math.random() * 0.1;
        positions[i] -= Math.cos(i) * Math.random() * 0.1;
      }

      this.geometry.getAttribute("position").needsUpdate = true;
    }
  }
}

class Lake {
  /**
   * @param {THREE.Box3} aabb
   * @param {number} widthSegments
   * @param {number} heightSegments
   */
  constructor(aabb,widthSegments,heightSegments) {
    const width = aabb.max.x - aabb.min.x;
    const height = aabb.max.z - aabb.min.z;

    // geometry
    const geometry = new THREE.PlaneGeometry(width,height,widthSegments,heightSegments);
    // options
    const normal = new THREE.TextureLoader().load("./textures/water_normal.jpg");
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    const options = {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normal,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 0.6,
      size: 2,
    };
    this.mesh = new Water(geometry,options);
    this.mesh.rotation.x = -Math.PI / 2;
    const position = new THREE.Vector3();
    aabb.getCenter(position);
    position.y = (aabb.max.y + aabb.min.y) / 2;
    this.mesh.position.copy(position);
  }

  update() {
    this.mesh.material.uniforms["time"].value += 1.0 / 180.0;
  }
}

class Smoke extends THREE.Points {
  #particles;
  time;
  constructor(speed = new THREE.Vector3(0,1,0),size = 10) {
    super();
    this.#particles = [];
    this.time = 0;
    this.speed = speed;
    this.size = size;
    this.createPoints();
    this.lightingPattern = { value: 1 };
  }

  update() {
    if (Date.now() - this.time > 1000) {
      this.#particles.push(new Particle(this.speed,this.size));
      this.time = Date.now();
    }
    this.smokeUpdate();
  }

  updateLightingPattern(value) {
    this.lightingPattern.value = value;
  }
  createPoints() {
    const texture = new THREE.TextureLoader().load("./textures/smoke.png");
    const geometry = new THREE.BufferGeometry();
    // 设置顶点数据
    geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array([]),3));
    geometry.setAttribute("a_opacity",new THREE.BufferAttribute(new Float32Array([]),1));
    geometry.setAttribute("a_size",new THREE.BufferAttribute(new Float32Array([]),1));
    geometry.setAttribute("a_scale",new THREE.BufferAttribute(new Float32Array([]),1));
    this.geometry = geometry;
    // material
    this.material = new THREE.PointsMaterial({
      color: "#fff",
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    this.material.onBeforeCompile = shader => {
      shader.uniforms.uStyle = this.lightingPattern;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
     attribute float a_opacity;
     attribute float a_size;
     attribute float a_scale;
     varying float v_opacity;
     #include <common>`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "gl_PointSize = size;",
        `v_opacity = a_opacity;
     gl_PointSize = a_size * a_scale;`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `varying float v_opacity;
         uniform float uStyle;
             #include <common>`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <premultiplied_alpha_fragment>",
        `#include <premultiplied_alpha_fragment>
        vec3 c = outgoingLight;
       gl_FragColor = vec4( c.x,c.y,c.z, diffuseColor.a * v_opacity );
      //  if(uStyle > 1.0){
      //    gl_FragColor = vec4( c.x + pow(v_opacity , 2.0) ,c.y,c.z*(1.0 - v_opacity), diffuseColor.a * v_opacity );
      //  }
      //  gl_FragColor = vec4( 0.2,0.3,0.4,gl_PointCoord.x );

       `,
      );
    };
  }

  smokeUpdate() {
    const particles = this.#particles.filter(particle => {
      particle.update();
      return !(particle.updateTime - particle.createTime > particle.life);
    });
    this.#particles = particles;

    if (!particles.length) return;

    // 遍历粒子,收集属性
    const positionList = [];
    const opacityList = [];
    const scaleList = [];
    const sizeList = [];

    particles.forEach(particle => {
      const { x,y,z } = particle.position;
      positionList.push(x,y,z);
      opacityList.push(particle.opacity);
      scaleList.push(particle.scale);
      sizeList.push(particle.size);
    });
    // 粒子属性写入
    this.geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(positionList),3));
    this.geometry.setAttribute("a_opacity",new THREE.BufferAttribute(new Float32Array(opacityList),1));
    this.geometry.setAttribute("a_scale",new THREE.BufferAttribute(new Float32Array(scaleList),1));
    this.geometry.setAttribute("a_size",new THREE.BufferAttribute(new Float32Array(sizeList),1));
  }
}

class Particle {
  constructor(speed = new THREE.Vector3(0,1,0),size = 10) {
    this.position = new THREE.Vector3(); // 粒子位置
    this.life = 10000; // 粒子的存活时间，毫秒
    this.createTime = Date.now(); // 粒子创建时间
    this.updateTime = Date.now(); // 上次更新时间
    this.size = size; // 粒子大小

    // 粒子透明度，及系数
    this.opacityFactor = 0.2;
    this.opacity = this.opacityFactor;

    // 粒子放大量，及放大系数
    this.scaleFactor = 2;
    this.scale = 1 + (this.scaleFactor * (this.updateTime - this.createTime)) / this.life; // 初始1，到达生命周期时为3

    // 粒子的扩散速度
    this.speed = speed;
  }

  // 更新粒子
  update() {
    const now = Date.now();
    const time = now - this.updateTime;

    // 更新位置
    this.position.x += (this.speed.x * time) / 1000;
    this.position.y += (this.speed.y * time) / 1000;
    this.position.z += (this.speed.z * time) / 1000;

    // 计算粒子透明度
    this.opacity = 1 - (now - this.createTime) / this.life;
    this.opacity *= this.opacityFactor;
    if (this.opacity < 0) this.opacity = 0;

    // 计算放大量
    this.scale = 1 + (this.scaleFactor * (now - this.createTime)) / this.life;
    if (this.scale > 1 + this.scaleFactor) this.scale = 1 + this.scaleFactor;

    // 重置更新时间
    this.updateTime = now;
  }
}

class FatLine extends Line2 {
  /**
   * @param { LineMaterialParameters  } parameters
   */
  constructor(parameters) {
    super();
    this.geometry = new LineGeometry();
    this.material = new LineMaterial(parameters);
    this.material.resolution.set(window.innerWidth,window.innerHeight);
  }

  onResize(innerWidth,innerHeight) {
    this.material.resolution.set(innerWidth,innerHeight);
  }
  /**
   * @param { number[] }
   */
  setPositions(positions) {
    this.geometry.setPositions(positions);
    return this;
  }
  /**
   * @param { THREE.Vector3[] }
   */
  setPoints(points) {
    this.setPositions(vec3ToNumber(points));
    return this;
  }

  /**
   * @description 释放内存，当销毁时，请调用该方法
   */
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

class StarLink extends THREE.Points {
  constructor(width = 100,height = 100,count = 1000) {
    super();
    this.points = [];
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(width,height));

    this.plane.rotation.x = -Math.PI / 2;
    this.plane.material.side = THREE.DoubleSide;
    this.plane.updateMatrixWorld();

    this.createGeometry(width,height,count);
    this.createMaterial();

    function distance(a,b) {
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dz * dz);
    }

    this.tree = new kdTree(this.points,distance,["x","z"]);
    this.onmousemove = this.bindMousemove.bind(this);
  }

  createGeometry(width,height,count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width - width / 2;
      const y = 0;
      const z = Math.random() * height - height / 2;
      this.points.push(new THREE.Vector3(x,y,z));
    }
    this.geometry.setFromPoints(this.points);
  }
  createMaterial() {
    this.material = new THREE.PointsMaterial({ transparent: true,vertexColors: true,size: 1,alphaTest: 0.1 });

    this.material.onBeforeCompile = shader => {
      shader.uniforms.uColor = {
        value: new THREE.Color(0xffffff),
      };

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <common>`,
        `
       #include <common>
       uniform vec3 uColor;
       `,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <premultiplied_alpha_fragment>`,
        `
       #include <premultiplied_alpha_fragment>
             float strength = distance(gl_PointCoord, vec2(0.5));

             float da = distance(gl_PointCoord, vec2(0.,0.));
             float db = distance(gl_PointCoord, vec2(0.,1.));
             float dc = distance(gl_PointCoord, vec2(1.,1.));
             float dd = distance(gl_PointCoord, vec2(1.,0.));

             float r = step(0.5,da) + step(0.5,db) + step(0.5,dc) + step(0.5,dd);
             float t = step(4.,r);

             strength = 0.5 - strength;
             strength = pow(strength, 1.0);
             gl_FragColor = vec4(uColor, strength*t);
       `,
      );
    };
  }

  bindMousemove(intersects) {
    if (intersects.length) {
      const point = intersects[0].point;
      const nearest = this.tree.nearest(point,100,10);
    }
  }
}

class SpecialGround extends THREE.Mesh {
  /**@param {THREE.Box3} aabb BoundingBox */
  constructor(center,min) {
    super();
    const textureLoader = new THREE.TextureLoader();
    const uBg = textureLoader.load("/textures/bg.png");
    this.elapsedTime = { value: 0 };
    this.position.set(center.x,min.y - 20,center.z);
    this.geometry = new THREE.PlaneGeometry(2000,2000);
    this.geometry.rotateX(-Math.PI / 2);
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: this.elapsedTime,
        uBg: {
          value: uBg
        },
        uColor: {
          value: new THREE.Color("#7b8593")
        }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
        `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        uniform sampler2D uBg;
        uniform vec3 uColor;
        void main(){

          vec4 uTex=texture2D(uBg, vUv);
          vec3 col = vec3(uTex.r,uTex.g,uTex.b);
          float colAlpha = uTex.a;
          vec2 tUv=(vUv-.5)*2.; // 0点在中心的uv
          float dis = length(tUv);
          float al = 1.0 - dis;

          vec3 finalCol =  mix(col , uColor, 1.0 - colAlpha);


          gl_FragColor= vec4(finalCol,al) * 0.6;


            // // create grid
            // vec2 frac=fract(uv*88.);
            // float vertical_lines=step(frac.x,.1);
            // float horizontal_lines=step(frac.y,.1);
            // float lines=vertical_lines+horizontal_lines;
            // vec3 col=vec3(lines);

            // // create circles
            // float d=length(uv);
            // d=sin(d*2.-uTime*.8)/40.;
            // d=abs(d);
            // d=pow(.005/d,.4);
            // vec3 col1=vec3(0.69921875, 0.84765625, 0.84765625);
            // vec3 col2=vec3(0.6, 0.3922, 0.9137);
            // vec3 col3=mix(col1,col2,pow(length(uv),4.));
            // col*=d*.2*col3;
            // float a =(1.-length(uv))*0.4;
            // gl_FragColor=vec4(col,a);

        }
        `,
    });
  }

  update(core) {
    this.elapsedTime.value = core.elapsedTime;
  }
}

class VolumeLight extends THREE.Mesh {
  constructor(options) {
    super();
    const num = options.num || 2;
    const width = options.width || 9;
    const height = options.height || 10;
  }
}

class HeatCircle extends THREE.Mesh {
  /**
   *
   * @param {THREE.Vector3} center 热图中心
   * @param {number} radius 热图半径
   * @param {1|2|3} level 热图热度
   */
  constructor(center = ZeroVec3,radius = 1,level = 1) {
    super();

    this.position.copy(center);

    this.geometry = new THREE.PlaneGeometry(radius,radius,10,10);
    this.geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide,
      uniforms: {
        uLevel: {
          value: level,
        },
      },
      vertexShader: `

            #include <common>
            varying vec2 vSt;

            #ifdef USE_LOGDEPTHBUF
                #ifdef USE_LOGDEPTHBUF_EXT
                    varying float vFragDepth;
                    varying float vIsPerspective;
                #else
                    uniform float logDepthBufFC;
                #endif
            #endif

            void main(){

                // mvp
                vec4 modelPosition = modelMatrix * vec4 ( position, 1.0);
                modelPosition.y += 0.5 * smoothstep(0.5,0., distance(uv,vec2(0.5,0.5)));
                gl_Position = projectionMatrix * viewMatrix * modelPosition;

                vSt = uv;

                // depthTest
                #ifdef USE_LOGDEPTHBUF
                    #ifdef USE_LOGDEPTHBUF_EXT
                        vFragDepth = 1.0 + gl_Position.w;
                        vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
                    #else
                        if ( isPerspectiveMatrix( projectionMatrix ) ) {
                            gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
                            gl_Position.z *= gl_Position.w;
                        }
                    #endif
                #endif
            }
            `,
      fragmentShader: `
            varying vec2 vSt;
            uniform float uLevel;
            #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
                uniform float logDepthBufFC;
                varying float vFragDepth;
                varying float vIsPerspective;
            #endif

            // compute color , 如果需要修改颜色生成逻辑，请在这里进行修改
            vec3 getColor(float z,float level){
                float r = 1.0;
                float g = 0.3333333*(level-1.0) + 0.196 * smoothstep( 0.0 , .5, z);
                // float g = 0.0;
                // if(level == 1.) g = 0.6666666 + 0.196 * smoothstep( 0.0 , .5, z);
                // if(level == 2.) g = 0.3333333 + 0.196 * smoothstep( 0.0 , .5, z);
                // if(level == 3.) g = 0.196 * smoothstep( 0.0 , .5, z);
                float b = 0.0;
                return vec3(r,g,b);
            }

            void main(){

                #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
                    gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
                #endif
                vec2 center = vec2(0.5,0.5);

                float d = distance(vSt,center);
                float a = step(d,0.5);

                vec3 color = getColor(d,uLevel);

                gl_FragColor = vec4(color,0.75*a);
            }
            `,
    });

    this.renderOrder = 10;
  }
}

class HighlightCircle extends THREE.Mesh {

  constructor() {
    super();

    this.name = "高亮圆圈";
    this.geometry = new THREE.PlaneGeometry(5,5,50,50);
    this.geometry.rotateX(-Math.PI / 2);


    this.elapsedTime = { value: 0 };

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uElapseTime: this.elapsedTime,
        uColor: {
          value: new THREE.Color("#7b8593")
        }
      },
      vertexShader: `
      varying vec2 st;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){
          st = uv;
          #include <begin_vertex>
          #include <project_vertex>
          #include <logdepthbuf_vertex>
      }
      `,
      fragmentShader: `
      uniform float uElapseTime;
      varying vec2 st;
      uniform vec3 uColor;

      float circle(vec2 _st, float _radius){
        vec2 pos = vec2(0.5)-_st;
        return smoothstep(1.0-_radius,1.0-_radius+_radius*0.2,1.-dot(pos,pos)*3.14);
        }

        #include <logdepthbuf_pars_fragment>
      void main(){

        float num = 4.;
        float t = 2.0;
        vec2 j = st * num;
        float circleAlpha = circle(st, 0.75);
        float dt = sin(mod(length((j  - vec2(0.5 * num, 0.5 * num)) * 1.) - uElapseTime * t, 3.14));
        float circle = (cos(mod(j.x * 32.0, 3.14) - 1.58) *0.5) *(sin(mod(j.y * 32.0, 3.14)) *0.5) * (1.-dt);
        gl_FragColor = vec4(0.1,0.75,0.35, 1.4*circleAlpha * circle);


        #include <logdepthbuf_fragment>
      }
      `,
    });

  }

  update(elapsedTime) {
    this.elapsedTime.value = elapsedTime;
  }


}
export { FlowLight,Rain,Snow,Lake,Smoke,FatLine,StarLink,SpecialGround,HeatCircle,HighlightCircle };
