import { Store3D } from "./three/index";
import { onMessage } from "./message/onMessage";
export const Core = new Store3D(document.querySelector("canvas"));
Core.init();
onMessage();
export default Core;
