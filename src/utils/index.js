import { Vector3,Vector2,Camera } from "three";

/**
 * @description 计算多边形面积
 * @param {Vector2[]} array
 * @return {number}
 */
function getPolygonArea(array) {
  let n = array.length;
  let S = 0;

  for (let i = 0; i < n; i++) {
    S += array[i].cross(array[(i + 1) % n]);
  }
  return Math.abs(S / 2);
}

/**
 * @description 判断两线段是否相交
 * @param {Vector2} line1P1 线1端点1
 * @param {Vector2} line1P2 线1端点2
 * @param {Vector2} line2P1 线2端点1
 * @param {Vector2} line2P2 线2端点2
 * @returns {boolean}
 */
function isLineCross(line1P1,line1P2,line2P1,line2P2) {
  const v1 = line1P2.clone().sub(line1P1);
  const v2 = line2P1.clone().sub(line1P1);
  const v3 = line2P2.clone().sub(line1P1);

  const v4 = line2P2.clone().sub(line2P1);
  const v5 = line1P1.clone().sub(line2P1);
  const v6 = line1P2.clone().sub(line2P1);
  // 判断点在向量的方向, 向量a X 向量b，如果叉乘结果为正，则说明向量b在向量a的逆时针方向。如果为负则是顺时针方向。如果为0代表a和b共线
  const res1 = v1.cross(v2);
  const res2 = v1.cross(v3);
  const res3 = v4.cross(v5);
  const res4 = v4.cross(v6);

  const res11 = res1 * res2;
  const res22 = res3 * res4;

  // 如果两种方式都相交，则线段相交
  if (res11 < 0 && res22 < 0) return true;

  // 如果有共线
  if (res1 === 0 && res2 === 0 && res3 === 0 && res4 === 0) {
    if (
      (line2P1.x >= line1P1.x && line2P1.x >= line1P2.x && line2P2.x >= line1P1.x && line2P2.y >= line1P2.x) ||
      (line2P1.x <= line1P1.x && line2P1.x <= line1P2.x && line2P2.x <= line1P1.x && line2P2.y <= line1P2.x)
    ) {
      return false;
    }
    return true;
  }

  // 如果其中一种方式判断，相同方向，则不相交
  return false;
}

/**
 *
 * @param {Vector2[]} positions 已存在的线的点位
 * @param {Vector2} point 新增点位
 * @returns {boolean}
 */
function checkLinesCross(positions,point) {
  let n = positions.length;
  // 点集长度为0，不存在相交情况
  if (n === 0) {
    return false;
  }

  // 点集长度为1，如果共点，判定为相交
  if (n === 1) {
    return positions[0].equals(point);
  }

  //
  for (let i = 0; i < n - 1; i++) {
    if (isLineCross(positions[i],positions[i + 1],positions[n - 1],point)) {
      return true;
    }
  }

  return false;
}

/**
 * @description 判断 三维向量是否在视野内
 * @param { Camera } camera
 * @param { Vector3 } vector
 * @returns { boolean }
 */
function isInView(camera,vector) {
  // 计算三维点在屏幕的投影位置
  let tempV = vector.project(camera);

  return !(Math.abs(tempV.x) > 1 || Math.abs(tempV.y) > 1 || Math.abs(tempV.z) > 1);
}

/**
 * @description vector2[] => number[]
 * @param { Vector2[] } points - 输入数组
 * @returns { number[] }
 */
function vec2ToNum(points) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    result.push(points[i].x,points[i].y);
  }
  return result;
}
/**
 * @description vector3[] => number[]
 * @param { Vector3[] } points - 输入数组
 * @returns { number[] }
 */
function vec3ToNum(points) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    result.push(points[i].x,points[i].y,points[i].z);
  }
  return result;
}

/**
 * @description vector3[] => vector2[]
 * @param { Vector3|Vector3[] } points - 输入数组
 * @param { "x"|"y"|"z" } x 新的二位向量的x对应原三位向量的分量
 * @param { "x"|"y"|"z" } y 新的二位向量的y对应原三位向量的分量
 * @returns { Vector2|Vector2[] }
 */
function vec3ToVec2(points,x = "x",y = "y") {
  if (Array.isArray(points)) {
    const results = [];
    points.forEach(point => results.push(vec3ToVec2(point,x,y)));
    return results;
  } else {
    const v = new Vector2();
    v.x = points[x];
    v.y = points[y];
    return v;
  }
}

/** @param {Vector3[]|Vector2[]} vertices */
function getLengthFromVertices(vertices) {
  let length = 0;
  for (let i = 1; i < vertices.length; i++) {
    length += vertices[i].distanceTo(vertices[i - 1]);
  }
  return length;
}



/**
 * @template T
 * @param { T } className
 * @returns { T }
 */
function singleInstance(className) {

  let instance = null;

  const proxy = new Proxy(className,{

    construct(target,argArray,newTarget) {

      if (!instance) {
        instance = Reflect.construct(target,argArray,newTarget);
      }

      return instance;
    }

  });

  className.prototype.constructor = proxy;

  return proxy;

}



export {
  getPolygonArea,
  isInView,
  isLineCross,
  checkLinesCross,
  vec2ToNum,
  vec3ToNum,
  vec3ToVec2,
  getLengthFromVertices,
  singleInstance
};
