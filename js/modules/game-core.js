(() => {
  const CONFIG = {
    cols: 4,
    maxRows: 8,
    spawnPool: [2, 2, 4, 8],
    startCoins: 150,
    startStars: 0,
    startScore: 0,
    powerCost: { trash: 100, shuffle: 150 },
    comboToastEnabled: true,
    storageKey: "merge_machine_books_save_v6",
    magneticRadius: 64,
    dragThreshold: 10,
    resolveLoopLimit: 24,
    destroyChargeMs: 90000,
    destroyChargeMax: 10,
    debug: true,
  };

  const VALUE_CLASS = {
    2: "v2",
    4: "v4",
    8: "v8",
    16: "v16",
    32: "v32",
    64: "v64",
    128: "v128",
    256: "v256",
    512: "v512",
  };

  const LEVEL_VALUES = Array.from({ length: 20 }, (_, i) => 2 ** (i + 1));
  const BOOKS_MODAL_UNLOCK_GENERATION = 20;
  const TUTORIAL_SEEN_KEY = "merge_machine_books_tutorial_seen_v1";
  const LEVEL_DETAILS_PATH = "assets/levels/level-details.json";

  const tileVisual = (value) => {
    const knownClass = VALUE_CLASS[value] || "high-value";
    return {
      className: knownClass,
      style: `background-image: url("assets/levels/capa-${value}.png"); background-size: cover; background-position: center; background-repeat: no-repeat;`,
    };
  };

  const setVideoSlowMode = (videoEl, playbackRate = 0.72) => {
    if (!videoEl) return;
    const applyRate = () => {
      videoEl.playbackRate = playbackRate;
      videoEl.defaultPlaybackRate = playbackRate;
    };
    applyRate();
    videoEl.addEventListener("loadeddata", applyRate);
  };


  const formatPt = (v) => {
    const value = Math.max(0, Number(v) || 0);
    if (value < 1000) return new Intl.NumberFormat("pt-BR").format(Math.floor(value));
    const suffixes = [
      { limit: 1e12, suffix: "T" },
      { limit: 1e9, suffix: "B" },
      { limit: 1e6, suffix: "M" },
      { limit: 1e3, suffix: "K" },
    ];
    const entry = suffixes.find((item) => value >= item.limit) || suffixes[suffixes.length - 1];
    const compact = Math.floor((value / entry.limit) * 10) / 10;
    const compactText = Number.isInteger(compact)
      ? `${compact.toFixed(0)}`
      : `${compact.toFixed(1)}`;
    return `${compactText}${entry.suffix}`;
  };
  const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const LEVEL_TEXT_CACHE = new Map();
  let levelDetailsDataPromise = null;
  const ICONS_BY_VALUE = ["➤", "◆", "◉", "✧", "◈", "▲", "⌖", "◐", "⬢"];
  const generationFromValue = (value) => Math.max(0, Math.log2(Math.max(1, value)));
  const iconForValue = (value) => ICONS_BY_VALUE[Math.max(0, generationFromValue(value) - 1) % ICONS_BY_VALUE.length];
  const fallbackLevelDetails = (value) => ({
    title: "Evolved Archive Book",
    icon: iconForValue(value),
    description: "An evolved archive card refined for advanced runs.",
    effect: "Adaptive progression bonus",
    effectIcon: iconForValue(value * 2),
  });

  const loadLevelDetailsData = async () => {
    if (!levelDetailsDataPromise) {
      levelDetailsDataPromise = fetch(LEVEL_DETAILS_PATH, { cache: "no-cache" })
        .then((response) => (response.ok ? response.json() : {}))
        .catch(() => ({}));
    }
    return levelDetailsDataPromise;
  };

  const loadLevelDetails = async (value) => {
    if (LEVEL_TEXT_CACHE.has(value)) return LEVEL_TEXT_CACHE.get(value);
    const data = await loadLevelDetailsData();
    const fromFile = data[String(value)];
    const fallback = fallbackLevelDetails(value);
    const details = {
      ...fallback,
      ...fromFile,
      icon: iconForValue(value),
      effectIcon: iconForValue(value * 2),
    };
    LEVEL_TEXT_CACHE.set(value, details);
    return details;
  };
  window.MergeMachineCore = Object.freeze({
    CONFIG,
    VALUE_CLASS,
    LEVEL_VALUES,
    BOOKS_MODAL_UNLOCK_GENERATION,
    TUTORIAL_SEEN_KEY,
    tileVisual,
    setVideoSlowMode,
    formatPt,
    randomFrom,
    wait,
    uid,
    loadLevelDetails,
    generationFromValue,
  });
})();
