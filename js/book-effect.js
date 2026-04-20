// Enhanced Electric Border Magic - JavaScript
// Interactive effects and dynamic enhancements

class ElectricBorderMagic {
  constructor() {
    this.modal = document.getElementById('generationModal');
    this.card = document.getElementById('electricGenerationCardContainer');
    this.mainCard = document.getElementById('generationFlipCard');

    if (!this.modal || !this.card || !this.mainCard) return;

    this.glowLayers = this.modal.querySelectorAll('.glow-layer-1, .glow-layer-2, .glow-layer-3, .glow-layer-4');
    this.overlays = this.modal.querySelectorAll('.overlay-1, .overlay-2, .overlay-3');
    this.energyParticles = this.modal.querySelector('.energy-particles');

    this.init();
  }

  init() {
    this.addMouseInteraction();
    this.addResizeHandler();
    this.startParticleAnimation();
    this.addClickEffects();
  }

  addMouseInteraction() {
    this.modal.addEventListener('mousemove', (e) => {
      if (!this.modal.open) return;
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;
      const intensity = Math.sqrt(mouseX * mouseX + mouseY * mouseY) / Math.sqrt(2);

      this.card.style.transform = `perspective(1000px) rotateY(${(mouseX - 0.5) * 8}deg) rotateX(${(mouseY - 0.5) * -8}deg) scale(${1 + intensity * 0.025})`;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distanceFromCenter = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const maxDistance = Math.hypot(centerX, centerY);
      const proximity = 1 - distanceFromCenter / maxDistance;

      this.glowLayers.forEach((layer, index) => {
        const baseOpacity = 0.7 - index * 0.12;
        layer.style.opacity = String(Math.max(0, baseOpacity + proximity * 0.24));
      });
    });

    this.modal.addEventListener('mouseleave', () => {
      this.card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
    });

    this.modal.addEventListener('close', () => {
      this.card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
    });
  }

  addResizeHandler() {
    window.addEventListener('resize', () => {
      if (!this.energyParticles) return;
      this.energyParticles.style.backgroundSize = `${window.innerWidth / 24}px ${window.innerHeight / 24}px`;
    });
  }

  startParticleAnimation() {
    if (!this.energyParticles) return;
    let particleOffset = 0;

    const animateParticles = () => {
      particleOffset += 0.5;
      this.energyParticles.style.backgroundPosition = `${particleOffset}px ${particleOffset}px`;
      requestAnimationFrame(animateParticles);
    };

    animateParticles();
  }

  addClickEffects() {
    this.card.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.className = 'electric-ripple';
      ripple.style.width = '0px';
      ripple.style.height = '0px';

      const rect = this.card.getBoundingClientRect();
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;

      this.card.appendChild(ripple);

      ripple.animate(
        [
          { width: '0px', height: '0px', opacity: 1 },
          { width: '240px', height: '240px', opacity: 0 }
        ],
        {
          duration: 900,
          easing: 'ease-out',
          fill: 'forwards'
        }
      );

      setTimeout(() => ripple.remove(), 900);
      this.triggerGlowBurst();
    });
  }

  triggerGlowBurst() {
    const originalOpacities = Array.from(this.glowLayers).map((layer) => layer.style.opacity || getComputedStyle(layer).opacity);

    this.glowLayers.forEach((layer, index) => {
      layer.style.opacity = '1';
      layer.style.filter = `blur(${4 + index * 1.8}px) brightness(1.5)`;
    });

    setTimeout(() => {
      this.glowLayers.forEach((layer, index) => {
        layer.style.opacity = originalOpacities[index];
        layer.style.filter = `blur(${1.6 + index * 0.8}px)`;
      });
    }, 420);
  }
}

class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.updateFPS();
  }

  updateFPS() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }

    requestAnimationFrame(() => this.updateFPS());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ElectricBorderMagic();
  new PerformanceMonitor();
});

document.addEventListener('visibilitychange', () => {
  document.documentElement.style.setProperty('--animation-play-state', document.hidden ? 'paused' : 'running');
});
