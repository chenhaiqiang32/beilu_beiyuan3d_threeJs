import { BufferGeometry, Vector3, CubicBezierCurve3, BufferAttribute, Line3 } from "three";

export class HDGeometry extends BufferGeometry {
  /**
   * 巷道由两部分组成，上半部分的弧形，下半部分的矩形
   * @typedef {Object} Parameter
   * @property {Vector3[]} points 连续三维坐标数据
   * @property {number} widthSegments 巷道上半部分的弧形的细分
   * @property {number} width 巷道下半部分的宽度
   * @property {number} height 巷道下半部分的高度
   * @property {number} controlLerp 巷道上半部分的弧形贝塞尔曲线的控制点的相对坐标 [0,1]
   * @property {number} controlHeight 巷道上半部分的弧形贝塞尔曲线的控制点的高度
   * @param {Parameter} parameter
   * @returns {BufferGeometry}
   */
  constructor(parameter) {
    super();

    const points = parameter.points;
    if (points.length === 0) return;

    const width = parameter.width === undefined ? 6 : parameter.width;
    const height = parameter.height === undefined ? 4 : parameter.height;
    const controlLerp = parameter.controlLerp === undefined ? 0.25 : parameter.controlLerp;
    const controlHeight = parameter.controlHeight === undefined ? 2 : parameter.controlHeight;
    const widthSegments = parameter.widthSegments === undefined ? 5 : parameter.widthSegments;

    const pathPoints = new PointList(points);

    const ls = pathPoints.count - 1;
    const lss = pathPoints.count;

    const ws = widthSegments;
    const wss = widthSegments + 1;

    const faceCount = ls * (ws + 3) * 2 + wss * 2;
    const vertexCount = lss * (wss + 3);

    const indices = new Uint32Array(faceCount * 3);
    const vertices = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    // 设置索引
    const _indices = [];
    let a, b, c, d;
    for (let j = 0, idxCount = 0; j < ls; j++) {
      for (let i = 0; i < wss + 2; i++) {
        a = (wss + 3) * j + i;
        b = (wss + 3) * (j + 1) + i;
        c = (wss + 3) * (j + 1) + i + 1;
        d = (wss + 3) * j + i + 1;

        _indices[idxCount] = b;
        _indices[idxCount + 1] = a;
        _indices[idxCount + 2] = c;

        _indices[idxCount + 3] = c;
        _indices[idxCount + 4] = a;
        _indices[idxCount + 5] = d;

        idxCount += 6;
      }
    }

    for (let i = 0; i < ws + 1; i++) {
      const a = i;
      const b = i + 1;
      const c = ws + 2;

      const d = (wss + 3) * ls + i;
      const e = (wss + 3) * ls + i + 1;
      const f = (wss + 3) * ls + ws + 2;

      _indices.unshift(a, c, b);
      _indices.push(d, e, f);
    }

    for (let i = 0; i < _indices.length; i++) {
      indices[i] = _indices[i];
    }

    const normal = new Vector3();
    const v = new Vector3();

    let posIndex = 0;
    let lastPoints;
    for (let i = 0, count = pathPoints.count; i < count; i++) {
      //
      if (i === 0) {
        const { position, direction, up, right, distance } = pathPoints.array[i];
        normal.crossVectors(up, direction);

        // 计算贝塞尔曲线的起点和终点
        const start = position.clone().addScaledVector(normal, width / 2);
        const end = position.clone().addScaledVector(normal, -width / 2);

        // 计算贝塞尔曲线控制点
        const ctr1 = start.clone().lerp(end, controlLerp);
        const ctr2 = start.clone().lerp(end, 1 - controlLerp);
        ctr1.y += controlHeight;
        ctr2.y += controlHeight;
        const bzr = new CubicBezierCurve3(start, ctr1, ctr2, end);

        lastPoints = bzr.getPoints(ws);
        lastPoints.forEach(p => {
          p.y += height;
        });

        const sp = lastPoints[0].clone();
        const ep = lastPoints[lastPoints.length - 1].clone();
        sp.y -= height;
        ep.y -= height;
        lastPoints.unshift(sp);
        lastPoints.push(ep, sp.clone());
      } else if (i === count - 1) {
        const last = pathPoints.array[i - 1];
        const current = pathPoints.array[i];

        const n = new Vector3()
          .crossVectors(current.up, current.position.clone().sub(last.position).normalize())
          .normalize();

        const start = current.position.clone().addScaledVector(n, width / 2);
        const end = current.position.clone().addScaledVector(n, -width / 2);

        const currentPoints = [start.clone(), start];
        for (let j = 1; j < ws; j++) {
          const cp = new Vector3().lerpVectors(start, end, j / ws);
          currentPoints.push(cp);
        }
        currentPoints.push(end, end.clone(), start.clone());

        currentPoints.forEach((p, index) => {
          p.y = lastPoints[index].y - (last.position.y - current.position.y);
        });

        lastPoints = currentPoints;
      } else {
        const last = pathPoints.array[i - 1];
        const current = pathPoints.array[i];
        const next = pathPoints.array[i + 1];

        const p1 = lastPoints[0];
        const p2 = lastPoints[lastPoints.length - 2];

        const n = new Vector3()
          .crossVectors(current.up, v.subVectors(current.position, last.position).normalize())
          .normalize();
        const p11 = current.position.clone().addScaledVector(n, width / 2);
        const p22 = current.position.clone().addScaledVector(n, -width / 2);

        const n2 = new Vector3()
          .crossVectors(current.up, v.subVectors(next.position, current.position).normalize())
          .normalize();
        const p3 = current.position.clone().addScaledVector(n2, width / 2);
        const p4 = current.position.clone().addScaledVector(n2, -width / 2);

        const p33 = next.position.clone().addScaledVector(n2, width / 2);
        const p44 = next.position.clone().addScaledVector(n2, -width / 2);

        const l1 = new MathLine(p1, p11);
        const l2 = new MathLine(p2, p22);

        const l3 = new MathLine(p3, p33);
        const l4 = new MathLine(p4, p44);

        const i1 = l1.intersect(l3);

        const i2 = l2.intersect(l4);

        const currentPoints = [i1.clone(), i1];
        for (let j = 1; j < ws; j++) {
          const cp = new Vector3().lerpVectors(i1, i2, j / ws);
          currentPoints.push(cp);
        }
        currentPoints.push(i2, i2.clone(), i1.clone());

        currentPoints.forEach((p, index) => {
          p.y = lastPoints[index].y - (last.position.y - current.position.y);
        });

        lastPoints = currentPoints;
      }

      // 计算巷道每个顶点坐标
      for (let i = 0; i < wss + 3; i++) {
        const point = lastPoints[i];
        vertices[posIndex] = point.x;
        vertices[posIndex + 1] = point.y;
        vertices[posIndex + 2] = point.z;
        posIndex += 3;
      }
    }

    // 重新设置 uv
    let uvIdxCount = 0;
    for (let j = 0; j < pathPoints.count; j++) {
      for (let i = 0; i <= wss + 2; i++) {
        uvs[uvIdxCount] = pathPoints.array[j].distance / pathPoints.distance();
        uvs[uvIdxCount + 1] = i / (wss + 2);
        uvIdxCount += 2;
      }
    }

    this.setIndex(new BufferAttribute(indices, 1));
    this.setAttribute("position", new BufferAttribute(vertices, 3));
    this.setAttribute("uv", new BufferAttribute(uvs, 2));

    this.computeVertexNormals();
  }
}

class MathLine extends Line3 {
  constructor(p1, p2) {
    super(p1, p2);
    this.v = p2.clone().sub(p1);
  }

  /**
   * @description 计算线段交点
   * @param {Line3} l 线段2
   * @returns {Vector3} 点
   */
  intersect(l) {
    const closest = new Vector3();
    this.closestPointToPoint(l.end, false, closest);

    const s = this.v.clone().cross(l.v).length() / (this.v.length() * l.v.length());
    const t = l.end.clone().sub(closest).length();
    const q = t / s;
    const h = l.v.clone().setLength(q);
    const m = l.end.clone().sub(h);

    return m;
  }
}

class PointList {
  constructor(points, close = false) {
    this.array = [];
    this.count = 0;

    // 点少于2个直接返回
    if (points.length < 2) return;

    // 是否闭合
    if (close && !points[0].equals(points[points.length - 1])) {
      points.push(points[0].clone());
    }

    // 计算
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        this._start(points[i], points[i + 1]);
      } else if (i === points.length - 1) {
        if (close) {
          this._corner(points[i], points[0]);
        } else {
          this._end(points[i]);
        }
      } else {
        this._corner(points[i], points[i + 1]);
      }
    }
  }
  _start(current, next) {
    const p = new Point();

    p.position.copy(current);
    p.direction.subVectors(next, current).normalize();
    p.right.crossVectors(p.direction, p.up).normalize();
    p.distance = 0;

    this.array.push(p);
    this.count++;
  }

  _end(point) {
    const lastP = this.array[this.count - 1];

    const p = new Point();

    p.position.copy(point);
    p.direction.subVectors(point, lastP.position).normalize();
    p.right.crossVectors(p.direction, p.up).normalize();
    p.distance = lastP.distance + point.distanceTo(lastP.position);

    this.array.push(p);
    this.count++;
  }

  _corner(current, next) {
    const lastP = this.array[this.count - 1];

    const p = new Point();

    p.position.copy(current);
    p.direction.addVectors(lastP.direction, new Vector3().subVectors(next, current).normalize()).normalize();
    p.right.crossVectors(p.direction, p.up).normalize();
    p.distance = lastP.distance + current.distanceTo(lastP.position);

    this.array.push(p);
    this.count++;
  }

  distance() {
    return this.array[this.count - 1].distance;
  }
}

class Point {
  constructor() {
    this.position = new Vector3(); // position
    this.direction = new Vector3(); // direction
    this.right = new Vector3(); // right
    this.up = new Vector3(0, 1, 0); // up
    this.distance = 0; // distance from start
  }
  lerpPathPoints(p1, p2, alpha) {
    this.position.lerpVectors(p1.position, p2.position, alpha);
    this.direction.lerpVectors(p1.direction, p2.direction, alpha);
    this.up.lerpVectors(p1.up, p2.up, alpha);
    this.right.lerpVectors(p1.right, p2.right, alpha);
    this.distance = (p2.distance - p1.distance) * alpha + p1.distance;
  }

  copy(source) {
    this.position.copy(source.position);
    this.direction.copy(source.direction);
    this.up.copy(source.up);
    this.right.copy(source.right);
    this.distance = source.distance;
  }
}
