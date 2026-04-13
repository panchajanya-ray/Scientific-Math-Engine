
const modes = ['scientific','number','expression','stats'];
const display = document.getElementById('display');


function setMode(modeName) {
  modes.forEach(md => {
    const section = document.getElementById("mode-" + md);
    const btn = document.getElementById("m" + capitalize(md));
    if (section) section.classList.toggle("active", md === modeName);
    if (btn) btn.classList.toggle("active", md === modeName);
  });


  display.style.display = modeName === "scientific" ? "block" : "none";


  if (modeName === "number") {
    document.getElementById("numInput").value = "";
    document.getElementById("numResult").innerText = "Result: —";
  }
  if (modeName === "expression") {
    document.getElementById("exprInput").value = "";
    document.getElementById("exprResult").innerText = "Result: —";
  }
  if (modeName === "stats") {
    document.getElementById("statValues").value = "";
    document.getElementById("statFreq").value = "";
    document.getElementById("statOutput").innerText = "Result: —";
  }
}

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }


setMode('scientific');

function insert(txt){
  
  if(!document.getElementById('mode-scientific').classList.contains('active')) return;
  display.value += txt;
  display.focus();
}
function clearAll(){ display.value = ''; }
function del(){
  display.value = display.value.slice(0,-1);
}


function calculate() {
  if (!document.getElementById("mode-scientific").classList.contains("active")) return;
  const expr = display.value.trim();
  if (!expr) return;

  try {
    
    const safe = expr
      .replace(/\^/g, "**")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/π/g, "Math.PI")
      .replace(/\be\b/g, "Math.E")
      .replace(/\bsin\(/g, "Math.sin(")
      .replace(/\bcos\(/g, "Math.cos(")
      .replace(/\btan\(/g, "Math.tan(")
      .replace(/\blog\(/g, "Math.log10(")
      .replace(/\bln\(/g, "Math.log(")
      .replace(/\bsqrt\(/g, "Math.sqrt(");

    
    const result = Function(`"use strict"; return (${safe})`)();

    if (typeof result === "number" && isFinite(result)) {
      display.value = result;
    } else {
      display.value = "Error";
    }
  } catch (err) {
    display.value = "Error";
  }
}


let isDeg = true;
function toggleDegRad(){
  isDeg = !isDeg;
  document.getElementById('degRadBtn').innerText = isDeg ? 'Deg' : 'Rad';
}
function insertConst(c){
  if(c === 'pi') insert(String(Math.PI));
  if(c === 'e') insert(String(Math.E));
}
function sciUnary(op){
  
  if(!document.getElementById('mode-scientific').classList.contains('active')) return;
  const raw = display.value.trim();
  const val = Number(raw || 0);
  let out;
  switch(op){
    case 'sin': out = Math.sin(isDeg ? val * Math.PI/180 : val); break;
    case 'cos': out = Math.cos(isDeg ? val * Math.PI/180 : val); break;
    case 'tan': out = Math.tan(isDeg ? val * Math.PI/180 : val); break;
    case 'ln': out = Math.log(val); break;
    case 'log': out = Math.log10(val); break;
    case 'exp': out = Math.exp(val); break;
    case 'sqrt': out = Math.sqrt(val); break;
    case 'square': out = Math.pow(val,2); break;
    case 'reciprocal': out = val === 0 ? 'Error' : 1/val; break;
    case 'abs': out = Math.abs(val); break;
    case 'neg': out = -val; break;
    case 'percent': out = val / 100; break;
    default: out = val;
  }
  display.value = String(out);
}


function tokenize(expr){
  const tokens = [];
  let i = 0;
  while(i < expr.length){
    const ch = expr[i];
    if(/\s/.test(ch)){ i++; continue; }
    if(/[0-9.]/.test(ch)){
      let num = ch; i++;
      while(i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push(num); continue;
    }
    if(/[A-Za-z]/.test(ch)){
      let id = ch; i++;
      while(i < expr.length && /[A-Za-z0-9]/.test(expr[i])) id += expr[i++];
      tokens.push(id); continue;
    }
    if('+-*/^%()'.includes(ch)){ tokens.push(ch); i++; continue; }
    tokens.push(ch); i++;
  }
  return tokens;
}

function isOp(tok){ return ['+','-','*','/','^','%'].includes(tok); }

function prec(tok){
  if(tok === '+'||tok === '-') return 1;
  if(tok === '*'||tok === '/'||tok === '%') return 2;
  if(tok === '^') return 3;
  return 0;
}


function infixToPostfixFrom(expr){
  const tokens = tokenize(expr);
  const stack = [], out = [];
  for(const t of tokens){
    if(/^[A-Za-z0-9.]+$/.test(t)) out.push(t);
    else if(t === '(') stack.push(t);
    else if(t === ')'){
      while(stack.length && stack.at(-1) !== '(') out.push(stack.pop());
      stack.pop();
    }
    else if(isOp(t)){
      while(stack.length && isOp(stack.at(-1)) &&
        ((prec(stack.at(-1)) > prec(t)) ||
         (prec(stack.at(-1)) === prec(t) && t !== '^'))){
        out.push(stack.pop());
      }
      stack.push(t);
    }
  }
  while(stack.length) out.push(stack.pop());
  return out.join(' ');
}


function postfixToInfixFrom(raw){
  const tokens = raw.trim().split(/\s+/);
  const stack = [];
  for(const t of tokens){
    if(!isOp(t)) stack.push(t);
    else {
      const b = stack.pop(), a = stack.pop();
      stack.push(`(${a} ${t} ${b})`);
    }
  }
  return stack.pop() || '';
}


function infixToPrefixFrom(expr){
  const rev = tokenize(expr).reverse().map(x => x === '(' ? ')' : x === ')' ? '(' : x);
  const stack = [], out = [];
  for(const t of rev){
    if(/^[A-Za-z0-9.]+$/.test(t)) out.push(t);
    else if(t === '(') stack.push(t);
    else if(t === ')'){
      while(stack.length && stack.at(-1) !== '(') out.push(stack.pop());
      stack.pop();
    }
    else if(isOp(t)){
      while(stack.length && isOp(stack.at(-1)) &&
        ((prec(stack.at(-1)) > prec(t)) ||
         (prec(stack.at(-1)) === prec(t) && t !== '^')))
        out.push(stack.pop());
      stack.push(t);
    }
  }
  while(stack.length) out.push(stack.pop());
  return out.reverse().join(' ');
}


function prefixToInfixFrom(raw){
  const tokens = raw.trim().split(/\s+/).reverse();
  const stack = [];
  for(const t of tokens){
    if(!isOp(t)) stack.push(t);
    else {
      const a = stack.pop(), b = stack.pop();
      stack.push(`(${a} ${t} ${b})`);
    }
  }
  return stack.pop() || '';
}

function postfixToPrefixFrom(raw){
  const tokens = raw.trim().split(/\s+/);
  const stack = [];
  for(const t of tokens){
    if(!isOp(t)) stack.push(t);
    else {
      const b = stack.pop(), a = stack.pop();
      stack.push(`${t} ${a} ${b}`);
    }
  }
  return stack.pop() || '';
}

function prefixToPostfixFrom(raw){
  const tokens = raw.trim().split(/\s+/).reverse();
  const stack = [];
  for(const t of tokens){
    if(!isOp(t)) stack.push(t);
    else {
      const a = stack.pop(), b = stack.pop();
      stack.push(`${a} ${b} ${t}`);
    }
  }
  return stack.pop() || '';
}

function convertExpression(){
  const from = document.getElementById('exprFrom').value;
  const to = document.getElementById('exprTo').value;
  const input = document.getElementById('exprInput').value.trim();
  if(!from || !to || !input){
    document.getElementById('exprResult').innerText =
      'Result: Provide input and choose From/To';
    return;
  }
  let out = '';
  try{
    if(from === to) out = input;
    else if(from === 'infix' && to === 'postfix') out = infixToPostfixFrom(input);
    else if(from === 'infix' && to === 'prefix') out = infixToPrefixFrom(input);
    else if(from === 'postfix' && to === 'infix') out = postfixToInfixFrom(input);
    else if(from === 'postfix' && to === 'prefix') out = postfixToPrefixFrom(input);
    else if(from === 'prefix' && to === 'infix') out = prefixToInfixFrom(input);
    else if(from === 'prefix' && to === 'postfix') out = prefixToPostfixFrom(input);
    else out = 'Unsupported conversion';
  }catch(e){
    out = 'Error';
  }
  document.getElementById('exprResult').innerText = 'Result: ' + out;
}


function swapBases(){
  const f = document.getElementById('fromBase');
  const t = document.getElementById('toBase');
  const tmp = f.value; f.value = t.value; t.value = tmp;
}
function toggleCustomBase(which){
  const select = document.getElementById(which + "Base");
  const input  = document.getElementById(which + "CustomBase");

  if(select.value === "other"){
    input.style.display = "block";
  } else {
    input.style.display = "none";
  }
}

function convertNumber(){
  let from = document.getElementById('fromBase').value;
  let to = document.getElementById('toBase').value;

  if(from === "other"){
    from = Number(document.getElementById("fromCustomBase").value);
  } else {
    from = Number(from);
  }

  if(to === "other"){
    to = Number(document.getElementById("toCustomBase").value);
  } else {
    to = Number(to);
  }

  const raw = document.getElementById('numInput').value.trim();

  if(!raw){
    document.getElementById('numResult').innerText = 'Result: —';
    return;
  }

  if(from < 2 || from > 32 || to < 2 || to > 32){
    document.getElementById('numResult').innerText = 'Result: Base must be between 2 and 32';
    return;
  }

  try{
    const parsed = parseInt(raw.replace(/\s+/g,''), from);

    if(Number.isNaN(parsed)){
      document.getElementById('numResult').innerText = 'Result: Invalid input for selected base';
      return;
    }

    const out = parsed.toString(to).toUpperCase();
    document.getElementById('numResult').innerText = `Result: ${out}`;
  }catch(e){
    document.getElementById('numResult').innerText = 'Result: Error';
  }
}


function parseCSV(s){ return s.split(',').map(x=>x.trim()).filter(x=>x.length).map(Number); }

function computeStat(){
  const kind = document.getElementById('statAction').value;
  const valsRaw = document.getElementById('statValues').value.trim();
  if(!kind || !valsRaw){ 
    document.getElementById('statOutput').innerText = 'Result: Provide data & choose operation'; 
    return; 
  }

  let vals = parseCSV(valsRaw);
  const freqRaw = document.getElementById('statFreq').value.trim();
  let freqs = [];

  if(freqRaw){
    freqs = parseCSV(freqRaw);
    if(freqs.length !== vals.length){ 
      document.getElementById('statOutput').innerText = 'Result: Frequencies length mismatch'; 
      return; 
    }
  } else freqs = Array(vals.length).fill(1);

  const map = new Map();
  for(let i = 0; i < vals.length; i++){
    if(map.has(vals[i])){
      map.set(vals[i], map.get(vals[i]) + freqs[i]);
    } else {
      map.set(vals[i], freqs[i]);
    }
  }

  vals = Array.from(map.keys());
  freqs = Array.from(map.values());

  let res;
  switch(kind){
    case 'mean': res = statMean(vals,freqs); break;
    case 'median': res = statMedian(vals,freqs); break;
    case 'mode': res = statMode(vals,freqs); break;
    case 'variance': res = statVariance(vals,freqs); break;
    case 'stdDev': res = Math.sqrt(statVariance(vals,freqs)); break;
    default: res = 'Unknown operation';
  }

  document.getElementById('statOutput').innerText = `Result: ${Number.isFinite(res) ? Number(res).toFixed(4) : res}`;
}


function statMean(v,f)
{ 
  let s=0,t=0; 
  for(let i=0;i<v.length;i++)
    { s += v[i]*f[i]; 
      t += f[i]; 
    } 
    return s/t; 
}

function statMedian(v, f) 
{
  const arr = [];
  for (let i = 0; i < v.length; i++) {
    for (let j = 0; j < f[i]; j++) {
      arr.push(v[i]);
    }
  }
  arr.sort((a, b) => a - b);
  const n = arr.length;
  if (n === 0) return NaN;
  if (n % 2 === 1) {
    return arr[(n - 1) / 2];
  }
  return (arr[n / 2 - 1] + arr[n / 2]) / 2;
}

function statMode(v, f) 
{
  const maxF = Math.max(...f);

  const modes = [];
  for (let i = 0; i < v.length; i++) {
    if (f[i] === maxF) {
      modes.push(v[i]);
    }
  }
  return [...new Set(modes)].join(',');
}

function statVariance(v,f)
{ const m=statMean(v,f); 
  let s=0,t=0; 
  for(let i=0;i<v.length;i++)
    { s += f[i]*Math.pow(v[i]-m,2); 
      t += f[i]; 
    } 
    return s/t; 
}