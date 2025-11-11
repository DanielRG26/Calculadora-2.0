// Calculadora Multivariable 2.0
// Funcionalidades: visualización 3D/contorno (Plotly), evaluación, gradiente, dominio/rango por muestreo,
// límites por aproximación, integral doble numérica (Simpson compuesto) sobre región rectangular.

(function () {
  const $ = (id) => document.getElementById(id);

  const fnInput = $('fn-input');
  const xMinInput = $('x-min');
  const xMaxInput = $('x-max');
  const yMinInput = $('y-min');
  const yMaxInput = $('y-max');
  const resInput = $('res');
  const x0Input = $('x0');
  const y0Input = $('y0');

  const ixMin = $('ix-min');
  const ixMax = $('ix-max');
  const iyMin = $('iy-min');
  const iyMax = $('iy-max');
  const nInt = $('n-int');
  const epsInput = $('eps');

  const chart3d = $('chart3d');
  const chart2d = $('chart2d');

  const valOut = $('val-out');
  const gradOut = $('grad-out');
  const domOut = $('dom-out');
  const limOut = $('lim-out');
  const intOut = $('int-out');

  const btnVisualizar = $('btn-visualizar');
  const btnCalcular = $('btn-calcular');
  const btnIntegral = $('btn-integral');
  const btnLimite = $('btn-limite');
  const examplesTabs = document.getElementById('examples-tabs');
  const examplesList = document.getElementById('examples-list');

  // Utilidades
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Catálogo de ejemplos
  const EXAMPLES = {
    funciones: [
      { label: 'sin(x)*cos(y)', expr: 'sin(x)*cos(y)', dom: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 } },
      { label: 'exp(-(x^2+y^2))', expr: 'exp(-(x^2 + y^2))', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 } },
      { label: 'x^2 + y^2', expr: 'x^2 + y^2', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 }, focus: 'grad' },
      { label: 'x^2 - y^2', expr: 'x^2 - y^2', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 } }
    ],
    dominio: [
      { label: 'log(x^2 + y^2)', expr: 'log(x^2 + y^2)', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 } },
      { label: '1 / (x^2 + y^2 - 1)', expr: '1 / (x^2 + y^2 - 1)', dom: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 } },
      { label: 'sqrt(x^2 + y^2)', expr: 'sqrt(x^2 + y^2)', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 } }
    ],
    limites: [
      { label: '(x^2*y)/(x^2+y^2) en (0,0)', expr: '(x^2*y)/(x^2 + y^2)', dom: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, point: { x0: 0, y0: 0 }, focus: 'limit' },
      { label: '(x*y)/(x^2+y^2) en (0,0)', expr: '(x*y)/(x^2 + y^2)', dom: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, point: { x0: 0, y0: 0 }, focus: 'limit' },
      { label: '(x^2 - y^2)/(x^2 + y^2) en (0,0)', expr: '(x^2 - y^2)/(x^2 + y^2)', dom: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, point: { x0: 0, y0: 0 }, focus: 'limit' }
    ],
    derivadas: [
      { label: 'x^2 + y^2 (∇f=(2x,2y))', expr: 'x^2 + y^2', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 }, point: { x0: 1, y0: 1 }, focus: 'grad' },
      { label: 'x*y (∇f=(y,x))', expr: 'x*y', dom: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 }, point: { x0: 2, y0: -1 }, focus: 'grad' },
      { label: 'sin(x)+cos(y)', expr: 'sin(x) + cos(y)', dom: { xmin: -6, xmax: 6, ymin: -6, ymax: 6 }, point: { x0: 0, y0: 0 }, focus: 'grad' },
      { label: 'exp(x*y)', expr: 'exp(x*y)', dom: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 }, point: { x0: 0.5, y0: -0.5 }, focus: 'grad' }
    ]
  };

  function applyExample(ex) {
    if (!ex) return;
    fnInput.value = ex.expr;
    if (ex.dom) {
      xMinInput.value = ex.dom.xmin; xMaxInput.value = ex.dom.xmax;
      yMinInput.value = ex.dom.ymin; yMaxInput.value = ex.dom.ymax;
    }
    if (ex.point) { x0Input.value = ex.point.x0; y0Input.value = ex.point.y0; }
    visualize();
    if (ex.focus === 'grad') { calculateAll(); }
    if (ex.focus === 'limit') { calculateLimit(); }
  }

  function renderExamples(cat) {
    const list = EXAMPLES[cat] || [];
    examplesList.innerHTML = '';
    list.forEach((ex) => {
      const btn = document.createElement('button');
      btn.className = 'example-chip';
      btn.textContent = ex.label;
      btn.addEventListener('click', () => applyExample(ex));
      examplesList.appendChild(btn);
    });
  }

  if (examplesTabs) {
    examplesTabs.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;
      if (!t.classList.contains('tab')) return;
      const cat = t.getAttribute('data-cat');
      [...examplesTabs.querySelectorAll('.tab')].forEach(el => el.classList.remove('active'));
      t.classList.add('active');
      renderExamples(cat);
    });
    // render inicial
    renderExamples('funciones');
  }

  // Compila una función f(x,y) a partir de una cadena
  function compileFunction(expr) {
    try {
      const node = math.parse(expr);
      const code = node.compile();
      return (x, y) => {
        try {
          const scope = { x, y, e: Math.E, pi: Math.PI };
          const v = code.evaluate(scope);
          return typeof v === 'number' ? v : Number(v);
        } catch (e) {
          return NaN;
        }
      };
    } catch (e) {
      return () => NaN;
    }
  }

  // Derivadas parciales simbólicas usando math.js
  function partialDerivatives(expr) {
    try {
      const dfx = math.derivative(expr, 'x').compile();
      const dfy = math.derivative(expr, 'y').compile();
      return {
        dfx: (x, y) => {
          try { return dfx.evaluate({ x, y, e: Math.E, pi: Math.PI }); } catch { return NaN; }
        },
        dfy: (x, y) => {
          try { return dfy.evaluate({ x, y, e: Math.E, pi: Math.PI }); } catch { return NaN; }
        }
      };
    } catch (e) {
      return { dfx: () => NaN, dfy: () => NaN };
    }
  }

  // Muestreo de grilla para visualización y estimación de rango
  function sampleGrid(f, xmin, xmax, ymin, ymax, n) {
    const xs = [], ys = [], zs = [];
    for (let i = 0; i < n; i++) {
      const x = xmin + (xmax - xmin) * (i / (n - 1));
      xs.push(x);
    }
    for (let j = 0; j < n; j++) {
      const y = ymin + (ymax - ymin) * (j / (n - 1));
      ys.push(y);
    }
    let zmin = Infinity, zmax = -Infinity, valid = 0;
    for (let j = 0; j < n; j++) {
      const row = [];
      for (let i = 0; i < n; i++) {
        const z = f(xs[i], ys[j]);
        const znum = Number(z);
        if (!Number.isNaN(znum) && Number.isFinite(znum)) {
          zmin = Math.min(zmin, znum);
          zmax = Math.max(zmax, znum);
          valid++;
          row.push(znum);
        } else {
          row.push(NaN);
        }
      }
      zs.push(row);
    }
    return { xs, ys, zs, zmin, zmax, valid };
  }

  // Gráfico 3D y contorno 2D (Plotly)
  function plotCharts(xs, ys, zs, grad) {
    const h3d = chart3d.clientHeight || 540;
    const surfaceData = [{
      type: 'surface', x: xs, y: ys, z: zs,
      colorscale: 'Turbo', showscale: true,
      opacity: 0.98,
      lighting: { ambient: 0.6, diffuse: 0.7, specular: 0.1, roughness: 0.8, fresnel: 0.2 },
      lightposition: { x: 100, y: 200, z: 100 },
      contours: {
        z: { show: true, usecolormap: true, project: { z: true }, highlight: true }
      }
    }];
    const surfaceLayout = {
      title: { text: 'Superficie z = f(x,y)', font: { size: 18, color: '#e8eaf6' } },
      height: h3d,
      margin: { l: 0, r: 0, t: 40, b: 0 },
      paper_bgcolor: '#151a2f', plot_bgcolor: '#151a2f',
      scene: {
        xaxis: { title: 'x', gridcolor: '#273152', zerolinecolor: '#273152', tickfont: { color: '#e8eaf6' }, titlefont: { color: '#b7c0d6' } },
        yaxis: { title: 'y', gridcolor: '#273152', zerolinecolor: '#273152', tickfont: { color: '#e8eaf6' }, titlefont: { color: '#b7c0d6' } },
        zaxis: { title: 'z', gridcolor: '#273152', zerolinecolor: '#273152', tickfont: { color: '#e8eaf6' }, titlefont: { color: '#b7c0d6' } },
        camera: { eye: { x: 1.6, y: 1.2, z: 0.9 } },
        aspectmode: 'manual', aspectratio: { x: 1, y: 1, z: 0.8 }
      },
      autosize: true
    };
    Plotly.newPlot(chart3d, surfaceData, surfaceLayout, { responsive: true, displayModeBar: true });

    // Contorno 2D (heatmap de z)
    const h2d = chart2d.clientHeight || 420;
    const contourData = [{
      type: 'contour', x: xs, y: ys, z: zs, colorscale: 'Turbo',
      contours: { coloring: 'heatmap', showlabels: true }, line: { smoothing: 0.88 },
      connectgaps: true
    }];
    if (grad && grad.xLines && grad.yLines) {
      contourData.push({
        type: 'scatter', mode: 'lines',
        x: grad.xLines, y: grad.yLines,
        line: { color: '#23b5d3', width: 2 },
        name: '∇f (dirección)',
        hoverinfo: 'none'
      });
    }
    const contourLayout = {
      title: { text: 'Contorno (nivel de f)', font: { size: 18, color: '#e8eaf6' } },
      height: h2d,
      margin: { l: 30, r: 10, t: 40, b: 40 },
      paper_bgcolor: '#151a2f', plot_bgcolor: '#151a2f',
      xaxis: { title: 'x', gridcolor: '#273152', zerolinecolor: '#273152', tickfont: { color: '#e8eaf6' }, titlefont: { color: '#b7c0d6' } },
      yaxis: { title: 'y', gridcolor: '#273152', zerolinecolor: '#273152', tickfont: { color: '#e8eaf6' }, titlefont: { color: '#b7c0d6' } }
    };
    Plotly.newPlot(chart2d, contourData, contourLayout, { responsive: true, displayModeBar: true });
  }

  // Dominio/rango estimados por muestreo
  function estimateDomainRange(grid) {
    const { xs, ys, zmin, zmax, valid } = grid;
    const domain = `x ∈ [${xs[0].toFixed(2)}, ${xs[xs.length - 1].toFixed(2)}], ` +
                   `y ∈ [${ys[0].toFixed(2)}, ${ys[ys.length - 1].toFixed(2)}]`;
    const range = valid > 0 ? `f ∈ [${zmin.toFixed(5)}, ${zmax.toFixed(5)}]` : 'Sin datos válidos';
    return { domain, range, validCount: valid };
  }

  // Límite en (x0,y0) aproximado por varios caminos
  function estimateLimit(f, x0, y0, eps) {
    const tries = [];
    const epsilons = [eps, eps / 2, eps / 4, eps / 8];
    // caminos: mantener x, mantener y, y = y0 + m (x - x0)
    const slopes = [0.5, 1, 2, -0.5, -1.5];
    function evalNear(dx, dy) { return f(x0 + dx, y0 + dy); }
    for (const e of epsilons) {
      const v1 = evalNear(0, e);
      const v2 = evalNear(e, 0);
      const values = [v1, v2];
      for (const m of slopes) {
        // recorrer en línea: y - y0 = m (x - x0)
        const dx = e;
        const dy = m * e;
        values.push(evalNear(dx, dy));
      }
      const finite = values.filter((v) => Number.isFinite(v));
      const avg = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : NaN;
      const spread = finite.length ? Math.max(...finite) - Math.min(...finite) : NaN;
      tries.push({ eps: e, values, avg, spread });
    }
    return tries;
  }

  // Integral doble por Simpson compuesto en [ax,bx]x[ay,by]
  function doubleIntegralSimpson(f, ax, bx, ay, by, n) {
    // n par preferible
    n = Math.max(10, Math.floor(n));
    if (n % 2 === 1) n += 1;
    const hx = (bx - ax) / n;
    const hy = (by - ay) / n;
    let sum = 0;
    for (let j = 0; j <= n; j++) {
      const y = ay + j * hy;
      const wy = j === 0 || j === n ? 1 : (j % 2 === 1 ? 4 : 2);
      for (let i = 0; i <= n; i++) {
        const x = ax + i * hx;
        const wx = i === 0 || i === n ? 1 : (i % 2 === 1 ? 4 : 2);
        const v = f(x, y);
        if (!Number.isFinite(v)) return NaN;
        sum += wx * wy * v;
      }
    }
    return (hx * hy / 9) * sum; // (hx/3)*(hy/3) = hx*hy/9
  }

  // Render inicial con ejemplo de gradiente
  fnInput.value = 'x^2 + y^2';

  function visualize() {
    const expr = fnInput.value.trim();
    const f = compileFunction(expr);
    const xmin = Number(xMinInput.value), xmax = Number(xMaxInput.value);
    const ymin = Number(yMinInput.value), ymax = Number(yMaxInput.value);
    const n = clamp(Number(resInput.value), 10, 200);
    const grid = sampleGrid(f, xmin, xmax, ymin, ymax, n);
    // Overlay de gradiente
    const { dfx, dfy } = partialDerivatives(expr);
    const m = Math.max(8, Math.min(25, Math.floor(n / 3)));
    const xLines = [], yLines = [];
    const lenBase = 0.15 * Math.max((xmax - xmin) / m, (ymax - ymin) / m);
    for (let j = 0; j < m; j++) {
      const y = ymin + (ymax - ymin) * (j / (m - 1));
      for (let i = 0; i < m; i++) {
        const x = xmin + (xmax - xmin) * (i / (m - 1));
        const gx = dfx(x, y), gy = dfy(x, y);
        if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue;
        const mag = Math.hypot(gx, gy);
        if (mag === 0) continue;
        const u = (gx / mag) * lenBase;
        const v = (gy / mag) * lenBase;
        xLines.push(x, x + u, null);
        yLines.push(y, y + v, null);
      }
    }
    plotCharts(grid.xs, grid.ys, grid.zs, { xLines, yLines });
    const est = estimateDomainRange(grid);
    domOut.textContent = `Dominio: ${est.domain}\nRango estimado: ${est.range}\nValores válidos: ${est.validCount}`;
  }

  function calculateAll() {
    const expr = fnInput.value.trim();
    const f = compileFunction(expr);
    const x0 = Number(x0Input.value), y0 = Number(y0Input.value);
    const val = f(x0, y0);
    valOut.textContent = Number.isFinite(val) ? `f(${x0}, ${y0}) = ${val}` : 'No definido (NaN/Inf)';

    const { dfx, dfy } = partialDerivatives(expr);
    const gx = dfx(x0, y0);
    const gy = dfy(x0, y0);
    gradOut.textContent = `∂f/∂x = ${gx}, ∂f/∂y = ${gy}`;

    // actualizar dominio/rango con visualización
    visualize();
  }

  function calculateIntegral() {
    const expr = fnInput.value.trim();
    const f = compileFunction(expr);
    const ax = Number(ixMin.value), bx = Number(ixMax.value);
    const ay = Number(iyMin.value), by = Number(iyMax.value);
    const n = Number(nInt.value);
    const val = doubleIntegralSimpson(f, ax, bx, ay, by, n);
    if (Number.isFinite(val)) {
      intOut.textContent = `∫∫ f(x,y) dxdy ≈ ${val} \nRectángulo: x∈[${ax},${bx}], y∈[${ay},${by}], n=${n}`;
    } else {
      intOut.textContent = 'Integral no evaluable: la función no es finita en la región.';
    }
  }

  function calculateLimit() {
    const expr = fnInput.value.trim();
    const f = compileFunction(expr);
    const x0 = Number(x0Input.value), y0 = Number(y0Input.value);
    const eps = Math.max(1e-6, Number(epsInput.value));
    const tries = estimateLimit(f, x0, y0, eps);
    const lines = tries.map(t => {
      const vals = t.values.filter(v => Number.isFinite(v));
      const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : NaN;
      const spread = vals.length ? (Math.max(...vals) - Math.min(...vals)) : NaN;
      return `ε=${t.eps}: promedio≈${avg}, dispersión≈${spread}`;
    });
    limOut.textContent = `Estimación por caminos:\n${lines.join('\n')}`;
  }

  // Eventos
  btnVisualizar.addEventListener('click', visualize);
  btnCalcular.addEventListener('click', calculateAll);
  btnIntegral.addEventListener('click', calculateIntegral);
  btnLimite.addEventListener('click', calculateLimit);

  // Render inicial
  visualize();
  calculateAll();
})();