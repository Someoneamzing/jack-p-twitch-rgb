global.window = global;
import five from "johnny-five";
import pixel from 'node-pixel';
import chroma from 'chroma-js';
import tmi from 'tmi.js';
import Strip from './test-helpers.js';
import AnimationManager from './AnimationManager.mjs';
import SimpleAnimation from './SimpleAnimation.mjs';

const STRIP_LENGTH = 2;
const STRIP_PIN = 6;

let board = new five.Board({port: "COM3"});

board.on("ready", function() {
  console.log("Board ready.")

  let strip = new Strip({
    board,
    controller: 'FIRMATA',
    strips: [{ pin: STRIP_PIN}],
    length: STRIP_LENGTH,
    gamma: 2.8
  })

  let isOn = false;

  strip.on('ready', ()=>{

    let animationManager = new AnimationManager(strip);

    let animations = [
      new SimpleAnimation([
        { color: [0, 255, 255], fadeInTime: 1000, holdTime: 0 },
        { color: [255, 0, 0], fadeInTime: 1000, holdTime: 0 }
      ], '0 1', true, 'hsv'),
      new SimpleAnimation([
        { color: [255, 0, 0], fadeInTime: 500, holdTime: 500 },
        { color: [255, 163, 15], fadeInTime: 500, holdTime: 1000, fadeOutTime: 500 }
      ], '0', false),
      new SimpleAnimation([
        { color: chroma.hsv(0, 100, 100), fadeInTime: 10, holdTime: 0},
        { color: chroma.hsv(180, 100, 100), fadeInTime: 1000, holdTime: 0},
        { color: chroma.hsv(360, 100, 100), fadeInTime: 1000, holdTime: 0, fadeOutTime: 10},
      ], '1', false, 'hsv')
    ]

    board.repl.inject({
      play(index) {
        animationManager.play(animations[index]);
      }
    })

    board.loop(Math.floor(1000 / 60), ()=>animationManager.update())

    console.log("Strip ready.");
    let client = new tmi.client({
      channels: ['codinggarden','jackpattillo','captainsparklez','x33n','thecherno','michaelreeves','sovietwomble']
    })

    client.on('cheer', (channel, userstate, message)=>{
      let numBits = userstate.bits; // numBits will now be the amount of bits cheered.
      // strip.color([0,0,255])
      // setTimeout(()=>strip.off(), 300)
    })

    client.on('hosted', (channel, username, viewers, autoHost) =>{
      //Viewers will be the number of people who have come across
      // strip.color([0,255,0])
      // setTimeout(()=>strip.off(), 300)
    })

    client.on('raided', (channel, username, viewers) => {
      //Viewers will be the number of people who have come across
      // strip.color([255,0,0])
      // setTimeout(()=>strip.off(), 300)
    })

    client.on('resub', (channel, username, streakMonths, message, userstate, methods)=>{
      //streakMonths is the streak the user is on. It will be 0 if the user doesn't want to share their streak.
      let totalMonths = userstate['msg-param-cumulative-months'];
      //totalMonths is the total number of months this user has been subscribed.
      // strip.color([255,255,0])
      // setTimeout(()=>strip.off(), 300)
    })

    client.on('submysterygift', (channel, username, numOfSubs, methods, userstate) => {
      //numOfSubs is how many usename is gifting.
      let totalPastSubs = userstate['msg-param-sender-count']
      //totalPastSubs is how many the sender has gifted to the channel in total.
      // strip.color([255,0,255])
      // setTimeout(()=>strip.off(), 300)
    })

    client.on('subscription', (channel, username, methods, message, userstate) => {
      //Username is the subscriber.
      //Message is the message the user attached to their sub.
      // strip.color([0,255,255])
      // setTimeout(()=>strip.off(), 300)
    })

    client.connect();
  })
});
