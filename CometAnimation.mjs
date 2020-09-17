import Animation from './Animation.mjs';

export default class CometAnimation extends Animation {
  constructor(headColor, tailColor, tailLength, speed, from, to, loop = false, pingPong = false, mode = 'lab') {
    //A CometAnimation will have several properties.
    /*
    headColor: the color of the start of the 'comet'
    tailColor: the color of the tail of the 'comet'
    tailLength: how long (in LEDs) that comet is. That is how many LEDs behind the head will be fading out.
    speed: the speed of the comet in LEDs / second.
    from: the starting position of the comet as an LED index.
    to: the finishing position of the comet as an LED index.
    loop: whether the animation should loop.
    pingPong: whether when the animation is looping if the comet should reverse direction when it hits the ends or not. If this is true it will bounce between the from and to positions. If not the comet will return to the start and loop over.
    mode: the blending mode of the animation.
    */

    //Here the super keyword refers to the Animation class as that is the super-class of this CometAnimation class.
    super(loop, mode);//We pass loop and mode to the Animation type as they are common to all animations.
    //We then store all of these properties in the respective properies on the instance.
    this.headColor = chroma(headColor);
    this.tailColor = chroma(tailColor);
    this.tailLength = tailLength;
    this.speed = speed;
    this.pingPong = pingPong;
    this.from = from;
    this.to = to;
    //Length is just the length of the segment that this animation plays over.
    this.length = this.to - this.from;
    //totalTime is the total time it takes to play through 1 loop of this animation. For a pingPong animation this is how long it takes to reach the end and get back to the start. As mentioned before this is necessary for the AnimationManager to accept it.
    this.totalTime = (this.length / (this.speed/1000))*(this.looping&&this.pingPong?2:1);
  }

  //This will return the direction the comet is going at any point in time. It is 1 if it is heading to the right and -1 id going to the left. It is used to figure out what side the trail should come from.
  getDirection(time) {
    return this.looping&&this.pingPong?Math.sign(this.totalTime/2 - (time % this.totalTime)):1
  }

  //This will get the position of the 'head' of the comet at any point in time.
  getCometPos(time) {
    let p = time/this.totalTime;
    return this.length * (this.looping&&this.pingPong?2*Math.min(1-p,p):p) + this.from;
  }

  //This will get the alpha of a pixel at any point in time.
  getPixelAlpha(index, time) {
    let leftL  = this.getDirection(time)==1?1:this.tailLength;
    let rightL = this.getDirection(time)==1?this.tailLength:1;
    let z = this.getCometPos(time);
    return Math.max(0, Math.min((z-index)/leftL + 1, (index-z)/rightL + 1))
  }

  //This is from the base Animation class. It returns whether this animation is controlling an LED at that particular point in time.
  hasPixel(index, time) {
    return this.getPixelAlpha(index, time) > 0;
  }

  //This returns the color of the LEDs for this animation.
  getLEDColor(index, time) {
    let a = this.getPixelAlpha(index, time)
    return chroma.mix(this.tailColor,this.headColor,a**4).alpha(a);
  }
}
