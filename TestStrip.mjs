export default class Strip {
  constructor(canvas, length) {
    this.length = length;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.leds = Array.from({length}, (_,i) => {return new Pixel(i)})
  }

  show(){
    for (let led of this.leds) led.show(this.ctx);
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

class Pixel {
  constructor(index) {
    this.index = index;
    this._color = "#000000";
  }

  show(ctx) {
    ctx.fillStyle = this._color;
    ctx.beginPath();
    ctx.arc(40 + this.index * 30, 40, 10, 0, Math.PI * 2);
    ctx.fill()
  }

  off() {
    this._color = "#000000";
  }

  color(val = null){
    if (val) {
      this._color = chroma(val).hex();
    } else {
      return this._color;
    }
  }
}
