import { LoadingManager } from "three";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GLTFLoader } from "../../lib/GLTFLoader";
import { GbkOBJLoader } from "../../lib/GbkOBJLoader";
import { loadingInstance } from "./loading";
import { postOnLoaded,postOnLoading } from "../../message/postMessage";

const loadingManager = new LoadingManager(
  function onLoaded() {
    loadingInstance.close();
    postOnLoaded();
  },
  function onProgress(url,loaded,total) {
    loadingInstance.service(((100 * loaded) / total).toFixed(2));
  },
  function onError(url) { },
);

export const loader = new GLTFLoader(loadingManager);

/**
 * @param {{name:string,path:string,type:string}[]} models 模型路径或者数组
 * @param {(gltf:import("three/examples/jsm/loaders/GLTFLoader").GLTF,path:string)=>{}} onProgress 模型加载回调
 * @param {()=>void} onLoaded
 * @returns {Promise}
 */
export function loadGLTF(models,onProgress,onLoaded) {
  const promises = [];
  loadingInstance.service(0);
  postOnLoading();

  if (Array.isArray(models)) {
    models.forEach(model => {
      if (model.type !== ".glb" && model.type !== ".gltf") return;
      const promise = loader.loadAsync(model.path).then(gltf => onProgress(gltf,model.name));
      promises.push(promise);
    });
  } else {
    if (models.type !== ".glb" && models.type !== ".gltf") return;
    const promise = loader.loadAsync(models.path).then(gltf => onProgress(gltf,models.name));
    promises.push(promise);
  }


  return Promise.all(promises).then(() => {
    onLoaded && onLoaded();
  });
}

/**
 * @param {{name:string,path:string,type:string}[]} models 模型路径或者数组
 * @param {{name: string;vertices: Vector3[];}[]} onProgress 模型加载回调
 * @returns {Promise}
 */
export function loadOBJ(models,onProgress) {
  const loader = new GbkOBJLoader();
  const promises = [];

  models.forEach(model => {
    if (model.type !== ".obj") return;
    /**@type {Promise<{name: string;vertices: Vector3[];}[]} */
    const promise = loader.loadAsync(model.path).then(object => onProgress(object,model.name));
    promises.push(promise);
  });
  return Promise.all(promises);
}
