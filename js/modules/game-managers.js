(() => {
  const createManagers = ({ randomFrom, wait, gsapApi }) => {
    class SoundManager {
      constructor() {
        this.enabled = true;
        this.musicEnabled = true;
        this.effectsEnabled = true;
        this.unlocked = false;
        this.bgmStarted = false;
        this.channels = {
          merge: ["merge1", "merge2", "merge3", "merge4", "merge5", "merge6"],
        };
        this.sounds = {
          bgmusic: this.makeSound("assets/sounds/bgmusic.webm", { loop: true, volume: 0.22 }),
          button: this.makeSound("assets/sounds/button.webm", { volume: 0.4 }),
          set: this.makeSound("assets/sounds/set.webm", { volume: 0.45 }),
          place: this.makeSound("assets/sounds/place.webm", { volume: 0.42 }),
          randCard: this.makeSound("assets/sounds/randCard.webm", { volume: 0.4 }),
          line: this.makeSound("assets/sounds/line.webm", { volume: 0.45 }),
          removeCard: this.makeSound("assets/sounds/removeCard.webm", { volume: 0.45 }),
          flyCoin: this.makeSound("assets/sounds/flyCoin.webm", { volume: 0.4 }),
          gem: this.makeSound("assets/sounds/gem.webm", { volume: 0.45 }),
          goal: this.makeSound("assets/sounds/goal.webm", { volume: 0.48 }),
          newRecord: this.makeSound("assets/sounds/new_record.webm", { volume: 0.55 }),
          gameover: this.makeSound("assets/sounds/Gameover.webm", { volume: 0.56 }),
          gamelose: this.makeSound("assets/sounds/gamelose.webm", { volume: 0.5 }),
          explosion: this.makeSound("assets/sounds/explosion.webm", { volume: 0.72 }),
          reload: this.makeSound("assets/sounds/reloaded.webm", { volume: 0.72 }),
          victory: this.makeSound("assets/sounds/victory.webm", { volume: 0.66, loop: true }),
          merge1: this.makeSound("assets/sounds/merge1.webm", { volume: 0.42 }),
          merge2: this.makeSound("assets/sounds/merge2.webm", { volume: 0.42 }),
          merge3: this.makeSound("assets/sounds/merge3.webm", { volume: 0.42 }),
          merge4: this.makeSound("assets/sounds/merge4.webm", { volume: 0.42 }),
          merge5: this.makeSound("assets/sounds/merge5.webm", { volume: 0.42 }),
          merge6: this.makeSound("assets/sounds/merge6.webm", { volume: 0.42 }),
          electricity: this.makeSound("assets/sounds/electricity.webm", { volume: 0.5, loop: true }),
          flipCard: this.makeSound("assets/sounds/flip-card.webm", { volume: 0.5 }),
        };
      }

      makeSound(src, { volume = 1, loop = false } = {}) {
        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = volume;
        audio.loop = loop;
        return audio;
      }

      unlock() {
        if (this.unlocked) return;
        this.unlocked = true;
        this.startBgm();
        this.play("set");
      }

      startBgm({ restart = false } = {}) {
        if (!this.enabled || !this.musicEnabled) return;
        const bg = this.sounds.bgmusic;
        if (restart) {
          bg.currentTime = 0;
        } else if (!this.bgmStarted) {
          bg.currentTime = 0;
        } else if (!bg.paused) {
          return;
        }
        bg.play().then(() => {
          this.bgmStarted = true;
        }).catch(() => {
          this.bgmStarted = false;
        });
      }

      play(name, { reset = true } = {}) {
        if (!this.enabled || !this.unlocked) return;
        const sound = this.sounds[name];
        if (!sound) return;
        if (name === "bgmusic" && !this.musicEnabled) return;
        if (name !== "bgmusic" && !this.effectsEnabled) return;
        if (reset) sound.currentTime = 0;
        sound.play().catch(() => {});
      }

      stop(name, { reset = false } = {}) {
        const sound = this.sounds[name];
        if (!sound) return;
        sound.pause();
        if (reset) sound.currentTime = 0;
      }

      playMerge() {
        const mergeName = randomFrom(this.channels.merge);
        this.play(mergeName);
      }

      pauseAll() {
        Object.values(this.sounds).forEach((sound) => {
          sound.pause();
        });
      }

      resumeBgmIfPossible() {
        if (!this.enabled || !this.unlocked) return;
        this.startBgm();
      }

      setMusicEnabled(enabled) {
        this.musicEnabled = Boolean(enabled);
        if (!this.musicEnabled) {
          this.stop("bgmusic", { reset: false });
          this.bgmStarted = false;
          return;
        }
        this.resumeBgmIfPossible();
      }

      setEffectsEnabled(enabled) {
        this.effectsEnabled = Boolean(enabled);
        if (this.effectsEnabled) return;
        Object.entries(this.sounds).forEach(([name, sound]) => {
          if (name === "bgmusic") return;
          sound.pause();
          sound.currentTime = 0;
        });
      }
    }

    class AnimationManager {
      pulse(el, scale = 1.08) {
        if (!el) return Promise.resolve();
        if (gsapApi) {
          return gsapApi.timeline()
            .to(el, { scale, duration: 0.12, ease: "back.out(2.2)" })
            .to(el, { scale: 1, duration: 0.14, ease: "power1.out" })
            .then();
        }
        el.classList.add("pulse");
        return wait(260).then(() => el.classList.remove("pulse"));
      }

      shake(el) {
        if (!el) return;
        if (gsapApi) {
          gsapApi.fromTo(el, { x: 0 }, {
            keyframes: [{ x: -7 }, { x: 6 }, { x: -4 }, { x: 3 }, { x: 0 }],
            duration: 0.28,
            ease: "power1.out",
          });
          return;
        }
        el.classList.add("invalid-shake");
        setTimeout(() => el.classList.remove("invalid-shake"), 320);
      }

      rewardFloat(boardFrameEl, text, point, options = {}) {
        const node = document.createElement("div");
        node.className = "reward-float";
        if (options.small) node.classList.add("reward-float--small");
        node.textContent = text;
        node.style.left = `${point.x}px`;
        node.style.top = `${point.y}px`;
        boardFrameEl.append(node);
        if (gsapApi) {
          gsapApi.timeline({
            onComplete: () => node.remove(),
          })
            .fromTo(
              node,
              { opacity: 0, y: 8, scale: 0.78, rotate: -1.5 },
              { opacity: 1, y: -8, scale: 1.07, rotate: 0, duration: 0.2, ease: "back.out(2.2)" },
            )
            .to(node, { y: -34, scale: 1, duration: 0.85, ease: "power2.out" })
            .to(node, { opacity: 0, y: -44, duration: 0.35, ease: "power2.in" });
        } else {
          setTimeout(() => node.remove(), 1800);
        }
      }

      comboToast(boardFrameEl, text) {
        const toast = document.createElement("div");
        toast.className = "combo-toast";
        toast.textContent = text;
        boardFrameEl.append(toast);
        if (gsapApi) {
          gsapApi.fromTo(toast, { opacity: 0, y: 10, scale: 0.8 }, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.15,
            ease: "back.out(2)",
            onComplete: () => gsapApi.to(toast, { opacity: 0, y: -24, duration: 0.22, delay: 0.5, onComplete: () => toast.remove() }),
          });
        } else {
          setTimeout(() => toast.remove(), 900);
        }
      }
    }

    return { SoundManager, AnimationManager };
  };

  window.MergeMachineManagers = Object.freeze({
    createManagers,
  });
})();
