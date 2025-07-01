// DOM Elements
const resumeFileInput = document.getElementById('resumeFile');
const uploadArea = document.getElementById('uploadArea');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const feedbackText = document.getElementById('feedbackText');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const errorMessage = document.getElementById('errorMessage');
const toast = document.getElementById('toast');

// Configuration
const API_BASE_URL = 'https://airesumeanalyzer-1.onrender.com';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];

// State
let currentFile = null;
let currentFeedback = '';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkServerStatus();
});

function initializeEventListeners() {
    // File input change
    resumeFileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => resumeFileInput.click());
    
    // Remove file button
    removeFileBtn.addEventListener('click', removeFile);
    
    // Analyze button
    analyzeBtn.addEventListener('click', analyzeResume);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        validateAndSetFile(files[0]);
    }
}

function validateAndSetFile(file) {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        showToast('Please upload a PDF file only.', 'error');
        return;
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        showToast('File size must be less than 10MB.', 'error');
        return;
    }
    
    // Set file
    currentFile = file;
    displayFileInfo(file);
    analyzeBtn.disabled = false;
    hideResultsAndError();
}

function displayFileInfo(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'block';
}

function removeFile() {
    currentFile = null;
    resumeFileInput.value = '';
    
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    analyzeBtn.disabled = true;
    hideResultsAndError();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzeResume() {
    if (!currentFile) {
        showToast('Please select a file first.', 'error');
        return;
    }
    
    setLoadingState(true);
    hideResultsAndError();
    
    try {
        const formData = new FormData();
        formData.append('resume', currentFile);
        
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data);
            showToast('Resume analyzed successfully!', 'success');
        } else {
            showError(data.error || 'Analysis failed. Please try again.');
        }
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to connect to the server. Please check if the backend is running.');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    if (loading) {
        analyzeBtn.classList.add('loading');
        analyzeBtn.disabled = true;
        analyzeBtn.querySelector('span').textContent = 'Analyzing...';
    } else {
        analyzeBtn.classList.remove('loading');
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector('span').textContent = 'Analyze Resume';
    }
}

function displayResults(data) {
    currentFeedback = data.feedback || 'No feedback available.';
    
    feedbackText.textContent = currentFeedback;
    wordCount.textContent = data.word_count || 0;
    charCount.textContent = data.character_count || currentFeedback.length;
    
    errorSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showError(message) {
    errorMessage.textContent = message;
    resultsSection.style.display = 'none';
    errorSection.style.display = 'block';
    
    // Scroll to error
    errorSection.scrollIntoView({ behavior: 'smooth' });
    
    showToast(message, 'error');
}

function hideResultsAndError() {
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

function tryAgain() {
    hideResultsAndError();
    if (currentFile) {
        analyzeResume();
    }
}

function analyzeAnother() {
    removeFile();
    hideResultsAndError();
    
    // Scroll back to top
    document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
}

function copyFeedback() {
    if (!currentFeedback) {
        showToast('No feedback to copy.', 'error');
        return;
    }
    
    navigator.clipboard.writeText(currentFeedback).then(() => {
        showToast('Feedback copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentFeedback;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Feedback copied to clipboard!', 'success');
    });
}

function downloadFeedback() {
    if (!currentFeedback) {
        showToast('No feedback to download.', 'error');
        return;
    }
    
    const fileName = currentFile ? 
        `${currentFile.name.replace('.pdf', '')}_analysis.txt` : 
        'resume_analysis.txt';
    
    const content = `AI Resume Analysis Report
Generated: ${new Date().toLocaleString()}
File: ${currentFile ? currentFile.name : 'Unknown'}

FEEDBACK:
${currentFeedback}

---
Generated by AI Resume Analyzer`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Report downloaded successfully!', 'success');
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Server is running:', data.message);
            if (data.api_configured === false) {
                showToast('⚠️ API key not configured. Check server logs.', 'error');
            }
        } else {
            showToast('⚠️ Server health check failed.', 'error');
        }
    } catch (error) {
        console.warn('❌ Server not responding. Make sure backend is running on port 5000.');
        showToast('Backend server not found. Please start the server.', 'error');
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + U to upload file
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        resumeFileInput.click();
    }
    
    // Enter to analyze (when file is selected)
    if (event.key === 'Enter' && currentFile && !analyzeBtn.disabled) {
        event.preventDefault();
        analyzeResume();
    }
    
    // Escape to remove file
    if (event.key === 'Escape' && currentFile) {
        event.preventDefault();
        removeFile();
    }
});

// Add some helpful console messages
console.log('🚀 AI Resume Analyzer Frontend Loaded');
console.log('⌨️ Keyboard shortcuts:');
console.log('  - Ctrl/Cmd + U: Upload file');
console.log('  - Enter: Analyze resume (when file selected)');
console.log('  - Escape: Remove current file');
console.log('📡 Backend should be running on http://127.0.0.1:5000');
