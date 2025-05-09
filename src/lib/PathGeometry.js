import { PathPoint } from "./PathPoint.js";
import * as THREE from "three";
/**
 * PathGeometry
 */
class PathGeometry extends THREE.BufferGeometry {
  /**
   * @param {Object|Number} initData - If initData is number, geometry init by empty data and set it as the max vertex. If initData is Object, it contains pathPointList and options.
   * @param {Boolean} [generateUv2=false]
   */
  constructor(initData = 3000, generateUv2 = false) {
    super();

    if (isNaN(initData)) {
      this._initByData(
        initData.pathPointList,
        initData.options,
        initData.usage,
        generateUv2,
      );
    } else {
      this._initByMaxVertex(initData, generateUv2);
    }
  }

  _initByMaxVertex(maxVertex, generateUv2) {
    this.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(maxVertex * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    if (generateUv2) {
      this.setAttribute(
        "uv2",
        new THREE.BufferAttribute(new Float32Array(maxVertex * 2), 2).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
    }

    this.drawRange.start = 0;
    this.drawRange.count = 0;

    this.setIndex(
      maxVertex > 65536
        ? new THREE.Uint32BufferAttribute(maxVertex * 3, 1)
        : new THREE.Uint16BufferAttribute(maxVertex * 3, 1),
    );
  }

  _initByData(pathPointList, options = {}, usage, generateUv2) {
    const vertexData = generatePathVertexData(
      pathPointList,
      options,
      generateUv2,
    );

    if (vertexData && vertexData.count !== 0) {
      this.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(vertexData.position),
          3,
        ).setUsage(usage || THREE.StaticDrawUsage),
      );
      this.setAttribute(
        "normal",
        new THREE.BufferAttribute(
          new Float32Array(vertexData.normal),
          3,
        ).setUsage(usage || THREE.StaticDrawUsage),
      );
      this.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(vertexData.uv), 2).setUsage(
          usage || THREE.StaticDrawUsage,
        ),
      );
      if (generateUv2) {
        this.setAttribute(
          "uv2",
          new THREE.BufferAttribute(
            new Float32Array(vertexData.uv2),
            2,
          ).setUsage(usage || THREE.StaticDrawUsage),
        );
      }

      this.setIndex(
        vertexData.position.length / 3 > 65536
          ? new THREE.Uint32BufferAttribute(vertexData.indices, 1)
          : new THREE.Uint16BufferAttribute(vertexData.indices, 1),
      );
    } else {
      this._initByMaxVertex(2, generateUv2);
    }
  }

  /**
   * Update geometry by PathPointList instance
   * @param {PathPointList} pathPointList
   * @param {Object} options
   * @param {Number} [options.width=0.1]
   * @param {Number} [options.progress=1]
   * @param {Boolean} [options.arrow=true]
   * @param {String} [options.side='both'] - "left"/"right"/"both"
   */
  update(pathPointList, options = {}) {
    const generateUv2 = !!this.getAttribute("uv2");

    const vertexData = generatePathVertexData(
      pathPointList,
      options,
      generateUv2,
    );

    if (vertexData) {
      this._updateAttributes(
        vertexData.position,
        vertexData.normal,
        vertexData.uv,
        generateUv2 ? vertexData.uv2 : null,
        vertexData.indices,
      );
      this.drawRange.count = vertexData.count;
    } else {
      this.drawRange.count = 0;
    }
  }

  _resizeAttribute(name, len) {
    let attribute = this.getAttribute(name);
    while (attribute.array.length < len) {
      const oldLength = attribute.array.length;
      const newAttribute = new THREE.BufferAttribute(
        new Float32Array(oldLength * 2),
        attribute.itemSize,
        attribute.normalized,
      );
      newAttribute.name = attribute.name;
      newAttribute.usage = attribute.usage;
      this.setAttribute(name, newAttribute);
      attribute = newAttribute;
    }
  }

  _resizeIndex(len) {
    let index = this.getIndex();
    while (index.array.length < len) {
      const oldLength = index.array.length;
      const newIndex = new THREE.BufferAttribute(
        oldLength * 2 > 65535
          ? new Uint32Array(oldLength * 2)
          : new Uint16Array(oldLength * 2),
        1,
      );
      newIndex.name = index.name;
      newIndex.usage = index.usage;
      this.setIndex(newIndex);
      index = newIndex;
    }
  }

  _updateAttributes(position, normal, uv, uv2, indices) {
    this._resizeAttribute("position", position.length);
    const positionAttribute = this.getAttribute("position");
    positionAttribute.array.set(position, 0);
    positionAttribute.updateRange.count = position.length;
    positionAttribute.needsUpdate = true;

    this._resizeAttribute("normal", normal.length);
    const normalAttribute = this.getAttribute("normal");
    normalAttribute.array.set(normal, 0);
    normalAttribute.updateRange.count = normal.length;
    normalAttribute.needsUpdate = true;

    this._resizeAttribute("uv", uv.length);
    const uvAttribute = this.getAttribute("uv");
    uvAttribute.array.set(uv, 0);
    uvAttribute.updateRange.count = uv.length;
    uvAttribute.needsUpdate = true;

    if (uv2) {
      this._resizeAttribute("uv2", uv2.length);
      const uv2Attribute = this.getAttribute("uv2");
      uv2Attribute.array.set(uv2, 0);
      uv2Attribute.updateRange.count = uv2.length;
      uv2Attribute.needsUpdate = true;
    }

    this._resizeIndex(indices.length);
    const indexAttribute = this.getIndex();
    indexAttribute.set(indices, 0);
    indexAttribute.updateRange.count = indices.length;
    indexAttribute.needsUpdate = true;
  }
}

export { PathGeometry };

// Vertex Data Generate Functions

function generatePathVertexData(pathPointList, options, generateUv2 = false) {
  const width = options.width || 0.1;
  const progress = options.progress !== undefined ? options.progress : 1;
  const arrow = options.arrow !== undefined ? options.arrow : true;
  const side = options.side !== undefined ? options.side : "both";

  const halfWidth = width / 2;
  const sideWidth = side !== "both" ? width / 2 : width;
  const totalDistance = pathPointList.distance();
  const progressDistance = progress * totalDistance;
  if (totalDistance == 0) {
    return null;
  }

  const sharpUvOffset = halfWidth / sideWidth;
  const sharpUvOffset2 = halfWidth / totalDistance;

  let count = 0;

  // modify data
  const position = [];
  const normal = [];
  const uv = [];
  const uv2 = [];
  const indices = [];
  let verticesCount = 0;

  const right = new THREE.Vector3();
  const left = new THREE.Vector3();

  // for sharp corners
  const leftOffset = new THREE.Vector3();
  const rightOffset = new THREE.Vector3();
  const tempPoint1 = new THREE.Vector3();
  const tempPoint2 = new THREE.Vector3();

  function addVertices(pathPoint) {
    const first = position.length === 0;
    const sharpCorner = pathPoint.sharp && !first;

    // const uvDist = pathPoint.dist / sideWidth; // origin
    // 此处修改了uv绘制逻辑，uv从起点到终点为0-1
    const uvDist = pathPoint.dist / totalDistance;
    const uvDist2 = pathPoint.dist / totalDistance;

    const dir = pathPoint.dir;
    const up = pathPoint.up;
    const _right = pathPoint.right;

    if (side !== "left") {
      right.copy(_right).multiplyScalar(halfWidth * pathPoint.widthScale);
    } else {
      right.set(0, 0, 0);
    }

    if (side !== "right") {
      left.copy(_right).multiplyScalar(-halfWidth * pathPoint.widthScale);
    } else {
      left.set(0, 0, 0);
    }

    right.add(pathPoint.pos);
    left.add(pathPoint.pos);

    if (sharpCorner) {
      leftOffset.fromArray(position, position.length - 6).sub(left);
      rightOffset.fromArray(position, position.length - 3).sub(right);

      const leftDist = leftOffset.length();
      const rightDist = rightOffset.length();

      const sideOffset = leftDist - rightDist;
      let longerOffset, longEdge;

      if (sideOffset > 0) {
        longerOffset = leftOffset;
        longEdge = left;
      } else {
        longerOffset = rightOffset;
        longEdge = right;
      }

      tempPoint1
        .copy(longerOffset)
        .setLength(Math.abs(sideOffset))
        .add(longEdge);

      let _cos = tempPoint2.copy(longEdge).sub(tempPoint1).normalize().dot(dir);
      let _len = tempPoint2.copy(longEdge).sub(tempPoint1).length();
      let _dist = _cos * _len * 2;

      tempPoint2.copy(dir).setLength(_dist).add(tempPoint1);

      if (sideOffset > 0) {
        position.push(
          tempPoint1.x,
          tempPoint1.y,
          tempPoint1.z, // 6
          right.x,
          right.y,
          right.z, // 5
          left.x,
          left.y,
          left.z, // 4
          right.x,
          right.y,
          right.z, // 3
          tempPoint2.x,
          tempPoint2.y,
          tempPoint2.z, // 2
          right.x,
          right.y,
          right.z, // 1
        );

        verticesCount += 6;

        indices.push(
          verticesCount - 6,
          verticesCount - 8,
          verticesCount - 7,
          verticesCount - 6,
          verticesCount - 7,
          verticesCount - 5,

          verticesCount - 4,
          verticesCount - 6,
          verticesCount - 5,
          verticesCount - 2,
          verticesCount - 4,
          verticesCount - 1,
        );

        count += 12;
      } else {
        position.push(
          left.x,
          left.y,
          left.z, // 6
          tempPoint1.x,
          tempPoint1.y,
          tempPoint1.z, // 5
          left.x,
          left.y,
          left.z, // 4
          right.x,
          right.y,
          right.z, // 3
          left.x,
          left.y,
          left.z, // 2
          tempPoint2.x,
          tempPoint2.y,
          tempPoint2.z, // 1
        );

        verticesCount += 6;

        indices.push(
          verticesCount - 6,
          verticesCount - 8,
          verticesCount - 7,
          verticesCount - 6,
          verticesCount - 7,
          verticesCount - 5,

          verticesCount - 6,
          verticesCount - 5,
          verticesCount - 3,
          verticesCount - 2,
          verticesCount - 3,
          verticesCount - 1,
        );

        count += 12;
      }

      normal.push(
        up.x,
        up.y,
        up.z,
        up.x,
        up.y,
        up.z,
        up.x,
        up.y,
        up.z,
        up.x,
        up.y,
        up.z,
        up.x,
        up.y,
        up.z,
        up.x,
        up.y,
        up.z,
      );

      uv.push(
        uvDist - sharpUvOffset,
        0,
        uvDist - sharpUvOffset,
        1,
        uvDist,
        0,
        uvDist,
        1,
        uvDist + sharpUvOffset,
        0,
        uvDist + sharpUvOffset,
        1,
      );

      if (generateUv2) {
        uv2.push(
          uvDist2 - sharpUvOffset2,
          0,
          uvDist2 - sharpUvOffset2,
          1,
          uvDist2,
          0,
          uvDist2,
          1,
          uvDist2 + sharpUvOffset2,
          0,
          uvDist2 + sharpUvOffset2,
          1,
        );
      }
    } else {
      position.push(left.x, left.y, left.z, right.x, right.y, right.z);

      normal.push(up.x, up.y, up.z, up.x, up.y, up.z);

      uv.push(uvDist, 0, uvDist, 1);

      if (generateUv2) {
        uv2.push(uvDist2, 0, uvDist2, 1);
      }

      verticesCount += 2;

      if (!first) {
        indices.push(
          verticesCount - 2,
          verticesCount - 4,
          verticesCount - 3,
          verticesCount - 2,
          verticesCount - 3,
          verticesCount - 1,
        );

        count += 6;
      }
    }
  }

  const sharp = new THREE.Vector3();
  function addStart(pathPoint) {
    const dir = pathPoint.dir;
    const up = pathPoint.up;
    const _right = pathPoint.right;

    const uvDist = pathPoint.dist / sideWidth;
    const uvDist2 = pathPoint.dist / totalDistance;

    if (side !== "left") {
      right.copy(_right).multiplyScalar(halfWidth * 2);
    } else {
      right.set(0, 0, 0);
    }

    if (side !== "right") {
      left.copy(_right).multiplyScalar(-halfWidth * 2);
    } else {
      left.set(0, 0, 0);
    }

    sharp.copy(dir).setLength(halfWidth * 3);

    right.add(pathPoint.pos);
    left.add(pathPoint.pos);
    sharp.add(pathPoint.pos);

    position.push(
      left.x,
      left.y,
      left.z,
      right.x,
      right.y,
      right.z,
      sharp.x,
      sharp.y,
      sharp.z,
    );

    normal.push(up.x, up.y, up.z, up.x, up.y, up.z, up.x, up.y, up.z);

    uv.push(
      uvDist,
      side !== "both" ? (side !== "right" ? -2 : 0) : -0.5,
      uvDist,
      side !== "both" ? (side !== "left" ? 2 : 0) : 1.5,
      uvDist + 1.5,
      side !== "both" ? 0 : 0.5,
    );

    if (generateUv2) {
      uv2.push(
        uvDist2,
        side !== "both" ? (side !== "right" ? -2 : 0) : -0.5,
        uvDist2,
        side !== "both" ? (side !== "left" ? 2 : 0) : 1.5,
        uvDist2 + (1.5 * width) / totalDistance,
        side !== "both" ? 0 : 0.5,
      );
    }

    verticesCount += 3;

    indices.push(verticesCount - 1, verticesCount - 3, verticesCount - 2);

    count += 3;
  }

  let lastPoint;

  if (progressDistance > 0) {
    for (let i = 0; i < pathPointList.count; i++) {
      const pathPoint = pathPointList.array[i];

      if (pathPoint.dist > progressDistance) {
        const prevPoint = pathPointList.array[i - 1];
        lastPoint = new PathPoint();

        // linear lerp for progress
        const alpha =
          (progressDistance - prevPoint.dist) /
          (pathPoint.dist - prevPoint.dist);
        lastPoint.lerpPathPoints(prevPoint, pathPoint, alpha);

        addVertices(lastPoint);
        break;
      } else {
        addVertices(pathPoint);
      }
    }
  } else {
    lastPoint = pathPointList.array[0];
  }

  // build arrow geometry
  if (arrow) {
    lastPoint = lastPoint || pathPointList.array[pathPointList.count - 1];
    addStart(lastPoint);
  }

  return {
    position,
    normal,
    uv,
    uv2,
    indices,
    count,
  };
}
