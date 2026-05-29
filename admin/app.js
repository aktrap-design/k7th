// ---------- STATE ----------
let galleryData = { hero: [], interlude: [], curated: [], categories: [], gallery: [], throwback: [], behindTheFrame: [] };
let currentUploadList = null;
let replaceTarget = null;

// ---------- DOM ELEMENTS ----------
const saveBtn = document.getElementById('save-btn');
const statusBar = document.getElementById('status-bar');
const loading = document.getElementById('loading');

const heroList = document.getElementById('hero-list');
const interludeList = document.getElementById('interlude-list');
const curatedList = document.getElementById('curated-list');
const galleryList = document.getElementById('gallery-list');
const throwbackList = document.getElementById('throwback-list');
const behindList = document.getElementById('behind-list');

const uploadModal = document.getElementById('upload-modal');
const uploadForm = document.getElementById('upload-form');
const cancelUploadBtn = document.getElementById('cancel-upload');
const categoryGroup = document.getElementById('category-group');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');

// ---------- INIT ----------
async function init() {
  showLoading(true);
  try {
    const res = await fetch('/api/data');
    galleryData = await res.json();
    if (!Array.isArray(galleryData.throwback)) {
      galleryData.throwback = [];
    }
    if (!Array.isArray(galleryData.interlude)) {
      galleryData.interlude = Array.isArray(galleryData.hero) ? galleryData.hero.slice(0, 3) : [];
    }
    if (!Array.isArray(galleryData.behindTheFrame)) {
      galleryData.behindTheFrame = [];
    }
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
  renderList(interludeList, galleryData.interlude, 'interlude');
  renderList(curatedList, galleryData.curated, 'curated');
  renderList(galleryList, galleryData.gallery, 'gallery');
  renderList(throwbackList, galleryData.throwback, 'throwback');
  renderList(behindList, galleryData.behindTheFrame, 'behindTheFrame');
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
      <img src="../${item.src || item.image || ''}" class="item-thumb" alt="thumb">
      <div class="item-details ${listName === 'behindTheFrame' ? 'item-details-behind' : ''}">
        <input type="text" class="input-field alt-input" value="${item.alt || item.title || ''}" placeholder="${listName === 'behindTheFrame' ? 'Title' : 'Alt Text'}">
    `;

    if (listName === 'gallery') {
      html += `
        <select class="input-field category-input">
          <option value="GRAPHIC" ${item.category === 'GRAPHIC' ? 'selected' : ''}>GRAPHIC</option>
          <option value="LIFE" ${item.category === 'LIFE' ? 'selected' : ''}>LIFE</option>
          <option value="MOMENT" ${item.category === 'MOMENT' ? 'selected' : ''}>MOMENT</option>
        </select>
      `;
    }

    if (listName === 'behindTheFrame') {
      html += `
        <select class="input-field visibility-input">
          <option value="public" ${(item.visibilityLevel || 'public') === 'public' ? 'selected' : ''}>visibility: public</option>
          <option value="private" ${(item.visibilityLevel || 'public') === 'private' ? 'selected' : ''}>visibility: private</option>
        </select>
        <input type="text" class="input-field linked-work-input" value="${item.linkedWork || ''}" placeholder="linkedWork (optional)">
        <input type="text" class="input-field preview-input" value="${item.promptPreview || ''}" placeholder="promptPreview">
        <textarea class="input-field full-prompt-input" placeholder="fullPrompt">${item.fullPrompt || ''}</textarea>
        <textarea class="input-field notes-input" placeholder="notes">${item.notes || ''}</textarea>
        <input type="text" class="input-field tags-input" value="${Array.isArray(item.tags) ? item.tags.join(', ') : ''}" placeholder="tags (comma separated)">
        <div class="behind-flags">
          <label><input type="checkbox" class="featured-input" ${item.isFeatured ? 'checked' : ''}> isFeatured</label>
          <label><input type="checkbox" class="published-input" ${item.isPublished !== false ? 'checked' : ''}> isPublished</label>
          <label>sortOrder <input type="number" class="input-field sort-order-input" value="${Number(item.sortOrder || 0)}"></label>
        </div>
      `;
    }

    html += `</div>
      <button class="btn btn-secondary replace-image-btn" type="button">Replace Image</button>
      <button class="btn btn-danger delete-btn" aria-label="Delete">🗑️</button>
    `;

    div.innerHTML = html;

    div.querySelector('.replace-image-btn').addEventListener('click', () => {
      replaceTarget = { listName, index };
      currentUploadList = listName;
      categoryGroup.style.display = 'none';
      uploadForm.reset();
      uploadModal.classList.add('open');
    });

    // Listeners for updates
    div.querySelector('.alt-input').addEventListener('input', (e) => {
      if (listName === 'behindTheFrame') {
        galleryData[listName][index].title = e.target.value;
      } else {
        galleryData[listName][index].alt = e.target.value;
      }
    });

    if (listName === 'gallery') {
      div.querySelector('.category-input').addEventListener('change', (e) => {
        galleryData[listName][index].category = e.target.value;
      });
    }

    if (listName === 'behindTheFrame') {
      div.querySelector('.preview-input').addEventListener('input', (e) => {
        galleryData[listName][index].promptPreview = e.target.value;
      });
      div.querySelector('.full-prompt-input').addEventListener('input', (e) => {
        galleryData[listName][index].fullPrompt = e.target.value;
      });
      div.querySelector('.notes-input').addEventListener('input', (e) => {
        galleryData[listName][index].notes = e.target.value;
      });
      div.querySelector('.tags-input').addEventListener('input', (e) => {
        galleryData[listName][index].tags = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
      });
      div.querySelector('.linked-work-input').addEventListener('input', (e) => {
        galleryData[listName][index].linkedWork = e.target.value;
      });
      div.querySelector('.visibility-input').addEventListener('change', (e) => {
        galleryData[listName][index].visibilityLevel = e.target.value;
      });
      div.querySelector('.featured-input').addEventListener('change', (e) => {
        galleryData[listName][index].isFeatured = e.target.checked;
      });
      div.querySelector('.published-input').addEventListener('change', (e) => {
        galleryData[listName][index].isPublished = e.target.checked;
      });
      div.querySelector('.sort-order-input').addEventListener('input', (e) => {
        galleryData[listName][index].sortOrder = Number(e.target.value || 0);
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
  new Sortable(interludeList, options);
  new Sortable(curatedList, options);
  new Sortable(galleryList, options);
  new Sortable(throwbackList, options);
  new Sortable(behindList, options);
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
    replaceTarget = null;
    currentUploadList = btn.dataset.list;
    categoryGroup.style.display = currentUploadList === 'gallery' ? 'block' : 'none';
    uploadForm.reset();
    uploadModal.classList.add('open');
  });
});

cancelUploadBtn.addEventListener('click', () => {
  replaceTarget = null;
  uploadModal.classList.remove('open');
});

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
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const altInput = document.getElementById('alt-input');
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
      if (!replaceTarget && currentUploadList === 'interlude' && galleryData.interlude.length >= 3) {
        showStatus('Interlude images can contain up to 3 items.', 'error');
        showLoading(false);
        return;
      }
      if (replaceTarget) {
        const target = galleryData[replaceTarget.listName][replaceTarget.index];
        if (!target) {
          showStatus('Target item not found.', 'error');
          showLoading(false);
          return;
        }
        if (replaceTarget.listName === 'behindTheFrame') {
          target.image = result.src;
        } else {
          target.src = result.src;
        }
        renderAll();
        uploadModal.classList.remove('open');
        replaceTarget = null;
        showStatus('Image replaced successfully', 'success');
        showLoading(false);
        return;
      }
      // 2. Add to JSON structure
      const newItem = {
        src: result.src,
        alt: altInput.value
      };
      if (currentUploadList === 'gallery') {
        newItem.category = categoryInput.value;
      }
      if (currentUploadList === 'behindTheFrame') {
        const defaultTitle = altInput.value || fileInput.files[0].name.replace(/\.[^.]+$/, '');
        Object.assign(newItem, {
          image: result.src,
          title: defaultTitle,
          promptPreview: '',
          fullPrompt: '',
          notes: '',
          tags: [],
          linkedWork: '',
          visibilityLevel: 'public',
          isFeatured: false,
          isPublished: true,
          sortOrder: 0
        });
        delete newItem.src;
        delete newItem.alt;
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
