let chroma = (typeof window !== 'undefined'?window:global).chroma;
if ((typeof window !== 'undefined'?window:global).module) chroma = require('chroma-js');

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
    //We use cumulativeTime to figure out at what times each color stop occurs.
    let cumulativeTime = 0;
    let finalColorStops = this.colors.reduce((acc, color)=>{//This will loop over each item in colors.
      //Here acc is a list. We add each color from our color stops to it.
      acc.push(color.color);
      //However, if this color is held for any amount of time we need to specify it twice to make a section of the gradient static.
      if (acc.holdTime > 0) acc.push(color.color);
      //This line just passes acc to the next color stop.
      return acc;
    }, [this.colors[this.colors.length-1].color]) //Here we can add a starting element to acc. We have added the last color in the animation at the start to make looping easier. For non looping animations we can just skip the first fade on the first play.
    let finalColorStopDomains = this.colors.reduce((acc, color)=>{ //Here we process the times for each color. We need to convert our relative times from colors to times in a timeline. To do that we add each colors fadeTime and holdTime to cumulativeTime and use that to figure out at what time each stop belongs.
      cumulativeTime += color.fadeInTime;
      //Add the time of the color when it's fully faded in.
      acc.push(cumulativeTime);
      if (acc.holdTime > 0) {
        //And if the color is held we need to add a time for when the color should start to fade to the next one.
        cumulativeTime += color.holdTime;
        acc.push(cumulativeTime);
      }
      return acc;//Again this line passes acc to the next color.
    }, [0])//Here we start acc with 0 to make sure chroma doesn't cut off the beginning color from the loop we specified earlier.
    //Now we can create the chroma scale that we will use to perform our fades. We specify the colors, times and the blending mode we want to use.
    this.scale = chroma.scale(finalColorStops).domain(finalColorStopDomains).mode(mode);
    //And we need to store the list of LED positions that we will change in this animation.
    this.leds = dedupedRangeList;
    this.firstLoop = true; //We'll use this to determine if we should fade from startColors or the last color for looping animations.
  }

  //This funtion will let us check if this animation is going to modify a particular LED.
  hasPixel(index, time) {
    //We get a time because animations shouldn't modify LEDs outside their timelines. It also allows for some expansions that we will talk about later.
    //This makes a couple of checks. The first is if we are looping, becuasde if we are there is no end to the animation's timeline. The next check is if we aren't looping then if we are still in our timeline. (We aren't past the end of the animation.) If either of those checks passes then we check if our list of LEDs contains the requested index. If it does then we return true. If however, the first checks don't pass then we just reutrn false as we aren;t going to modify any LEDs.
    return this.looping || time < this.totalTime ? this.leds.has(parseInt(index).valueOf()) : false
  }

  //This function will get the color for a particular LED at a particular time.
  getLEDColor(index, time) {
    //First thing to check if this animation even has a color for this LED. If it doesnt then we just return null.
    if (!this.hasPixel(index, time)) return null;
    //To get the color we simply pass in the time in the animation to our chroma scale.
    return this.scale(time).alpha(//However to allow fading we provide an alpha or 'opacity' if you will. We'll look at how we will use this in the AnimationManager but the maths is fairly simple.
      //Our first check is if we are looping or not.
      this.looping?(
        //If we are then we only want to fade at the very start, so we check if this is the first loop through.
        this.firstLoop?
        //If it is the first loop then we return a number that goes from 0 to 1 as we fade in and stays at 1 for the rest of the loop.
          Math.min(1,time/this.colors[0].fadeInTime)
        :
        //If this is not our first loop then just return 1 as the animation won't fade out again.
          1
      ):(
        //If we aren't looping then our numbers are slightly different.
        //Our first check is if we are fading out.
        time > this.timeToFadeOut?
        //If we are we return a number that goes from 0 to 1 as we fade out.
          1 - (time-this.timeToFadeOut) / this.colors[this.colors.length-1].fadeOutTime
        :(
        //If we arent then we check if we are fading in
          time < this.colors[0].fadeInTime?
            //If we are then we return a number that goes from 0 to 1 as we fade in.
            Math.min(1,time/this.colors[0].fadeInTime)
          :
            //If we 're after the fadeInTime then we just return 1 as the color is solid.
            1
        )
      )
    );
  }
}

export default Animation;
