/**
 * BIZCORE - Dynamic Data Fetcher & Renderer (CMS via Google Apps Script)
 * File: function.js
 * * Deskripsi: Mengambil data dari Google Sheet API (Apps Script)
 * dan merendernya secara dinamis ke halaman web.
 */

// --- 1. CONFIGURATION ---
const API_CONFIG = {
  // Ganti URL ini dengan URL Web App (Deploy) dari Google Apps Script kamu nanti
  BASE_URL:
    "https://script.google.com/macros/s/AKfycby53_2mjt7wZaRYHuJ4K4s2xdAnkP5VGDWm4jjdcNL-CozKRVBcro3ltcA_5bBNHgG5/exec",
  LIMIT_HOMEPAGE: 3,
};

// --- 2. DOM ELEMENTS DETECTION ---
// Mendeteksi halaman aktif berdasarkan elemen unik yang ada di halaman tersebut
const DOM = {
  servicesGrid: document.querySelector("#services .grid-3"),
  portfolioGrid: document.querySelector("#portfolio .grid-3"),
  reviewsGrid: document.querySelector("#clients .grid-3"),
  // Elemen khusus di sub-page (jika ada)
  isServicesPage: window.location.pathname.includes("services.html"),
  isPortfolioPage: window.location.pathname.includes("portfolio.html"),
};

// --- 3. API SERVICE LAYER ---
// Bertugas murni untuk mengambil data mentah dari API
async function fetchDataFromCMS() {
  try {
    const response = await fetch(API_CONFIG.BASE_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return data; // Ekspektasi return: { services: [...], portfolio: [...], reviews: [...] }
  } catch (error) {
    console.error("Gagal mengambil data dari CMS Google Script:", error);
    return null;
  }
}

// --- HELPER FUNCTION: OPTIMASI GAMBAR GOOGLE DRIVE ---
// Fungsi ini otomatis mendeteksi link GDrive dan mengecilkan ukurannya secara real-time lewat server Google
function optimizeDriveImage(url, maxWidth = 600) {
  if (!url)
    return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80"; // Placeholder jika kosong

  // let urlStr = url.toString().trim();

  // Cek apakah ini link Google Drive
  if (url.includes("drive.google.com")) {
    let fileId = "";

    // Pola 1: Link sharing biasa (/file/d/FILE_ID/view)
    if (url.includes("/file/d/")) {
      fileId = url.split("/file/d/")[1].split("/")[0];
    }
    // Pola 2: Link lama (id=FILE_ID)
    else if (url.includes("id=")) {
      fileId = url.split("id=")[1].split("&")[0];
    }

    if (fileId) {
      // FIX: Tambahkan $ di {fileId} dan gunakan https:// agar aman saat online
      return `https://lh3.googleusercontent.com/d/${fileId}=w${maxWidth}`;
    }
  }

  // Jika bukan link drive (misal link unsplash biasa), kembalikan url asli
  return url;
}

// --- 4. TEMPLATE HTML BUILDERS ---
// Fungsi pembentuk komponen HTML (Bisa di-style sesuka hati, konsisten dengan HTML statis sebelumnya)
const Templates = {
  serviceCard(item, delay) {
    const gambarRaw =
      item.icon ||
      item["link gambar pelayanan"] ||
      item["Link Gambar Pelayanan"];
    // Kompres gambar lewat helper function sebelum ditampilkan
    const gambarFix = optimizeDriveImage(gambarRaw, 600);

    return `
            <div class="card service-card" data-aos="fade-up" data-aos-delay="${delay}">
                <div class="service-img-wrapper">
                    <img src="${gambarFix}" alt="${item.title}" class="service-card-img">
                </div>
                <div class="service-card-body">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="booking-action" onclick="openQuotationModal('${item.title}')" style="margin-top: 15px; font-weight: 600; color: #3498db; font-size: 14px; cursor: pointer;">
                        Minta Penawaran <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
                    </div>
                </div>
            </div>
        `;
  },

  portfolioItem(item, delay) {
    console.log("Data Portfolio dari Sheets:", item);
    // 1. Ambil data link dari kolom spreadsheet (misal: item.project_url atau item.link)
    const projectLink = item.project_url || item.link || "";
    const gambarRaw =
      item.image ||
      item["link gambar portfolio"] ||
      item["Link Gambar Portfolio"];
    const gambarFix = optimizeDriveImage(gambarRaw, 600);

    // 2. Siapkan HTML isi portfolio bawaan template lu
    const itemContent = `
        <div class="portfolio-item" data-aos="zoom-in" data-aos-delay="${delay}">
            <img src="${gambarFix}" alt="${item.title}" class="service-card-img">
            <div class="portfolio-overlay">
                <h4>${item.title}</h4>
                <p>${item.category}</p>
            </div>
        </div>
    `;

    // 3. Logika: Jika ada link, bungkus dengan tag <a>. Jika kosong, biarkan normal.
    if (projectLink) {
      return `
            <a href="${projectLink}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block; color: inherit;">
                ${itemContent}
            </a>
        `;
    } else {
      return itemContent;
    }
  },

  reviewCard(item, delay) {
    // Logika untuk mencetak bintang kuning & abu-abu
    let starHTML = "";
    const rating = parseInt(item.rating) || 5;
    for (let i = 1; i <= 5; i++) {
      starHTML +=
        i <= rating
          ? '<i class="fas fa-star"></i>'
          : '<i class="far fa-star"></i>';
    }

    return `
            <div class="card review-card" data-aos="fade-up" data-aos-delay="${delay}">
                <div class="client-info">
                    
                    <div>
                        <h4>${item.name}</h4>
                        <p class="client-company">${item.company}</p>
                    </div>
                </div>
                <div class="stars">${starHTML}</div>
                <p class="review-text">"${item.review}"</p>
            </div>
        `;
  },

  skeletonLoader() {
    return `<div class="text-center" style="grid-column: 1/-1; padding: 20px; color: var(--text-light);">
                    <i class="fas fa-spinner fa-spin"></i> Loading data...
                </div>`;
  },
};

// --- 5. RENDER ENGINE ---
// Mengatur logika distribusi data (kapan harus dipotong maks 3, kapan harus ditampilkan semua)
function renderContent(data) {
  if (!data) return;
  console.log("=== DATA DARI GOOGLE APPS SCRIPT ===", data);
  // A. RENDER SERVICES
  if (DOM.servicesGrid) {
    DOM.servicesGrid.innerHTML = "";
    // Jika di halaman index, batasi 3. Jika di halaman services.html, tampilkan semua (6+).
    // Memastikan data.services ada dulu, kalau gak ada otomatis jadi array kosong []
    const servicesData = data && data.services ? data.services : [];
    const servicesToRender = DOM.isServicesPage
      ? servicesData
      : servicesData.slice(0, API_CONFIG.LIMIT_HOMEPAGE);

    servicesToRender.forEach((item, index) => {
      const delay = (index + 1) * 100;
      DOM.servicesGrid.innerHTML += Templates.serviceCard(item, delay);
    });
  }

  // B. RENDER PORTFOLIO
  if (DOM.portfolioGrid) {
    DOM.portfolioGrid.innerHTML = "";
    // Memastikan data.portfolio ada dulu, kalau gak ada otomatis jadi array kosong []
    const portfolioData = data && data.portfolio ? data.portfolio : [];
    const portfolioToRender = DOM.isPortfolioPage
      ? portfolioData
      : portfolioData.slice(0, API_CONFIG.LIMIT_HOMEPAGE);

    portfolioToRender.forEach((item, index) => {
      const delay = (index + 1) * 100;
      DOM.portfolioGrid.innerHTML += Templates.portfolioItem(item, delay);
    });
  }

  // C. RENDER REVIEWS (Hanya ada di Landing Page)
  if (DOM.reviewsGrid && data.reviews) {
    DOM.reviewsGrid.innerHTML = "";
    const reviewsToRender = data.reviews.slice(0, API_CONFIG.LIMIT_HOMEPAGE);

    reviewsToRender.forEach((item, index) => {
      const delay = (index + 1) * 100;
      DOM.reviewsGrid.innerHTML += Templates.reviewCard(item, delay);
    });
  }

  // Refresh AOS setelah element baru disuntikkan ke DOM agar animasinya berjalan
  if (typeof AOS !== "undefined") {
    AOS.refresh();
  }
}

// --- 6. INITIALIZER ---
// Fungsi yang otomatis berjalan saat halaman web selesai dimuat
document.addEventListener("DOMContentLoaded", async () => {
  // Pasang loader singkat sebelum data muncul
  if (DOM.servicesGrid) DOM.servicesGrid.innerHTML = Templates.skeletonLoader();
  if (DOM.portfolioGrid)
    DOM.portfolioGrid.innerHTML = Templates.skeletonLoader();
  if (DOM.reviewsGrid) DOM.reviewsGrid.innerHTML = Templates.skeletonLoader();

  // Jalankan proses ambil data dan render
  const cmsData = await fetchDataFromCMS();
  renderContent(cmsData);
});

// Ubah di function.js agar bisa dipanggil dari mana saja:
window.openQuotationModal = function (serviceName) {
  const modal = document.getElementById("quoteModal");
  if (modal) {
    modal.style.display = "flex";
    // const selectService = document.getElementById('quote-service');
    // if (selectService && serviceName) {
    //     selectService.value = serviceName;
    // }
  }
};

window.closeQuotationModal = function () {
  const modal = document.getElementById("quoteModal");
  if (modal) modal.style.display = "none";
};

const quotationForm = document.getElementById("quotation-form");

if (quotationForm) {
  let isSubmittingQuote = false;

  quotationForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (isSubmittingQuote) return;

    // Simpan referensi form agar tidak error pas panggil .reset() nanti
    const formElement = this;
    const submitBtn = formElement.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    isSubmittingQuote = true;
    submitBtn.textContent = "Mengirim...";
    submitBtn.disabled = true;

    const payload = {
      type: "quotation",
      company: document.getElementById("quote-company").value,
      service: document.getElementById("quote-service").value,
      budget: document.getElementById("quote-budget").value,
      deadline: document.getElementById("quote-deadline").value,
      detail: document.getElementById("quote-detail").value,
    };

    try {
      const response = await fetch(API_CONFIG.BASE_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const resultText = await response.text();

      if (
        resultText === "SUCCESS" ||
        resultText.includes('"status":"success"')
      ) {
        if (resultText.includes("Duplikat")) {
          Swal.fire({
            icon: "warning",
            title: "Permintaan Duplikat",
            text: "Permintaan quotation serupa sudah terkirim sebelumnya. Mohon tunggu respons kami.",
            confirmButtonColor: "#2563eb",
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "Quotation Terkirim!",
            text: "Permintaan quotation berhasil dikirim! Detail proyek sudah masuk ke database dan email admin.",
            confirmButtonColor: "#2563eb",
          });
        }

        formElement.reset(); // 🔥 FIX 2: Pakai referensi yang aman, bukan 'this.reset()'

        if (window.closeQuotationModal) {
          window.closeQuotationModal();
        } else if (typeof closeQuotationModal === "function") {
          closeQuotationModal();
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Gagal mengirim quotation: " + resultText,
          footer: '<a href="#">Kenapa masalah ini terjadi?</a>',
        });
      }
    } catch (error) {
      console.error("Error sending quotation:", error);
      Swal.fire({
        icon: "error",
        title: "Koneksi Terganggu",
        text: "Permintaan anda sedang diproses, terima kasih! Jika tidak ada email konfirmasi, silakan hubungi admin.",
        footer: '<a href="#">Kenapa masalah ini terjadi?</a>',
      });
      formElement.reset(); // 🔥 FIX 2: Diubah juga disini
      if (window.closeQuotationModal) window.closeQuotationModal();
    } finally {
      isSubmittingQuote = false;
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  });
}
