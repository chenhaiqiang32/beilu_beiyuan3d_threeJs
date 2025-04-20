import { Orientation } from "./Orientation";
import { Updatable } from "./Updatable";

/**
 * 人员筛选模块
 */
export class PersonFilter extends Updatable {

  /** @param {Orientation} orientation  */
  constructor(orientation) {
    super();
    this.order = 0;

    this.orientation = orientation;

    this.rules = null;

    orientation.addUpdatable(this);

  }

  filter(rules) {
    this.rules = rules;
  }

  update() {

    const rules = this.rules;

    if (!rules) return;

    const data = this.orientation.map;

    data.forEach(this.updateVisible);

  }

  updateVisible = (item) => {

    const rules = this.rules;

    if (!rules) return;

    const visible = rules[item.typeName];

    item.object3d.traverse(child => {
      child.visible = visible;

      // 被筛选的数据
      child.isPass = !visible;
    });

    // 被筛选的数据不参与聚合计算

    if (item.id !== this.orientation.searchId && item.id !== this.orientation.followId) {
      item.isSingle = !visible;
    }

    item.isPass = !visible;
  };

}
