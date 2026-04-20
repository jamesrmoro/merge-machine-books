(() => {
  const dom = {
    modal: document.getElementById("booksModal"),
    root: document.getElementById("booksShowcaseRoot"),
    host: document.getElementById("booksShowcaseCanvasHost"),
    loading: document.getElementById("loading"),
    loadingText: document.getElementById("loadingText"),
    progressFill: document.getElementById("progressFill"),
    infos: document.getElementById("lesInfos"),
  };

  if (!dom.modal || !dom.root || !dom.host) {
    window.BooksShowcase = { open: () => {}, close: () => {} };
    return;
  }

  let scrollY = 0;
  let targetScrollY = 0;
  let scrollVelocity = 0;
  let materials = [];
  let totalImagesToLoad = 0;
  let loadedImagesCount = 0;
  let meshes = [];
  let preserveOriginalRatios = true;
  let isOpen = false;
  let isDragging = false;
  let lastMouseY = 0;
  let lastTouchY = 0;
  let rafId = 0;

  let scene = null;
  let camera = null;
  let renderer = null;
  let fallbackCanvas = null;
  let fallbackCtx = null;
  let fallbackBands = [];
  const IMAGE_LOAD_TIMEOUT_MS = 12000;
  const BAND_HEIGHT = 120;
  const IMAGE_HEIGHT = 100;
  const IMAGE_GAP = 10;
  const CLONE_COUNT = 3;
  const MAX_IMAGE_WIDTH = 300;
  const EDGE_PADDING = 0;
  const IMAGES_PER_BAND = [8, 12, 9, 13, 14, 10, 9, 13];

  const LEVEL_IMAGE_VALUES = [
    2, 4, 8, 16, 32, 64, 128, 256, 512, 1024,
    2048, 4096, 8192, 16384, 32768, 65536,
    131072, 262144, 524288, 1048576,
  ];
  const LEVEL_IMAGE_PATHS = LEVEL_IMAGE_VALUES.map((value) => `assets/levels/capa-${value}.png`);

  const bandConfigs = [
    { offsetY: -110, speed: 1.0, rotation: 7 * Math.PI / 180, rotationType: "fromLeft", name: "Haut 1", curveAmount: 40.0, curveDirection: 1 },
    { offsetY: -330, speed: 1.3, rotation: 7 * Math.PI / 180, rotationType: "fromCenter", name: "Haut 2", curveAmount: 35.0, curveDirection: 1 },
    { offsetY: -440, speed: 1.6, rotation: 7 * Math.PI / 180, rotationType: "fromLeft", name: "Centre Haut", curveAmount: 40.0, curveDirection: 1 },
    { offsetY: -220, speed: 0.7, rotation: 7 * Math.PI / 180, name: "Centrale", curveAmount: 40.0, curveDirection: 1 },
    { offsetY: 0, speed: 0.4, rotation: 7 * Math.PI / 180, name: "Centre Bas", curveAmount: 40.0, curveDirection: 1 },
    { offsetY: 110, speed: 1.2, rotation: 7 * Math.PI / 180, name: "Bas 1", curveAmount: 40.0, curveDirection: 1 },
    { offsetY: 220, speed: 0.8, rotation: 7 * Math.PI / 180, name: "Bas 2", curveAmount: 40.0, curveDirection: 1 },
    { offsetY: 330, speed: 1.4, rotation: 7 * Math.PI / 180, name: "Très Bas", curveAmount: 40.0, curveDirection: 1 },
  ];

  const getImageUrlsForBand = (bandIndex) => {
    const imagesCount = IMAGES_PER_BAND[bandIndex] || 0;
    const bandOffset = bandIndex * 3;
    return Array.from({ length: imagesCount }, (_, i) => {
      const index = (bandOffset + i) % LEVEL_IMAGE_PATHS.length;
      return LEVEL_IMAGE_PATHS[index];
    });
  };

  const calculateImageDimensions = (height, ratio) => {
    let width = Math.round(height * ratio);
    let h = height;
    if (width > MAX_IMAGE_WIDTH) {
      width = MAX_IMAGE_WIDTH;
      h = Math.round(width / ratio);
    }
    return { width, height: h, ratio };
  };

  const getOpaqueBounds = (img, alphaThreshold = 10) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha <= alphaThreshold) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      return { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
    }

    return {
      sx: minX,
      sy: minY,
      sw: Math.max(1, maxX - minX + 1),
      sh: Math.max(1, maxY - minY + 1),
    };
  };

  const formatRatio = (ratio) => {
    const commonRatios = [
      { value: 1.5, text: "3:2", tolerance: 0.05 },
      { value: 1.333, text: "4:3", tolerance: 0.02 },
      { value: 1.777, text: "16:9", tolerance: 0.02 },
      { value: 1.85, text: "1.85:1", tolerance: 0.02 },
      { value: 2.0, text: "2:1", tolerance: 0.05 },
      { value: 1.0, text: "1:1", tolerance: 0.01 },
      { value: 0.75, text: "3:4", tolerance: 0.02 },
      { value: 0.667, text: "2:3", tolerance: 0.02 },
    ];
    for (const common of commonRatios) if (Math.abs(ratio - common.value) < common.tolerance) return common.text;
    return `${ratio.toFixed(2)}:1`;
  };

  const createHorizontalTextureForBand = (images) => {
    let sequenceWidth = 0;
    images.forEach((imageInfo) => {
      if (imageInfo && imageInfo.loaded) sequenceWidth += imageInfo.width + IMAGE_GAP;
    });
    sequenceWidth = Math.max(1, sequenceWidth - IMAGE_GAP);
    const totalWidth = sequenceWidth * CLONE_COUNT;
    const canvas = document.createElement("canvas");
    canvas.width = totalWidth;
    canvas.height = BAND_HEIGHT;
    const ctx = canvas.getContext("2d");
    let currentX = 0;

    for (let clone = 0; clone < CLONE_COUNT; clone += 1) {
      images.forEach((imageInfo) => {
        if (!imageInfo || !imageInfo.loaded || !imageInfo.img) return;
        const centeredY = (BAND_HEIGHT - imageInfo.height) / 2;
        const drawWidth = Math.max(1, imageInfo.width - EDGE_PADDING * 2);
        const drawHeight = Math.max(1, imageInfo.height - EDGE_PADDING * 2);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(
          imageInfo.img,
          imageInfo.sx ?? 0,
          imageInfo.sy ?? 0,
          imageInfo.sw || imageInfo.img.naturalWidth || imageInfo.img.width,
          imageInfo.sh || imageInfo.img.naturalHeight || imageInfo.img.height,
          currentX + EDGE_PADDING,
          centeredY + EDGE_PADDING,
          drawWidth,
          drawHeight,
        );
        if (imageInfo.displayRatio) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(imageInfo.displayRatio, currentX + imageInfo.width / 2, centeredY + imageInfo.height + 12);
        }
        ctx.restore();
        currentX += imageInfo.width + IMAGE_GAP;
      });
    }
    return { canvas, totalWidth, sequenceWidth, imagesCount: images.length };
  };

  const createFallbackImageForBand = (imageObj, imgIndex, bandIndex) => {
    const fallbackRatios = [1.5, 1.333, 1.777, 1.0, 0.75];
    const ratio = fallbackRatios[Math.floor(Math.random() * fallbackRatios.length)];
    const dimensions = calculateImageDimensions(IMAGE_HEIGHT, ratio);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d");
    const bandColors = ["hsl(210, 70%, 60%)", "hsl(180, 70%, 60%)", "hsl(150, 70%, 60%)", "hsl(120, 70%, 60%)", "hsl(90, 70%, 60%)", "hsl(60, 70%, 60%)", "hsl(30, 70%, 60%)", "hsl(0, 70%, 60%)"];
    ctx.fillStyle = bandColors[bandIndex] || "hsl(0, 0%, 70%)";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ratioText = formatRatio(ratio);
    ctx.fillText(`B${bandIndex + 1}`, dimensions.width / 2, dimensions.height / 2 - 15);
    ctx.fillText(`Img ${imgIndex + 1}`, dimensions.width / 2, dimensions.height / 2);
    ctx.fillText(ratioText, dimensions.width / 2, dimensions.height / 2 + 15);
    Object.assign(imageObj, { loaded: true, img: canvas, width: dimensions.width, height: dimensions.height, ratio, displayRatio: ratioText, isFallback: true });
  };

  const updateLoading = () => {
    const progress = totalImagesToLoad ? (loadedImagesCount / totalImagesToLoad) * 100 : 0;
    if (dom.progressFill) dom.progressFill.style.width = `${progress}%`;
    if (dom.loadingText) dom.loadingText.textContent = `Loading... ${loadedImagesCount}/${totalImagesToLoad}`;
    if (loadedImagesCount >= totalImagesToLoad && dom.loading) {
      setTimeout(() => {
        if (isOpen) dom.loading.style.display = "none";
      }, 500);
    }
  };

  const loadImagesForBand = (bandIndex, imagesCount, callback) => {
    const images = [];
    let loaded = 0;
    const imageUrls = getImageUrlsForBand(bandIndex);

    for (let i = 0; i < imagesCount; i += 1) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const imageObj = { loaded: false, img: null, width: 0, height: 0, ratio: 0, bandIndex, imageIndex: i };
      images.push(imageObj);
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        loaded += 1;
        loadedImagesCount += 1;
        updateLoading();
        if (loaded === imagesCount) callback(images);
      };

      img.onload = () => {
        const opaqueBounds = getOpaqueBounds(img);
        const originalRatio = opaqueBounds.sw / opaqueBounds.sh;
        let targetHeight = IMAGE_HEIGHT;
        let targetWidth = Math.round(targetHeight * (preserveOriginalRatios ? originalRatio : 1.5));
        if (targetWidth > MAX_IMAGE_WIDTH) {
          targetWidth = MAX_IMAGE_WIDTH;
          targetHeight = Math.round(targetWidth / (preserveOriginalRatios ? originalRatio : 1.5));
        }
        Object.assign(imageObj, {
          loaded: true,
          img,
          sx: opaqueBounds.sx,
          sy: opaqueBounds.sy,
          sw: opaqueBounds.sw,
          sh: opaqueBounds.sh,
          width: targetWidth,
          height: targetHeight,
          ratio: preserveOriginalRatios ? originalRatio : 1.5,
          displayRatio: formatRatio(originalRatio),
        });
        finish();
      };

      img.onerror = () => {
        createFallbackImageForBand(imageObj, i, bandIndex);
        finish();
      };

      window.setTimeout(() => {
        if (done) return;
        createFallbackImageForBand(imageObj, i, bandIndex);
        finish();
      }, IMAGE_LOAD_TIMEOUT_MS);

      if (imageUrls && imageUrls[i]) {
        const source = imageUrls[i];
        if (/^https?:\/\//i.test(source)) {
          const url = new URL(source);
          url.searchParams.set("auto", "format");
          url.searchParams.set("fit", "crop");
          img.src = url.toString();
        } else {
          img.src = source;
        }
      } else {
        img.src = `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/400/300`;
      }
    }
  };

  const cleanupOldMeshes = () => {
    meshes.forEach((mesh) => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (mesh.material.uniforms?.uTexture?.value) mesh.material.uniforms.uTexture.value.dispose();
        mesh.material.dispose();
      }
    });
    meshes = [];
    materials = [];
    loadedImagesCount = 0;
    fallbackBands = [];
  };

  const recreateAllBandsFallback = async () => {
    fallbackBands = [];
    loadedImagesCount = 0;
    if (dom.loading) dom.loading.style.display = "block";
    updateLoading();
    const jobs = [];
    for (let bandIndex = 0; bandIndex < bandConfigs.length; bandIndex += 1) {
      const imagesCount = IMAGES_PER_BAND[bandIndex];
      jobs.push(new Promise((resolve) => {
        loadImagesForBand(bandIndex, imagesCount, (images) => resolve({ bandIndex, images }));
      }));
    }
    const result = await Promise.all(jobs);
    fallbackBands = result.map(({ bandIndex, images }) => ({
      config: bandConfigs[bandIndex],
      images: images.filter((img) => img && img.loaded),
      sequenceWidth: Math.max(1, images.reduce((sum, img) => sum + (img.width || 0) + IMAGE_GAP, 0) - IMAGE_GAP),
    }));
    const hasAnyImage = fallbackBands.some((band) => band.images.length > 0);
    if (!hasAnyImage) {
      fallbackBands = bandConfigs.map((config, bandIndex) => {
        const images = Array.from({ length: IMAGES_PER_BAND[bandIndex] }, (_, i) => {
          const fake = { loaded: false, img: null, width: 0, height: 0 };
          createFallbackImageForBand(fake, i, bandIndex);
          return fake;
        });
        return {
          config,
          images,
          sequenceWidth: Math.max(1, images.reduce((sum, img) => sum + img.width + IMAGE_GAP, 0) - IMAGE_GAP),
        };
      });
      loadedImagesCount = totalImagesToLoad;
      updateLoading();
    }
  };

  const recreateAllBands = async () => {
    if (!window.THREE) {
      await recreateAllBandsFallback();
      return;
    }
    cleanupOldMeshes();
    loadedImagesCount = 0;
    if (dom.loading) dom.loading.style.display = "block";
    updateLoading();

    const bandPromises = [];
    for (let bandIndex = 0; bandIndex < bandConfigs.length; bandIndex += 1) {
      const config = bandConfigs[bandIndex];
      const imagesCount = IMAGES_PER_BAND[bandIndex];
      bandPromises.push(new Promise((resolve) => {
        loadImagesForBand(bandIndex, imagesCount, (images) => {
          const textureData = createHorizontalTextureForBand(images, config.name);
          const texture = new window.THREE.Texture(textureData.canvas);
          texture.generateMipmaps = false;
          texture.minFilter = window.THREE.LinearFilter;
          texture.magFilter = window.THREE.LinearFilter;
          texture.needsUpdate = true;
          resolve({ bandIndex, config, texture, textureData });
        });
      }));
    }

    const bandResults = await Promise.all(bandPromises);
    bandResults.forEach((result) => {
      const { bandIndex, config, texture, textureData } = result;
      const material = new window.THREE.ShaderMaterial({
        uniforms: {
          uResolution: { value: new window.THREE.Vector2() },
          uTexture: { value: texture },
          uTextureWidth: { value: textureData.totalWidth },
          uSequenceWidth: { value: textureData.sequenceWidth },
          uBandHeight: { value: BAND_HEIGHT },
          uScroll: { value: 0 },
          uSpeed: { value: config.speed },
          uOffsetY: { value: config.offsetY },
          uRotation: { value: config.rotation },
          uRotationType: { value: config.rotationType === "fromLeft" ? 1.0 : 0.0 },
          uHasRotation: { value: config.rotation !== 0 ? 1.0 : 0.0 },
          uBandIndex: { value: bandIndex },
          uCurveAmount: { value: config.curveAmount },
          uCurveDirection: { value: config.curveDirection },
          uTime: { value: 0 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);} `,
        fragmentShader: `
          precision highp float;
          uniform vec2 uResolution; uniform sampler2D uTexture; uniform float uTextureWidth; uniform float uSequenceWidth;
          uniform float uBandHeight; uniform float uScroll; uniform float uSpeed; uniform float uOffsetY;
          uniform float uRotation; uniform float uRotationType; uniform float uHasRotation; uniform float uBandIndex;
          uniform float uCurveAmount; uniform float uCurveDirection; uniform float uTime; varying vec2 vUv;
          mat2 rotate2d(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
          void main(){
            vec2 pixelCoord = vUv * uResolution; vec2 originalPixelCoord = pixelCoord;
            float normalizedX = pixelCoord.x / uResolution.x;
            float curveFactor = 4.0 * (normalizedX - 0.5) * (normalizedX - 0.5);
            float curveOffset = (0.5 - curveFactor) * uCurveAmount * uCurveDirection;
            float bandTopBase = (uResolution.y - uBandHeight) * 0.5 + uOffsetY;
            float bandTop = bandTopBase + curveOffset; float bandBottom = bandTop + uBandHeight;
            float bandCenterY = bandTopBase + (uBandHeight * 0.5);
            if (uHasRotation > 0.5) {
              vec2 rc = uRotationType > 0.5 ? vec2(0.0, bandCenterY) : vec2(uResolution.x * 0.5, bandCenterY);
              pixelCoord -= rc; pixelCoord = rotate2d(uRotation) * pixelCoord; pixelCoord += rc;
              originalPixelCoord -= rc; originalPixelCoord = rotate2d(uRotation) * originalPixelCoord; originalPixelCoord += rc;
              vec2 tb = vec2(0.0, bandTop); vec2 bb = vec2(0.0, bandBottom);
              tb -= rc; tb = rotate2d(uRotation) * tb; tb += rc; bb -= rc; bb = rotate2d(uRotation) * bb; bb += rc;
              bandTop = min(tb.y, bb.y); bandBottom = max(tb.y, bb.y);
            }
            float margin = 3.0;
            if (pixelCoord.y < bandTop - margin || pixelCoord.y > bandBottom + margin) discard;
            float scrollPos = uScroll * uSpeed;
            float wrappedX = mod(originalPixelCoord.x + scrollPos + uSequenceWidth, uSequenceWidth);
            float textureX = (wrappedX + uSequenceWidth + 0.5) / uTextureWidth;
            float texY = (pixelCoord.y - bandTop) / (bandBottom - bandTop);
            if (textureX < 0.0 || textureX > 1.0 || texY < 0.0 || texY > 1.0) discard;
            vec4 color = texture2D(uTexture, vec2(textureX, texY));
            if (color.a < 0.001) discard;
            float edge = min(pixelCoord.y - bandTop, bandBottom - pixelCoord.y);
            if (edge < margin) color.a *= smoothstep(0.0, margin, edge);
            if (color.a < 0.01) discard;
            float hueShift = uBandIndex * 0.1;
            color.r *= (1.0 + sin(hueShift) * 0.02);
            color.g *= (1.0 + sin(hueShift + 2.094) * 0.02);
            color.b *= (1.0 + sin(hueShift + 4.188) * 0.02);
            gl_FragColor = color;
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        alphaTest: 0,
      });

      materials.push(material);
      const geometry = new window.THREE.PlaneGeometry(2, 2);
      const mesh = new window.THREE.Mesh(geometry, material);
      mesh.position.z = bandIndex * -0.1;
      scene.add(mesh);
      meshes.push(mesh);
    });
  };

  const inertia = 0.92;
  const applyInertia = () => {
    if (!isDragging) {
      targetScrollY += scrollVelocity;
      scrollVelocity *= inertia;
      if (Math.abs(scrollVelocity) < 0.5) scrollVelocity = 0;
    }
  };

  const animate = () => {
    if (!isOpen) return;
    rafId = requestAnimationFrame(animate);
    applyInertia();
    const smoothing = isDragging ? 0.3 : 0.1;
    scrollY += (targetScrollY - scrollY) * smoothing;
    materials.forEach((material) => {
      material.uniforms.uScroll.value = scrollY;
      material.uniforms.uTime.value += 0.016;
      material.uniforms.uResolution.value.set(dom.host.clientWidth, dom.host.clientHeight);
    });
    renderer.render(scene, camera);
  };

  const animateFallback = () => {
    if (!isOpen || !fallbackCtx || !fallbackCanvas) return;
    rafId = requestAnimationFrame(animateFallback);
    applyInertia();
    const smoothing = isDragging ? 0.3 : 0.1;
    scrollY += (targetScrollY - scrollY) * smoothing;

    const width = fallbackCanvas.width;
    const height = fallbackCanvas.height;
    fallbackCtx.clearRect(0, 0, width, height);

    fallbackBands.forEach(({ config, images, sequenceWidth }) => {
      if (!images.length) return;
      const bandTop = (height - BAND_HEIGHT) * 0.5 + config.offsetY;
      const bandCenterY = bandTop + BAND_HEIGHT * 0.5;
      const scrollPos = ((scrollY * config.speed) % sequenceWidth + sequenceWidth) % sequenceWidth;
      const rotationCenterX = config.rotationType === "fromLeft" ? 0 : width * 0.5;
      fallbackCtx.save();
      fallbackCtx.translate(rotationCenterX, bandCenterY);
      fallbackCtx.rotate(config.rotation || 0);
      fallbackCtx.translate(-rotationCenterX, -bandCenterY);
      const drawAt = (startX) => {
        let x = startX;
        images.forEach((img) => {
          const normalizedX = x / Math.max(1, width);
          const curveFactor = 4 * (normalizedX - 0.5) * (normalizedX - 0.5);
          const curveOffset = (0.5 - curveFactor) * (config.curveAmount || 0) * (config.curveDirection || 1);
          const y = bandTop + curveOffset + (BAND_HEIGHT - img.height) / 2;
          fallbackCtx.globalAlpha = 0.9;
          fallbackCtx.drawImage(img.img, x, y, img.width, img.height);
          x += img.width + IMAGE_GAP;
        });
      };
      const sx = -scrollPos - sequenceWidth;
      drawAt(sx);
      drawAt(sx + sequenceWidth);
      drawAt(sx + sequenceWidth * 2);
      fallbackCtx.restore();
    });
  };

  const onWheel = (e) => {
    if (!isOpen) return;
    e.preventDefault();
    const delta = e.deltaY;
    targetScrollY += delta;
    scrollVelocity = delta * 0.15;
  };

  const onKeyDown = (e) => {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); targetScrollY -= 50; scrollVelocity = -8; break;
      case "ArrowLeft": e.preventDefault(); targetScrollY += 50; scrollVelocity = 8; break;
      case " ": e.preventDefault(); scrollVelocity = -scrollVelocity * 1.5; break;
      case "r":
      case "R":
        e.preventDefault();
        if (window.THREE) {
          recreateAllBands();
        } else {
          recreateAllBandsFallback();
        }
        break;
      default: break;
    }
  };

  const onMouseDown = (e) => {
    if (!isOpen) return;
    isDragging = true;
    lastMouseY = e.clientY;
    scrollVelocity = 0;
    dom.root.style.cursor = "grabbing";
  };

  const onMouseMove = (e) => {
    if (!isOpen || !isDragging) return;
    const deltaY = e.clientY - lastMouseY;
    targetScrollY += deltaY * 2.0;
    lastMouseY = e.clientY;
    scrollVelocity = deltaY * 0.25;
  };

  const onMouseUp = () => {
    isDragging = false;
    dom.root.style.cursor = "default";
  };

  const onTouchStart = (e) => {
    if (!isOpen) return;
    e.preventDefault();
    lastTouchY = e.touches[0]?.clientY ?? 0;
    scrollVelocity = 0;
  };

  const onTouchMove = (e) => {
    if (!isOpen) return;
    e.preventDefault();
    const touchY = e.touches[0]?.clientY ?? lastTouchY;
    const deltaY = touchY - lastTouchY;
    targetScrollY += deltaY * 2.5;
    lastTouchY = touchY;
    scrollVelocity = deltaY * 0.3;
  };

  const onResize = () => {
    if (!isOpen) return;
    if (renderer) {
      renderer.setSize(dom.host.clientWidth, dom.host.clientHeight);
      materials.forEach((material) => material.uniforms.uResolution.value.set(dom.host.clientWidth, dom.host.clientHeight));
    }
    if (fallbackCanvas) {
      fallbackCanvas.width = dom.host.clientWidth;
      fallbackCanvas.height = dom.host.clientHeight;
    }
  };

  const onDoubleClick = () => {
    if (!isOpen) return;
    targetScrollY = 0;
    scrollVelocity = 0;
  };

  let bound = false;
  const bind = () => {
    if (bound) return;
    dom.root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    dom.root.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.root.addEventListener("touchstart", onTouchStart, { passive: false });
    dom.root.addEventListener("touchmove", onTouchMove, { passive: false });
    dom.root.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("resize", onResize);
    if (renderer) renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    if (dom.infos) dom.infos.addEventListener("click", () => { dom.infos.style.display = "none"; });
    bound = true;
  };

  const waitForHostSize = async () => {
    const maxChecks = 20;
    for (let i = 0; i < maxChecks; i += 1) {
      const width = dom.host.clientWidth;
      const height = dom.host.clientHeight;
      if (width > 0 && height > 0) return { width, height };
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return {
      width: Math.max(1, dom.host.clientWidth || dom.root.clientWidth || 1),
      height: Math.max(1, dom.host.clientHeight || dom.root.clientHeight || 1),
    };
  };

  const open = async () => {
    const hostSize = await waitForHostSize();

    if (!window.THREE) {
      if (!fallbackCanvas) {
        fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.style.width = "100%";
        fallbackCanvas.style.height = "100%";
        fallbackCtx = fallbackCanvas.getContext("2d");
      }
      if (!dom.host.contains(fallbackCanvas)) {
        fallbackCanvas.width = hostSize.width;
        fallbackCanvas.height = hostSize.height;
        dom.host.innerHTML = "";
        dom.host.appendChild(fallbackCanvas);
      }
      isOpen = true;
      scrollY = 0;
      targetScrollY = 0;
      scrollVelocity = 0;
      totalImagesToLoad = IMAGES_PER_BAND.reduce((sum, count) => sum + count, 0);
      loadedImagesCount = 0;
      if (dom.infos) dom.infos.style.display = "block";
      if (dom.loading) dom.loading.style.display = "block";
      updateLoading();
      bind();
      await recreateAllBandsFallback();
      cancelAnimationFrame(rafId);
      animateFallback();
      return;
    }

    if (!scene || !camera || !renderer) {
      scene = new window.THREE.Scene();
      camera = new window.THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
      camera.position.z = 1;
    }

    if (!dom.host.contains(renderer.domElement)) {
      renderer.setSize(hostSize.width, hostSize.height);
      dom.host.innerHTML = "";
      dom.host.appendChild(renderer.domElement);
    }

    isOpen = true;
    scrollY = 0;
    targetScrollY = 0;
    scrollVelocity = 0;
    totalImagesToLoad = IMAGES_PER_BAND.reduce((sum, count) => sum + count, 0);
    loadedImagesCount = 0;
    if (dom.infos) dom.infos.style.display = "block";
    if (dom.loading) dom.loading.style.display = "block";
    updateLoading();

    bind();
    try {
      await recreateAllBands();
      if (!materials.length) throw new Error("No materials created");
      cancelAnimationFrame(rafId);
      animate();
    } catch (_) {
      if (!fallbackCanvas) {
        fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.style.width = "100%";
        fallbackCanvas.style.height = "100%";
        fallbackCtx = fallbackCanvas.getContext("2d");
      }
      fallbackCanvas.width = hostSize.width;
      fallbackCanvas.height = hostSize.height;
      dom.host.innerHTML = "";
      dom.host.appendChild(fallbackCanvas);
      await recreateAllBandsFallback();
      cancelAnimationFrame(rafId);
      animateFallback();
    }
  };

  const close = () => {
    isOpen = false;
    cancelAnimationFrame(rafId);
    cleanupOldMeshes();
    if (dom.loading) dom.loading.style.display = "none";
  };

  window.BooksShowcase = { open, close };
})();
