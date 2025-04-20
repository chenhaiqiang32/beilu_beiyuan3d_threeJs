import {
  KeyframeTrack,
  AnimationClip,
  AnimationMixer,
  Vector3,
  Quaternion,
  Color,
  ColorKeyframeTrack,
  BooleanKeyframeTrack,
  Object3D,
} from "three";

export class FrameAnimation {
  static TYPE = {
    QUATERNION: ".quaternion",
    POSITION: ".position",
    COLOR: ".material.color",
    VISIBLE: ".visible",
    SCALE: ".scale",
  };

  /**
   * @param {string} type
   * @returns
   */
  static getTrackConstructorByType(type) {
    const TYPE = FrameAnimation.TYPE;
    switch (type) {
      case TYPE.QUATERNION:
        return KeyframeTrack;
      case TYPE.POSITION:
        return KeyframeTrack;
      case TYPE.COLOR:
        return ColorKeyframeTrack;
      case TYPE.VISIBLE:
        return BooleanKeyframeTrack;
      case TYPE.SCALE:
        return KeyframeTrack;
      default:
        return KeyframeTrack;
    }
  }

  /**
   * 绑定帧动画
   * @param {Object3D} object 帧动画绑定的根对象
   * @param {string} name 帧动画命名
   * @param {{
   * times: number[],
   * positions?:Vector3[],
   * quaternions?: Quaternion[],
   * colors?:Color[],
   * scales?:Vector3[],
   * visible?:boolean[]
   * }} data 动画帧数据
   * @returns {{mixer:AnimationMixer,clip:AnimationClip}}
   */
  static bindFrameFromData(object, name, data) {
    const { times, positions, quaternions, colors, scales, visible } = data;
    if (!Array.isArray(times)) {
      console.error("times is not an array");
      return;
    }

    const tracks = [];
    const createKeyframeTrack = FrameAnimation.createKeyframeTrack;
    const TYPE = FrameAnimation.TYPE;

    if (Array.isArray(quaternions)) {
      const track = createKeyframeTrack(times, quaternions, TYPE.QUATERNION);
      tracks.push(track);
    }
    if (Array.isArray(positions)) {
      const track = createKeyframeTrack(times, positions, TYPE.POSITION);
      tracks.push(track);
    }
    if (Array.isArray(colors)) {
      const track = createKeyframeTrack(times, colors, TYPE.COLOR);
      tracks.push(track);
    }
    if (Array.isArray(scales)) {
      const track = createKeyframeTrack(times, scales, TYPE.SCALE);
      tracks.push(track);
    }
    if (Array.isArray(visible)) {
      const track = createKeyframeTrack(times, visible, TYPE.VISIBLE);
      tracks.push(track);
    }

    const duration = times[times.length - 1] - times[0];
    const clip = new AnimationClip(name, duration, tracks);
    const mixer = new AnimationMixer(object);
    const action = mixer.clipAction(clip);

    return {
      action,
      mixer,
      clip,
    };
  }

  /**
   * 创建关键帧
   * @param {Array<number>} times 时间帧
   * @param {Array<boolean|Vector3|Color|Quaternion>} array 关键帧的值数组
   * @param {string} type 类型
   * @returns
   */
  static createKeyframeTrack(times, array, type) {
    const values = FrameAnimation.collect(array, type);
    const _KeyframeTrack = FrameAnimation.getTrackConstructorByType(type);
    const track = new _KeyframeTrack(type, times, values);
    return track;
  }

  /**
   * 收集数据，bool数组直接返回，其他数组进行解构返回
   * @param {Array<boolean|Vector3|Color|Quaternion>} array 关键帧的值数组
   */
  static collect(array) {
    const first = array[0];
    if (first instanceof Boolean) {
      return array;
    } else if (isNaN(first)) {
      const result = [];
      for (let i = 0, l = array.length; i < l; i++) {
        result.push(...array[i]);
      }
      return result;
    } else {
      return array;
    }
  }
}

Object.freeze(FrameAnimation);
