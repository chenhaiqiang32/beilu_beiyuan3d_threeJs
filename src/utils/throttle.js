export function throttle(func, wait) {
  var previous = 0;
  return function () {
    let now = Date.now();
    if (now - previous > wait) {
      func();
      previous = now;
    }
  };
}
