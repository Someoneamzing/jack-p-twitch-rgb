import SimpleAnimation from './SimpleAnimation.mjs';
import CometAnimation from './CometAnimation.mjs';
import AnimationManager from './AnimationManager.mjs';
import Strip from './TestStrip.mjs';

window.addEventListener('load', ()=>{
  const canvas = document.getElementById('canvas');
  const buttonCont = document.getElementById('buttons')
  console.log(canvas);
  const ctx = canvas.getContext('2d');

  const animations = [
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
    ], '1', false, 'hsv'),
    new CometAnimation("#ff0000", "#ff7700", 10, 10, 0, 100, true),
    new CometAnimation("#0000ff", "#0077ff", 10, 10, 0, 100, true, true),
    new CometAnimation("#00ff00", "#ffff00", 10, 10, 0, 100),
  ]

  let strip = new Strip(canvas, 100);
  let manager = new AnimationManager(strip);

  function update(){
    ctx.clearRect(0,0,canvas.width, canvas.height)
    manager.update()
    requestAnimationFrame(update)
  }

  for (let i in animations) {
    let animation = animations[i];
    let button = document.createElement('button')
    button.innerText = `Play Animation ${Number(i) + 1}`;
    button.onclick = (e)=>{
      manager.play(animation)
    }
    buttonCont.append(button)
  }

  requestAnimationFrame(update)
})
