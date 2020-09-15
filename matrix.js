const five = require('johnny-five');

function delay(millis) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millis)
  });
}

let numbers = [
  [
    "00000000",
    "00000000",
    "00000000",
    "00011000",
    "00011000",
    "00000000",
    "00000000",
    "00000000",
  ],[
    "00000011",
    "00000011",
    "00000000",
    "00000000",
    "00000000",
    "00000000",
    "11000000",
    "11000000",
  ],[
    "00000011",
    "00000011",
    "00000000",
    "00011000",
    "00011000",
    "00000000",
    "11000000",
    "11000000",
  ],[
    "11000011",
    "11000011",
    "00000000",
    "00000000",
    "00000000",
    "00000000",
    "11000011",
    "11000011",
  ],[
    "11000011",
    "11000011",
    "00000000",
    "00011000",
    "00011000",
    "00000000",
    "11000011",
    "11000011",
  ],[
    "11000011",
    "11000011",
    "00000000",
    "11000011",
    "11000011",
    "00000000",
    "11000011",
    "11000011",
  ],
]

let changes = Array.from({length: numbers.length}, _=>Array.from({length: numbers.length}))



let board = new five.Board({port: "COM3"})
board.on('ready', ()=>{
  let matrix = new five.Led.Matrix({pins: {data: 7, clock: 5, cs: 6},board})
  let button = new five.Button({pin: 2, hold: 500, isPullup: true})
  let rolling = 0;
  let rollNumber = -1;
  let flashesLeft = 0;
  let canRoll = true;
  changes.default = numbers.map(char=>(()=>matrix.draw(char)))

  for (let i = 0; i < numbers.length; i ++) {
    for (let j = 0; j < numbers.length; j ++) {
      let body = "";
      for (let line in numbers[i]) {
        let from = numbers[i][line];
        let to = numbers[j][line];
        for (let char = 0; char < from.length; char ++) {
          if (from[char] != to[char]) body += `matrix.led(${line}, ${char}, ${to[char]});`
        }
      }
      let runnable = new Function('matrix', body);
      console.log("Caching ", i, j);
      changes[i][j] = ()=>runnable(matrix);
    }
  }

  function roll(){
    let to = Math.floor(Math.random() * 6);
    console.log(rollNumber, to);
    console.log(changes[rollNumber<0?'default':rollNumber]);
    console.log(changes[rollNumber<0?'default':rollNumber][to]);
    changes[rollNumber<0?'default':rollNumber][to]()
    rollNumber = to;
    rolling --;
  }

  button.on('hold', async ()=>{
    if (canRoll) {
      canRoll = false;
      console.log("Held");
      rolling = Math.floor(Math.random() * 40) + 10
      console.log("Changing " + rolling);
      while(rolling > 0) {
        console.log('Animating');
        roll()
        await delay((-rolling * .9 + 50) * 5)
      }
      for (let i = 0; i < 4; i ++) {
        console.log("Flashing");
        await delay(500)
        matrix.off()
        await delay(500)
        matrix.on()
      }
      console.log("Done");
      canRoll = true;
    }
  })
})
