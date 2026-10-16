const retained = [];
let tick = 0;
console.log("Leaky demo started. Watch Heapgarden as retained memory grows.");
setInterval(() => {
  tick++;
  retained.push(Buffer.alloc(1024 * 1024, tick % 255));
  retained.push({ id: tick, createdAt: new Date().toISOString(), values: Array.from({ length: 2000 }, (_, index) => `${tick}:${index}`) });
  if (tick % 5 === 0) console.log(`retained chunks: ${retained.length}`);
}, 1000);
