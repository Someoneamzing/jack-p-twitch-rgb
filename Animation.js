const chroma = require('chroma-js');

class Animation {
  constructor(colors, ranges, looping = false, mode = 'lab') {
    //We'll check to make sure our animations have been specified correctly. This will catch any errors before they become a problem.
    //The first check will be that we have specified at least one color stop.
    if (colors.length < 1) throw new Error("We need at least one color to animate.")
    //The next check is to verify that the ranges of LEDs specified are formatted properly.
    //Don't worry too much about the pattern below. Just know that it checks for ranges of numbers in the format '0', '0-10 20-30 44-50' or '10-35' to specify segments of the LED strip to animate.
    ranges = ranges.trim()
    //  |--------------------------| This stuff is a regex pattern. You wont need to know how it works to use it but if you would like to find out more you can visit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    if (!/^(?:\d+(?:-\d+)?(?: |$))+$/.test(ranges)) throw new Error("The provided ranges must be either a single number or a range of numbers specified like this '1-10'. You can have multiple of these ranges separated by a space.")

    //This will give us a list of the ranges.
    let rangeList = ranges.split(/ +/g) // this just separates on spaces but ignores double spaces.
    //This will store the indexes of the LEDs that this animation will afect. We will get this from the ranges.
    let dedupedRangeList = new Set(); // A Set is like a list but it doesn't allow for duplicates. (It ignores them)
    //We can now verify that the ranges specified are valid and do some logic to join together overlapping ranges.
    for (let range of rangeList) {
      console.log("Checking range " + range);
      let [a, b = null] = range.split('-');
      console.log(`a: ${a}, b: ${b}`);
      if (a < 0) throw new Error("LED indexes must be positive.")
      if (b == null) {
        console.log("Single index");
        //We have just a single number. The only check we need to make is that its positive.
        dedupedRangeList.add(parseInt(a).valueOf());
      } else {
        //We are dealing with a proper range e.g. 10-30.
        if (b <= a) throw new Error("Ranges of LEDs must be specified with the first number being smaller than the second. If you want to specify a single led then just add it's index like '10'.")
        //Note: We don't need to check b for being positive as we know b is bigger than a and we know a is positive so we know b is too.
        //Now we generate all the LED positions between a and b.
        for (let i = Number(a); i < Number(b); i ++) {
          //And add them to our list;
          dedupedRangeList.add(parseInt(i).valueOf());
        }
      }
    }

    console.log(dedupedRangeList);


    //We'll record the total time this animation will take for one run by adding the fadeInTime holdTime and final fadeOutTime for each color.
    let totalTime = 0;
    //As well as the time it takes before the animation fades out. This will make calculations later clearer.
    let timeToFadeOut = 0;
    for (let i = 0; i < colors.length; i ++) {
      let colorStop = colors[i];
      //The first check on each color will be that we have specified a color.
      if (!chroma.valid(colorStop.color)) throw new Error(`Make sure to specify a valid color for the stops. The one in position ${i} seems wrong.`)
      //Next we will check that each specified color has a 'fadeInTime' and that it is positive. This will be how many ms it will take to fade to that color either from the previous color or the color of the strip if this is the first color.
      if (isNaN(colorStop.fadeInTime) || colorStop.fadeInTime < 0) throw new Error(`Make sure you have specified a fadeInTime and that it is positive. The stop at position ${i} isn't right.`)
      //Add the fade int time to the totalTime and timeToFadeOut
      totalTime += colorStop.fadeInTime;
      timeToFadeOut += colorStop.fadeInTime;
      //The next property is the holdTime. This is how long the light will stay on without changing. We will check that it is specified and that it is positive.
      if (isNaN(colorStop.holdTime) || colorStop.holdTime < 0) throw new Error(`Make sure you have specified a holdTime and that it is positive. The stop at position ${i} isn't right.`)
      //Add the holdTime to totalTime and timeToFadeOut
      totalTime += colorStop.holdTime;
      timeToFadeOut += colorStop.holdTime;
      //The final property is an interesting one. It is the fadeOutTime. It is how long it takes for this animation's final color to fade out. This should only exist on the last color in the list but only if this isn't a looping animation. And of course should be a positive number.
      if (!looping && i + 1 == colors.length && (isNaN(colorStop.fadeOutTime) || colorStop.fadeOutTime < 0)) {throw new Error("The last color in the list must have a fadeOutTime in non-looping animations and it must be positive.")}
      else if ((looping || i + 1 != colors.length) && 'fadeOutTime' in colorStop) throw new Error(`fadeOutTime should only be specified on the last color in a non-looping animation. It was found on index ${i}.`);
      //Now we add fadeOutTime to totalTime only.
      if (!isNaN(colorStop.fadeOutTime)) totalTime += colorStop.fadeOutTime;
    }
    // Now that we have verified the color stops are valid, calculated the total time and generated the positions of the LEDs that this animation will affect we can put all of this information on the animation object.
    this.looping = looping;
    this.mode = mode;
    this.colors = colors;
    this.totalTime = totalTime;
    this.timeToFadeOut = timeToFadeOut;
    //We use cumulative time to figure out at what times each color stop occurs.
    let cumulativeTime = 0;
    let finalColorStops = this.colors.reduce((acc, color)=>{
      acc.push(color.color);
      if (acc.holdTime > 0) acc.push(color.color);
      return acc;
    }, [this.colors[this.colors.length-1].color])
    let finalColorStopDomains = this.colors.reduce((acc, color)=>{
      cumulativeTime += color.fadeInTime;
      acc.push(cumulativeTime);
      if (acc.holdTime > 0) {
        cumulativeTime += color.holdTime;
        acc.push(cumulativeTime);
      }
      return acc;
    }, [0])
    this.scale = chroma.scale(finalColorStops).domain(finalColorStopDomains).mode(mode);
    // this.startTime = Date.now();
    this.leds = dedupedRangeList;
    // this.startColors = Array.from(dedupedRangeList).reduce(
    //     (map, index)=>{
    //       map.set(index, strip.pixel(index).color());
    //       return map;
    //     }
    //   , new Map()); //This gets the current color of all the LEDs we will change. We will use this to fade the starting color.
    this.firstLoop = true; //We'll use this to determine if we should fade from startColors or the last color stop for looping animations.
  }

  hasPixel(index, time) {return this.looping || time < this.totalTime ? this.leds.has(parseInt(index).valueOf()) : false}

  getLEDColor(index, time) {
    if (!this.hasPixel(index, time)) return null;
    return this.scale(time).alpha(
      this.looping?(
        this.firstLoop?
          Math.min(1,time/this.colors[0].fadeInTime)
        :
          1
      ):(
        time > this.timeToFadeOut?
          1 - (time-this.timeToFadeOut) / this.colors[this.colors.length-1].fadeOutTime
        :
          1
      )
    );
  }
}

module.exports = Animation;
