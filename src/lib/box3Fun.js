import * as THREE from "three";
export const getBoxCenter = object => {

  const box = new THREE.Box3();
  box.setFromObject(object);

  const center = box.getCenter(new THREE.Vector3());

  const radius = box.max.distanceTo(center);

  return { center,radius,min: box.min,max: box.max,boundingBox: box };
};
