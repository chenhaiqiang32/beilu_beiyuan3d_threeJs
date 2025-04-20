import * as THREE from "three";
import { AlarmPersonCard } from "./utils";


export class PersonAlarm {

  constructor(sprite) {

    this.person = null;
    this.object3d = new THREE.Object3D();
    this.object3d.name = "personDanger";

    this.label = sprite.clone();
    this.board = new AlarmPersonCard();
    this.dangerPersonInfo = null; // 报警人员信息


    this.object3d.add(this.label,this.board);

  }

  setAlarm(person) {
    this.person = person;

    this.board.setInnerText(person.name);

    const position = person.position;
    this.object3d.position.copy(position);

    this.object3d.add(this.label,this.board);

  }

  clearAlarm() {
    this.object3d.removeFromParent();
    this.board.element.parentNode.removeChild(this.board.element);
  }

}
