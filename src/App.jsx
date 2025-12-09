import React, { useState, useEffect, useMemo } from "react";

function App() {
  // --- Variant 10 parametrləri (cədvəldən) ---
  const l1 = 0.22; // l_AB
  const l2 = 1.52; // l_BC
  const l3 = 0.5;  // l_CD
  const xd = 1.5;  // x
  const yd = 0.2;  // y
  const lBE = 0.5 * l2; // L_BE = 0.5 L_BC
  const alf = (30 * Math.PI) / 180; // 30° radianla

  const [fi1Deg, setFi1Deg] = useState(30); // krank bucağı (dərəcə)
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracePoints, setTracePoints] = useState([]); // E nöqtəsinin trayektoriyası

  // --- fi1 üçün kinematik hesab (C# kodundan port) ---
  function computeConfiguration(fi1) {
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
  const config = useMemo(() => computeConfiguration(fi1), [fi1]);

  // --- Trayektoriyanın yığılması (E nöqtəsi) ---
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

  // --- Sadə animasiya (φ1 avtomatik dövsün) ---
  useEffect(() => {
    if (!isPlaying) return;
    let frameId;

    const step = () => {
      setFi1Deg((prev) => {
        const next = prev + 2; // hər kadrda 2°
        return next >= 360 ? next - 360 : next;
      });
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // --- Ekran koordinatları üçün çevirmə ---
  const scale = 250;
  const offsetX = 50;
  const offsetY = 320;

  const toScreen = (p) => ({
    x: offsetX + p.x * scale,
    y: offsetY - p.y * scale,
  });

  if (!config) {
    return (
      <div style={{ fontFamily: "sans-serif" }}>
        <p>Bu φ₁ üçün mexanizm yığılmır (diskriminant &lt; 0).</p>
        <input
          type="range"
          min="0"
          max="360"
          value={fi1Deg}
          onChange={(e) => {
            setFi1Deg(+e.target.value);
            setTracePoints([]); // trayektoriyanı sıfırla
          }}
        />
      </div>
    );
  }

  const { A, B, C, D, E, f21, f31 } = config;

  const Ap = toScreen(A);
  const Bp = toScreen(B);
  const Cp = toScreen(C);
  const Dp = toScreen(D);
  const Ep = toScreen(E);

  // trayektoriya üçün SVG nöqtələri
  const tracePointsSvg = tracePoints
    .map((p) => {
      const s = toScreen(p);
      return `${s.x},${s.y}`;
    })
    .join(" ");

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "sans-serif",
        display: "flex",
        gap: 24,
      }}
    >
      {/* Sol tərəf – mexanizm şəkli */}
      <div style={{ flex: 2 }}>
        <h2>Tapşırıq 10 – Dördbəndli oynaq mexanizmi (Variant 10)</h2>

        <div style={{ marginBottom: 12 }}>
          <label>
            Krank bucağı φ₁ = {fi1Deg.toFixed(1)}°
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={fi1Deg}
              onChange={(e) => {
                setFi1Deg(+e.target.value);
                setTracePoints([]); // manuel dəyişəndə trayektoriyanı sıfırla
              }}
              style={{ width: "100%", display: "block", marginTop: 8 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            style={{ padding: "6px 12px" }}
          >
            {isPlaying ? "Pause" : "Play"} (avto fırlanma)
          </button>
          <button
            onClick={() => setTracePoints([])}
            style={{ padding: "6px 12px" }}
          >
            Trayektoriyanı təmizlə
          </button>
        </div>

        <svg
          width={700}
          height={380}
          style={{ border: "1px solid #ccc", background: "#fdfdfd" }}
        >
          {/* Yer xətti */}
          <line
            x1={Ap.x - 20}
            y1={Ap.y}
            x2={Ap.x + 600}
            y2={Ap.y}
            stroke="#999"
            strokeDasharray="4 4"
          />

          {/* Dayaq nöqtələri */}
          <circle cx={Ap.x} cy={Ap.y} r={4} fill="#000" />
          <text x={Ap.x - 10} y={Ap.y + 15} fontSize="12">
            A
          </text>

          <circle cx={Dp.x} cy={Dp.y} r={4} fill="#000" />
          <text x={Dp.x + 5} y={Dp.y - 5} fontSize="12">
            D
          </text>

          {/* Çubuqlar */}
          <line
            x1={Ap.x}
            y1={Ap.y}
            x2={Bp.x}
            y2={Bp.y}
            stroke="#000"
            strokeWidth={4}
          />
          <line
            x1={Bp.x}
            y1={Bp.y}
            x2={Cp.x}
            y2={Cp.y}
            stroke="#000"
            strokeWidth={4}
          />
          <line
            x1={Cp.x}
            y1={Cp.y}
            x2={Dp.x}
            y2={Dp.y}
            stroke="#000"
            strokeWidth={4}
          />
          <line
            x1={Bp.x}
            y1={Bp.y}
            x2={Ep.x}
            y2={Ep.y}
            stroke="#000"
            strokeWidth={3}
          />

          {/* Nöqtələr */}
          <circle cx={Bp.x} cy={Bp.y} r={3} fill="#000" />
          <text x={Bp.x - 10} y={Bp.y - 5} fontSize="12">
            B
          </text>

          <circle cx={Cp.x} cy={Cp.y} r={3} fill="#000" />
          <text x={Cp.x + 5} y={Cp.y + 15} fontSize="12">
            C
          </text>

          <circle cx={Ep.x} cy={Ep.y} r={3} fill="#000" />
          <text x={Ep.x + 5} y={Ep.y - 5} fontSize="12">
            E
          </text>

          {/* E nöqtəsinin trayektoriyası */}
          {tracePointsSvg && (
            <polyline
              points={tracePointsSvg}
              fill="none"
              stroke="#d33"
              strokeWidth={1.5}
            />
          )}

          {/* x ölçüsü */}
          <line
            x1={Ap.x}
            y1={Ap.y + 40}
            x2={Dp.x}
            y2={Ap.y + 40}
            stroke="#000"
            markerStart="url(#arrowStart)"
            markerEnd="url(#arrowEnd)"
          />
          <text
            x={(Ap.x + Dp.x) / 2 - 10}
            y={Ap.y + 55}
            fontSize="12"
          >
            x
          </text>

          {/* y ölçüsü */}
          <line
            x1={Dp.x + 40}
            y1={Dp.y}
            x2={Dp.x + 40}
            y2={Ap.y}
            stroke="#000"
            markerStart="url(#arrowStart)"
            markerEnd="url(#arrowEnd)"
          />
          <text
            x={Dp.x + 45}
            y={(Dp.y + Ap.y) / 2}
            fontSize="12"
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
        </svg>
      </div>

      {/* Sağ panel – outputlar */}
      <div
        style={{
          flex: 1,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          background: "#fafafa",
          fontSize: 14,
        }}
      >
        <h3>Hesablanmış parametrlər</h3>
        <div style={{ marginBottom: 8 }}>
          <strong>Bucaqlar (dərəcə):</strong>
          <ul>
            <li>φ₁ (AB) = {fi1Deg.toFixed(2)}°</li>
            <li>φ₂ (BC) = {(f21 * 180 / Math.PI).toFixed(2)}°</li>
            <li>φ₃ (CD) = {(f31 * 180 / Math.PI).toFixed(2)}°</li>
          </ul>
        </div>

        <div style={{ marginBottom: 8 }}>
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

        <div>
          <strong>Trayektoriya haqqında:</strong>
          <p>
            E nöqtəsinin yadda saxlanmış nöqtə sayı:{" "}
            {tracePoints.length}
          </p>
          <p style={{ fontSize: 12, color: "#555" }}>
            Play düyməsinə basanda krank fırlanır, E nöqtəsinin
            hərəkət yolu qırmızı xətt kimi çızılır. İstəsən "Trayektoriyanı
            təmizlə" ilə sıfırlaya bilərsən.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
