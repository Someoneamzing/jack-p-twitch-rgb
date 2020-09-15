# Animating RGB Colors
Animating color involves a process called interpolation. There are a couple of different forms. Which one you go with is personal opinion, I'll provide a list of the different types as well as what they look like so you can choose.

The type of system we are going to construct will work similar to layers in photoshop. We can have multiple animations playing at once but the top ones will take priority. So if we have a simple "breathing" animation between two colors that loops constantly then we play a short animation to indicate a twitch event like a flash of orange then the orange will show up and then return to the background animation. This also means we can fade between animations. So if an animation is halfway through fading in then some of the color of that pixel will be from the background animation and the rest from the top animation.

To make most of this easier we will use a library called `chroma.js`. It provides easy color mixing functions that we can use.

To install it run the following inside the project.
```sh
npm install chroma-js
```

Once that is done go to the top of the `index.js` file and add the line
```js
const chroma = require('chroma-js');
```

Now we can use the chroma library. To make things easier we are going to write a system to animate the lights from one color to another.

Chroma provides a simple gradient system. You can specify color stops and move them around. We will use this as our fades. It works like so:
```js
let fade = chroma.scale(['red','green','blue']).domain([0, 500, 1000]).domain('lab');
```
Fade is then a gradient that fades from red through green to blue in 1 second. The list of numbers is the time in ms that the color should be completely faded to.

We can get the color of the LEDs at any point in time by doing this:
```js
let color = fade(time);
```
color is then the color of the fade at `time` milliseconds into the animation.

To make a color stay static you can specify the same color twice and give two different times for the start and finish. Like so:
```js
let fade = chroma.scale(['red','green','green','blue']).domain([0, 500, 1000, 1500]).domain('lab');
```

Now fade will go from red to green over 500ms. Then hold green for 500ms, then finally fade to blue over 500ms.

The only part left to do now is to implement the fade in and fade out. However, because we are fading from another animation we need to do these slightly differently because we can't easily change colors in a chroma gradient. So we will implement it like so:
```js
let color = chroma.mix(backColor, color, fadeProprtion, 'lab')
```
Here the backColor is the color of the strip from the animation below this one.

This system will be based on the idea of predefined animations and a system that keeps track of which ones are playing. To model this we will make 2 new classes (types if you will). The first will be an Animation class. This will represent the pattern the lights will follow and will keep track of timing, colors, looping etc. The other class will be the AnimationManager. It will keep track of all the currently playing animations and manage blending between animations as well as updating the LED strip each frame.

To get started create a new file called `Animation.mjs` in the same folder as `index.js`. Inside that we will add this bit of starter code.
```js
import chroma from'chroma-js';

export default class Animation {

}
```

What this does is bring in the chroma library to use in this file and create a new class called Animation. The export default line tells JavaScript that we want to use this class from other files. This is why we use the `.mjs` extension rather then `.js`. Additionally you should rename `index.js` to `index.mjs` and change the library imports from earlier to the new import syntax. So the top of our `index.mjs` file should look like this:

```js
import five from "johnny-five";
import pixel from 'node-pixel';
import chroma from 'chroma-js';
import tmi from 'tmi.js';
```

Now under that we add the following line:
```js
import Animation from './Animation.mjs';
```

This is what the `export default` line from earlier enables. We can now use the `Animation` class we created in `Animation.mjs` inside `index.mjs`. This allows use to keep file sizes small and makes managing our code easier.

Now what we are going to add next is quite large but there are comments to explain each part so bare with it. In `Animation.mjs` inside the `Animation` class add these lines:
```js
export default class Animation {
  constructor(colors, ranges, looping = false, mode = 'lab') {
    //colors is going to be a list of color stops and their timings.
    //ranges is a string describing the LEDs that this animation will play on.
    //Looping is whether or not this animation loops. If it isn't specified it defaults to false.
    //mode is the blending mode we use. If it isn't specified it default's to 'lab'.
    //We'll check to make sure our animations have been specified correctly. This will catch any errors before they become a problem.
    //The first check will be that we have specified at least one color stop.
    if (colors.length < 1) throw new Error("We need at least one color to animate.")
    //The next check is to verify that the ranges of LEDs specified are formatted properly.
    //First we want to get rid of any extra spaces on the ends of the string.
    ranges = ranges.trim()
    //Don't worry too much about the pattern below. Just know that it checks for ranges of numbers in the format '0', '0-10 20-30 44-50' or '10-35' to specify segments of the LED strip to animate.
    if (!/^(?:\d+(?:-\d+)?(?: |$))+$/.test(ranges)) throw new Error("The provided ranges must be either a single number or a range of numbers specified like this '1-10'. You can have multiple of these ranges separated by a space.")
    //  |--------------------------|
    //  This stuff is a regex pattern. You won't need to know how it works to use it but if you would like to find out more you can visit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions

    //This will give us a list of the ranges.
    let rangeList = ranges.split(/ +/g)
    //                           |---|
    //this just separates on spaces but ignores double spaces.

    //This will store the indexes of the LEDs that this animation will affect. We will get this from the ranges.
    let dedupedRangeList = new Set(); // A Set is like a list but it doesn't allow for duplicates. (It ignores them)
    //We can now verify that the ranges specified are valid and do some logic to join together overlapping ranges.
    for (let range of rangeList) {
      //This just gets the two numbers on either side of the dash.
      //So 10-20 will make a = 10 and b = 20
      let [a, b = null] = range.split('-');
      //If there isn't a dash, however, then b will be left as null.
      //We then check to make sure the numbers are reasonable.
      if (a < 0) throw new Error("LED indexes must be positive.")
      //Then we check to see if we had a range or just a single number.
      if (b == null) {
        //We have just a single number so we can just add it to the set.
        dedupedRangeList.add(parseInt(a).valueOf());
      } else {
        //We are dealing with a proper range e.g. 10-30.
        if (b <= a) throw new Error("Ranges of LEDs must be specified with the first number being smaller than the second. If you want to specify a single led then just add it's index like '10'.")
        //Note: We don't need to check b for being positive as we now know b is bigger than a and we know a is positive so we know b is too.
        //Now we generate all the LED positions between a and b.
        for (let i = Number(a); i < Number(b); i ++) {
          //And add them to our list;
          dedupedRangeList.add(parseInt(i).valueOf());
        }
      }
    }


    //We'll record the total time this animation will take for one run by adding the fadeInTime holdTime and final fadeOutTime for each color.
    let totalTime = 0;
    //As well as the time it takes before the animation fades out. This will make calculations later easier and clearer.
    let timeToFadeOut = 0;
    //Then we loop over each of the specified color stops to check them all.
    for (let i = 0; i < colors.length; i ++) {
      let colorStop = colors[i];
      //The first check on each color will be that we have actually specified a color.
      if (!chroma.valid(colorStop.color)) throw new Error(`Make sure to specify a valid color for the stops. The one in position ${i} seems wrong.`)
      //Next we will check that each specified color has a 'fadeInTime' and that it is positive. This will be how many ms it will take to fade to that color either from the previous color or the color of the previous animation if this is the first color.
      if (isNaN(colorStop.fadeInTime) || colorStop.fadeInTime < 0) throw new Error(`Make sure you have specified a fadeInTime and that it is positive. The stop at position ${i} isn't right.`)
      //Add the fade in time to the totalTime and timeToFadeOut
      totalTime += colorStop.fadeInTime;
      timeToFadeOut += colorStop.fadeInTime;
      //The next property is the holdTime. This is how long the light will stay this color. We will check that it is specified and that it is positive.
      if (isNaN(colorStop.holdTime) || colorStop.holdTime < 0) throw new Error(`Make sure you have specified a holdTime and that it is positive. The stop at position ${i} isn't right.`)
      //Add the holdTime to totalTime and timeToFadeOut
      totalTime += colorStop.holdTime;
      timeToFadeOut += colorStop.holdTime;
      //The final property is an interesting one. It is the fadeOutTime. It is how long it takes for this animation's final color to fade out. This should only exist on the last color in the list but only if this isn't a looping animation. And of course should be a positive number.
      //Our first check is that it is specified on the last color and that it is positive.
      if (!looping && i + 1 == colors.length && (isNaN(colorStop.fadeOutTime) || colorStop.fadeOutTime < 0)) {throw new Error("The last color in the list must have a fadeOutTime in non-looping animations and it must be positive.")}
      //Our other check is that we haven't specified it on a looping animation or on any color that isn't the last one.
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
}
```

Now that that is added we can specify animations like below:

```js
//To make a simple two color fade that fades to red in 500ms holds it for 500ms then fades to green after 500ms then holds for 500ms before fading out over 1 second for 100 LEDs without looping:
new Animation([
  {color: [255, 0, 0], fadeInTime: 500, holdTime: 500},
  {color: [0, 255, 0], fadeInTime: 500, holdTime: 500, fadeOutTime: 1000},
], '0-100') // Note we can leave out the looping and mode parameters as the defaults are fine.

//To have a two color flash on the first 50 LEDs that goes red for a second then blue for 2 seconds with no fade and without looping:
new Animation([
  {color: [255, 0, 0], fadeInTime: 0, holdTime: 1000},
  {color: [0, 0, 255], fadeInTime: 0, holdTime: 2000, fadeOutTime: 0}
], '0-50')

//To have a simple fade between three colors on the first 25 LEDs and the last 25 LEDs of the strip each lasting 1 second without holding that loops forever.
new Animation([
  {color: [255, 0, 51], fadeInTime: 500, holdTime: 0},
  {color: [149, 0, 255], fadeInTime: 500, holdTime: 0},
  {color: [255, 0, 0], fadeInTime: 500, holdTime: 0} // Note that we don't specify a fadeOutTime as it will use the fadeInTime of the first to fade back around.
], '0-25 74-100', true)
```

Now that is the definition part of the Animations done but we still don't have a way of getting colors at specific times. So to do that we are going to add two functions to the Animation class. So inside `Animation.mjs` below our last bit of code but still inside the Animation class add this code:

```js
//This funtion will let us check if this animation is going to modify a particular LED.
hasPixel(index, time) {
  //We get a time because animations shouldn't modify LEDs outside their timelines. It also allows for some expansions that we will talk about later.
  //This makes a couple of checks. The first is if we are looping, becuasde if we are there is no end to the animation's timeline. The next check is if we aren't looping then if we are still in our timeline. (We aren't past the end of the animation.) If either of those checks passes then we check if our list of LEDs contains the requested index. If it does then we return true. If however, the first checks don't pass then we just return false as we aren't going to modify any LEDs.
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
```

This allows us to retieve the color of LEDs at specific times during the animation. As an example:
```js
let testAnimation = new Animation([
  {color: [255, 0, 0], fadeInTime: 500, holdTime: 500},
  {color: [0, 255, 0], fadeInTime: 500, holdTime: 500, fadeOutTime: 1000},
], '0-100')

//As an example we will assume that we are 500ms into the animation. To get the color of the 50th LED we can do this:
let color = testAnimation.getLEDColor(49, 500);//Note the 49 rather than the 50. This is because the first LED is at 0 and the second at 1 and so on.
```

Now to add the AnimationManager class. In the same folder as `index.mjs` and `Animation.mjs` add a new file named `AnimationManager.mjs`. Inside it add this code:
```js
import chroma from 'chroma-js';
import Animation = from './Animation.mjs'; //This lets us access the Animation class inside this file.

export default class AnimationManager {

}
```

Our first addition will go inside the AnimationManager class. It will set up the configuration options for the manager.
```js
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
}
```

After that we will add 4 functions. One to play an animation, one to get the color of LEDs, one to set a background color and another to actually update the LED strip with the appropriate colors. So below the last code but still inside the AnimationManager class add this:
```js
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
```
Now this may seem like a lot of code, but the payoff is worth it. You can very easily create new animations and react to new events without having to change much code at all. This can event be used in systems other than Twitch. It can be used to react to other real-time events or even be set to go off at specific times. And with some small modifications we can add much more complex animations. I cover that [here](./complex_animations.md).


Once all that code is implemented we should be able to start animating the LEDs. Inside `index.mjs`, undeneath the TIM.js client configuration and before adding out event listeners, add this code.
```js
let animationManager = new AnimationManager(strip);

board.loop(Math.floor(1000 / 60), ()=>animationManager.update())
```
 And that's it. This will run our animations at 60 fps. This can be changed by changing the `1000/60` part to `1000/fps` where `fps` is the fps target you want. Remember there is a hardware limit on most strips and for this system it's around 60 fps, but that changes with more LEDs. We can now play animations in reaction to twitch events. A reccomended pattern to follow is to have a Map of your animations defined beforehand to give them names.

 So, for example, before the `board.loop()` line add this:
 ```js
const animations = new Map();

animations.set('subscribe', new Animation([
  {
    color: "#f59842",
    fadeIntTime: 500,
    holdTime: 200,
  },
  {
    color: "#ff5500",
    fadeInTime: 300,
    holdTime: 0,
    fadeOutTime: 500
  }
], '0-25 75-100', false))
 ```

 So now in the Twitch events section:

```js
//We listen to 'subscription' events
client.on('subscription', (channel, username, methods, message, userstate) => {
  //And play the 'subscribe' animation when the event happens.
  animationManager.play(animations.get('subscribe'))
})
```

And now when a subscription comes in the strip will flash orange and fade to a reddish-orange before fading out.

And that's it. Just add your animations into the map like shown above and call the `AnimationManager.play()` method whenever you want to play an animation.
