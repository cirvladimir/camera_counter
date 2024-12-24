window.onload = function () {
  const video = document.getElementById('camera');
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const startButton = document.getElementById('startCamera');
  const captureButton = document.getElementById('capture');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('upload');

  captureButton.disabled = true;

  // Add file upload handler
  uploadButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.style.width = canvas.width + "px";
      canvas.style.height = canvas.height + "px";

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Convert to OpenCV Mat and initialize viewer
      let src = cv.imread(canvas);
      console.log(src.size());

      video.style.display = 'none';
      document.getElementById('canvasContainer').style.display = 'block';
      document.getElementById('capture').style.display = 'none';
      document.getElementById('initialControlContainer').style.display = 'none';
      document.getElementById('fileInput').style.display = 'none';

      const imageViewer = new ImageViewer(src, canvas);
    };

    img.src = URL.createObjectURL(file);
  }

  async function startCamera() {
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      if (result.state === 'denied') {
        alert('Camera permission has been denied. Please reset permissions and try again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 * 2 },
          height: { ideal: 720 * 2 },
          facingMode: { exact: "environment" }
        }
      });
      video.srcObject = stream;

      // Wait for video metadata to load to get actual dimensions
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = canvas.width + "px";
        canvas.style.height = canvas.height + "px";
        console.log(`Canvas size set to ${canvas.width}x${canvas.height}`);
        video.play();
      };

      document.getElementById('initialControlContainer').style.display = 'none';
      captureButton.disabled = false;
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  }

  startButton.addEventListener('click', startCamera);
  captureButton.addEventListener('click', capture);
}

function capture() {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('camera');

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  let src = cv.imread(canvas);
  console.log(src.size());

  video.style.display = 'none';
  document.getElementById('canvasContainer').style.display = 'block';
  document.getElementById('capture').style.display = 'none';

  const imageViewer = new ImageViewer(src, canvas);
}

class ImageViewer {
  constructor(mat, canvas) {
    this.mat = mat;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.x = 0;
    this.y = 0;
    this.elementZoom = this.canvas.clientWidth / this.canvas.width;
    this.zoom = this.elementZoom * document.body.clientWidth / this.canvas.width;

    this.selectedRect = null;

    // Convert Mat to Image once
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mat.cols;
    tempCanvas.height = mat.rows;
    const tempCtx = tempCanvas.getContext('2d');

    const imgData = new ImageData(
      new Uint8ClampedArray(mat.data),
      mat.cols,
      mat.rows
    );
    tempCtx.putImageData(imgData, 0, 0);

    // Store the converted image
    this.image = tempCanvas;

    // Add touch tracking properties
    this.touchCenter = null;
    this.lastTouchDistance = null;

    // Bind event handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    // Add event listeners
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);

    // Add reset button handler
    const resetButton = document.getElementById('resetSelection');
    resetButton.addEventListener('click', () => {
      this.selectedRect = null;
      this.draw();
    });
    document.getElementById('processSelection').addEventListener('click', () => {
      this.processSelection();
    });

    // Draw initial state
    this.draw();
  }

  // Convert screen coordinates to image coordinates
  screenToImage(screenX, screenY) {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom
    };
  }

  // Convert image coordinates to screen coordinates
  imageToScreen(imageX, imageY) {
    return {
      x: imageX * this.zoom + this.x,
      y: imageY * this.zoom + this.y
    };
  }

  getTouchCenter(event) {
    const touch1 = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    const touch2 = { x: event.touches[1].clientX, y: event.touches[1].clientY };

    // Calculate center in screen coordinates
    const screenCenter = {
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2
    };

    // Store center in image coordinates
    return this.screenToImage(screenCenter.x, screenCenter.y);
  }

  getTouchDistance(event) {
    const touch1 = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    const touch2 = { x: event.touches[1].clientX, y: event.touches[1].clientY };
    return Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
  }

  handleTouchStart(event) {
    event.preventDefault();

    if (event.touches.length === 2) {
      // Existing two-finger touch handling
      this.touchCenter = this.getTouchCenter(event);
      this.lastTouchDistance = this.getTouchDistance(event);
    } else if (event.touches.length === 1) {
      this.touchCenter = this.screenToImage(event.touches[0].clientX, event.touches[0].clientY);
      this.lastTouchDistance = null;
    } else {
      this.touchCenter = null;
      this.lastTouchDistance = null;
    }
  }

  handleTouchMove(event) {
    event.preventDefault();

    if (event.touches.length === 2) {
      const currentDistance = this.getTouchDistance(event);
      this.zoom *= currentDistance / this.lastTouchDistance;
      this.lastTouchDistance = currentDistance;

      const currentScreenCenter = this.getTouchCenter(event);

      // Adjust position to keep the image point fixed at the touch center
      this.x += (currentScreenCenter.x - this.touchCenter.x) * this.zoom;
      this.y += (currentScreenCenter.y - this.touchCenter.y) * this.zoom;


      this.draw();

    } else if (event.touches.length === 1) {
      const touchCenter = this.screenToImage(event.touches[0].clientX, event.touches[0].clientY);
      if (Math.abs(this.touchCenter.y - touchCenter.y) > 50) {
        if (this.selectedRect == null) {
          this.selectedRect = {
            x: Math.min(this.touchCenter.x, touchCenter.x),
            y: Math.min(this.touchCenter.y, touchCenter.y),
            width: Math.abs(touchCenter.x - this.touchCenter.x),
            height: Math.abs(touchCenter.y - this.touchCenter.y)
          };
        } else {
          // Extend selected rect to contain new touch point
          const newX = Math.min(this.selectedRect.x, touchCenter.x);
          const newY = Math.min(this.selectedRect.y, touchCenter.y);
          const newWidth = Math.max(
            this.selectedRect.x + this.selectedRect.width,
            touchCenter.x
          ) - newX;
          const newHeight = Math.max(
            this.selectedRect.y + this.selectedRect.height,
            touchCenter.y
          ) - newY;

          this.selectedRect = {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          };
        }
        this.draw();
      }
    }
  }

  handleTouchEnd(event) {
    event.preventDefault();
    if (event.touches.length !== 2) {
      this.touchCenter = null;
      this.lastTouchDistance = null;
    }
  }

  processSelection() {
    if (this.selectedRect == null) {
      return;
    }

    const rect = new cv.Rect(this.selectedRect.x, this.selectedRect.y, this.selectedRect.width, this.selectedRect.height);
    const cropped = this.mat.roi(rect);

    let gray = new cv.Mat();
    cv.cvtColor(cropped, gray, cv.COLOR_RGBA2GRAY);

    // Threshold
    let binary = new cv.Mat();
    cv.threshold(gray, binary, 100, 255, cv.THRESH_BINARY);

    // Median blur
    let blurred = new cv.Mat();
    cv.medianBlur(binary, blurred, 5);

    // Find first black pixel indices
    let firstBlackPixelIndices = [];
    for (let y = 0; y < blurred.rows; y++) {
      let row = blurred.row(y);
      let data = row.data;
      let foundBlack = false;
      for (let x = data.length - 1; x >= 0; x--) {
        if (data[x] !== 0) {
          firstBlackPixelIndices.push(data.length - x);
          foundBlack = true;
          break;
        }
      }
      if (!foundBlack) firstBlackPixelIndices.push(0);
    }

    // Compute derivative
    let derivative = [];
    for (let i = 1; i < firstBlackPixelIndices.length; i++) {
      derivative.push(Math.abs(firstBlackPixelIndices[i] - firstBlackPixelIndices[i - 1]));
    }

    // Smooth derivative
    let smoothed = [];
    let kernelSize = 5;
    for (let i = 0; i < derivative.length - kernelSize + 1; i++) {
      let sum = 0;
      for (let j = 0; j < kernelSize; j++) {
        sum += derivative[i + j];
      }
      smoothed.push(sum / kernelSize);
    }

    const peaks = findPeaks(smoothed, 10);

    // Draw lines at detected peaks (example)
    let colorImage = this.mat.clone();
    // Assuming `peaks` contains y-coordinates of peaks
    peaks.forEach(peak => {
      cv.line(colorImage, new cv.Point(this.selectedRect.x, this.selectedRect.y + peak), new cv.Point(this.selectedRect.x + this.selectedRect.width,
        this.selectedRect.y + peak), [0, 0, 255, 255], 2);
    });

    // Display the result
    cv.imshow(this.canvas, colorImage);
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save current transform state
    this.ctx.save();

    // Apply transformations
    this.ctx.translate(this.x, this.y);
    this.ctx.scale(this.zoom, this.zoom);

    // Draw the pre-converted image
    this.ctx.drawImage(this.image, 0, 0);

    if (this.selectedRect) {
      this.ctx.strokeStyle = 'red';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(this.selectedRect.x, this.selectedRect.y, this.selectedRect.width, this.selectedRect.height);
      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
      this.ctx.fillRect(this.selectedRect.x, this.selectedRect.y, this.selectedRect.width, this.selectedRect.height);
    }

    // Restore original transform state
    this.ctx.restore();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.draw();
  }

  setZoom(zoom) {
    this.zoom = zoom;
    this.draw();
  }
}

function findPeaks(data, distance) {
  const peaks = [];
  for (let i = 0; i < data.length; i++) {
    let isPeak = true;

    // Check the left neighbors
    for (let j = 1; j <= distance; j++) {
      if (i - j >= 0 && data[i] <= data[i - j]) {
        isPeak = false;
        break;
      }
    }

    // Check the right neighbors
    for (let j = 1; j <= distance; j++) {
      if (i + j < data.length && data[i] <= data[i + j]) {
        isPeak = false;
        break;
      }
    }

    if (isPeak) {
      peaks.push(i);
    }
  }
  return peaks;
}


