// ---------- Utilities ----------
function clamp(min, max, x) {
  return Math.max(min, Math.min(max, x));
}

function fmt(n, digits = 1) {
  return Number(n).toFixed(digits);
}

// ---------- Model (SVB-inspired scoring) ----------
// Inputs are normalized into comparable ranges, then weighted.
// This is intentionally transparent so you can justify it in your methodology page.
function computeStressScore(inputs) {
  const {
    rateShockPct,          // 0..6
    uninsuredPct,          // 0..100
    durationYears,         // 0..10
    unrealizedLossPctCap,  // 0..120
    withdrawalSpeed,       // 0..100
    concentration          // 0..100
  } = inputs;

  // Normalize to 0..1-ish scales
  const r = clamp(0, 1, rateShockPct / 6);
  const u = clamp(0, 1, uninsuredPct / 100);
  const d = clamp(0, 1, durationYears / 10);
  const l = clamp(0, 1, unrealizedLossPctCap / 120);
  const w = clamp(0, 1, withdrawalSpeed / 100);
  const c = clamp(0, 1, concentration / 100);

  // Weights reflect SVB-style dynamics:
  // - uninsured deposits + withdrawal speed + duration/rate sensitivity are key accelerants
  const weights = {
    rateShock: 18,
    uninsured: 22,
    duration: 15,
    losses: 18,
    withdrawal: 17,
    concentration: 10
  };

  const raw =
    weights.rateShock * r +
    weights.uninsured * u +
    weights.duration * d +
    weights.losses * l +
    weights.withdrawal * w +
    weights.concentration * c;

  // raw max = sum(weights) = 100 by design
  return clamp(0, 100, raw);
}

// Very simplified bond price sensitivity approximation.
// Example: duration 6 years, +2% rates => ~ -12% price.
function estimateDurationLossPct(durationYears, rateShockPct) {
  return clamp(0, 100, durationYears * rateShockPct);
}

function classifyStatus(score) {
  if (score < 40) return { label: "Stable", colorVar: "--good" };
  if (score < 70) return { label: "At Risk", colorVar: "--warn" };
  return { label: "Critical", colorVar: "--bad" };
}

function interpretationText(score) {
  if (score < 40) {
    return "Balance-sheet and run dynamics appear resilient in this simplified scenario. Stress factors do not compound fast enough to trigger a run.";
  }
  if (score < 70) {
    return "Multiple risk factors are present. A confidence shock or faster withdrawals could push the bank into a self-reinforcing liquidity spiral.";
  }
  return "Conditions resemble high fragility: rate sensitivity + deposit flight dynamics can accelerate rapidly. Liquidity pressure would likely dominate decision-making.";
}

// ---------- DOM wiring ----------
const el = (id) => document.getElementById(id);

const sliders = {
  rateShock: el("rateShock"),
  uninsured: el("uninsured"),
  duration: el("duration"),
  losses: el("losses"),
  withdrawal: el("withdrawal"),
  concentration: el("concentration")
};

const readInputs = () => ({
  rateShockPct: Number(sliders.rateShock.value),
  uninsuredPct: Number(sliders.uninsured.value),
  durationYears: Number(sliders.duration.value),
  unrealizedLossPctCap: Number(sliders.losses.value),
  withdrawalSpeed: Number(sliders.withdrawal.value),
  concentration: Number(sliders.concentration.value)
});

function syncValueLabels(inputs) {
  el("rateShockVal").textContent = fmt(inputs.rateShockPct, 2) + "%";
  el("uninsuredVal").textContent = fmt(inputs.uninsuredPct, 0) + "%";
  el("durationVal").textContent = fmt(inputs.durationYears, 1);
  el("lossesVal").textContent = fmt(inputs.unrealizedLossPctCap, 0) + "%";
  el("withdrawalVal").textContent = fmt(inputs.withdrawalSpeed, 0);
  el("concentrationVal").textContent = fmt(inputs.concentration, 0);
}

// ---------- Charts ----------
let stressChart, driversChart;

function initCharts() {
  const stressCtx = el("stressChart");
  const driversCtx = el("driversChart");

  stressChart = new Chart(stressCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Stress Score",
        data: [],
        tension: 0.25,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100 }
      }
    }
  });

  driversChart = new Chart(driversCtx, {
    type: "bar",
    data: {
      labels: ["Rate shock", "Uninsured", "Duration", "Losses", "Withdrawal", "Concentration"],
      datasets: [{
        label: "Driver intensity (0–1 normalized)",
        data: [0, 0, 0, 0, 0, 0]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 1 }
      }
    }
  });

  // Make charts taller
  stressCtx.parentElement.style.height = "220px";
  driversCtx.parentElement.style.height = "220px";
}

function updateCharts(inputs, score) {
  // Update stress time-series (last 30 points)
  const nowLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  stressChart.data.labels.push(nowLabel);
  stressChart.data.datasets[0].data.push(score);

  if (stressChart.data.labels.length > 30) {
    stressChart.data.labels.shift();
    stressChart.data.datasets[0].data.shift();
  }
  stressChart.update();

  // Update normalized drivers
  const driverVals = [
    clamp(0, 1, inputs.rateShockPct / 6),
    clamp(0, 1, inputs.uninsuredPct / 100),
    clamp(0, 1, inputs.durationYears / 10),
    clamp(0, 1, inputs.unrealizedLossPctCap / 120),
    clamp(0, 1, inputs.withdrawalSpeed / 100),
    clamp(0, 1, inputs.concentration / 100)
  ];
  driversChart.data.datasets[0].data = driverVals;
  driversChart.update();
}

// ---------- Presets ----------
function setPreset(p) {
  sliders.rateShock.value = p.rateShockPct;
  sliders.uninsured.value = p.uninsuredPct;
  sliders.duration.value = p.durationYears;
  sliders.losses.value = p.unrealizedLossPctCap;
  sliders.withdrawal.value = p.withdrawalSpeed;
  sliders.concentration.value = p.concentration;
  render(); // refresh UI
}

const presets = {
  svb: {
    rateShockPct: 2.5,
    uninsuredPct: 80,
    durationYears: 6.5,
    unrealizedLossPctCap: 65,
    withdrawalSpeed: 85,
    concentration: 85
  },
  stable: {
    rateShockPct: 1.0,
    uninsuredPct: 25,
    durationYears: 3.0,
    unrealizedLossPctCap: 15,
    withdrawalSpeed: 25,
    concentration: 30
  },
  rateShock: {
    rateShockPct: 4.5,
    uninsuredPct: 45,
    durationYears: 7.5,
    unrealizedLossPctCap: 55,
    withdrawalSpeed: 40,
    concentration: 45
  },
  run: {
    rateShockPct: 2.0,
    uninsuredPct: 70,
    durationYears: 5.5,
    unrealizedLossPctCap: 35,
    withdrawalSpeed: 95,
    concentration: 90
  }
};

// ---------- Render loop ----------
function render() {
  const inputs = readInputs();
  syncValueLabels(inputs);

  const score = computeStressScore(inputs);
  el("stressScore").textContent = fmt(score, 1);

  const status = classifyStatus(score);
  const pill = el("statusPill");
  pill.textContent = status.label;
  pill.style.background = `color-mix(in srgb, var(${status.colorVar}) 22%, transparent)`;
  pill.style.borderColor = `color-mix(in srgb, var(${status.colorVar}) 55%, var(--border))`;

  const durLoss = estimateDurationLossPct(inputs.durationYears, inputs.rateShockPct);
  el("durationLoss").textContent = `~${fmt(durLoss, 1)}% price impact`;
  el("interpretation").textContent = interpretationText(score);

  updateCharts(inputs, score);
}

// ---------- Initialization ----------
function attachListeners() {
  Object.values(sliders).forEach((s) => s.addEventListener("input", render));

  el("presetSVB").addEventListener("click", () => setPreset(presets.svb));
  el("presetStable").addEventListener("click", () => setPreset(presets.stable));
  el("presetRateShock").addEventListener("click", () => setPreset(presets.rateShock));
  el("presetRun").addEventListener("click", () => setPreset(presets.run));
}

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  attachListeners();
  render(); // initial render
});
