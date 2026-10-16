let tick = 0;
console.log("Stable demo started.");
setInterval(() => {
  tick++;
  const temporary = Array.from({ length: 20000 }, (_, index) => ({ id: index, text: `temporary-${tick}-${index}` }));
  if (tick % 5 === 0) console.log(`temporary objects allocated: ${temporary.length}`);
}, 1000);
