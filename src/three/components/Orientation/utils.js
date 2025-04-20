import * as THREE from "three";
import { singleInstance } from "../../../utils";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

export function createSprite(imgSrc,scale = new THREE.Vector3(1,1,1),center = new THREE.Vector2(0.5,0.5)) {

  const map = new THREE.TextureLoader().load(imgSrc);
  const material = new THREE.SpriteMaterial({
    map,
    sizeAttenuation: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.copy(scale);
  sprite.center.copy(center);

  return sprite;
}


class _PersonCard extends CSS2DObject {

  constructor(item,fun) {
    let labelEle = document.createElement("div");
    let labelTop = document.createElement("div");
    let labelBottom = document.createElement("div");
    let labelBottomDown = document.createElement("div");
    let labelEleOut = document.createElement("div");
    labelEleOut.append(labelEle);
    labelEleOut.append(labelTop);
    labelEleOut.append(labelBottom);
    labelEleOut.append(labelBottomDown);
    labelEleOut.draggable = false;
    labelTop.className = "beilu_three_Board_text_person_top";
    labelBottom.className = "beilu_three_Board_text_person_bottom";
    labelEleOut.className = "beilu_three_Board_text_person";
    labelBottomDown.className = "beilu_three_Board_text_person_bottom_down";

    labelEle.innerText = item.name;

    if (fun) {
      labelEle.onclick = () => {
        fun();
      };
    }

    super(labelEleOut);

    this.name = "board" + item.id;

  }

  setInnerText(str) {
    this.element.innerText = str;
  }

}

class _AlarmPersonCard extends CSS2DObject {

  constructor() {
    let labelEle = document.createElement("div");
    let labelTop = document.createElement("div");
    let labelBottom = document.createElement("div");
    let labelBottomDown = document.createElement("div");
    let labelEleOut = document.createElement("div");
    labelEleOut.append(labelEle);
    labelEleOut.append(labelTop);
    labelEleOut.append(labelBottom);
    labelEleOut.append(labelBottomDown);
    labelEleOut.draggable = false;
    labelTop.className = "beilu_three_Board_text_person_top";
    labelBottom.className = "beilu_three_Board_text_person_bottom";
    labelEleOut.className = "red_three_Board_text_person";
    labelBottomDown.className = "beilu_three_Board_text_person_bottom_down";

    super(labelEleOut);

  }

  setInnerText(str) {
    this.element.innerText = str;
  }

}

export class ClusterCard extends CSS2DObject {
  constructor(item,fun) {
    let labelEleOut = document.createElement("div");
    labelEleOut.className = "ellipse-container";
    labelEleOut.style.cursor = "pointer";
    labelEleOut.style.background = "#3F35F2";
    labelEleOut.draggable = false;
    labelEleOut.innerText = item.name;
    if (fun) {
      labelEleOut.onclick = () => {
        fun(item.cluster);
      };
    }
    super(labelEleOut);

    this.name = "board" + item.id;
  }

}

// export const PersonCard = singleInstance(_PersonCard);
export const AlarmPersonCard = singleInstance(_AlarmPersonCard);
