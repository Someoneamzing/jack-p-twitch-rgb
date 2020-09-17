let chroma = (typeof window !== 'undefined'?window:global).chroma;
if ((typeof window !== 'undefined'?window:global).module) chroma = require('chroma-js');

class Animation {
  constructor(looping = false, mode = 'lab') {
    if (this.constructor === Animation) throw new TypeError("Animation should not be instantiated directly. Use one of the sub classes to create an animation.")
    this.looping = looping;
    this.mode = mode;
  }

  //This funtion will let us check if this animation is going to modify a particular LED.
  hasPixel(index, time) {
    throw new TypeError("You should not call Animation.hasPixel() this should be overriden by a sub class.")
  }

  //This function will get the color for a particular LED at a particular time.
  getLEDColor(index, time) {
    throw new TypeError("You should not call Animation.getLEDColor() this should be overriden by a sub class.")
  }
}

export default Animation;
