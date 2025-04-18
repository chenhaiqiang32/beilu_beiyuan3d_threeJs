
import { Orientation } from "./Orientation";
import { Updatable } from "./Updatable";

/**
 * 搜索模块
 */
export class Search extends Updatable {

  /**
   * @param {Orientation} orientation
   */
  constructor(orientation) {
    super();

    /**@type { number } 人员 id  */
    this.id = null;
    this.orientation = orientation;
    this.core = orientation.core;

    orientation.addUpdatable(this);
  }

  search() {
    const orientation = this.orientation;
    if (!orientation.has(this.id)) return;
    const item = orientation.get(this.id);
    item.isSingle = true;
    // 将搜索的人从聚合数据拉出
    orientation.clusterModule.pullFromCluster(item);

    item.object3d.traverse(child => { // 搜索的人在隐藏中
      child.visible = true;
    });
    this.core.controls.enablePan = false;
    this.update(orientation);
    this.setSearchIcon("big",item);
  }

  setSearchIcon(string,item) { // 修改图标
    if (!string) return false;
    let setScale = 0.03;
    let setTransform = "translate(0, -200%) scale(0.75)";
    if (string === "big") {
      setScale = 0.05;
      setTransform = "translate(0, -320%) scale(1.2)";
    }
    item.object3d.traverse(child => {
      if (child.isSprite) {
        child.scale.set(setScale,setScale,setScale);
      }
      if (child.isCSS2DObject) {
        let className = child.classTypeName;
        if (className) {
          let arDoom = child.element.childNodes[0];
          arDoom.style.transform = setTransform;
        }
      }
    });
  }

  setPosition() {
    const id = this.id;
    const item = this.orientation.get(id);
    const position = item.position;
    // const { camera,controls } = this.core;

    // camera.lookAt(position);
    // controls.target.copy(position);

    this.core.tweenControl.lerpTo(position,50,1000);

  }

  clearSearch() {
    const id = this.id;
    if (!id) return;

    const orientation = this.orientation;
    if (!orientation.has(id)) return;

    // 取消搜索，将数据加入聚合数据
    const item = orientation.get(id);
    item.isSingle = false;

    // orientation.orientation3D.closeDialog();
    // orientation.orientation3D.setDialogVisible(true);

    this.core.controls.enablePan = true;
    this.id = null;
    orientation.updateModules(); // 会从新计算一下筛选
    this.setSearchIcon("small",item);
  }

  update(orientation) {
    if (this.id && !this.orientation.followId) {

      // const id = this.id;
      // const item = orientation.get(id);

      // const position = item.position;

      let searchScene = this.orientation.get(this.id);
      const { originId,sceneType } = searchScene;
      const { sceneType: currentType,originId: currentOrigin } = this.core.getCurrentOriginId();
      if ((sceneType !== currentType) || (sceneType === 0 && (originId !== currentOrigin))) {
        return false;
      } // 搜索的人离开当前场景了
      // const { camera,controls } = this.core;

      // camera.lookAt(position);
      // controls.target.copy(position);
    }
  }

}
