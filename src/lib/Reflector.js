import {
    Color,
    Matrix4,
    Mesh,
    PerspectiveCamera,
    Plane,
    ShaderMaterial,
    UniformsUtils,
    Vector2,
    Vector3,
    Vector4,
    WebGLRenderTarget,
    TextureLoader,
} from "three";

class Reflector extends Mesh {
    constructor(geometry, options = {}) {
        super(geometry);

        this.isReflector = true;

        this.type = "Reflector";
        this.camera = new PerspectiveCamera();

        const scope = this;

        const color = options.color !== undefined ? new Color(options.color) : new Color(0x7f7f7f);
        const textureWidth = options.textureWidth || 512;
        const textureHeight = options.textureHeight || 512;
        const clipBias = options.clipBias || 0;
        const shader = options.shader || Reflector.ReflectorShader;
        const multisample = options.multisample !== undefined ? options.multisample : 4;
        const gaussEffect = options.gaussEffect ? 1 : 0;
        const opacity = options.opacity || 1;

        //

        const reflectorPlane = new Plane();
        const normal = new Vector3();
        const reflectorWorldPosition = new Vector3();
        const cameraWorldPosition = new Vector3();
        const rotationMatrix = new Matrix4();
        const lookAtPosition = new Vector3(0, 0, -1);
        const clipPlane = new Vector4();

        const view = new Vector3();
        const target = new Vector3();
        const q = new Vector4();

        const textureMatrix = new Matrix4();
        const virtualCamera = this.camera;

        // 纹理
        const textureLoader = new TextureLoader();
        // const patternTexture = textureLoader.load("/textures/ground.png");

        const renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, {
            samples: multisample,
        });

        const material = new ShaderMaterial({
            uniforms: UniformsUtils.clone(shader.uniforms),
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            transparent: true,
        });

        material.uniforms["tDiffuse"].value = renderTarget.texture;
        material.uniforms["color"].value = color;
        material.uniforms["textureMatrix"].value = textureMatrix;
        // material.uniforms["patternTexture"].value = patternTexture;
        material.uniforms["gaussEffect"].value = gaussEffect;
        material.uniforms["opacity"].value = opacity;

        this.material = material;

        this.onBeforeRender = function (renderer, scene, camera) {
            reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
            cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

            rotationMatrix.extractRotation(scope.matrixWorld);

            normal.set(0, 0, 1);
            normal.applyMatrix4(rotationMatrix);

            view.subVectors(reflectorWorldPosition, cameraWorldPosition);

            // Avoid rendering when reflector is facing away

            if (view.dot(normal) > 0) return;

            view.reflect(normal).negate();
            view.add(reflectorWorldPosition);

            rotationMatrix.extractRotation(camera.matrixWorld);

            lookAtPosition.set(0, 0, -1);
            lookAtPosition.applyMatrix4(rotationMatrix);
            lookAtPosition.add(cameraWorldPosition);

            target.subVectors(reflectorWorldPosition, lookAtPosition);
            target.reflect(normal).negate();
            target.add(reflectorWorldPosition);

            virtualCamera.position.copy(view);
            virtualCamera.up.set(0, 1, 0);
            virtualCamera.up.applyMatrix4(rotationMatrix);
            virtualCamera.up.reflect(normal);
            virtualCamera.lookAt(target);

            virtualCamera.far = camera.far; // Used in WebGLBackground

            virtualCamera.updateMatrixWorld();
            virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

            // Update the texture matrix
            textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
            textureMatrix.multiply(virtualCamera.projectionMatrix);
            textureMatrix.multiply(virtualCamera.matrixWorldInverse);
            textureMatrix.multiply(scope.matrixWorld);

            // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
            // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
            reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
            reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

            clipPlane.set(
                reflectorPlane.normal.x,
                reflectorPlane.normal.y,
                reflectorPlane.normal.z,
                reflectorPlane.constant,
            );

            const projectionMatrix = virtualCamera.projectionMatrix;

            q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
            q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
            q.z = -1.0;
            q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

            // Calculate the scaled plane vector
            clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

            // Replacing the third row of the projection matrix
            projectionMatrix.elements[2] = clipPlane.x;
            projectionMatrix.elements[6] = clipPlane.y;
            projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
            projectionMatrix.elements[14] = clipPlane.w;

            // Render

            // renderTarget.texture.encoding = renderer.outputEncoding;

            scope.visible = false;

            const currentRenderTarget = renderer.getRenderTarget();

            const currentXrEnabled = renderer.xr.enabled;
            const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

            renderer.xr.enabled = false; // Avoid camera modification
            renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

            renderer.setRenderTarget(renderTarget);

            renderer.state.buffers.depth.setMask(true); // make sure the depth buffer is writable so it can be properly cleared, see #18897

            if (renderer.autoClear === false) renderer.clear();
            renderer.render(scene, virtualCamera);

            renderer.xr.enabled = currentXrEnabled;
            renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

            renderer.setRenderTarget(currentRenderTarget);

            // Restore viewport

            const viewport = camera.viewport;

            if (viewport !== undefined) {
                renderer.state.viewport(viewport);
            }

            scope.visible = true;
        };

        this.getRenderTarget = function () {
            return renderTarget;
        };

        this.dispose = function () {
            renderTarget.dispose();
            scope.material.dispose();
        };
    }
}

Reflector.ReflectorShader = {
    uniforms: {
        color: {
            value: null,
        },

        tDiffuse: {
            value: null, // 相机拍摄到的场景
        },

        textureMatrix: {
            value: null,
        },
        textureSize: {
            value: new Vector2(400, 400),
        },
        patternTexture: {
            value: null,
        },
        gaussEffect: {
            value: null,
        },
        opacity: {
            value: null,
        },
    },

    vertexShader: /* glsl */ `
		uniform mat4 textureMatrix;
		varying vec4 vUv;
    varying vec2 st;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

      st = uv;
			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,

    fragmentShader: /* glsl */ `
		uniform vec3 color;
  uniform vec2 textureSize;
  // uniform sampler2D patternTexture;
		uniform sampler2D tDiffuse;
  uniform float gaussEffect;
  uniform float opacity;
		varying vec4 vUv;
  varying vec2 st;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}
  #define GAUSS_SIZE 20 // 高斯模糊尺寸 20
  #define GAUSS_SIGMA 5.0 // 标准差 4

  float gaussKernel[GAUSS_SIZE];
  float gauss(float x, float sigma) {
   return 1.0 / (sigma * sqrt(2.0 * 3.1415926)) * exp(-(x*x) / (2.0 * sigma * sigma));
  }

 void generateGaussKernel() {
  for(int i = 0; i < GAUSS_SIZE; i++){
   float x = float(i) - float(GAUSS_SIZE)/2.0;
   gaussKernel[i] = gauss(x, GAUSS_SIGMA);
  }
 }

		void main() {

			#include <logdepthbuf_fragment>

   if(gaussEffect == 1.0){
    generateGaussKernel();
    vec2 texelSize = float(GAUSS_SIZE ) / textureSize*0.5;

    vec4 reflectColor = vec4(0.0);
    for( int i = 0; i < GAUSS_SIZE; i++ ) {
     for(int j = 0; j < GAUSS_SIZE; j++){
      vec2 offset = vec2(float(i) - float(GAUSS_SIZE) / 2.0, float(j) - float(GAUSS_SIZE) / 2.0 )* texelSize;
      vec4 newUv = vec4(0.0);
      newUv.xy = vUv.xy + offset;
      newUv.zw = vUv.zw;
      reflectColor += gaussKernel[i] * gaussKernel[j] * texture2DProj( tDiffuse, newUv );
     }
    }
    vec3 fn =  reflectColor.rgb + color;
    gl_FragColor = vec4(fn,opacity);
   } else {
   vec4 base = texture2DProj( tDiffuse, vUv ); // 对拍摄到的场景进行采样
			base = vec4( blendOverlay( base.rgb, color ), opacity );
   gl_FragColor = base;
   }


			#include <colorspace_fragment>

		}`,
};

export { Reflector };
