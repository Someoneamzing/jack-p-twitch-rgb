# Animating RGB Colors
Animating color involves a process called interpolation. There are a couple of different forms. Which one you go with is personal opinion, I'll provide a list of the different types as well as what they look like so you can choose.

To make most of this easier we will use a library called `chroma.js`. It provides easy color mixing functions that we can use.

To install run the following inside the project.
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
Fade is then a gradient that fades from red through green to blue in 1 second.

We can get the color of the LEDs at any point in time by doing this:
```js
let color = fade(time);
```
color is then the color of the fade at time milliseconds into the animation.

To add the holdTimes you can specify the same color twice. Like so:
```js
let fade = chroma.scale(['red','green','green','blue']).domain([0, 500, 1000, 1500]).domain('lab');
```

Now fade will go from red to green over 500ms. Then hold green for 500ms, then finally fade to blue over 500ms.

The only part left to do now is to implement the fade in and fade out. However, because the fade from color isn't known when we make the animation (the starting and ending color depends on what animations are already playing) we need to do these slightly differently. This will be done like so:
```js
let color = chroma.mix(backColor, color, fadeProprtion, 'lab')
```
Here the backColor is the color of the strip before/after the animation is played


This system will be based on the idea of predefined animations and playing them. To model this we will make 2 new classes (types if you will). The first will be an Animation class. This will represent the pattern the lights will follow.


So to start we will add two things, the list and our helper function that will create the animations. Now this will look quite complicated but I will explain each part.

```js

```

Now this alone won't actually animate any LEDs yet. This is just the system that will allow us to specify simple fading animations. We can use it like so:

```js
//To play a simple two color fade that fades to red in 500ms holds it for 500ms then fades to green after 500ms then holds for 500ms before fading out over 1 second for all 100 LEDs without looping:
new Animation([
  {color: [255, 0, 0], fadeInTime: 500, holdTime: 500},
  {color: [0, 255, 0], fadeInTime: 500, holdTime: 500, fadeOutTime: 1000},
], '0-100') // Note we can leave out the false here as false is the default for looping.

//To have a two color flash on half of the LEDs that goes red for a second then blue for 2 seconds with no fade without looping:
new Animation([
  {color: [255, 0, 0], fadeInTime: 0, holdTime: 1000},
  {color: [0, 0, 255], fadeInTime: 0, holdTime: 2000, fadeOutTime: 0}
], '0-50')

//To have a simple fade between three colors on the first and last quarter of the strip each lasting 1 second without holding that loops forever.
new Animation([
  {color: [255, 0, 51], fadeInTime: 500, holdTime: 0},
  {color: [149, 0, 255], fadeInTime: 500, holdTime: 0},
  {color: [255, 0, 0], fadeInTime: 500, holdTime: 0} // Note that we don't specify a fadeOut time as it will use the fadeInTime of the first to fade back
], '0-25 74-100', true)
```

Now to implement the code that will animate the LEDs. For this we will need some code that will run every 'frame' so to say. We will run ours at 30 fps. This can be changed by changing the `1000/30` to `1000/fps` where fps is the fps target you want. Remember there is a hardware limit on most strips and for this system it's around 60 fps, but that changes with more LEDs.

Below the last code add in this:
```js

const MIX_MODE = 'lab';

setInterval(()=>{
  let updated = new Set();
  //We'll loop backwards through the current animations so the latest animations have priority. That means a looping animation played at the start wont stop a new animation played later on.
  for (let i = currentAnimations.length - 1; i >= 0; i --) {
    let animation = currentAnimations[i];
    let t = Date.now() - animation.startTime;
    if (animation.looping) t %= animation.totalTime;
    if (t > animation.totalTime) {
      currentAnimations.splice(i, 1) // Remove the animation from the processing list as it has finished.
      continue; //Stop processing this animation as it has finished.
    }
    let j = 0; //This is the index of the color stop we are currently fading to / holding.
    let progressTimeTest = 0;
    while (progressTimeTest + animation.colors[j].fadeInTime + animation.colors[j].holdTime + (animation.colors[j].fadeOutTime?animation.colors[j].fadeOutTime:0) < t) {
      j ++;
      progressTimeTest += animation.colors[j].fadeInTime + animation.colors[j].holdTime;
    }
    //j is now the index of the current color stop;
    let stopTime = t - progressTimeTest;
    //Stop time is how long the animation has spent in this stop.

    //lastColor will be the last color that we animated to and are now moving from. We will use this to interpolate (fade) to the next color. The logic it follows is if this is the first color stop then we will set this to null if we are in our first loop to indicate that we need to animate each LED from their starting colors and if we aren't in our first loop then it will use the last color stop in the list. If this isn't the first color stop then just use the last color in the list of stops.
    let lastColor = j == 0 ? (animation.firstLoop ? null : animation.colors[animation.colors.length-1].color) : animation.colors[j-1].color;
    if (animation.firstLoop && j >= 1) animation.firstLoop = false; //If we have passed the first stop on our first loop then set firstLoop to false as we have finished with the startColors array.
    //Current color will set what the LEDs should be showing at this point in the animation. If it is null it indicates that we are in the start of our first loop so each led is going to have a different starting color (got from animation.startColors).
    let currentColor = stopTime <= animation.colors[j].fadeInTime ? (lastColor !== null ? chroma.mix(lastColor, animation.colors[j].color, stopTime / animation.colors[j].fadeInTime, MIX_MODE) : null) : animation.colors[j].color;
    //Loop over all of the LEDs that this animation affects and update their colors.
    for (let index of animation.leds) {
      let pixelColor = currentColor;
      if (pixelColor === null) {
        pixelColor = chroma.mix(//If pixelColor is null it means we need to get this individual LED's color from it's starting color or the next animation to take over's color.
          animation.startColors.get(index),
          animation.colors[j].color,
          stopTime/animation.colors[j].fadeInTime,
          MIX_MODE
        )
      }
      strip.pixel(index).color((
        currentColor?currentColor:
      ).rgb);//We want the color in a list format like [0, 255, 0] so we get the .rgb style from the chroma color.
    }
  }
}, 1000 / 30);
```
