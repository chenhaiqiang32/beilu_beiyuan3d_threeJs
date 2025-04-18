import { Heatmap } from "../heatmap";
import { Orientation } from "./Orientation";
import { Updatable } from "./Updatable";

export class HeatmapSystem extends Updatable {

  /**@param {Orientation} orientation  */
  constructor(orientation) {
    super();
    this.orientation = orientation;
  }

  #initData(data) {
    this.heatmap = new Heatmap(this.#resetData(data),{
      container: document.createElement("div"),
      maxOpacity: 1,
      radius: 5,
      blur: 1,
      backgroundColor: "rgba(0, 255, 255, 1)",
    });
    this.heatmap.name = "heatmap";

  }

  /**
   * 展示热力图
   * @param {Orientation} orientation
   */
  update(orientation) {
    const data = orientation.getCurrentSceneData();

    this.dispose();
    if (data.length === 0) return;
    this.#initData(data);

    orientation.core.scene.add(this.heatmap);
  }

  // 重置
  #resetData(data) {
    const positions = [];
    for (let i = 0; i < data.length; i++) {
      const position = data[i].position;
      positions.push({
        x: Math.floor(position.x),
        y: Math.floor(position.z),
        value: 1,
      });
    }
    return positions;
  }

  openHeatmap() {
    this.orientation.addUpdatable(this);
    this.update(this.orientation);
  }

  clearHeatmap() {
    this.dispose();
    this.orientation.removeUpdatable(this);
  }

  dispose() {
    if (this.heatmap) {
      this.heatmap.deleteSelf();
    }
  }
}
