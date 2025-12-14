import React, { useState, useEffect, useMemo } from "react";
import "./App.css";

function App() {
  // ---- Mexanizm parametrləri (input olaraq dəyişən) ----
  const [l1, setL1] = useState(0.22);      // AB
  const [l2, setL2] = useState(1.52);      // BC
  const [l3, setL3] = useState(0.5);       // CD
  const [xd, setXd] = useState(1.5);       // D-nin A-dan üfüqi məsafəsi
  const [yd, setYd] = useState(0.2);       // D-nin A-dan şaquli məsafəsi
  const [lBERatio, setLBERatio] = useState(0.5); // L_BE / L_BC
  const [alfDeg, setAlfDeg] = useState(30);      // BE ilə BC arasındakı bucaq (dərəcə)

  // ---- Krank bucağı və animasiya ----
  const [fi1Deg, setFi1Deg] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracePoints, setTracePoints] = useState([]); // E nöqtəsinin trayektoriyası

  // ---- fi1 üçün kinematik hesab (C# kodundan port) ----
  function computeConfiguration(fi1, params) {
    const { l1, l2, l3, xd, yd, lBERatio, alfDeg } = params;

    if (l2 === 0 || l3 === 0) return null;

    const lBE = lBERatio * l2;
    const alf = (alfDeg * Math.PI) / 180;

    const csf = Math.cos(fi1);
    const snf = Math.sin(fi1);

    const ba = -2 * l3 * xd + 2 * l1 * l3 * csf;
    const bb = -2 * l3 * yd + 2 * l1 * l3 * snf;
    const bc =
      l1 * l1 +
      l3 * l3 -
      l2 * l2 +
      xd * xd +
      yd * yd -
      2 * l1 * (xd * csf + yd * snf);

    const a = bc - ba;
    const b = 2 * bb;
    const c = ba + bc;

    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;

    const x1 = (-b - Math.sqrt(disc)) / (2 * a); // birinci həll
    const f31 = 2 * Math.atan(x1);

    const snf31 = (2 * x1) / (1 + x1 * x1);
    const csf31 = (1 - x1 * x1) / (1 + x1 * x1);

    const snf21 = (-l3 * snf31 - l1 * snf + yd) / l2;
    const csf21 = (-l3 * csf31 - l1 * csf + xd) / l2;

    const f21 = Math.atan2(snf21, csf21); // f2

    const A = { x: 0, y: 0 };
    const B = { x: l1 * csf, y: l1 * snf };
    const C = {
      x: B.x + l2 * Math.cos(f21),
      y: B.y + l2 * Math.sin(f21),
    };
    const D = { x: xd, y: yd };
    const E = {
      x: B.x + lBE * Math.cos(f21 + alf),
      y: B.y + lBE * Math.sin(f21 + alf),
    };

    return { A, B, C, D, E, f21, f31 };
  }

  const fi1 = useMemo(() => (fi1Deg * Math.PI) / 180, [fi1Deg]);

  const config = useMemo(
    () =>
      computeConfiguration(fi1, {
        l1,
        l2,
        l3,
        xd,
        yd,
        lBERatio,
        alfDeg,
      }),
    [fi1, l1, l2, l3, xd, yd, lBERatio, alfDeg]
  );

  // ---- Trayektoriyanın yığılması (E nöqtəsi) ----
  useEffect(() => {
    if (!config) return;
    const { E } = config;
    setTracePoints((prev) => {
      if (prev.length === 0) return [E];
      const last = prev[prev.length - 1];
      const dist = Math.hypot(last.x - E.x, last.y - E.y);
      if (dist < 1e-3) return prev; // eyni nöqtədirsə əlavə etmə
      return [...prev, E];
    });
  }, [config]);

  // ---- Sadə animasiya (φ1 avtomatik dövsün) ----
  useEffect(() => {
    if (!isPlaying) return;
    let frameId;

    const step = () => {
      setFi1Deg((prev) => {
        const next = prev + 0.5; // hər kadrda 2°
        return next >= 360 ? next - 360 : next;
      });
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // ---- Ekran koordinatları üçün çevirmə ----
  const scale = 250;
  const offsetX = 60;
  const offsetY = 340;

  const toScreen = (p) => ({
    x: offsetX + p.x * scale,
    y: offsetY - p.y * scale,
  });

  const A = { x: 0, y: 0 };
  const D = { x: xd, y: yd };
  const Ap = toScreen(A);
  const Dp = toScreen(D);

  let B, C, E, f21, f31, Bp, Cp, Ep;
  if (config) {
    ({ B, C, E, f21, f31 } = config);
    Bp = toScreen(B);
    Cp = toScreen(C);
    Ep = toScreen(E);
  }

  // trayektoriya üçün SVG nöqtələri
  const tracePointsSvg =
    config &&
    tracePoints
      .map((p) => {
        const s = toScreen(p);
        return `${s.x},${s.y}`;
      })
      .join(" ");

  // ---- input dəyişəndə trayektoriyanı sıfırlamaq üçün helper ----
  const handleParamChange = (setter) => (e) => {
    const value = parseFloat(e.target.value.replace(",", ".")) || 0;
    setter(value);
    setTracePoints([]);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Tapşırıq 10 – Dördbəndli Oynaq Mexanizmi</h1>
          <p className="subtitle">
            Variant 10 üçün vizual kinematik analiz. Parametrləri dəyiş, bucağı
            fırlat və E nöqtəsinin trayektoriyasına bax.
          </p>
        </div>
      </header>

      <main className="app-main">
        {/* Sol panel – mexanizm şəkli */}
        <section className="panel panel-left">
          <div className="controls-row">
            <div className="control-block">
              <label>
                Krank bucağı φ₁:{" "}
                <strong>{fi1Deg.toFixed(1)}°</strong>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={fi1Deg}
                onChange={(e) => {
                  setFi1Deg(+e.target.value);
                  setTracePoints([]);
                }}
              />
            </div>

            <div className="buttons">
              <button
                type="button"
                className={`btn ${isPlaying ? "btn-secondary" : "btn-primary"}`}
                onClick={() => setIsPlaying((p) => !p)}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTracePoints([])}
              >
                Trayektoriyanı təmizlə
              </button>
            </div>
          </div>

          <div className="canvas-wrapper">
            <svg
              width={700}
              height={500}
              className="mechanism-svg"
            >
              {/* Yer xətti */}
              <line
                x1={Ap.x - 20}
                y1={Ap.y}
                x2={Ap.x + 600}
                y2={Ap.y}
                className="ground-line"
              />

              {/* Dayaq nöqtələri */}
              <circle cx={Ap.x} cy={Ap.y} r={4} className="joint" />
              <text x={Ap.x - 12} y={Ap.y + 18} className="label">
                A
              </text>

              <circle cx={Dp.x} cy={Dp.y} r={4} className="joint" />
              <text x={Dp.x + 6} y={Dp.y - 6} className="label">
                D
              </text>

              {/* Əsas çubuqlar yalnız konfiqurasiya olduqda */}
              {config && (
                <>
                  <line
                    x1={Ap.x}
                    y1={Ap.y}
                    x2={Bp.x}
                    y2={Bp.y}
                    className="link link-main"
                  />
                  <line
                    x1={Bp.x}
                    y1={Bp.y}
                    x2={Cp.x}
                    y2={Cp.y}
                    className="link link-main"
                  />
                  <line
                    x1={Cp.x}
                    y1={Cp.y}
                    x2={Dp.x}
                    y2={Dp.y}
                    className="link link-main"
                  />
                  <line
                    x1={Bp.x}
                    y1={Bp.y}
                    x2={Ep.x}
                    y2={Ep.y}
                    className="link link-secondary"
                  />

                  {/* Nöqtələr */}
                  <circle cx={Bp.x} cy={Bp.y} r={3} className="joint" />
                  <text
                    x={Bp.x - 10}
                    y={Bp.y - 6}
                    className="label"
                  >
                    B
                  </text>

                  <circle cx={Cp.x} cy={Cp.y} r={3} className="joint" />
                  <text
                    x={Cp.x + 6}
                    y={Cp.y + 16}
                    className="label"
                  >
                    C
                  </text>

                  <circle cx={Ep.x} cy={Ep.y} r={3} className="joint joint-E" />
                  <text
                    x={Ep.x + 6}
                    y={Ep.y - 6}
                    className="label"
                  >
                    E
                  </text>
                </>
              )}

              {/* E nöqtəsinin trayektoriyası */}
              {tracePointsSvg && (
                <polyline
                  points={tracePointsSvg}
                  className="trace"
                />
              )}

              {/* x ölçüsü */}
              <line
                x1={Ap.x}
                y1={Ap.y + 40}
                x2={Dp.x}
                y2={Ap.y + 40}
                className="dimension-line"
                markerStart="url(#arrowStart)"
                markerEnd="url(#arrowEnd)"
              />
              <text
                x={(Ap.x + Dp.x) / 2 - 10}
                y={Ap.y + 56}
                className="label"
              >
                x
              </text>

              {/* y ölçüsü */}
              <line
                x1={Dp.x + 40}
                y1={Dp.y}
                x2={Dp.x + 40}
                y2={Ap.y}
                className="dimension-line"
                markerStart="url(#arrowStart)"
                markerEnd="url(#arrowEnd)"
              />
              <text
                x={Dp.x + 46}
                y={(Dp.y + Ap.y) / 2}
                className="label"
              >
                y
              </text>

              {/* Ox markerləri */}
              <defs>
                <marker
                  id="arrowEnd"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 z" />
                </marker>
                <marker
                  id="arrowStart"
                  markerWidth="6"
                  markerHeight="6"
                  refX="1"
                  refY="3"
                  orient="auto"
                >
                  <path d="M6,0 L0,3 L6,6 z" />
                </marker>
              </defs>

              {!config && (
                <text
                  x={Ap.x + 120}
                  y={Ap.y - 120}
                  className="error-text"
                >
                  Bu parametrlər üçün mexanizm yığılmır (diskriminant &lt; 0)
                </text>
              )}
            </svg>
          </div>
        </section>

        {/* Sağ panel – input + outputlar */}
        <section className="panel panel-right">
          <h2 className="panel-title">Parametrlər və nəticələr</h2>

          <div className="grid grid-2">
            <div>
              <h3 className="section-title">Giriş parametrləri</h3>
              <div className="form-grid">
                <label className="field">
                  <span>l₁ = AB (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={l1}
                    onChange={handleParamChange(setL1)}
                  />
                </label>
                <label className="field">
                  <span>l₂ = BC (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={l2}
                    onChange={handleParamChange(setL2)}
                  />
                </label>
                <label className="field">
                  <span>l₃ = CD (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={l3}
                    onChange={handleParamChange(setL3)}
                  />
                </label>
                <label className="field">
                  <span>x (A → D) (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={xd}
                    onChange={handleParamChange(setXd)}
                  />
                </label>
                <label className="field">
                  <span>y (A → D) (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={yd}
                    onChange={handleParamChange(setYd)}
                  />
                </label>
                <label className="field">
                  <span>L_BE / L_BC</span>
                  <input
                    type="number"
                    step="0.05"
                    value={lBERatio}
                    onChange={handleParamChange(setLBERatio)}
                  />
                </label>
                <label className="field">
                  <span>∠(BC, BE) (°)</span>
                  <input
                    type="number"
                    step="1"
                    value={alfDeg}
                    onChange={handleParamChange(setAlfDeg)}
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="section-title">Hesablanmış nəticələr</h3>

              {config ? (
                <>
                  <div className="result-block">
                    <strong>Bucaqlar (dərəcə):</strong>
                    <ul>
                      <li>φ₁ (AB) = {fi1Deg.toFixed(2)}°</li>
                      <li>
                        φ₂ (BC) = {(f21 * 180 / Math.PI).toFixed(2)}°
                      </li>
                      <li>
                        φ₃ (CD) = {(f31 * 180 / Math.PI).toFixed(2)}°
                      </li>
                    </ul>
                  </div>

                  <div className="result-block">
                    <strong>Nöqtə koordinatları (m):</strong>
                    <ul>
                      <li>A(0, 0)</li>
                      <li>
                        B({B.x.toFixed(3)}, {B.y.toFixed(3)})
                      </li>
                      <li>
                        C({C.x.toFixed(3)}, {C.y.toFixed(3)})
                      </li>
                      <li>
                        D({D.x.toFixed(3)}, {D.y.toFixed(3)})
                      </li>
                      <li>
                        E({E.x.toFixed(3)}, {E.y.toFixed(3)})
                      </li>
                    </ul>
                  </div>

                  <div className="result-block">
                    <strong>Trayektoriya haqqında:</strong>
                    <p>
                      E nöqtəsinin yadda saxlanmış nöqtə sayı:{" "}
                      <strong>{tracePoints.length}</strong>
                    </p>
                    <p className="hint">
                      Play düyməsi ilə krank fırlanır, E nöqtəsinin hərəkət yolu
                      qırmızı xətt kimi çəkilir.
                    </p>
                  </div>
                </>
              ) : (
                <p className="error-text">
                  Parametrləri elə seç ki, mexanizm yığıla bilsin (diskriminant
                  ≥ 0 və l₂, l₃ ≠ 0).
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
