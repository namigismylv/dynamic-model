import React, { useState, useEffect, useMemo } from "react";
import "./App.css";

function App() {
  // ---- Mexanizm parametrləri (input olaraq dəyişən) ----
  const [l1, setL1] = useState(""); // AB
  const [l2, setL2] = useState(""); // BC
  const [l3, setL3] = useState(""); // CD
  const [xd, setXd] = useState(""); // D-nin A-dan üfüqi məsafəsi
  const [yd, setYd] = useState(""); // D-nin A-dan şaquli məsafəsi
  const [lBERatio, setLBERatio] = useState(""); // L_BE / L_BC
  const [alfDeg, setAlfDeg] = useState(""); // BE ilə BC arasındakı bucaq (dərəcə)
  const [initialFi1Deg, setInitialFi1Deg] = useState(""); // Başlanğıc krank bucağı (input)

  // ---- Krank bucağı və animasiya ----
  const [fi1Deg, setFi1Deg] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracePoints, setTracePoints] = useState([]); // E nöqtəsinin trayektoriyası

  // ---- Submitted state (form submitted və mexanizm göstərilməsi üçün) ----
  const [submittedParams, setSubmittedParams] = useState(null);

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

  const config = useMemo(() => {
    if (!submittedParams) return null;
    return computeConfiguration(fi1, submittedParams);
  }, [fi1, submittedParams]);

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
    if (!isPlaying || !config) {
      setIsPlaying(false);
      return;
    }
    let frameId;

    const step = () => {
      setFi1Deg((prev) => {
        const next = prev + 0.5; // hər kadrda 0.5°
        return next >= 360 ? next - 360 : next;
      });
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, config]);

  // ---- Ekran koordinatları üçün çevirmə (auto-scale və mərkəzləmə) ----
  const svgWidth = 700;
  const svgHeight = 500;
  const padding = 50; // daha geniş boşluq, oxlar və trayektoriya üçün

  // Dünyadakı nöqtələr: A və D həmişə mövcuddur; B, C, E yalnız config olduqda
  const A_world = { x: 0, y: 0 };
  const D_world = submittedParams
    ? { x: submittedParams.xd, y: submittedParams.yd }
    : { x: 0, y: 0 };

  const worldPoints = [A_world, D_world];
  if (config) {
    worldPoints.push(config.B, config.C, config.E);
  }
  // Trayektoriya nöqtələrini də bbox-a daxil et ki, polilin də içəridə qalsın
  if (tracePoints.length) {
    worldPoints.push(...tracePoints);
  }

  // Bounding box hesabla
  let minX = Math.min(...worldPoints.map((p) => p.x));
  let maxX = Math.max(...worldPoints.map((p) => p.x));
  let minY = Math.min(...worldPoints.map((p) => p.y));
  let maxY = Math.max(...worldPoints.map((p) => p.y));

  const worldW = Math.max(1e-6, maxX - minX);
  const worldH = Math.max(1e-6, maxY - minY);

  // Oxlar, etiketlər və dairə radiusları üçün əlavə bufer
  const marginWorld = Math.max(0.15 * Math.max(worldW, worldH), 0.5);
  minX -= marginWorld;
  maxX += marginWorld;
  minY -= marginWorld;
  maxY += marginWorld;

  const paddedWorldW = Math.max(1e-6, maxX - minX);
  const paddedWorldH = Math.max(1e-6, maxY - minY);

  // Mövcud sahəyə sığışdırmaq üçün miqyas
  const scaleX = (svgWidth - 2 * padding) / paddedWorldW;
  const scaleY = (svgHeight - 2 * padding) / paddedWorldH;
  const scale = Math.max(0.0001, Math.min(scaleX, scaleY));

  // Mərkəzləmə üçün ofsetlər (SVG koordinatlarına)
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const offsetX = svgWidth / 2 - cx * scale;
  const offsetY = svgHeight / 2 + cy * scale; // SVG-də y aşağı artır

  const toScreen = (p) => ({
    x: offsetX + p.x * scale,
    y: offsetY - p.y * scale,
  });

  const A = A_world;
  const D = D_world;
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
    const value = e.target.value;
    setter(value);
  };

  // ---- Form submit handler ----
  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }
    const params = {
      l1: parseFloat(l1) || 0,
      l2: parseFloat(l2) || 0,
      l3: parseFloat(l3) || 0,
      xd: parseFloat(xd) || 0,
      yd: parseFloat(yd) || 0,
      lBERatio: parseFloat(lBERatio) || 0,
      alfDeg: parseFloat(alfDeg) || 0,
    };
    setSubmittedParams(params);
    // İstifadəçi tərəfindən daxil edilən krank bucağını təyin et
    const crankAngle = parseFloat(initialFi1Deg) || 0;
    setFi1Deg(crankAngle);
    setTracePoints([]);
  };

  // ---- Handle Enter key on input fields ----
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
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
                <strong>{config ? fi1Deg.toFixed(1) : "--"}°</strong>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={fi1Deg}
                disabled={!config}
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
                disabled={!config}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTracePoints([])}
                disabled={!config}
              >
                Trayektoriyanı təmizlə
              </button>
            </div>
          </div>

          <div className="canvas-wrapper">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="mechanism-svg"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Yer xətti */}
              <line
                x1={padding}
                y1={Ap.y}
                x2={svgWidth - padding}
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
                  <text x={Bp.x - 10} y={Bp.y - 6} className="label">
                    B
                  </text>

                  <circle cx={Cp.x} cy={Cp.y} r={3} className="joint" />
                  <text x={Cp.x + 6} y={Cp.y + 16} className="label">
                    C
                  </text>

                  <circle cx={Ep.x} cy={Ep.y} r={3} className="joint joint-E" />
                  <text x={Ep.x + 6} y={Ep.y - 6} className="label">
                    E
                  </text>
                </>
              )}

              {/* E nöqtəsinin trayektoriyası */}
              {tracePointsSvg && (
                <polyline points={tracePointsSvg} className="trace" />
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
              <text x={(Ap.x + Dp.x) / 2 - 10} y={Ap.y + 56} className="label">
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
              <text x={Dp.x + 46} y={(Dp.y + Ap.y) / 2} className="label">
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
                <text x={Ap.x + 120} y={Ap.y - 120} className="error-text">
                  {!submittedParams
                    ? "Parametrləri daxil edin"
                    : "Bu parametrlər üçün mexanizm yığılmır"}
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
              <form onSubmit={handleSubmit} className="form-grid">
                <label className="field">
                  <span>l₁ = AB (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={l1}
                    onChange={handleParamChange(setL1)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>l₂ = BC (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={l2}
                    onChange={handleParamChange(setL2)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>l₃ = CD (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={l3}
                    onChange={handleParamChange(setL3)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>x (A → D) (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={xd}
                    onChange={handleParamChange(setXd)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>y (A → D) (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={yd}
                    onChange={handleParamChange(setYd)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>L_BE / L_BC</span>
                  <input
                    type="number"
                    step="0.05"
                    value={lBERatio}
                    onChange={handleParamChange(setLBERatio)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>∠(BC, BE) (°)</span>
                  <input
                    type="number"
                    step="1"
                    value={alfDeg}
                    onChange={handleParamChange(setAlfDeg)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <label className="field">
                  <span>Başlanğıc krank bucağı φ₁ (°)</span>
                  <input
                    type="number"
                    step="1"
                    value={initialFi1Deg}
                    onChange={handleParamChange(setInitialFi1Deg)}
                    onKeyDown={handleKeyDown}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ gridColumn: "1 / -1", marginTop: "10px" }}
                >
                  Mexanizmi göstər
                </button>
              </form>
            </div>

            <div>
              <h3 className="section-title">Hesablanmış nəticələr</h3>

              {config ? (
                <>
                  <div className="result-block">
                    <strong>Bucaqlar (dərəcə):</strong>
                    <ul>
                      <li>φ₁ (AB) = {fi1Deg.toFixed(2)}°</li>
                      <li>φ₂ (BC) = {((f21 * 180) / Math.PI).toFixed(2)}°</li>
                      <li>φ₃ (CD) = {((f31 * 180) / Math.PI).toFixed(2)}°</li>
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
                  {submittedParams
                    ? "Parametrləri elə seç ki, mexanizm yığıla bilsin (diskriminant ≥ 0 və l₂, l₃ ≠ 0)."
                    : "Mexanizmi göstərmək üçün parametrləri daxil edin və formu göndərin."}
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
