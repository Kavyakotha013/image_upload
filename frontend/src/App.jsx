import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api/images';

function App() {
  const [images, setImages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      if (response.data && response.data.images) {
        setImages(response.data.images);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      showToast('error', 'Failed to fetch images from database.');
    }
  };

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const validateFile = (file) => {
    if (!file) return false;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isAllowedExt = ['jpeg', 'jpg', 'png'].includes(fileExtension);
    const isAllowedMime = allowedTypes.includes(file.type);

    if (!isAllowedMime || !isAllowedExt) {
      showToast('error', 'Invalid file type. Only JPG, JPEG, and PNG images are allowed.');
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('error', 'File too large. Maximum size is 5MB.');
      return false;
    }

    return true;
  };

  const processFile = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);

    setUploading(true);
    setProgress(0);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      if (response.data && response.data.success) {
        showToast('success', response.data.message || 'Image uploaded successfully!');
        removeSelectedFile();
        fetchImages();
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errMsg = error.response?.data?.message || 'Failed to upload image. Please try again.';
      showToast('error', errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (imageUrl, fileName, e) => {
    if (e) e.stopPropagation();
    
    try {
      showToast('success', 'starting download...');
      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'blob',
      });
      
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      showToast('error', 'Failed to downlod img');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to permanently delete this image?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      if (response.data && response.data.success) {
        showToast('success', response.data.message || 'Image deleted successfully!');
        setImages((prev) => prev.filter((img) => img._id !== id));
        if (lightboxImage?._id === id) {
          setLightboxImage(null);
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      const errMsg = error.response?.data?.message || 'Failed to delete image.';
      showToast('error', errMsg);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  return (
    <div className="app-container">
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
            <button className="btn-close-toast" onClick={() => removeToast(toast.id)}>✕</button>
          </div>
        ))}
      </div>

      <header className="app-header">
        <h1 className="brand-title">AURA GALLERY</h1>
        <p className="brand-subtitle">
          Experience ultra-responsive, beautiful, and secure image hosting. 
          Drag, drop, and manage your photo assets in real-time.
        </p>
      </header>

      <div className="dashboard-grid">
        <section className="glass-card">
          <h2 className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Media
          </h2>
          
          <div 
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="file-input" 
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={uploading}
            />
            
            <div className="upload-icon-container">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            
            <div>
              <p className="upload-text-main">Drag & Drop image here</p>
              <p className="upload-text-sub">or click to browse local files</p>
            </div>
            <p className="upload-text-sub" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Supports JPG, JPEG, PNG (max 5MB)
            </p>
          </div>

          {previewUrl && (
            <div className="preview-container">
              <div className="preview-wrapper">
                <img src={previewUrl} alt="Upload Preview" className="preview-img" />
                <div className="preview-overlay">
                  <div className="preview-details">
                    <p className="preview-name">{selectedFile?.name}</p>
                    <p className="preview-size">{formatBytes(selectedFile?.size || 0)}</p>
                  </div>
                  <button 
                    className="btn-remove-preview" 
                    onClick={removeSelectedFile}
                    disabled={uploading}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {uploading && (
                <div className="progress-container">
                  <div className="progress-label">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              <button 
                className="btn-upload" 
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeDasharray="30 150" />
                    </svg>
                    Uploading Assets...
                  </>
                ) : (
                  <>
                    Publish Image
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        <section className="glass-card">
          <h2 className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Gallery Collections
          </h2>

          <div className="gallery-grid">
            {images.length === 0 ? (
              <div className="gallery-empty">
                <div className="empty-icon">📁</div>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Your vault is empty</p>
                <p style={{ fontSize: '0.88rem' }}>Upload your first image to populate your cloud library.</p>
              </div>
            ) : (
              images.map((image) => (
                <div 
                  key={image._id} 
                  className="gallery-card"
                  onClick={() => setLightboxImage(image)}
                >
                  <img 
                    src={image.imageUrl} 
                    alt={image.fileName} 
                    className="gallery-image"
                    loading="lazy"
                  />
                  
                  <div className="card-actions">
                    <button 
                      className="btn-icon-download"
                      onClick={(e) => handleDownload(image.imageUrl, image.fileName, e)}
                      title="Download Image"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button 
                      className="btn-icon-delete"
                      onClick={(e) => handleDelete(image._id, e)}
                      title="Delete Image"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>

                  <div className="gallery-info">
                    <h3 className="gallery-card-name" title={image.fileName}>
                      {image.fileName}
                    </h3>
                    <span className="gallery-card-date">
                      {formatDate(image.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {lightboxImage && (
        <div 
          className="lightbox-modal"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="btn-close-lightbox" 
              onClick={() => setLightboxImage(null)}
            >
              ✕
            </button>
            <img 
              src={lightboxImage.imageUrl} 
              alt={lightboxImage.fileName} 
              className="lightbox-image" 
            />
            <p className="lightbox-title">{lightboxImage.fileName}</p>
            <p className="upload-text-sub" style={{ textAlign: 'center', marginTop: '5px' }}>
              Published on {formatDate(lightboxImage.createdAt)}
            </p>
            <button 
              className="btn-download-lightbox"
              onClick={(e) => handleDownload(lightboxImage.imageUrl, lightboxImage.fileName, e)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download High-Res
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
