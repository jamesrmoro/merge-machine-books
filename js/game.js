(() => {
  const core = window.MergeMachineCore || {};
  const {
    CONFIG,
    LEVEL_VALUES,
    BOOKS_MODAL_UNLOCK_GENERATION,
    TUTORIAL_SEEN_KEY,
    tileVisual,
    formatPt,
    randomFrom,
    wait,
    uid,
    loadLevelDetails,
    generationFromValue,
    setVideoSlowMode,
  } = core;

  if (!CONFIG || !LEVEL_VALUES || !tileVisual || !loadLevelDetails) {
    console.error("Missing core game module.");
    return;
  }

  const gsapApi = window.gsap || null;

  const dom = {
    board: document.getElementById("board"),
    boardFrame: document.querySelector(".board-frame"),
    screenBgVideo: document.querySelector(".screen-bg-video"),
    coins: document.getElementById("coins"),
    stars: document.getElementById("energy"),
    score: document.getElementById("score"),
    record: document.getElementById("record"),
    trashBtn: document.getElementById("shopBtn"),
    shuffleBtn: document.getElementById("collectionBtn"),
    recordModalBtn: document.getElementById("recordModalBtn"),
    destroyChargeBtn: document.getElementById("destroyChargeBtn"),
    destroyChargeInfoBtn: document.getElementById("destroyChargeInfoBtn"),
    destroyChargeRingProgress: document.getElementById("destroyChargeRingProgress"),
    destroyChargePoints: document.getElementById("destroyChargePoints"),
    destroyChargeLabel: document.getElementById("destroyChargeLabel"),
    recordModal: document.getElementById("recordModal"),
    closeRecordModal: document.getElementById("closeRecordModal"),
    booksModalBtn: document.getElementById("booksModalBtn"),
    booksModal: document.getElementById("booksModal"),
    closeBooksModal: document.getElementById("closeBooksModal"),
    booksLockIndicator: document.getElementById("booksLockIndicator"),
    booksLockMessage: document.getElementById("booksLockMessage"),
    loaderScreen: document.getElementById("loaderScreen"),
    playBtn: document.getElementById("playBtn"),
    tutorialModal: document.getElementById("tutorialModal"),
    tutorialConfirmBtn: document.getElementById("tutorialConfirmBtn"),
    openTutorialModalBtn: document.getElementById("openTutorialModalBtn"),
    aboutGameLink: document.getElementById("aboutGameLink"),
    aboutGameModal: document.getElementById("aboutGameModal"),
    closeAboutGameModal: document.getElementById("closeAboutGameModal"),
    gameOverModal: document.getElementById("gameOverModal"),
    gameOverHomeBtn: document.getElementById("gameOverHomeBtn"),
    gameOverRetryBtn: document.getElementById("gameOverRetryBtn"),
    menuBtn: document.getElementById("menuBtn"),
    soundSettingsBtn: document.getElementById("soundSettingsBtn"),
    soundSettingsPanel: document.getElementById("soundSettingsPanel"),
    soundMusicToggle: document.getElementById("soundMusicToggle"),
    soundEffectsToggle: document.getElementById("soundEffectsToggle"),
    menuModal: document.getElementById("menuModal"),
    reloadHomeBtn: document.getElementById("reloadHomeBtn"),
    resetGameBtn: document.getElementById("resetGameBtn"),
    resetGameConfirmModal: document.getElementById("resetGameConfirmModal"),
    closeResetGameConfirmModal: document.getElementById("closeResetGameConfirmModal"),
    cancelResetGameBtn: document.getElementById("cancelResetGameBtn"),
    confirmResetGameBtn: document.getElementById("confirmResetGameBtn"),
    closeMenuModal: document.getElementById("closeMenuModal"),
    openPrivacyModal: document.getElementById("openPrivacyModal"),
    privacyModal: document.getElementById("privacyModal"),
    closePrivacyModal: document.getElementById("closePrivacyModal"),
    archiveWarningModal: document.getElementById("archiveWarningModal"),
    closeArchiveWarningModal: document.getElementById("closeArchiveWarningModal"),
    archiveWarningHalfCost: document.getElementById("archiveWarningHalfCost"),
    archiveWarningSavedCard: document.getElementById("archiveWarningSavedCard"),
    archiveWarningSavedCardValue: document.getElementById("archiveWarningSavedCardValue"),
    acceptArchiveProposalBtn: document.getElementById("acceptArchiveProposalBtn"),
    destroyHighestCardBtn: document.getElementById("destroyHighestCardBtn"),
    destroyChargeInfoModal: document.getElementById("destroyChargeInfoModal"),
    closeDestroyChargeInfoModal: document.getElementById("closeDestroyChargeInfoModal"),
    generationModal: document.getElementById("generationModal"),
    closeGenerationModal: document.getElementById("closeGenerationModal"),
    generationFlipCard: document.getElementById("generationFlipCard"),
    generationFlipFront: document.getElementById("generationFlipFront"),
    generationFlipTitle: document.getElementById("generationFlipTitle"),
    generationFlipDescription: document.getElementById("generationFlipDescription"),
    generationFlipEffect: document.getElementById("generationFlipEffect"),
    generationTouchHint: document.getElementById("generationTouchHint"),
    gameShell: document.getElementById("gameShell"),
    levelTracker: document.getElementById("levelTracker"),
  };

  if (!dom.board || !dom.boardFrame) return;
  setVideoSlowMode(dom.screenBgVideo, 0.72);

  const STICKER_VARIANTS = ["sticker-left", "sticker-right", "sticker-top", "sticker-angled", "sticker-none"];
  const randomVariant = () => randomFrom(STICKER_VARIANTS);
  const topGeneration = (columns) => {
    const maxValue = columns.flat().reduce((acc, tile) => Math.max(acc, tile?.value || 0), 0);
    return generationFromValue(maxValue);
  };

  const ICONS = {
    archive: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="4" rx="1.2" fill="currentColor" opacity=".92"></rect><rect x="5" y="9" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.6"></rect><path d="M10 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>`,
    rearrange: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 6h11m0 0-2-2m2 2-2 2M17 18H6m0 0 2-2m-2 2 2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  };

  const managersFactory = window.MergeMachineManagers?.createManagers;
  if (!managersFactory) {
    console.error("Missing game managers module.");
    return;
  }
  const { SoundManager, AnimationManager } = managersFactory({ randomFrom, wait, gsapApi });

  class Board {
    constructor(boardEl, boardFrameEl, cols) {
      this.boardEl = boardEl;
      this.boardFrameEl = boardFrameEl;
      this.cols = cols;
      this.tileCache = new Map();
      this.columnsEl = [];
      this.boardEl.style.setProperty("--cols", String(cols));
      this.buildColumns();
      this.measure();
      window.addEventListener("resize", () => this.measure());
    }

    buildColumns() {
      this.boardEl.innerHTML = "";
      for (let i = 0; i < this.cols; i += 1) {
        const col = document.createElement("div");
        col.className = "column";
        col.dataset.col = String(i);
        this.boardEl.append(col);
      }
      this.columnsEl = Array.from(this.boardEl.querySelectorAll(".column"));
    }

    measure() {
      const col = this.columnsEl[0];
      if (!col) return;
      const colRect = col.getBoundingClientRect();
      let gap = parseFloat(getComputedStyle(this.boardEl).gap);
      if (isNaN(gap)) gap = 8;
      this.metrics = { colWidth: colRect.width, gap };
    }

    rowY(row) {
      let tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tile-size"));
      if (isNaN(tileSize)) tileSize = 66;
      let gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tile-gap"));
      if (isNaN(gap)) gap = 8;
      return row * (tileSize + gap);
    }

    get tileHeight() {
      let tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tile-size"));
      if (isNaN(tileSize)) tileSize = 66;
      return tileSize;
    }

    colRect(colIndex) {
      const col = this.columnsEl[colIndex];
      if (!col) return null;
      return col.getBoundingClientRect();
    }

    topRewardPoint(colIndex) {
      const colRect = this.columnsEl[colIndex].getBoundingClientRect();
      const frameRect = this.boardFrameEl.getBoundingClientRect();
      return {
        x: colRect.left - frameRect.left + colRect.width / 2,
        y: colRect.top - frameRect.top + 24,
      };
    }

    render(columns, options = {}) {
      const { animate = false } = options;
      this.measure();
      const seen = new Set();

      columns.forEach((col, colIndex) => {
        const colEl = this.columnsEl[colIndex];
        col.forEach((tile, row) => {
          seen.add(tile.id);
          let tileEl = this.tileCache.get(tile.id);
          const isNew = !tileEl;
          if (isNew) {
            tileEl = document.createElement("div");
            tileEl.dataset.id = tile.id;
            tileEl.className = "tile spawn";
            this.tileCache.set(tile.id, tileEl);
            colEl.append(tileEl);
            setTimeout(() => tileEl.classList.remove("spawn"), 180);
          }

          if (tileEl.parentElement !== colEl) colEl.append(tileEl);

          if (!STICKER_VARIANTS.includes(tile.variant)) tile.variant = randomVariant();
          const visual = tileVisual(tile.value);
          tileEl.className = `tile ${visual.className} ${tile.variant}`;
          tileEl.style.cssText = "";
          if (visual.style) tileEl.style.cssText = visual.style;
          tileEl.dataset.col = String(colIndex);
          tileEl.dataset.row = String(row);
          tileEl.style.width = `${this.metrics.colWidth - 2}px`;
          tileEl.style.left = "1px";

          const targetTop = this.rowY(row);
          if (animate && !isNew) {
            if (gsapApi) {
              gsapApi.to(tileEl, { top: targetTop, duration: 0.12, ease: "power2.out", overwrite: true });
            } else {
              tileEl.style.transition = "top 120ms ease-out";
              tileEl.style.top = `${targetTop}px`;
            }
          } else {
            tileEl.style.top = `${targetTop}px`;
          }
          tileEl.style.opacity = "";
        });
      });

      Array.from(this.tileCache.keys()).forEach((id) => {
        if (seen.has(id)) return;
        this.tileCache.get(id)?.remove();
        this.tileCache.delete(id);
      });
    }

    clearColumnTargets() {
      this.columnsEl.forEach((col) => col.classList.remove("is-targeted", "is-invalid-target"));
    }

    markColumnTarget(colIndex, valid) {
      this.clearColumnTargets();
      if (colIndex === null || colIndex === undefined) return;
      const col = this.columnsEl[colIndex];
      if (!col) return;
      col.classList.add(valid ? "is-targeted" : "is-invalid-target");
    }

    tileEl(id) {
      return this.tileCache.get(id) || null;
    }
  }

  class HUD {
    constructor(elements, anim, audio) {
      this.el = elements;
      this.anim = anim;
      this.audio = audio;
      this.displayed = { coins: 0, stars: 0, score: 0, record: 0, destroyPoints: 0 };
      this.generationCards = [];
      this.hideTooltipTimer = null;
      this.generationTrackerReady = false;
      this.lastKnownGeneration = 0;
      this.scoreMilestoneTriggered = false;
      this.scoreNearMillion = false;
      this.scoreTooltipTimer = null;
      this.scorePillEl = this.el.score?.closest(".pill") || null;
      this.el.trashBtn.innerHTML = `${ICONS.archive}<span>ARCHIVE</span><span class="cost"><img src="assets/images/bookmark.webp" alt="" aria-hidden="true"> ${CONFIG.powerCost.trash}</span>`;
      this.el.shuffleBtn.innerHTML = `${ICONS.rearrange}<span>REARRANGE</span><span class="cost"><img src="assets/images/bookmark.webp" alt="" aria-hidden="true"> ${CONFIG.powerCost.shuffle}</span>`;
      this.buildGenerationTracker();
      this.bindScoreExactTooltip();
      this.bindGenerationTrackerInteraction();
      this.bindGenerationModalEvents();
      window.addEventListener("resize", () => this.syncTrackerOverlayHeight());
    }

    update(state, animate = true) {
      this.latestScore = state.score;
      this.updateNumber("coins", this.el.coins, state.coins, animate);
      this.updateNumber("stars", this.el.stars, state.stars, animate);
      this.updateNumber("score", this.el.score, state.score, animate);
      this.updateNumber("record", this.el.record, state.record, false);
      this.updateDestroyCharge(state);

      this.el.trashBtn.classList.toggle("can-use", state.coins >= state.costs.trash && !state.inputLocked);
      this.el.shuffleBtn.classList.toggle("can-use", state.coins >= state.costs.shuffle && !state.inputLocked);
      this.el.trashBtn.disabled = state.inputLocked;
      this.el.shuffleBtn.disabled = state.inputLocked;
      this.updateGenerationTracker(state.stars);
    }

    updateDestroyCharge(state) {
      if (this.el.destroyChargePoints) {
        this.updateNumber("destroyPoints", this.el.destroyChargePoints, state.destroyPoints, false);
        const progress = Math.max(0, Math.min(1, state.destroyChargeProgress || 0));
        this.el.destroyChargePoints.style.setProperty("--destroy-badge-progress", `${progress}`);
      }
      if (this.el.destroyChargeRingProgress) {
        const circumference = 184;
        const progress = Math.max(0, Math.min(1, state.destroyChargeProgress || 0));
        const dashOffset = circumference * (1 - progress);
        this.el.destroyChargeRingProgress.style.strokeDashoffset = `${dashOffset}`;
      }
      if (this.el.destroyChargeBtn) {
        this.el.destroyChargeBtn.classList.toggle("is-ready", state.destroyPoints > 0);
        this.el.destroyChargeBtn.classList.toggle("is-armed", Boolean(state.destroyModeArmed));
      }
      if (this.el.destroyChargeLabel) {
        this.el.destroyChargeLabel.textContent = state.destroyModeArmed ? "TARGET" : "POWER COVER";
      }
    }

    updateNumber(key, el, next, animate) {
      const prev = this.displayed[key];
      const formatValue = (value) => {
        if (key === "record") {
          return new Intl.NumberFormat("pt-BR").format(Math.max(0, Math.floor(Number(value) || 0)));
        }
        return formatPt(value);
      };
      if (key === "score") {
        this.updateScoreMilestoneState(prev, next, el);
      }
      if (!animate || !gsapApi || prev === next) {
        this.displayed[key] = next;
        el.textContent = formatValue(next);
        return;
      }
      const holder = { v: prev };
      const delta = Math.abs(next - prev);
      const duration = key === "score"
        ? Math.min(0.62, Math.max(0.26, 0.24 + delta / 900000))
        : 0.25;
      gsapApi.to(holder, {
        v: next,
        duration,
        ease: "power1.out",
        onUpdate: () => {
          el.textContent = formatValue(holder.v);
        },
        onComplete: () => {
          this.displayed[key] = next;
        },
      });
      this.anim.pulse(el, 1.1);
    }

    updateScoreMilestoneState(prev, next, scoreEl) {
      const scorePill = scoreEl?.closest(".pill");
      if (!scorePill) return;
      scorePill.classList.toggle("can-show-exact-score", next >= 1000000);
      const nearingMillion = next >= 950000 && next < 1000000;
      if (nearingMillion !== this.scoreNearMillion) {
        this.scoreNearMillion = nearingMillion;
        scorePill.classList.toggle("score-near-million", nearingMillion);
      }
      if (prev < 1000000 && next >= 1000000 && !this.scoreMilestoneTriggered) {
        this.scoreMilestoneTriggered = true;
        this.playMillionMilestone(scoreEl, scorePill);
      } else if (next < 1000000) {
        this.scoreMilestoneTriggered = false;
      }
    }

    playMillionMilestone(scoreEl, scorePill) {
      scorePill.classList.remove("score-million-hit");
      void scorePill.offsetWidth;
      scorePill.classList.add("score-million-hit");
      setTimeout(() => scorePill.classList.remove("score-million-hit"), 1300);

      if (gsapApi) {
        gsapApi.timeline()
          .to(scoreEl, { scale: 1.18, duration: 0.12, ease: "back.out(2.6)" })
          .to(scoreEl, { scale: 1.06, duration: 0.15, ease: "power2.out" })
          .to(scoreEl, { scale: 1, duration: 0.24, ease: "power2.out" });
      } else {
        this.anim.pulse(scoreEl, 1.16);
      }

      this.spawnMillionBurst(scoreEl);
      if (dom.boardFrame) {
        const rect = scoreEl.getBoundingClientRect();
        const boardRect = dom.boardFrame.getBoundingClientRect();
        const preferredX = dom.boardFrame.clientWidth * 0.34;
        const scoreAnchorX = rect.left - boardRect.left + rect.width * 0.5 - 42;
        this.anim.rewardFloat(
          dom.boardFrame,
          "+1M",
          {
            x: Math.max(24, Math.min(dom.boardFrame.clientWidth - 52, Math.min(preferredX, scoreAnchorX))),
            y: Math.max(20, rect.bottom - boardRect.top + 6),
          },
          { small: true },
        );
      }
    }

    spawnMillionBurst(scoreEl) {
      const rect = scoreEl.getBoundingClientRect();
      const x = rect.left + rect.width * 0.5;
      const y = rect.top + rect.height * 0.5;
      const particleCount = 14;
      for (let i = 0; i < particleCount; i += 1) {
        const particle = document.createElement("span");
        particle.className = "score-million-particle";
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty("--dx", `${(Math.random() - 0.5) * 92}px`);
        particle.style.setProperty("--dy", `${-30 - Math.random() * 58}px`);
        particle.style.setProperty("--size", `${3 + Math.random() * 4}px`);
        document.body.append(particle);
        setTimeout(() => particle.remove(), 900);
      }
    }

    bindScoreExactTooltip() {
      if (!this.scorePillEl || !this.el.score) return;
      this.scorePillEl.setAttribute("tabindex", "0");
      this.scorePillEl.setAttribute("role", "button");
      this.scorePillEl.setAttribute("aria-label", "Show exact score");

      this.scorePillEl.addEventListener("click", () => {
        const exactScore = this.latestScore ?? this.displayed.score;
        if ((exactScore || 0) < 1000000) return;
        this.showExactScoreTooltip(exactScore);
      });
      this.scorePillEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const exactScore = this.latestScore ?? this.displayed.score;
        if ((exactScore || 0) < 1000000) return;
        this.showExactScoreTooltip(exactScore);
      });
      this.el.score.addEventListener("click", () => {
        const exactScore = this.latestScore ?? this.displayed.score;
        if ((exactScore || 0) < 1000000) return;
        this.showExactScoreTooltip(exactScore);
      });
    }

    showExactScoreTooltip(scoreValue) {
      if (!this.scorePillEl) return;
      clearTimeout(this.scoreTooltipTimer);

      let tooltip = document.body.querySelector(".score-exact-tooltip");
      if (!tooltip) {
        tooltip = document.createElement("span");
        tooltip.className = "score-exact-tooltip";
        document.body.append(tooltip);
      }

      const pillRect = this.scorePillEl.getBoundingClientRect();
      tooltip.style.left = `${pillRect.left + pillRect.width * 0.5}px`;
      tooltip.style.top = `${pillRect.bottom + 6}px`;

      tooltip.textContent = new Intl.NumberFormat("pt-BR").format(Math.floor(Math.max(0, Number(scoreValue) || 0)));
      tooltip.classList.remove("is-visible");
      void tooltip.offsetWidth;
      tooltip.classList.add("is-visible");

      this.scoreTooltipTimer = window.setTimeout(() => {
        tooltip.classList.remove("is-visible");
      }, 3000);
    }

    buildGenerationTracker() {
      if (!this.el.levelTracker) return;
      this.el.levelTracker.innerHTML = "";
      this.generationCards = LEVEL_VALUES
        .slice()
        .reverse()
        .map((value) => {
          const level = generationFromValue(value);
          const card = document.createElement("div");
          card.className = "generation-card";
          card.dataset.level = String(level);
          card.dataset.value = String(value);
          card.style.backgroundImage = `url("assets/levels/capa-${value}.png")`;
          card.innerHTML = `<span class="generation-tooltip" role="tooltip">Card not unlocked yet.</span>`;
          card.title = `Generation ${level}`;
          this.el.levelTracker.append(card);
          return card;
        });
      this.syncTrackerOverlayHeight();
      this.scrollTrackerToBottom();
    }

    bindGenerationTrackerInteraction() {
      if (!this.el.levelTracker) return;
      this.el.levelTracker.addEventListener("click", (event) => {
        const card = event.target.closest(".generation-card");
        if (!card) return;
        const unlocked = card.classList.contains("is-unlocked");
        if (!unlocked) {
          this.showLockedTooltip(card);
          return;
        }
        this.generationCards.forEach((generationCard) => generationCard.classList.remove("show-tooltip"));
        this.openGenerationModal(card);
      });
    }

    showLockedTooltip(card) {
      clearTimeout(this.hideTooltipTimer);
      this.generationCards.forEach((generationCard) => generationCard.classList.remove("show-tooltip"));
      card.classList.add("show-tooltip");
      this.hideTooltipTimer = setTimeout(() => {
        card.classList.remove("show-tooltip");
      }, 1800);
    }

    bindGenerationModalEvents() {
      dom.closeGenerationModal?.addEventListener("click", () => this.closeGenerationModal());
      dom.generationModal?.addEventListener("click", (event) => {
        if (event.target === dom.generationModal) this.closeGenerationModal();
      });
      dom.generationFlipCard?.addEventListener("click", () => {
        this.audio.play("flipCard");
        dom.generationModal?.classList.toggle("is-flipped");
      });
      dom.generationTouchHint?.addEventListener("click", () => {
        this.audio.play("flipCard");
        dom.generationModal?.classList.toggle("is-flipped");
      });
      dom.generationModal?.addEventListener("close", () => {
        this.audio.stop("electricity", { reset: true });
        dom.generationModal?.classList.remove("is-flipped");
      });
    }

    async openGenerationModal(card) {
      if (!dom.generationModal || !dom.generationFlipFront || !dom.generationFlipTitle) return;
      const level = Number(card.dataset.level) || 0;
      const value = Number(card.dataset.value) || 0;
      const requestId = (this.generationModalRequestId || 0) + 1;
      this.generationModalRequestId = requestId;
      clearTimeout(this.generationFlipTimer);
      dom.generationFlipFront.style.backgroundImage = `url("assets/levels/capa-${value}.png")`;
      const tierPrefix = `Tier ${level}`;
      if (dom.generationFlipTitle) {
        dom.generationFlipTitle.textContent = `${tierPrefix} · Loading...`;
      }
      if (dom.generationFlipDescription) {
        dom.generationFlipDescription.textContent = "Loading card text...";
      }
      if (dom.generationFlipEffect) {
        dom.generationFlipEffect.textContent = "Effect: Loading details...";
      }
      if (dom.generationTouchHint) dom.generationTouchHint.textContent = "Tap to rotate";
      dom.generationModal.classList.remove("is-flipped");
      dom.generationModal.showModal();
      this.audio.play("electricity");
      this.generationFlipTimer = setTimeout(() => {
        if (!dom.generationModal?.open || this.generationModalRequestId !== requestId) return;
        dom.generationModal.classList.add("is-flipped");
      }, 2000);
      const details = await loadLevelDetails(value);
      if (!dom.generationModal?.open || this.generationModalRequestId !== requestId) return;
      if (dom.generationFlipTitle) {
        dom.generationFlipTitle.textContent = `${tierPrefix} · ${details.title || "Evolved Archive Book"}`;
      }
      if (dom.generationFlipDescription) {
        dom.generationFlipDescription.textContent = details.description
          || `An evolved archive card from tier ${level}, optimized for advanced runs.`;
      }
      if (dom.generationFlipEffect) {
        dom.generationFlipEffect.textContent = `Effect: ${details.effect || "Progression support"}`;
      }
    }

    closeGenerationModal() {
      if (!dom.generationModal?.open) return;
      clearTimeout(this.generationFlipTimer);
      this.audio.stop("electricity", { reset: true });
      dom.generationModal.classList.remove("is-flipped");
      setTimeout(() => {
        if (dom.generationModal?.open) dom.generationModal.close();
      }, 180);
    }

    updateGenerationTracker(currentGeneration) {
      if (!this.generationCards.length) return;
      this.generationCards.forEach((card) => {
        const cardLevel = Number(card.dataset.level) || 0;
        const wasUnlocked = card.classList.contains("is-unlocked");
        const unlocked = cardLevel <= currentGeneration;
        card.classList.toggle("is-unlocked", unlocked);
        card.classList.toggle("is-current", cardLevel === currentGeneration && unlocked);
        if (this.generationTrackerReady && !wasUnlocked && unlocked) this.launchUnlockConfetti(card);
      });
      this.syncTrackerOverlayHeight();
      this.adjustTrackerScroll(currentGeneration);
      this.lastKnownGeneration = Math.max(this.lastKnownGeneration, currentGeneration);
      this.generationTrackerReady = true;
    }

    syncTrackerOverlayHeight() {
      if (!this.el.levelTracker) return;
      requestAnimationFrame(() => {
        const tracker = this.el.levelTracker;
        tracker.style.setProperty("--tracker-overlay-height", `${tracker.scrollHeight}px`);
      });
    }

    scrollTrackerToBottom() {
      if (!this.el.levelTracker) return;
      requestAnimationFrame(() => {
        this.el.levelTracker.scrollTop = this.el.levelTracker.scrollHeight;
      });
    }

    adjustTrackerScroll(currentGeneration) {
      if (!this.el.levelTracker) return;
      if (currentGeneration === this.lastKnownGeneration) return;
      const currentCard = this.generationCards.find((card) => Number(card.dataset.level) === currentGeneration);
      if (currentCard) {
        currentCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        return;
      }
      this.scrollTrackerToBottom();
    }

    launchUnlockConfetti(card) {
      const pieces = 80;
      const rect = card.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      for (let i = 0; i < pieces; i += 1) {
        const particle = document.createElement("span");
        particle.className = "unlock-confetti";
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.setProperty("--dx", `${-window.innerWidth * 0.7 + Math.random() * window.innerWidth * 1.4}px`);
        particle.style.setProperty("--dy", `${-120 - Math.random() * window.innerHeight * 0.9}px`);
        particle.style.setProperty("--delay", `${Math.random() * 220}ms`);
        particle.style.background = `hsl(${40 + Math.random() * 150}, 95%, 62%)`;
        document.body.append(particle);
        setTimeout(() => particle.remove(), 1350);
      }
    }
  }

  class PowerUpManager {
    constructor(game) {
      this.game = game;
    }

    async useTrash() {
      const { state, anim } = this.game;
      this.game.audio.play("button");
      if (state.inputLocked) return;
      if (state.coins < state.costs.trash) {
        anim.shake(dom.trashBtn);
        return;
      }
      this.game.lockInput();
      const positions = [];
      state.columns.forEach((col, colIndex) => {
        col.forEach((_, rowIndex) => positions.push({ colIndex, rowIndex }));
      });
      if (!positions.length) {
        this.game.unlockInput();
        return;
      }
      for (let i = positions.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      const removeCount = Math.min(4, positions.length);
      const pickedPositions = positions.slice(0, removeCount);
      const maxTileValue = Math.max(0, ...state.columns.flat().map((tile) => tile.value));
      const hasHighestCardOnBoard = positions.some(({ colIndex, rowIndex }) => state.columns[colIndex]?.[rowIndex]?.value === maxTileValue);
      let halfScoreCost = 0;

      if (hasHighestCardOnBoard) {
        halfScoreCost = Math.floor(state.score * 0.5);
        const decision = await this.game.openArchiveWarningModal(maxTileValue);
        if (decision === "cancel") {
          this.game.unlockInput();
          this.game.hud.update(state, true);
          return;
        }
        if (decision === "pay") {
          state.score = Math.max(0, state.score - halfScoreCost);
          const lowestFirstPositions = [...positions].sort((a, b) => {
            const valueA = state.columns[a.colIndex]?.[a.rowIndex]?.value ?? Number.MAX_SAFE_INTEGER;
            const valueB = state.columns[b.colIndex]?.[b.rowIndex]?.value ?? Number.MAX_SAFE_INTEGER;
            return valueA - valueB;
          });
          pickedPositions.splice(0, pickedPositions.length, ...lowestFirstPositions.slice(0, removeCount));
        }
      }
      state.coins -= state.costs.trash;

      const byCol = new Map();
      pickedPositions.forEach(({ colIndex, rowIndex }) => {
        if (!byCol.has(colIndex)) byCol.set(colIndex, []);
        byCol.get(colIndex).push(rowIndex);
      });
      byCol.forEach((rows, colIndex) => {
        rows.sort((a, b) => b - a).forEach((rowIndex) => state.columns[colIndex].splice(rowIndex, 1));
      });
      this.game.normalizeBoard();
      this.game.board.render(state.columns, { animate: true });
      this.game.audio.play("removeCard");
      await this.game.resolveBoardStable();
      if (await this.game.spawnIfOnlyFourTilesRemain()) {
        await this.game.resolveBoardStable();
      }
      this.game.hud.update(state, true);
      anim.pulse(dom.trashBtn, 1.08);
      this.game.unlockInput();
      this.game.persist();
    }

    async useShuffle() {
      const { state, anim } = this.game;
      this.game.audio.play("button");
      if (state.inputLocked) return;
      if (state.coins < state.costs.shuffle) {
        anim.shake(dom.shuffleBtn);
        return;
      }

      this.game.lockInput();
      state.coins -= state.costs.shuffle;

      const all = state.columns.flat();
      for (let i = all.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      const nextCols = Array.from({ length: CONFIG.cols }, () => []);
      all.forEach((tile, index) => {
        const colIdx = index % CONFIG.cols;
        if (nextCols[colIdx].length < CONFIG.maxRows) nextCols[colIdx].push(tile);
      });

      state.columns = nextCols;
      this.game.normalizeBoard();
      this.game.board.render(state.columns, { animate: true });
      this.game.audio.play("randCard");
      await this.game.resolveBoardStable();
      this.game.hud.update(state, true);
      await anim.pulse(dom.board, 1.02);
      this.game.unlockInput();
      this.game.persist();
    }
  }

  class Game {
    constructor() {
      this.anim = new AnimationManager();
      this.audio = new SoundManager();
      this.board = new Board(dom.board, dom.boardFrame, CONFIG.cols);
      this.state = this.load() || this.createInitialState();
      this.hud = new HUD(dom, this.anim, this.audio);
      this.powerUps = new PowerUpManager(this);

      this.dragGhost = null;
      this.originRect = null;
      this.pointerId = null;
      this.dragStartPointer = null;
      this.dragDelta = { x: 0, y: 0 };
      this.destroyChargeTick = null;
      this.destroyDrag = null;
      this.visibilityPauseStartedAt = null;
      this.booksLockMessageTimer = null;
      this.destroyChargeFullMessageTimer = null;

      this.bindButtons();
      this.bindBoardInput();
      this.sanitizeState();
      this.syncGeneration();
      this.render();
      this.startDestroyChargeLoop();
      this.setupPersistenceSafetyNet();
      this.persist();
    }

    debug() {}

    printBoard() {}

    createInitialState() {
      const seed = [
        [16, 2],
        [2, 4],
        [2, 8],
        [8, 16],
      ];
      return {
        columns: seed.map((col) => col.map((value) => ({ id: uid(), value, variant: randomVariant() }))),
        coins: CONFIG.startCoins,
        stars: CONFIG.startStars,
        score: CONFIG.startScore,
        record: 0,
        inputLocked: false,
        costs: { ...CONFIG.powerCost },
        selectedTileId: null,
        originColumn: null,
        originRow: null,
        dragPointerOffset: { x: 0, y: 0 },
        currentDropTarget: null,
        isDragging: false,
        draggedStack: null,
        newRecordSfxPlayed: false,
        destroyPoints: 0,
        destroyChargeStartedAt: Date.now(),
        destroyChargeProgress: 0,
        destroyModeArmed: false,
      };
    }

    sanitizeState() {
      this.state.columns = Array.from({ length: CONFIG.cols }, (_, i) => this.state.columns[i] || []);
      this.normalizeBoard();
    }

    bindButtons() {
      dom.trashBtn.addEventListener("click", () => this.powerUps.useTrash());
      dom.shuffleBtn.addEventListener("click", () => this.powerUps.useShuffle());
      dom.booksModalBtn?.addEventListener("click", () => {
        this.audio.unlock();
        this.audio.play("button");
        if (!this.canOpenBooksModal()) {
          this.showBooksLockedMessage();
          return;
        }
        dom.booksModal?.showModal();
        this.audio.play("victory");
        requestAnimationFrame(() => window.BooksShowcase?.open?.());
      });
      dom.booksModalBtn?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.audio.unlock();
        this.audio.play("button");
        if (!this.canOpenBooksModal()) {
          this.showBooksLockedMessage();
          return;
        }
        dom.booksModal?.showModal();
        this.audio.play("victory");
        requestAnimationFrame(() => window.BooksShowcase?.open?.());
      });
      dom.soundSettingsBtn?.addEventListener("click", (event) => {
        event.stopPropagation();
        dom.soundSettingsPanel?.classList.toggle("is-hidden");
      });
      dom.soundMusicToggle?.addEventListener("change", (event) => {
        this.audio.setMusicEnabled(Boolean(event.target.checked));
      });
      dom.soundEffectsToggle?.addEventListener("change", (event) => {
        this.audio.setEffectsEnabled(Boolean(event.target.checked));
      });
      document.addEventListener("click", (event) => {
        if (!dom.soundSettingsPanel || dom.soundSettingsPanel.classList.contains("is-hidden")) return;
        if (dom.soundSettingsPanel.contains(event.target)) return;
        if (dom.soundSettingsBtn?.contains(event.target)) return;
        dom.soundSettingsPanel.classList.add("is-hidden");
      });
      dom.closeBooksModal?.addEventListener("click", () => {
        window.BooksShowcase?.close?.();
        this.audio.stop("victory", { reset: true });
        dom.booksModal?.close();
      });
      dom.booksModal?.addEventListener("click", (event) => {
        if (event.target === dom.booksModal) {
          window.BooksShowcase?.close?.();
          this.audio.stop("victory", { reset: true });
          dom.booksModal.close();
        }
      });
      dom.booksModal?.addEventListener("close", () => {
        window.BooksShowcase?.close?.();
        this.audio.stop("victory", { reset: true });
      });
      dom.recordModalBtn?.addEventListener("click", () => {
        dom.recordModal?.showModal();
      });
      dom.closeRecordModal?.addEventListener("click", () => dom.recordModal?.close());
      dom.recordModal?.addEventListener("click", (event) => {
        if (event.target === dom.recordModal) dom.recordModal.close();
      });
      dom.menuBtn?.addEventListener("click", () => {
        this.audio.unlock();
        this.audio.play("button");
        dom.menuModal?.showModal();
      });
      dom.closeMenuModal?.addEventListener("click", () => dom.menuModal?.close());
      dom.menuModal?.addEventListener("click", (event) => {
        if (event.target === dom.menuModal) dom.menuModal.close();
      });
      dom.reloadHomeBtn?.addEventListener("click", () => {
        dom.menuModal?.close();
        window.location.reload();
      });
      dom.resetGameBtn?.addEventListener("click", () => {
        dom.menuModal?.close();
        dom.resetGameConfirmModal?.showModal();
      });
      dom.closeResetGameConfirmModal?.addEventListener("click", () => dom.resetGameConfirmModal?.close());
      dom.cancelResetGameBtn?.addEventListener("click", () => dom.resetGameConfirmModal?.close());
      dom.resetGameConfirmModal?.addEventListener("click", (event) => {
        if (event.target === dom.resetGameConfirmModal) dom.resetGameConfirmModal.close();
      });
      dom.confirmResetGameBtn?.addEventListener("click", () => {
        try {
          localStorage.removeItem(CONFIG.storageKey);
          localStorage.removeItem(TUTORIAL_SEEN_KEY);
        } catch {
          // Ignore storage failures.
        }
        window.location.reload();
      });
      dom.openPrivacyModal?.addEventListener("click", () => {
        dom.menuModal?.close();
        dom.privacyModal?.showModal();
      });
      dom.closePrivacyModal?.addEventListener("click", () => dom.privacyModal?.close());
      dom.privacyModal?.addEventListener("click", (event) => {
        if (event.target === dom.privacyModal) dom.privacyModal.close();
      });
      dom.closeArchiveWarningModal?.addEventListener("click", () => dom.archiveWarningModal?.close("cancel"));
      dom.archiveWarningModal?.addEventListener("click", (event) => {
        if (event.target === dom.archiveWarningModal) dom.archiveWarningModal.close("cancel");
      });
      dom.acceptArchiveProposalBtn?.addEventListener("click", () => dom.archiveWarningModal?.close("pay"));
      dom.destroyHighestCardBtn?.addEventListener("click", () => dom.archiveWarningModal?.close("destroy"));
      dom.destroyChargeInfoBtn?.addEventListener("click", () => dom.destroyChargeInfoModal?.showModal());
      dom.closeDestroyChargeInfoModal?.addEventListener("click", () => dom.destroyChargeInfoModal?.close());
      dom.destroyChargeInfoModal?.addEventListener("click", (event) => {
        if (event.target === dom.destroyChargeInfoModal) dom.destroyChargeInfoModal.close();
      });
      dom.destroyChargeBtn?.addEventListener("pointerdown", (event) => this.beginDestroyDrag(event));
      dom.destroyChargeBtn?.addEventListener("pointerup", (event) => this.endDestroyDrag(event));
      dom.destroyChargeBtn?.addEventListener("pointercancel", (event) => this.endDestroyDrag(event));
      dom.destroyChargeBtn?.addEventListener("dragstart", (event) => event.preventDefault());
      dom.gameOverHomeBtn?.addEventListener("click", () => {
        window.location.reload();
      });
      dom.gameOverRetryBtn?.addEventListener("click", () => {
        dom.gameOverModal?.close();
        this.resetGameState();
      });
    }

    bindBoardInput() {
      dom.board.addEventListener("pointerdown", (event) => {
        const tileEl = event.target.closest(".tile");
        if (!tileEl) return;
        this.audio.unlock();
        this.beginTileDrag(tileEl.dataset.id, event);
      });
      window.addEventListener("pointermove", (event) => this.updateDrag(event));
      window.addEventListener("pointerup", (event) => this.endTileDrag(event));
      window.addEventListener("pointercancel", (event) => this.endTileDrag(event));
      window.addEventListener("pointermove", (event) => this.updateDestroyDrag(event));
      window.addEventListener("pointerup", (event) => this.endDestroyDrag(event));
      window.addEventListener("pointercancel", (event) => this.endDestroyDrag(event));
      window.addEventListener("blur", () => this.clearDestroyDrag());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.clearDestroyDrag();
      });
    }

    render(animate = false) {
      this.syncGeneration();
      this.board.render(this.state.columns, { animate });
      this.hud.update(this.state, false);
      this.updateBooksModalLockState();
    }

    syncGeneration() {
      const previousGeneration = this.state.stars || 0;
      this.state.stars = topGeneration(this.state.columns);
      if (this.state.stars !== previousGeneration) {
        this.updateBooksModalLockState();
      }
    }

    startDestroyChargeLoop() {
      if (this.destroyChargeTick) return;
      const tick = () => {
        this.updateDestroyChargeProgress();
        this.hud.updateDestroyCharge(this.state);
        this.destroyChargeTick = window.requestAnimationFrame(tick);
      };
      this.destroyChargeTick = window.requestAnimationFrame(tick);
    }

    stopDestroyChargeLoop() {
      if (!this.destroyChargeTick) return;
      window.cancelAnimationFrame(this.destroyChargeTick);
      this.destroyChargeTick = null;
    }

    updateDestroyChargeProgress(now = Date.now()) {
      if (this.state.destroyPoints >= CONFIG.destroyChargeMax) {
        this.state.destroyPoints = CONFIG.destroyChargeMax;
        this.state.destroyChargeProgress = 1;
        return;
      }
      const elapsed = Math.max(0, now - (this.state.destroyChargeStartedAt || now));
      if (elapsed >= CONFIG.destroyChargeMs) {
        this.state.destroyPoints = Math.min(CONFIG.destroyChargeMax, this.state.destroyPoints + 1);
        this.state.destroyChargeStartedAt = now;
        this.audio.play("reload");
        this.anim.shake(dom.destroyChargeBtn);
        this.persist();
      }
      const remainingElapsed = Math.max(0, now - this.state.destroyChargeStartedAt);
      this.state.destroyChargeProgress = Math.max(0, Math.min(1, remainingElapsed / CONFIG.destroyChargeMs));
    }

    beginDestroyDrag(event) {
      event.preventDefault();
      event.stopPropagation();
      if (this.state.inputLocked || this.state.isDragging) return;
      this.audio.unlock();
      this.audio.play("button");
      if (this.state.destroyPoints <= 0) {
        this.anim.shake(dom.destroyChargeBtn);
        return;
      }
      if (this.state.destroyPoints >= CONFIG.destroyChargeMax) {
        this.showDestroyChargeFullMessage();
      }
      const ghost = document.createElement("div");
      ghost.className = "destroy-drag-ghost";
      if (dom.destroyChargeBtn?.classList.contains("is-ready")) {
        ghost.classList.add("is-ready");
      }
      ghost.innerHTML = `
        <img src="assets/images/default.webp" alt="" class="destroy-drag-ghost-svg" draggable="false">`;
      ghost.style.left = `${event.clientX}px`;
      ghost.style.top = `${event.clientY}px`;
      document.body.append(ghost);
      document.body.style.cursor = "grabbing";
      if (dom.destroyChargeBtn?.setPointerCapture && event.pointerId !== undefined) {
        try {
          dom.destroyChargeBtn.setPointerCapture(event.pointerId);
        } catch (_) {
          // ignore capture errors
        }
      }
      this.destroyDrag = { pointerId: event.pointerId, ghost, dropped: false, sourceEl: dom.destroyChargeBtn };
      dom.destroyChargeBtn?.classList.add("is-dragging-charge");
      this.state.destroyModeArmed = true;
      this.hud.updateDestroyCharge(this.state);
    }

    updateDestroyDrag(event) {
      if (!this.destroyDrag) return;
      this.destroyDrag.ghost.style.left = `${event.clientX}px`;
      this.destroyDrag.ghost.style.top = `${event.clientY}px`;
    }

    endDestroyDrag(event) {
      if (!this.destroyDrag) return;
      event?.preventDefault?.();
      const clientX = Number.isFinite(event.clientX) ? event.clientX : null;
      const clientY = Number.isFinite(event.clientY) ? event.clientY : null;
      if (clientX !== null && clientY !== null && !this.destroyDrag.dropped) {
        const targetTile = (document.elementsFromPoint(clientX, clientY).find((el) => el.classList?.contains("tile")) || null);
        if (targetTile?.dataset?.id && this.state.destroyPoints > 0) {
          this.destroyDrag.dropped = true;
          this.consumeDestroyPoint(targetTile.dataset.id);
        }
      }
      this.clearDestroyDrag();
    }

    clearDestroyDrag() {
      if (!this.destroyDrag) return;
      const { sourceEl, pointerId } = this.destroyDrag;
      if (sourceEl?.releasePointerCapture && pointerId !== undefined) {
        try {
          sourceEl.releasePointerCapture(pointerId);
        } catch (_) {
          // ignore release errors
        }
      }
      this.destroyDrag.ghost?.remove();
      this.destroyDrag = null;
      dom.destroyChargeBtn?.classList.remove("is-dragging-charge");
      document.body.style.cursor = "";
      this.state.destroyModeArmed = false;
      this.hud.updateDestroyCharge(this.state);
    }

    consumeDestroyPoint(tileId) {
      if (this.state.destroyPoints <= 0) return;
      const tileRef = this.getTileById(tileId);
      if (!tileRef) return;
      const { column, row } = tileRef;
      this.state.columns[column].splice(row, 1);
      this.state.destroyPoints = Math.max(0, this.state.destroyPoints - 1);
      this.state.destroyModeArmed = false;
      this.normalizeBoard();
      this.board.render(this.state.columns, { animate: true });
      this.audio.play("removeCard");
      this.launchExplosion(column, row);
      this.hud.update(this.state, false);
      this.persist();
    }

    launchExplosion(colIndex, rowIndex) {
      const colRect = this.board.colRect(colIndex);
      if (!colRect) return;
      this.audio.play("explosion");
      const originX = colRect.left + colRect.width / 2;
      const originY = colRect.top + this.board.rowY(rowIndex) + this.board.tileHeight / 2;
      this.launchExplosionShockwave(originX, originY);
      const particleCount = 30;
      for (let i = 0; i < particleCount; i += 1) {
        const particle = document.createElement("span");
        particle.className = "destroy-particle";
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.background = `hsl(${18 + Math.random() * 30}, 96%, ${58 + Math.random() * 22}%)`;
        document.body.append(particle);
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
        const distance = 34 + Math.random() * 108;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const scale = 0.3 + Math.random() * 0.9;
        const duration = 220 + Math.random() * 170;
        const animation = particle.animate([
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`, opacity: 0 },
        ], { duration, easing: "cubic-bezier(.18,.8,.3,1)", fill: "forwards" });
        animation.onfinish = () => particle.remove();
      }
      this.launchExplosionCanvasBurst(originX, originY);
    }

    launchExplosionShockwave(originX, originY) {
      const shockwave = document.createElement("span");
      shockwave.className = "destroy-shockwave";
      shockwave.style.left = `${originX}px`;
      shockwave.style.top = `${originY}px`;
      document.body.append(shockwave);
      const animation = shockwave.animate([
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.95 },
        { transform: "translate(-50%, -50%) scale(2.15)", opacity: 0 },
      ], {
        duration: 260,
        easing: "cubic-bezier(.18,.9,.3,1)",
        fill: "forwards",
      });
      animation.onfinish = () => shockwave.remove();
    }

    launchExplosionCanvasBurst(originX, originY) {
      const canvas = document.createElement("canvas");
      canvas.className = "destroy-burst-canvas";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.append(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.remove();
        return;
      }

      const particles = Array.from({ length: 70 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        return {
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.6,
          radius: 0.9 + Math.random() * 2.2,
          life: 24 + Math.random() * 14,
          hue: 12 + Math.random() * 38,
          alpha: 0.9 + Math.random() * 0.1,
        };
      });

      let frame = 0;
      const totalFrames = 32;
      const step = () => {
        frame += 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "lighter";
        particles.forEach((particle) => {
          if (particle.life <= 0) return;
          particle.life -= 1;
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 0.985;
          particle.vy += 0.12;
          particle.alpha *= 0.967;
          ctx.beginPath();
          ctx.fillStyle = `hsla(${particle.hue}, 98%, 64%, ${particle.alpha})`;
          ctx.shadowColor = `hsla(${particle.hue}, 98%, 60%, 0.95)`;
          ctx.shadowBlur = 14;
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        if (frame < totalFrames) {
          window.requestAnimationFrame(step);
        } else {
          canvas.remove();
        }
      };
      window.requestAnimationFrame(step);
    }

    getTileById(tileId) {
      for (let c = 0; c < this.state.columns.length; c += 1) {
        const row = this.state.columns[c].findIndex((t) => t.id === tileId);
        if (row >= 0) return { tile: this.state.columns[c][row], column: c, row };
      }
      return null;
    }

    getMovableGroup(colIdx, rowIdx) {
      return this.state.columns[colIdx].slice(rowIdx);
    }

    lockInput() {
      this.state.inputLocked = true;
      this.hud.update(this.state, false);
    }

    unlockInput() {
      this.state.inputLocked = false;
      this.hud.update(this.state, false);
    }

    openArchiveWarningModal(savedTileValue) {
      if (!dom.archiveWarningModal) return Promise.resolve("destroy");
      const currentScore = Math.max(0, Number(this.state?.score) || 0);
      const halfScoreCost = Math.floor(currentScore * 0.5);
      if (dom.archiveWarningHalfCost) {
        dom.archiveWarningHalfCost.textContent = `${formatPt(halfScoreCost)} score`;
      }
      if (dom.archiveWarningSavedCard) {
        dom.archiveWarningSavedCard.style.backgroundImage = `url("assets/levels/capa-${savedTileValue}.png")`;
      }
      if (dom.archiveWarningSavedCardValue) {
        const generationValue = Math.max(1, Math.round(Math.log2(savedTileValue)));
        dom.archiveWarningSavedCardValue.textContent = `${formatPt(generationValue)}`;
      }
      dom.archiveWarningModal.returnValue = "";
      dom.archiveWarningModal.showModal();
      return new Promise((resolve) => {
        const handleClose = () => {
          dom.archiveWarningModal.removeEventListener("close", handleClose);
          const decision = dom.archiveWarningModal.returnValue || "cancel";
          resolve(decision);
        };
        dom.archiveWarningModal.addEventListener("close", handleClose);
      });
    }

    resetGameState() {
      const preservedRecord = Math.max(0, Number(this.state?.record) || 0);
      this.state = this.createInitialState();
      this.state.record = preservedRecord;
      this.render();
      this.persist();
    }

    beginTileDrag(tileId, pointer) {
      if (this.state.inputLocked || this.state.isDragging) return;
      if (pointer.pointerType === "mouse" && pointer.button !== 0) return;

      const tileRef = this.getTileById(tileId);
      const tileEl = this.board.tileEl(tileId);
      if (!tileRef || !tileEl) return;

      pointer.preventDefault();
      this.pointerId = pointer.pointerId;
      tileEl.setPointerCapture?.(pointer.pointerId);

      const rect = tileEl.getBoundingClientRect();
      this.originRect = rect;
      this.dragStartPointer = { x: pointer.clientX, y: pointer.clientY };
      this.dragDelta = { x: 0, y: 0 };

      this.state.selectedTileId = tileId;
      this.state.originColumn = tileRef.column;
      this.state.originRow = tileRef.row;
      this.state.dragPointerOffset = {
        x: pointer.clientX - rect.left,
        y: pointer.clientY - rect.top,
      };

      this.state.isDragging = false;
      this.state.draggedStack = null;
      this.audio.play("set");
      this.debug("drag.select", { tileId, fromCol: tileRef.column, fromRow: tileRef.row });
    }

    startDrag() {
      if (this.state.isDragging || !this.state.selectedTileId) return;
      const dragSlice = this.getMovableGroup(this.state.originColumn, this.state.originRow);
      if (!dragSlice.length) return;
      this.state.draggedStack = dragSlice;

      const ghost = document.createElement("div");
      ghost.classList.add("drag-ghost", "is-dragging");
      ghost.style.position = "fixed";
      ghost.style.left = `${this.originRect.left}px`;
      ghost.style.top = `${this.originRect.top}px`;
      ghost.style.width = `${this.originRect.width}px`;
      ghost.style.height = `${this.originRect.height}px`;
      ghost.style.margin = "0";
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "60";

      dragSlice.forEach((subTile, i) => {
        const clone = document.createElement("div");
        const visual = tileVisual(subTile.value);
        clone.className = `tile ${visual.className} ${subTile.variant}`;
        if (visual.style) clone.style.cssText = visual.style;
        clone.style.position = "absolute";
        clone.style.left = "0px";
        clone.style.top = `${this.board.rowY(i) - this.board.rowY(0)}px`;
        clone.style.width = `${this.originRect.width}px`;
        clone.style.height = `${this.originRect.height}px`;
        ghost.append(clone);

        const origin = this.board.tileEl(subTile.id);
        if (origin) origin.style.opacity = "0";
      });

      document.body.append(ghost);
      this.dragGhost = ghost;
      this.state.isDragging = true;
      dom.board.classList.add("is-dragging");
    }

    updateDrag(pointer) {
      if (this.pointerId !== pointer.pointerId) return;

      if (!this.state.isDragging && this.state.selectedTileId) {
        const dx = pointer.clientX - this.dragStartPointer.x;
        const dy = pointer.clientY - this.dragStartPointer.y;
        if (Math.hypot(dx, dy) < CONFIG.dragThreshold) return;
        this.startDrag();
      }

      if (!this.state.isDragging || !this.dragGhost) return;
      pointer.preventDefault();

      const x = pointer.clientX - this.state.dragPointerOffset.x - this.originRect.left;
      const y = pointer.clientY - this.state.dragPointerOffset.y - this.originRect.top;
      this.dragDelta = { x, y };

      const target = this.getDropTarget(pointer);
      this.state.currentDropTarget = target;
      const valid = Boolean(target && this.validateMove(this.state.originColumn, target.colIndex, this.state.draggedStack));
      this.board.markColumnTarget(target?.colIndex ?? null, valid);
      this.applyMagneticSnap(target, valid);
    }

    getDropTarget(pointer) {
      const candidates = [];
      this.state.columns.forEach((col, colIndex) => {
        const colEl = this.board.columnsEl[colIndex];
        if (!colEl) return;
        const projectedSize = col.length + (this.state.draggedStack ? this.state.draggedStack.length : 1) - (colIndex === this.state.originColumn ? this.state.draggedStack.length : 0);
        if (projectedSize > CONFIG.maxRows) return;

        const rect = colEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const dist = Math.abs(pointer.clientX - centerX);
        candidates.push({ colIndex, centerX, dist, rect });
      });

      if (!candidates.length) return null;
      candidates.sort((a, b) => a.dist - b.dist);
      if (candidates[0].dist > CONFIG.magneticRadius * 2) return null;
      return candidates[0];
    }

    applyMagneticSnap(target, isValid) {
      if (!this.dragGhost) return;
      if (!target || !isValid) {
        const tx = this.dragDelta.x;
        const ty = this.dragDelta.y;
        if (gsapApi) gsapApi.to(this.dragGhost, { x: tx, y: ty, duration: 0.05, ease: "power1.out", overwrite: true });
        else this.dragGhost.style.transform = `translate(${tx}px, ${ty}px)`;
        return;
      }

      const colRect = target.rect;
      const targetCol = target.colIndex;
      const baseRow = this.state.columns[targetCol].length - (targetCol === this.state.originColumn ? this.state.draggedStack.length : 0);
      const slotY = colRect.top + this.board.rowY(baseRow);
      const offsetX = colRect.left - this.originRect.left + 1;
      const offsetY = slotY - this.originRect.top;

      if (gsapApi) gsapApi.to(this.dragGhost, { x: offsetX, y: offsetY, duration: 0.06, ease: "power3.out", overwrite: true });
      else this.dragGhost.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }

    async endTileDrag(pointer) {
      if (this.pointerId !== pointer.pointerId) return;
      this.pointerId = null;

      if (!this.state.isDragging) {
        this.cleanupDragState();
        return;
      }

      this.lockInput();

      const draggedStack = this.state.draggedStack;
      const targetCol = this.state.currentDropTarget?.colIndex;
      const sourceCol = this.state.originColumn;
      const valid = Boolean(draggedStack && this.validateMove(sourceCol, targetCol, draggedStack));
      this.debug("drag.drop", { sourceCol, targetCol, valid, size: draggedStack?.length || 0 });

      if (!valid) {
        await this.returnToOrigin();
        this.audio.play("button");
        this.unlockInput();
        this.persist();
        return;
      }

      this.audio.play("place");
      await this.resolveTurn({ sourceCol, sourceRow: this.state.originRow, targetCol, group: draggedStack });
      this.cleanupDragState();
      this.unlockInput();
      this.persist();
    }

    validateMove(sourceCol, targetCol, group) {
      if (targetCol === null || targetCol === undefined) return false;
      if (sourceCol === targetCol) return false;
      if (!group || !group.length) return false;
      const tCol = this.state.columns[targetCol];
      const projectedSize = tCol.length + group.length;
      return projectedSize <= CONFIG.maxRows;
    }

    async returnToOrigin() {
      if (this.dragGhost) {
        if (gsapApi) {
          await gsapApi.to(this.dragGhost, { x: 0, y: 0, duration: 0.16, ease: "power2.out" });
        } else {
          this.dragGhost.style.transition = "transform 160ms ease-out";
          this.dragGhost.style.transform = "translate(0px, 0px)";
          await wait(160);
        }
      }
      this.cleanupDragState();
      this.board.render(this.state.columns);
      this.debug("turn.cancelled");
    }

    async resolveTurn({ sourceCol, sourceRow, targetCol, group }) {
      const before = this.snapshotBoard(this.state.columns);
      this.printBoard("before-turn");

      const targetTopBeforeMove = this.state.columns[targetCol][this.state.columns[targetCol].length - 1] || null;
      const draggedLeadTile = group[0] || null;

      this.state.columns[sourceCol].splice(sourceRow);
      this.state.columns[targetCol].push(...group);
      this.normalizeBoard();
      this.board.render(this.state.columns, { animate: true });
      await wait(120);

      const isValidMatch = Boolean(
        targetTopBeforeMove &&
        draggedLeadTile &&
        targetTopBeforeMove.value === draggedLeadTile.value
      );

      if (isValidMatch) {
        this.audio.play("goal");
        await this.resolveBoardStable();
      } else {
        await this.spawnNextRow();
        await this.resolveBoardStable();
      }

      if (await this.spawnIfOnlyFourTilesRemain()) {
        await this.resolveBoardStable();
      }

      this.checkGameOver();
      this.syncGeneration();
      this.hud.update(this.state, true);

      const after = this.snapshotBoard(this.state.columns);
      this.debug("turn.consumed", { changed: before !== after });
      this.printBoard("after-turn");
    }

    normalizeColumn(columnIndex) {
      const source = Array.isArray(this.state.columns[columnIndex]) ? this.state.columns[columnIndex] : [];
      const normalized = [];
      const seenInColumn = new Set();

      source.forEach((tile, row) => {
        if (!tile || !tile.id || !Number.isFinite(tile.value)) {
          this.debug("normalize.drop-invalid-tile", { columnIndex, row, tile });
          return;
        }

        if (seenInColumn.has(tile.id)) {
          this.debug("normalize.duplicate-in-column", { columnIndex, row, tileId: tile.id });
          return;
        }

        seenInColumn.add(tile.id);
        normalized.push(tile);
      });

      if (normalized.length > CONFIG.maxRows) {
        this.debug("normalize.trim-overflow", { columnIndex, from: normalized.length, to: CONFIG.maxRows });
      }

      this.state.columns[columnIndex] = normalized.slice(0, CONFIG.maxRows);
    }

    normalizeBoard() {
      this.state.columns = Array.from({ length: CONFIG.cols }, (_, i) => this.state.columns[i] || []);
      for (let i = 0; i < CONFIG.cols; i += 1) this.normalizeColumn(i);

      const globalSeen = new Set();
      this.state.columns.forEach((col, colIndex) => {
        this.state.columns[colIndex] = col.filter((tile, rowIndex) => {
          if (globalSeen.has(tile.id)) {
            this.debug("normalize.duplicate-id-global", { colIndex, rowIndex, tileId: tile.id });
            return false;
          }
          globalSeen.add(tile.id);
          return true;
        });
      });

      this.assertBoardIntegrity(this.state.columns);
      return this.state.columns;
    }

    snapshotBoard(columns) {
      return columns.map(c => c.map(t => t.id + ':' + t.value).join(',')).join('|');
    }

    applyMergePass() {
      let changed = false;
      let cascades = 0;
      for (let c = 0; c < this.state.columns.length; c += 1) {
        const col = this.state.columns[c];
        for (let i = col.length - 1; i > 0; i -= 1) {
          const top = col[i];
          const below = col[i - 1];
          if (top.value !== below.value) continue;

          cascades += 1;
          changed = true;

          below.value *= 2;
          col.splice(i, 1);

          const scoreGain = below.value * (90 + cascades * 20);
          const coinGain = below.value >= 16 ? 2 : 1;

          const previousRecord = this.state.record;
          this.state.score += scoreGain;
          if (!this.state.newRecordSfxPlayed && this.state.score > previousRecord) {
            this.state.newRecordSfxPlayed = true;
            this.audio.play("newRecord");
          }
          this.state.record = Math.max(this.state.record, this.state.score);
          this.state.coins += coinGain;
          this.audio.playMerge();
          this.audio.play("flyCoin");
          if (below.value >= 64) this.audio.play("gem");

          this.debug("merge", { col: c, row: i - 1, value: below.value });
          const p = this.board.topRewardPoint(c);
          this.anim.rewardFloat(dom.boardFrame, `+${formatPt(scoreGain)} PTS`, { x: p.x, y: p.y - 4 });
          break;
        }
      }
      if (changed && CONFIG.comboToastEnabled && cascades > 1) this.anim.comboToast(dom.boardFrame, `Combo x${cascades}`);
      return changed;
    }

    async resolveBoardStable() {
      let loops = 0;
      while (loops < CONFIG.resolveLoopLimit) {
        loops += 1;
        const before = this.snapshotBoard(this.state.columns);
        const merged = this.applyMergePass();
        this.normalizeBoard();
        this.syncGeneration();
        const after = this.snapshotBoard(this.state.columns);
        const changed = merged || before !== after;
        if (!changed) break;

        this.board.render(this.state.columns, { animate: true });
        this.hud.update(this.state, true);
        await wait(140);
      }
      if (loops >= CONFIG.resolveLoopLimit) {
        console.warn("[MMB] resolve loop limit reached");
      }
    }

    async spawnNextRow() {
      this.normalizeBoard();
      if (this.state.columns.some((col) => col.length >= CONFIG.maxRows)) {
        this.gameOver();
        return false;
      }
      this.state.columns.forEach((col, colIndex) => {
        const targetRow = 0;
        if (col.length >= CONFIG.maxRows) {
          this.debug("spawn.blocked-column-full", { colIndex });
          return;
        }
        if (col[targetRow]) {
          this.debug("spawn.shift-column", { colIndex, occupiedRow: targetRow });
        }
        col.unshift({ id: uid(), value: randomFrom(CONFIG.spawnPool), variant: randomVariant() });
      });
      this.normalizeBoard();
      this.board.render(this.state.columns, { animate: true });
      this.audio.play("line");
      dom.board.classList.remove("penalty-topline");
      void dom.board.offsetWidth;
      dom.board.classList.add("penalty-topline");
      setTimeout(() => dom.board.classList.remove("penalty-topline"), 260);
      await wait(180);
      return true;
    }

    tileCount() {
      return this.state.columns.reduce((acc, col) => acc + col.length, 0);
    }

    async spawnIfOnlyFourTilesRemain() {
      if (this.tileCount() !== CONFIG.cols) return false;
      await this.spawnNextRow();
      return true;
    }

    checkGameOver() {
      for (let i = 0; i < this.state.columns.length; i += 1) {
        if (this.state.columns[i].length > CONFIG.maxRows) {
          this.gameOver();
          break;
        }
      }
    }

    gameOver() {
      this.audio.play("gameover");
      this.audio.play("gamelose");
      this.lockInput();
      dom.gameOverModal?.showModal();
    }

    assertBoardIntegrity(columns) {
      const seen = new Set();
      const slotSeen = new Set();
      columns.forEach((col, colIndex) => {
        if (col.length > CONFIG.maxRows) {
          console.warn(`[MMB] Column ${colIndex} exceeds max rows: ${col.length}`);
        }
        col.forEach((tile, row) => {
          const slotKey = `${colIndex}:${row}`;
          if (slotSeen.has(slotKey)) {
            console.error("[MMB] duplicate slot occupation", { colIndex, row, tileId: tile?.id });
          }
          slotSeen.add(slotKey);
          if (!tile?.id || !Number.isFinite(tile.value)) {
            console.error("[MMB] invalid tile", { colIndex, row, tile });
          }
          if (seen.has(tile.id)) {
            console.error("[MMB] duplicate tile id", tile.id);
          }
          seen.add(tile.id);
        });
      });
    }

    cleanupDragState() {
      if (this.dragGhost) {
        this.dragGhost.remove();
        this.dragGhost = null;
      }

      if (this.state.draggedStack) {
        this.state.draggedStack.forEach((tile) => {
          const el = this.board.tileEl(tile.id);
          if (el) el.style.opacity = "";
        });
      }

      this.board.clearColumnTargets();
      this.state.selectedTileId = null;
      this.state.originColumn = null;
      this.state.originRow = null;
      this.state.dragPointerOffset = { x: 0, y: 0 };
      this.state.currentDropTarget = null;
      this.state.isDragging = false;
      this.state.draggedStack = null;
      dom.board.classList.remove("is-dragging");
    }

    canOpenBooksModal() {
      return (this.state.stars || 0) >= BOOKS_MODAL_UNLOCK_GENERATION;
    }

    updateBooksModalLockState() {
      if (!dom.booksModalBtn) return;
      const isLocked = !this.canOpenBooksModal();
      dom.booksModalBtn.classList.toggle("is-locked", isLocked);
      dom.booksModalBtn.setAttribute(
        "aria-label",
        isLocked
          ? `Lista de livros bloqueada até a geração ${BOOKS_MODAL_UNLOCK_GENERATION}`
          : "Abrir lista de livros",
      );
      if (dom.booksLockIndicator) {
        dom.booksLockIndicator.setAttribute("aria-hidden", "true");
      }
      if (dom.booksLockMessage) {
        if (isLocked) {
          dom.booksLockMessage.textContent = `Unlocks at generation ${BOOKS_MODAL_UNLOCK_GENERATION}.`;
          dom.booksLockMessage.classList.add("is-visible");
        } else {
          dom.booksLockMessage.textContent = "";
          dom.booksLockMessage.classList.remove("is-visible");
        }
      }
    }

    showBooksLockedMessage() {
      if (!this.booksLockToastEl) {
        this.booksLockToastEl = document.createElement("div");
        this.booksLockToastEl.className = "global-books-lock-toast";
        document.body.append(this.booksLockToastEl);
      }
      clearTimeout(this.booksLockMessageTimer);
      this.booksLockToastEl.textContent = `Locked: Books modal unlocks only at generation ${BOOKS_MODAL_UNLOCK_GENERATION}. Keep merging to reach it.`;
      this.booksLockToastEl.classList.add("is-visible");
      this.booksLockMessageTimer = window.setTimeout(() => {
        this.booksLockToastEl?.classList.remove("is-visible");
      }, 1800);
    }

    showDestroyChargeFullMessage() {
      if (!this.destroyChargeFullToastEl) {
        this.destroyChargeFullToastEl = document.createElement("div");
        this.destroyChargeFullToastEl.className = "global-books-lock-toast";
        document.body.append(this.destroyChargeFullToastEl);
      }
      clearTimeout(this.destroyChargeFullMessageTimer);
      this.destroyChargeFullToastEl.textContent = `Power Cover is full (${CONFIG.destroyChargeMax}/${CONFIG.destroyChargeMax}). Use it before charging again.`;
      this.destroyChargeFullToastEl.classList.add("is-visible");
      this.destroyChargeFullMessageTimer = window.setTimeout(() => {
        this.destroyChargeFullToastEl?.classList.remove("is-visible");
      }, 1800);
    }

    handleVisibilityChange(isHidden) {
      if (isHidden) {
        this.clearDestroyDrag();
        this.visibilityPauseStartedAt = Date.now();
        this.stopDestroyChargeLoop();
        this.audio.pauseAll();
        return;
      }
      if (this.visibilityPauseStartedAt) {
        const pausedDuration = Math.max(0, Date.now() - this.visibilityPauseStartedAt);
        this.state.destroyChargeStartedAt += pausedDuration;
      }
      this.visibilityPauseStartedAt = null;
      this.startDestroyChargeLoop();
      this.audio.resumeBgmIfPossible();
    }


    setupPersistenceSafetyNet() {
      const persistState = () => this.persist();
      window.addEventListener("offline", persistState);
      this.persistSafetyNet = persistState;
    }

    persist() {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        columns: this.state.columns,
        coins: this.state.coins,
        stars: this.state.stars,
        score: this.state.score,
        record: this.state.record,
        destroyPoints: this.state.destroyPoints,
        destroyChargeStartedAt: this.state.destroyChargeStartedAt,
      }));
    }

    load() {
      try {
        const raw = localStorage.getItem(CONFIG.storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.columns)) return null;
        return {
          columns: parsed.columns.map((col) =>
            col.map((t) => ({
              id: t.id || uid(),
              value: t.value,
              variant: STICKER_VARIANTS.includes(t.variant) ? t.variant : randomVariant(),
            }))),
          coins: Number(parsed.coins) || CONFIG.startCoins,
          stars: Number(parsed.stars) || 0,
          score: Number(parsed.score) || 0,
          record: Number(parsed.record) || 0,
          destroyPoints: Math.min(CONFIG.destroyChargeMax, Math.max(0, Number(parsed.destroyPoints) || 0)),
          destroyChargeStartedAt: Number(parsed.destroyChargeStartedAt) || Date.now(),
          destroyChargeProgress: 0,
          destroyModeArmed: false,
          inputLocked: false,
          costs: { ...CONFIG.powerCost },
          selectedTileId: null,
          originColumn: null,
          originRow: null,
          dragPointerOffset: { x: 0, y: 0 },
          currentDropTarget: null,
          isDragging: false,
          draggedStack: null,
          newRecordSfxPlayed: false,
        };
      } catch {
        return null;
      }
    }
  }

  let activeGame = null;
  let tutorialShouldBootGame = false;
  let tutorialMarkAsSeen = false;

  const hasSeenTutorial = () => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  };

  const markTutorialAsSeen = () => {
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  };

  const openTutorialModal = ({ bootGameAfterClose = false, markSeen = false } = {}) => {
    if (!dom.tutorialModal || typeof dom.tutorialModal.showModal !== "function") return false;
    tutorialShouldBootGame = bootGameAfterClose;
    tutorialMarkAsSeen = markSeen;
    const tutorialVideo = dom.tutorialModal.querySelector("video");
    if (tutorialVideo) {
      tutorialVideo.currentTime = 0;
      tutorialVideo.play().catch(() => {});
    }
    try {
      dom.tutorialModal.showModal();
      return true;
    } catch {
      tutorialShouldBootGame = false;
      tutorialMarkAsSeen = false;
      return false;
    }
  };

  const bootGame = () => {
    if (dom.loaderScreen) dom.loaderScreen.remove();
    dom.gameShell?.classList.remove("is-hidden");
    activeGame = new Game();
    activeGame.audio.unlock();
    activeGame.audio.startBgm();
  };

  document.addEventListener("visibilitychange", () => {
    if (!activeGame) return;
    activeGame.handleVisibilityChange(document.hidden);
  });

  dom.aboutGameLink?.addEventListener("click", () => {
    dom.aboutGameModal?.showModal();
  });
  dom.closeAboutGameModal?.addEventListener("click", () => {
    dom.aboutGameModal?.close();
  });
  dom.aboutGameModal?.addEventListener("click", (event) => {
    if (event.target === dom.aboutGameModal) dom.aboutGameModal.close();
  });

  const closeTutorialModal = () => {
    if (tutorialMarkAsSeen) markTutorialAsSeen();
    const shouldBoot = tutorialShouldBootGame;
    tutorialShouldBootGame = false;
    tutorialMarkAsSeen = false;
    dom.tutorialModal?.close();
    if (shouldBoot) bootGame();
  };

  if (dom.playBtn) {
    dom.tutorialModal?.addEventListener("cancel", (event) => {
      event.preventDefault();
    });
    dom.playBtn.addEventListener("click", () => {
      if (!hasSeenTutorial() && openTutorialModal({ bootGameAfterClose: true, markSeen: true })) {
        return;
      }
      bootGame();
    }, { once: true });
    dom.tutorialConfirmBtn?.addEventListener("click", closeTutorialModal);
    dom.openTutorialModalBtn?.addEventListener("click", () => {
      dom.menuModal?.close();
      openTutorialModal({ bootGameAfterClose: false, markSeen: false });
    });
  } else {
    bootGame();
  }
})();
