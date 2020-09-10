const chroma = require('chroma-js');
const Animation = require('./Animation.js');

class AnimationManager {
  constructor(strip, MIX_MODE = 'lab') {
    this.currentAnimations = [];
    this.startTimes = [];
    this.MIX_MODE = MIX_MODE;
    this.defaultColor = chroma([0,0,0]);
    this.strip = strip;
  }

  animate(animation) {
    if (!animation instanceof Animation) throw new Error("animation must be an instance of Animation")
    this.currentAnimations.push(animation);
    this.startTimes.push(Date.now());
  }

  setDefaultColor(color) {
    this.defaultColor = chroma(color);
  }

  getLEDColor(index, time = Date.now(), startFrom = null) {
    if (startFrom < 0) return this.defaultColor;
    for (let i = startFrom === null ? this.currentAnimations.length - 1: startFrom; i >= 0; i --) {
      let animation = this.currentAnimations[i];
      let startTime = this.startTimes[i];
      let t = time - startTime;
      if (animation.looping) t %= animation.totalTime;
      if (animation.hasPixel(index, t)) {
        // console.log(`Time: ${t}`);
        let color = animation.getLEDColor(index, t);
        return color.alpha() == 1 ? color : chroma.mix(this.getLEDColor(index, time, i - 1), color.alpha(1), color.alpha(), animation.mode);
        // if (animation.firstLoop && t < animation.colors[0].fadeInTime) {
        //   // console.log(`First loop fade-in`)
        //   return chroma.mix(this.getLEDColor(index, time, i-1), animation.getLEDColor(index, animation.colors[0].fadeInTime), t / animation.colors[0].fadeInTime, animation.mode);
        // } else if (t < animation.timeToFadeOut) {
        //   // console.log(`Regular mix`)
        //   return animation.getLEDColor(index, t)
        // } else {
        //   let animColor = animation.getLEDColor(index, animation.timeToFadeOut)
        //   let backColor = this.getLEDColor(index, time, i - 1);
        //   let ratio = (t - animation.timeToFadeOut) / animation.colors[animation.colors.length - 1].fadeOutTime;
        //   // console.log(`Fade out. Anim Color: ${animColor},  Back color: ${backColor}, t: ${t}, ratio: ${ratio}`)
        //   return chroma.mix(animColor, backColor, ratio, animation.mode)
        // }
      };
    }
    return this.defaultColor;
  }

  update(){
    let time = Date.now();
    for (let i = this.currentAnimations.length - 1; i >= 0; i --) {
      let animation = this.currentAnimations[i];
      let startTime = this.startTimes[i];
      if (time - startTime > animation.totalTime) {
        if (animation.looping) {
          animation.firstLoop = false;
        } else {
          this.currentAnimations.splice(i, 1);
          this.startTimes.splice(i, 1);
        }
      }
    }
    for (let i = 0; i < this.strip.length; i ++) {
      let color = this.getLEDColor(i, time);
      this.strip.pixel(i).color(color.rgb());
    }
    this.strip.show();
  }

  // update(){
  //   let updated = new Set();
  //   //We'll loop backwards through the current animations so the latest animations have priority. That means a looping animation played at the start wont stop a new animation played later on.
  //   for (let i = this.currentAnimations.length - 1; i >= 0; i --) {
  //     let animation = this.currentAnimations[i];
  //     let t = Date.now() - animation.startTime;
  //     if (animation.looping) t %= animation.totalTime;
  //     if (t > animation.totalTime) {
  //       this.currentAnimations.splice(i, 1) // Remove the animation from the processing list as it has finished.
  //       continue; //Stop processing this animation as it has finished.
  //     }
  //     let j = 0; //This is the index of the color stop we are currently fading to / holding.
  //     let progressTimeTest = 0;
  //     while (progressTimeTest + animation.colors[j].fadeInTime + animation.colors[j].holdTime + (animation.colors[j].fadeOutTime?animation.colors[j].fadeOutTime:0) < t) {
  //       j ++;
  //       progressTimeTest += animation.colors[j].fadeInTime + animation.colors[j].holdTime;
  //     }
  //     //j is now the index of the current color stop;
  //     let stopTime = t - progressTimeTest;
  //     //Stop time is how long the animation has spent in this stop.
  //
  //     //lastColor will be the last color that we animated to and are now moving from. We will use this to interpolate (fade) to the next color. The logic it follows is if this is the first color stop then we will set this to null if we are in our first loop to indicate that we need to animate each LED from their starting colors and if we aren't in our first loop then it will use the last color stop in the list. If this isn't the first color stop then just use the last color in the list of stops.
  //     let lastColor = j == 0 ? (animation.firstLoop ? null : animation.colors[animation.colors.length-1].color) : animation.colors[j-1].color;
  //     if (animation.firstLoop && j >= 1) animation.firstLoop = false; //If we have passed the first stop on our first loop then set firstLoop to false as we have finished with the startColors array.
  //     //Current color will set what the LEDs should be showing at this point in the animation. If it is null it indicates that we are in the start of our first loop so each led is going to have a different starting color (got from animation.startColors).
  //     let currentColor = stopTime <= animation.colors[j].fadeInTime ? (lastColor !== null ? chroma.mix(lastColor, animation.colors[j].color, stopTime / animation.colors[j].fadeInTime, MIX_MODE) : null) : animation.colors[j].color;
  //     //Loop over all of the LEDs that this animation affects and update their colors.
  //     for (let index of animation.leds) {
  //       let pixelColor = currentColor;
  //       if (pixelColor === null) {
  //         pixelColor = chroma.mix(//If pixelColor is null it means we need to get this individual LED's color from it's starting color or the next animation to take over's color.
  //           animation.startColors.get(index),
  //           animation.colors[j].color,
  //           stopTime/animation.colors[j].fadeInTime,
  //           MIX_MODE
  //         )
  //       }
  //       strip.pixel(index).color((
  //         currentColor?currentColor:
  //       ).rgb);//We want the color in a list format like [0, 255, 0] so we get the .rgb style from the chroma color.
  //     }
  //   }
  // }
}

module.exports = AnimationManager;
