const EventEmitter = require('events');
const five = require('johnny-five');
global.window = global
class Strip extends EventEmitter {
  constructor({board, controller, strips, gamma, length}) {
    super();
    this.board = board;
    this.strips = strips;
    this.leds = [new five.Led.RGB({board, pins: [6, 5, 3]}), new five.Led.RGB({board, pins: [11, 10, 9]})]
    this.leds[1].color([255,0,0])
    this.length = length;
    setTimeout(()=>this.emit('ready'), 500);
  }

  show(){

  }

  off() {
    for (let led of this.leds) led.off()
  }

  color(...args) {
    for (let led of this.leds) led.color(...args)
  }

  shift() {

  }

  pixel(addr) {
    return this.leds[addr];
  }


}

module.exports = Strip
