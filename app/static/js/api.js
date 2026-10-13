/**
 * DoseWise Academy - API Client & Global Helpers
 */

const API = {
  token: localStorage.getItem('dosewise_token') || null,

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('dosewise_token', token);
    } else {
      localStorage.removeItem('dosewise_token');
    }
  },

  async request(url, options = {}) {
    options.headers = options.headers || {};
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, options);

      // Handle CSV or file downloads
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/csv')) {
        const blob = await response.blob();
        return { isBlob: true, blob };
      }

      let data = null;
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          data = null;
        }
      } else {
        const textContent = await response.text();
        data = { detail: textContent || response.statusText };
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          localStorage.removeItem('dosewise_user');
          if (window.App && window.App.showLoginView) {
            window.App.showLoginView();
          }
        }
        
        // Extract bilingual error message
        let errorMsg = "حدث خطأ أثناء معالجة الطلب";
        if (data && data.detail) {
          if (typeof data.detail === 'object') {
            errorMsg = data.detail[I18N.currentLang] || data.detail.ar || data.detail.en || JSON.stringify(data.detail);
          } else {
            errorMsg = data.detail;
          }
        } else if (response.status === 500) {
          errorMsg = "حدث خطأ داخلي في الخادم (500)";
        }
        showToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error("API Request Error:", err);
      throw err;
    }
  },

  get(url, params = {}) {
    const urlObj = new URL(url, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        urlObj.searchParams.append(key, params[key]);
      }
    });
    return this.request(urlObj.toString(), { method: 'GET' });
  },

  post(url, body = {}) {
    return this.request(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(url, body = {}) {
    return this.request(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const iconSvg = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || '';

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Global Modal Dialog Helper
 */
function openModal(title, contentHtml, onSave = null, saveText = null, sizeClass = '') {
  let modalBackdrop = document.getElementById('globalModal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'globalModal';
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.innerHTML = `
      <div class="modal-dialog ${sizeClass}">
        <div class="modal-header">
          <h3 class="modal-title" id="globalModalTitle"></h3>
          <button class="btn btn-icon btn-secondary" onclick="closeModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body" id="globalModalBody"></div>
        <div class="modal-footer" id="globalModalFooter"></div>
      </div>
    `;
    document.body.appendChild(modalBackdrop);
  }

  const dialog = modalBackdrop.querySelector('.modal-dialog');
  dialog.className = `modal-dialog ${sizeClass}`;

  document.getElementById('globalModalTitle').textContent = title;
  document.getElementById('globalModalBody').innerHTML = contentHtml;

  const footer = document.getElementById('globalModalFooter');
  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">${I18N.t('cancel')}</button>
  `;

  if (onSave) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = saveText || I18N.t('save');
    saveBtn.onclick = async () => {
      try {
        saveBtn.disabled = true;
        saveBtn.textContent = I18N.t('loading');
        await onSave();
        closeModal();
      } catch (e) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveText || I18N.t('save');
      }
    };
    footer.appendChild(saveBtn);
  }

  modalBackdrop.classList.add('show');
}

function closeModal() {
  const modalBackdrop = document.getElementById('globalModal');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('show');
  }
}

/**
 * Formatting Utilities
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return `${num.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${I18N.t('currency')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(I18N.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}
