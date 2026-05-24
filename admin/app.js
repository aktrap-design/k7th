// ---------- STATE ----------
let galleryData = { hero: [], curated: [], categories: [], gallery: [] };
let currentUploadList = null;

// ---------- DOM ELEMENTS ----------
const saveBtn = document.getElementById('save-btn');
const statusBar = document.getElementById('status-bar');
const loading = document.getElementById('loading');

const heroList = document.getElementById('hero-list');
const curatedList = document.getElementById('curated-list');
const galleryList = document.getElementById('gallery-list');

const uploadModal = document.getElementById('upload-modal');
const uploadForm = document.getElementById('upload-form');
const cancelUploadBtn = document.getElementById('cancel-upload');
const categoryGroup = document.getElementById('category-group');
const fileInput = document.getElementById('file-input');
const altInput = document.getElementById('alt-input');
const dropZone = document.getElementById('drop-zone');

// ---------- INIT ----------
async function init() {
  showLoading(true);
  try {
    const res = await fetch('/api/data');
    galleryData = await res.json();
    renderAll();
    setupSortable();
  } catch (err) {
    showStatus('Error loading data. Make sure server is running.', 'error');
  }
  showLoading(false);
}

// ---------- RENDER ----------
function renderAll() {
  renderList(heroList, galleryData.hero, 'hero');
  renderList(curatedList, galleryData.curated, 'curated');
  renderList(galleryList, galleryData.gallery, 'gallery');
}

function renderList(container, items, listName) {
  container.innerHTML = '';
  if (!items) return;

  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.dataset.index = index;

    let html = `
      <div class="drag-handle">☰</div>
      <img src="../${item.src}" class="item-thumb" alt="thumb">
      <div class="item-details">
        <input type="text" class="input-field alt-input" value="${item.alt}" placeholder="Alt Text">
    `;

    if (listName === 'gallery') {
      html += `
        <select class="input-field category-input">
          <option value="GRAPHIC" ${item.category === 'GRAPHIC' ? 'selected' : ''}>GRAPHIC</option>
          <option value="LIFE" ${item.category === 'LIFE' ? 'selected' : ''}>LIFE</option>
        </select>
      `;
    }

    html += `</div>
      <button class="btn btn-danger delete-btn" aria-label="Delete">🗑️</button>
    `;

    div.innerHTML = html;

    // Listeners for updates
    div.querySelector('.alt-input').addEventListener('input', (e) => {
      galleryData[listName][index].alt = e.target.value;
    });

    if (listName === 'gallery') {
      div.querySelector('.category-input').addEventListener('change', (e) => {
        galleryData[listName][index].category = e.target.value;
      });
    }

    // Delete
    div.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm('Remove this image?')) {
        galleryData[listName].splice(index, 1);
        renderAll();
      }
    });

    container.appendChild(div);
  });
}

// ---------- SORTABLE DRAG & DROP ----------
function setupSortable() {
  const options = {
    handle: '.drag-handle',
    animation: 150,
    onEnd: function (evt) {
      const listName = evt.to.id.replace('-list', '');
      const item = galleryData[listName].splice(evt.oldIndex, 1)[0];
      galleryData[listName].splice(evt.newIndex, 0, item);
      renderAll(); // re-render to update internal indices
    }
  };

  new Sortable(heroList, options);
  new Sortable(curatedList, options);
  new Sortable(galleryList, options);
}

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

// ---------- MODAL & UPLOAD ----------
document.querySelectorAll('.add-new-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentUploadList = btn.dataset.list;
    categoryGroup.style.display = currentUploadList === 'gallery' ? 'block' : 'none';
    uploadForm.reset();
    uploadModal.classList.add('open');
  });
});

cancelUploadBtn.addEventListener('click', () => {
  uploadModal.classList.remove('open');
});

function sanitizeFilenameBase(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

function extractK7Alt(baseName) {
  const match = baseName.match(/K7_[^ ]*/i);
  return match ? match[0] : baseName;
}

function applyAutoAltFromFile(file) {
  if (!file) return;
  const baseName = sanitizeFilenameBase(file.name);
  altInput.value = extractK7Alt(baseName);
}

function setFileInputFiles(files) {
  const dt = new DataTransfer();
  Array.from(files).forEach((file) => dt.items.add(file));
  fileInput.files = dt.files;
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (e) => {
  const imageFiles = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
  if (!imageFiles.length) return;
  setFileInputFiles([imageFiles[0]]);
  applyAutoAltFromFile(imageFiles[0]);
});

fileInput.addEventListener('change', () => {
  if (!fileInput.files.length) return;
  applyAutoAltFromFile(fileInput.files[0]);
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const categoryInput = document.getElementById('category-input');

  if (!fileInput.files.length) return;

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  showLoading(true);
  try {
    // 1. Upload image
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (result.success) {
      // 2. Add to JSON structure
      const newItem = {
        src: result.src,
        alt: altInput.value
      };
      if (currentUploadList === 'gallery') {
        newItem.category = categoryInput.value;
      }

      galleryData[currentUploadList].unshift(newItem); // Add to top
      renderAll();
      uploadModal.classList.remove('open');
      showStatus('Image uploaded and added successfully', 'success');
    } else {
      showStatus(result.error || 'Upload failed', 'error');
    }
  } catch (err) {
    showStatus('Upload failed. Server error.', 'error');
  }
  showLoading(false);
});

// ---------- SAVE DATA ----------
saveBtn.addEventListener('click', async () => {
  showLoading(true);
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(galleryData)
    });
    const result = await res.json();
    if (result.success) {
      showStatus('All changes saved to gallery.json! (Remember to commit to GitHub)', 'success');
    } else {
      showStatus('Failed to save data.', 'error');
    }
  } catch (err) {
    showStatus('Save failed. Server error.', 'error');
  }
  showLoading(false);
});

// ---------- UTILS ----------
function showLoading(show) {
  loading.classList.toggle('open', show);
}

function showStatus(message, type) {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`;
  setTimeout(() => {
    statusBar.style.display = 'none';
  }, 5000);
}

// Start
init();
