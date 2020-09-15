let chroma = (typeof window !== 'undefined'?window:global).chroma;
if ((typeof window !== 'undefined'?window:global).module) chroma = require('chroma-js');
import Animation from './Animation.mjs';

class AnimationManager {
  constructor(strip, MIX_MODE = 'lab') {
    //This list keeps track of all the animations that are currently playing.
    this.currentAnimations = [];
    //This keeps track of all the starting times for each playing animation. So the animation at index 1 will have it's startTime  at index 1 in startTimes.
    this.startTimes = [];
    //MIX_MODE is the blending mode we use to blend between animations. This is different that the mode for blending between colors in an single animation.
    this.MIX_MODE = MIX_MODE;
    //This will be the static color of the LED strip if there are no animations playing.
    this.defaultColor = chroma([0,0,0]);
    //This is the LED strip that we are going to animate.
    this.strip = strip;
  }


  //This function will be used to play an animation.
  //You pass a previously created animation instance and it will play it.
  play(animation) {
    //First we check that it is actually a proper Animation. This saves us from trying to catch errors down the line.
    if (!animation instanceof Animation) throw new Error("animation must be an instance of Animation")
    //Add the animation to the list of currently playing animations.
    this.currentAnimations.push(animation);
    //Then we record the start time of the animation. This is used later to figure out how far into the animation we are.
    this.startTimes.push(Date.now());
  }

  //This allows us to set a static background color. It defaults to black or off but can be set to any color.
  setDefaultColor(color) {
    //Here we pass the color through chroma just to make sure we are dealing with chroma colors later.
    this.defaultColor = chroma(color);
  }


  //This method lets us get the color of a particular LED at a particular time. This way we can just ask the animation manager what color an LED is and it will figure out the mixing and blending etc.
  getLEDColor(index, time = Date.now(), startFrom = null) {
    //Index is the index of the led we want to get.
    //Time is the current time in ms, can either be from the start of the program or the current date and time converted to ms as long as all the code  uses the same convention.
    //startFrom is the number of layers to skip so to say. It will become clearer why we have this later but for calling this outside the AnmationManager class we can ignore it.
    //If we're told to start from a negative index it means that we are looking for the background color. So we return that.
    if (startFrom < 0) return this.defaultColor;
    //Now we loop over the animations, but backwards. This means the last animation added shows up on top and that we don't get any issues when removing animations that have finished.
    //We also start from the startFrom index if it has been specified, otherwise we go from the end of the animation list.
    for (let i = startFrom === null ? this.currentAnimations.length - 1: startFrom; i >= 0; i --) {
      //We get the current animation and it's start time.
      let animation = this.currentAnimations[i];
      let startTime = this.startTimes[i];
      //We then calculate how far into the animation we are.
      let t = time - startTime;
      //Making sure that if the animation loops that we loop the time as well.
      if (animation.looping) t %= animation.totalTime;
      //We then check if the current animation will control the LED at this time.
      if (animation.hasPixel(index, t)) {
        //If it does then we get the color of the LED at this time in the animation.
        let color = animation.getLEDColor(index, t);
        //Here we get a bit complex.
        //We check to see if the color is transparent at all (i.e. a non-one alpha)
        if (color.alpha() == 1) {
          //If the alpha is full 1 thenwe just return the color as it won;t blend with anything underneath. It is blocking it.
          return color
        } else {
          //If it's transparent then we need to mix with the colors of the animations beneath.
          //This is done with the chroma.mix() function.
          return chroma.mix(
            this.getLEDColor(index, time, i - 1),//By calling getLEDColor again but with a startFrom index we skip the current animation and can get the color that the animations below would have made the LED.
            color.alpha(1),//We then blend between that color and the full strength color from this animation
            color.alpha(),// based on the alpha the animation returned.
            animation.mode// using the specified blending mode.
          );
        }
      };
    }
    //If we get to the end of the loop then we know that no animation controls this LED so it should stay as the background color.
    return this.defaultColor;
  }


  //This function will be called every frame to actually update the LED strip. It takes care of getting the LED colors and updating them.
  update(){
    //We get the current time.
    let time = Date.now();
    //And then loop over each animation but backwards. Again this is so that we can avoid any issues when removing finished animations.
    for (let i = this.currentAnimations.length - 1; i >= 0; i --) {
      //We get the current animation and it's starting time.
      let animation = this.currentAnimations[i];
      let startTime = this.startTimes[i];
      //We then check to see if the animation has passed the end of it's first playthrough.
      if (time - startTime > animation.totalTime) {
        if (animation.looping) {
          //If this is a looping animation then we just want to update the animation to tell it that it is no longer on it's first loop.
          animation.firstLoop = false;
        } else {
          //Otherwise if this is a non-looping animation then it has finished and should be removed as it won't affect any LEDs.
          this.currentAnimations.splice(i, 1);
          this.startTimes.splice(i, 1);
        }
      }
    }
    //Now once all of the animations have been updated with the looping information and any old animations have been cleared, we can get the color for each LED and update the strip.
    for (let i = 0; i < this.strip.length; i ++) {
      //We get the color for the current LED
      let color = this.getLEDColor(i, time);
      //And set the current LED to that color.
      this.strip.pixel(i).color(color.rgb());
    }
    //Once all the LEDs have been updated we tell the strip to show our updates.
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

export default AnimationManager;
// module.exports = AnimationManager;
