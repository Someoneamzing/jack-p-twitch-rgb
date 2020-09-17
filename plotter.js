const canvas = document.getElementById('canvas');
const input = document.getElementById('input');
const button = document.getElementById('plot');
const min = document.getElementById('min');
const max = document.getElementById('max');
const step = document.getElementById('step');

const ctx = canvas.getContext('2d');
ctx.scale(1, -1);
// ctx.translate(0, canvas.height);

function plot(fn) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ctx.save()
  let points = []
  for (let i = Number(min.value); i < max.value; i += Number(step.value)) {
    points.push([i, fn(i)]);
    console.log(points);
  }
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let p of points) {
    if (p[1] < minVal) minVal = p[1];
    if (p[1] > maxVal) maxVal = p[1];
  }
  console.log(min.value, minVal);
  ctx.translate(min.value, minVal);
  console.log((max.value - min.value)/canvas.width, (maxVal - minVal) / canvas.height);
  ctx.scale((max.value - min.value)/canvas.width, (maxVal - minVal) / canvas.height);
  ctx.beginPath()
  ctx.moveTo(0,0);
  ctx.moveTo(1000,1000);
  ctx.stroke()
  ctx.beginPath();
  ctx.moveTo(...points[0])
  for (let i = 1; i < points.length; i ++) ctx.lineTo(...points[1]);
  ctx.stroke();
  ctx.restore();
}

button.onclick = (e)=>{
  plot(new Function('x', input.value))
}
