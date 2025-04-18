import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import * as THREE from "three";

export function merge(object) {
  const resource = {};

  if (Array.isArray(object)) {
    object.forEach(item => {
      mergeTraverse(item,resource);
    });
  } else {
    mergeTraverse(object,resource);
  }

  // 结果
  const result = new THREE.Group();
  Object.keys(resource).forEach(key => {
    const mergeGeometry = mergeGeometries(resource[key].geometries,true);

    resource[key].geometries.forEach(geometry => {
      geometry.dispose();
    });

    result.add(new THREE.Mesh(mergeGeometry,resource[key].materials));
  });

  return result;
}

/**
 * 便利收集顶点数据材质数据
 * @param {THREE.Object3D} model
 * @param {*} resource
 */
function mergeTraverse(model,resource) {

  model.traverseVisible(child => {
    if (child.isMesh) {
      const geometry = child.geometry;

      const attr = Object.keys(geometry.attributes).toString();
      if (!resource[attr]) {
        resource[attr] = {
          geometries: [],
          materials: [],
        };
      }

      geometry.applyMatrix4(child.matrixWorld);
      resource[attr].geometries.push(geometry);
      resource[attr].materials.push(child.material);
    } else {
      child.updateMatrixWorld();
    }
  });
}
