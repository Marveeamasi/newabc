import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyARsN-63d0r7so5ytt6RmYMjMyVJ6Rpw8c",
  authDomain: "abcd-c7e89.firebaseapp.com",
  projectId: "abcd-c7e89",
  storageBucket: "abcd-c7e89.firebasestorage.app",
  messagingSenderId: "689449277919",
  appId: "1:689449277919:web:c2fc6277911b214ae58c6a"
};
window.firebaseApp = initializeApp(firebaseConfig);

// Initialize Supabase
window.supabase = createClient(
  'https://bedbewwjsflzqkosjlng.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGJld3dqc2ZsenFrb3NqbG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MjAzNDEsImV4cCI6MjA2NjM5NjM0MX0.7rDu4ifFPFYKpfOS7kKbjJeVJkAkHKkewEKAlCNZqo4'
);

const appState = {
  loading: false,
  error: '',
  activeIndex: 1,
  dynamicBg: 'images/img9.jpeg',
  pdfs: [
    { title: "Contact Address", subtitle: "A few minutes ago", imageUrl: "images/img10.jpeg" },
    { title: "Specification", subtitle: "An hour ago", imageUrl: "images/img9.jpeg" },
    { title: "Company Presentation", subtitle: "A few hours ago", imageUrl: "images/img11.jpeg" }
  ]
};

async function uploadImageToSupabase(imageFile) {
  try {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 500,
      useWebWorker: true,
      fileType: 'image/webp'
    };
    const compressedImage = await imageCompression(imageFile, options);
    if (!compressedImage) throw new Error('Image compression failed');

    const uniqueFileName = `image_${Date.now()}_${compressedImage.name}`;
    const filePath = `images/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await window.supabase.storage
      .from('images')
      .upload(filePath, compressedImage);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = window.supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('Image URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('uploadImageToSupabase error:', error);
    throw error;
  }
}

function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

async function fetchPdfs() {
  if (!window.firebaseApp) {
    console.error('Firebase app not initialized');
    appState.error = 'Database not available';
    return;
  }
  appState.loading = true;
  try {
    const db = getDatabase(window.firebaseApp);
    const pdfsRef = ref(db, 'profilerpdf');
    const snapshot = await new Promise((resolve, reject) => {
      onValue(pdfsRef, resolve, reject, { onlyOnce: true });
    });
    if (snapshot.exists()) {
      const data = snapshot.val();
      appState.pdfs = appState.pdfs.map((pdf, index) => ({
        ...pdf,
        title: data[`form${index + 1}`]?.title || pdf.title,
        subtitle: data[`form${index + 1}`]?.subtitle || pdf.subtitle,
        imageUrl: data[`form${index + 1}`]?.imageUrl || pdf.imageUrl
      }));
      renderPdfs();
    } else {
      console.warn('No data found at path: profilerpdf');
      appState.error = 'No PDF data found in database';
    }
  } catch (err) {
    console.error('Error fetching PDFs from Firebase:', err);
    appState.error = 'Failed to fetch data from database';
  } finally {
    appState.loading = false;
    renderPdfs();
  }
}

function renderPdfs() {
  const pdfSlides = document.getElementById('pdfSlides');
  if (!pdfSlides) {
    console.error('pdfSlides element not found');
    return;
  }
  pdfSlides.innerHTML = appState.pdfs.map((pdf, index) => `
    <div class="slide" data-index="${index}" style="${index === appState.activeIndex ? 'transform: scale(1.1); border: 1px solid rgba(0,0,0,0.231);' : 'transform: scale(1);'}">
      ${appState.loading ? `
        <div style="width: 100%; height: 100%; background-color: #6b7280; color: white; display: flex; align-items: center; justify-content: center;">
          Loading...
        </div>
      ` : `
        <div style="position: relative; width: 100%; height: 100%;">
          <img src="${pdf.imageUrl}" alt="Document ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
          <div class="overlay">
            <div class="file-name">${pdf.title}</div>
            <div class="file-time">${pdf.subtitle}</div>
          </div>
        </div>
      `}
    </div>
  `).join('');
  attachSlideListeners();
}

function showWarning(img, index) {
  if (appState.loading) {
    console.warn('Data is still loading. Please wait.');
    appState.error = 'Please wait while data is loading.';
    document.getElementById('error').textContent = appState.error;
    return;
  }
  if (img && index !== undefined) {
    appState.activeIndex = index;
    appState.dynamicBg = img;
    const dynamicBgElement = document.getElementById('dynamicBg');
    if (dynamicBgElement) {
      dynamicBgElement.src = img;
    } else {
      console.error('dynamicBg element not found');
    }
    renderPdfs();
  }
  
}

async function fetchForms() {
  if (!window.firebaseApp) {
    console.error('Firebase app not initialized');
    return;
  }
  const id = getQueryParam('id');
  if (id !== 'qwerty') {
    console.log('Invalid admin ID, redirecting to index.html');
    window.location.href = 'index.html';
    return;
  }
  try {
    const db = getDatabase(window.firebaseApp);
    const [form1Snapshot, form2Snapshot, form3Snapshot, form4Snapshot] = await Promise.all([
      new Promise((resolve, reject) => onValue(ref(db, 'profilerpdf/form1'), resolve, reject, { onlyOnce: true })),
      new Promise((resolve, reject) => onValue(ref(db, 'profilerpdf/form2'), resolve, reject, { onlyOnce: true })),
      new Promise((resolve, reject) => onValue(ref(db, 'profilerpdf/form3'), resolve, reject, { onlyOnce: true })),
    ]);
    const form1Data = form1Snapshot.val() || {};
    const form2Data = form2Snapshot.val() || {};
    const form3Data = form3Snapshot.val() || {};
    const form1Title = document.getElementById('form1-title');
    const form1Subtitle = document.getElementById('form1-subtitle');
    const form2Title = document.getElementById('form2-title');
    const form2Subtitle = document.getElementById('form2-subtitle');
    const form3Title = document.getElementById('form3-title');
    const form3Subtitle = document.getElementById('form3-subtitle');
    if (form1Title) form1Title.value = form1Data.title || '';
    if (form1Subtitle) form1Subtitle.value = form1Data.subtitle || '';
    if (form2Title) form2Title.value = form2Data.title || '';
    if (form2Subtitle) form2Subtitle.value = form2Data.subtitle || '';
    if (form3Title) form3Title.value = form3Data.title || '';
    if (form3Subtitle) form3Subtitle.value = form3Data.subtitle || '';
  } catch (error) {
    console.error('Error fetching forms:', error);
    appState.error = `Failed to fetch forms: ${error.message}`;
    alert(appState.error);
  }
}

async function handleAdminSubmit(event, formId) {
  event.preventDefault();
  const submitButton = document.getElementById(`${formId}-submit`);
  submitButton.disabled = true;
  submitButton.textContent = 'Updating...';
  try {
    const db = getDatabase(window.firebaseApp);
    const formRef = ref(db, `profilerpdf/${formId}`);
    const snapshot = await new Promise((resolve, reject) => onValue(formRef, resolve, reject, { onlyOnce: true }));
    const existingData = snapshot.val() || {};
    let updatedData = { ...existingData };
   
      const title = document.getElementById(`${formId}-title`).value;
      const subtitle = document.getElementById(`${formId}-subtitle`).value;
      const imageFile = document.getElementById(`${formId}-image`).files[0];
      if (title) updatedData.title = title;
      if (subtitle) updatedData.subtitle = subtitle;
      if (imageFile) {
        updatedData.imageUrl = await uploadImageToSupabase(imageFile);
      }
    await set(formRef, updatedData);
    console.log(`Form ${formId} updated successfully`);
    alert(`Form ${formId} updated successfully`);
      document.getElementById(`${formId}-title`).value = '';
      document.getElementById(`${formId}-subtitle`).value = '';
      document.getElementById(`${formId}-image`).value = '';
  } catch (error) {
    console.error(`Error updating form ${formId}:`, error);
    appState.error = `Failed to update form: ${error.message}`;
    alert(appState.error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Update';
  }
}

function attachSlideListeners() {
  const slides = document.querySelectorAll('.slide');
  slides.forEach(slide => {
    slide.addEventListener('click', () => {
      const index = parseInt(slide.dataset.index);
      showWarning(appState.pdfs[index].imageUrl, index);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    fetchPdfs();
  } else if (window.location.pathname.includes('admin.html')) {
    fetchForms();
    ['form1', 'form2', 'form3'].forEach(formId => {
      const form = document.getElementById(formId);
      if (form) {
        form.addEventListener('submit', (event) => handleAdminSubmit(event, formId));
      }
    });
  }
});