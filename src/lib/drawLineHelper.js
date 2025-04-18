import { Vector3,Scene,Group } from "three";

import { vec3ToNum,checkLinesCross,vec3ToVec2 } from "../utils";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { getLengthFromVertices,getPolygonArea } from "../utils";

const _geometry = new LineGeometry();
const material = new LineMaterial({ color: 0xff00ff,linewidth: 4,depthTest: false,transparent: true });
material.resolution.set(window.innerWidth,window.innerHeight);

/** @description 画线辅助工具*/
export class DrawLineHelper {
  /**@type {boolean} 当前辅助工具的活跃状态 */
  #active;

  /**@type {Vector3[]} 所有确定（不确定的movePoint）的三维坐标信息 */
  points;

  /**@type {Line2} 已经绘制的线 */
  line;

  /**@type {Line2} 即将绘制的线 */
  moveLine;

  /**@type {number} 绘制的点位的数量 */
  count;

  /**@type {boolean} 移动的时候是否需要在一定距离内吸附至第一个顶点 */
  needToAdhereToFirstPoint;

  /**@type {number} 被吸附的最小距离 */
  closestDistanceToAdhere;

  /**@type {boolean} 是否需要在绘制时检测相交，去除Y轴分量，以二维向量集合形式计算 */
  needCheckLinesCross;

  /**@type {boolean} 是否闭合*/
  isClosed;

  /**@type {Vector3} 移动坐标*/
  movePoint;

  /**@type {boolean} 活跃状态 */
  set active(value) {
    if (this.#active === value) return;
    this.#active = value;

    if (value) {
      this._create();
    } else {
      this.end();
    }
  }

  get active() {
    return this.#active;
  }

  /**@param {Scene} scene 三维场景 */
  constructor(scene) {
    this.scene = scene;

    this.needToAdhereToFirstPoint = true;
    this.needCheckLinesCross = false;
    this.closestDistanceToAdhere = 0;
    this.points = [];
    this.count = 0;
    this.isClosed = false;

    this.#active = false;

    this.movePoint = new Vector3();

    this._create();

    this.moveLine.visible = false;

    this.group = new Group();
    this.group.name = "绘制组";

    this.group.add(this.line,this.moveLine);
    this.scene._add(this.group);
  }

  /**
   * @description 向正在绘制的线中添加坐标点,期待在鼠标落下时触发。
   * @param {Vector3} point 三维向量
   */
  addPoint(point) {
    if (!this.#active) return;
    if (
      this.needCheckLinesCross &&
      checkLinesCross(vec3ToVec2(this.points,"x","z"),vec3ToVec2(point,"x","z"))
    ) {
      setTimeout(() => { // 给个提示但是不能阻塞进程
        alert("相交了,操作无效");
      },0);
      console.log("相交了,操作无效");
      return;
    }

    if (this.needToAdhereToFirstPoint && this.count > 1 && point.equals(this.points[0])) {
      this.isClosed = true;
    }

    this.points.push(point);
    this.count++;

    this.updateLine();
    this.updateMoveLine(point);

    if (!this.line.parent) {
      this.group.add(this.line,this.moveLine);
    }
  }

  /**结束绘制,moveLine将会释放它的资源。*/
  end() {
    this.moveLine.deleteSelf();
  }

  /**撤回已经绘制的线段上的最后一点 */
  deletePoint() {
    if (!this.#active) return;
    if (this.points.length) {
      this.points.pop();
      this.count--;
      this.updateLine();
      this.updateMoveLine();
    }
  }

  _create() {
    this.line = new Line2(undefined,material);
    this.moveLine = new Line2(new LineGeometry().setPositions([0,0,0,0,0,0]),material);
  }

  /**
   * 获取确定线段的总长度
   * @param {number} [toFixed=2] 小数点后保留位数
   */
  getLength(toFixed = 2) {
    return parseFloat(getLengthFromVertices(this.points).toFixed(toFixed));
  }

  /**
   * 获取所有线段的总长度，包含moveLine
   * @param {number} [toFixed=2] 小数点后保留位数
   */
  getTotalLength(toFixed = 2) {
    return parseFloat(getLengthFromVertices([...this.points,this.movePoint]).toFixed(toFixed));
  }

  /**
   * 获取绘制图形的面积,未闭合状态返回0,该信息为三维坐标取 [ x , z ] 计算得来。
   * @param {number} [toFixed=2] 小数点后保留位数
   */
  getArea(toFixed = 2) {
    if (this.isClosed) {
      return parseFloat(getPolygonArea(vec3ToVec2(this.points,"x","z")).toFixed(toFixed));
    }
    return 0;
  }

  /**
   * 获取绘制图形的几何中心
   * @param {Vector3} target
   */
  getCenter(target = new Vector3()) {
    const center = target;
    this.points.forEach(point => {
      center.addScaledVector(point,1 / this.points.length);
    });
    return center;
  }

  /**
   * 请执行在 Window.onresize 确保效果正常
   * @param {number} width
   * @param {number} height
   */
  onresize(width,height) {
    material.resolution.set(width,height);
  }

  /**更新moveLine */
  updateMoveLine(point) {
    if (!this.#active) return;
    if (this.count) {
      const { x,y,z } = this.points[this.count - 1];
      if (point === undefined) {
        const positions = this.moveLine.geometry.attributes.instanceStart.data.array;
        this.moveLine.geometry.setPositions([x,y,z,positions[3],positions[4],positions[5]]);
      } else {
        this.movePoint.copy(point);
        if (this.needToAdhereToFirstPoint) {
          const firstPoint = this.points[0];
          if (point.distanceTo(firstPoint) < this.closestDistanceToAdhere) {
            point.copy(firstPoint);
          }
        }

        this.moveLine.geometry.setPositions([x,y,z,point.x,point.y,point.z]);
        this.moveLine.visible = true;
      }
    } else {
      this.moveLine.visible = false;
    }
  }

  /**更新Line */
  updateLine() {
    if (!this.#active) return;

    this.line.geometry.dispose();
    if (this.count >= 2) {
      const geometry = new LineGeometry().setPositions(vec3ToNum(this.points));
      this.line.geometry = geometry;
    } else {
      this.line.geometry = _geometry;
    }
  }

  /**释放资源 */
  dispose() {
    this.line && this.line.deleteSelf();
    this.moveLine && this.moveLine.deleteSelf();

    this.line = null;
    this.moveLine = null;

    this.count = 0;
    this.points.length = 0;

    this.isClosed = false;

    this.#active = false;
  }
}
