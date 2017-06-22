function somethingNew() : string {
  let date : number = Date.now();
  return `Tell me = ${date / 1000}`;
}

function print() {
  console.log(somethingNew());
}

setInterval(print, 2000);
