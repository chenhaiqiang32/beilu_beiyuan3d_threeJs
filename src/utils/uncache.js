import { AnimationMixer, Object3D, AnimationClip } from "three";
/**
 * @description 释放动画内存
 * @param {AnimationClip[]} animations
 * @param {AnimationMixer} mixer
 * @param {Object3D} root
 */
export function uncache(animations, mixer, root) {
  animations.forEach(animation => {
    mixer.uncacheAction(animation);
    mixer.uncacheClip(animation);
    mixer.uncacheRoot(root);
  });
}
