// --- INITIALIZE AOS (Animation On Scroll) ---
AOS.init({
  once: true, // Animasi hanya berjalan sekali saat di-scroll ke bawah
  offset: 120, // Jarak memicu animasi (px)
});

// --- STICKY NAVBAR EFFECT ---
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("sticky");
  } else {
    navbar.classList.remove("sticky");
  }
});

// --- TOGGLE MOBILE MENU ---
const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

menuToggle.addEventListener("click", () => {
  navMenu.classList.toggle("active");
  // Ubah icon menu bar jadi icon silang (X) saat aktif
  const icon = menuToggle.querySelector("i");
  icon.classList.toggle("fa-bars");
  icon.classList.toggle("fa-times");
});

// Tutup menu mobile ketika link di klik
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("active");
    const icon = menuToggle.querySelector("i");
    icon.classList.add("fa-bars");
    icon.classList.remove("fa-times");
  });
});

// --- INTERACTIVE GIVE US RATING FEATURE ---
// --- INTERACTIVE GIVE US RATING FEATURE (UPDATED) ---
const stars = document.querySelectorAll("#rating-stars i");
const ratingStarsContainer = document.getElementById("rating-stars");
const ratingMessage = document.getElementById("rating-message");
const ratingForm = document.getElementById("rating-form");

stars.forEach((star) => {
  // Efek Hover (Saat mouse masuk)
  star.addEventListener("mouseover", function () {
    const value = this.getAttribute("data-value");
    highlightStars(value);
  });

  // Reset bintang jika tidak di-klik (Saat mouse keluar)
  star.addEventListener("mouseout", function () {
    const currentRating = ratingStarsContainer.getAttribute("data-rated");
    highlightStars(currentRating);
  });

  // Mengunci nilai rating saat klik
  star.addEventListener("click", function () {
    const value = this.getAttribute("data-value");
    ratingStarsContainer.setAttribute("data-rated", value);
    ratingMessage.style.color = "var(--primary-color)";
    ratingMessage.textContent = `Anda memilih ${value} bintang.`;
  });
});

function highlightStars(value) {
  stars.forEach((star) => {
    if (parseInt(star.getAttribute("data-value")) <= parseInt(value)) {
      star.classList.replace("far", "fas");
    } else {
      star.classList.replace("fas", "far");
    }
  });
}

// Handling Submit Form Rating
// A. Handle Submit Form Contact Us
const contactForm = document.getElementById("feedback-form");

if (contactForm) {
    let isSubmitting = false;

    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 1. Jika sedang proses kirim, blokir klik susulan
        if (isSubmitting) return;

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // 2. Kunci tombol secara fisik dan logika
        isSubmitting = true;
        submitBtn.textContent = "Mengirim Pesan...";
        submitBtn.disabled = true;

        const payload = {
            type: "contact",
            name: document.getElementById('contact-name').value, // Sesuaikan ID input lu
            email: document.getElementById('contact-email').value, // Sesuaikan ID input lu
            message: document.getElementById('contact-message').value // Sesuaikan ID input lu
        };

        try {
            // 3. Kirim via fetch normal tanpa no-cors, karena Apps Script sudah pakai MimeType.TEXT
            const response = await fetch(API_CONFIG.BASE_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            
            const resultText = await response.text();
            
            if (resultText === "SUCCESS" || resultText.includes('"status":"success"')) {
                // Jika suksesnya ternyata karena mendeteksi data duplikat
                if (resultText.includes("Duplikat")) {
                    alert('Ulasan/Pesan ini sudah terkirim sebelumnya. Terima kasih!');
                } else {
                    // Sukses murni kiriman pertama
                    alert('Terima kasih! Pesan Anda telah berhasil dikirim. Silakan cek email Anda untuk surat konfirmasi.');
                }
                this.reset(); // Kosongkan form setelah sukses
            } else {
                alert('Gagal mengirim pesan: ' + resultText);
            }

        } catch (error) {
            console.error("Error sending contact data:", error);
            // Fallback aman: jika network sukses tapi browser telat baca status
            alert('Pesan Anda sedang diproses, terima kasih!');
            this.reset();
        } finally {
            // 4. Buka kembali kunci tombol setelah semua proses kelar
            isSubmitting = false;
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// B. Handle Submit Form Rating
if (ratingForm) {
    // Tameng utama di luar event listener untuk mencegah double submit di level logika
    let isSubmitting = false;

    ratingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Jika sedang ada proses kirim yang berjalan, langsung blokir klik susulan!
        if (isSubmitting) return;

        const finalRating = ratingStarsContainer.getAttribute('data-rated');
        if (finalRating === "0") {
            ratingMessage.style.color = "#dc2626";
            ratingMessage.textContent = "Silakan pilih rating bintang terlebih dahulu!";
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // Aktifkan status submitting dan kunci tombol secara fisik
        isSubmitting = true;
        submitBtn.textContent = "Mengirim Ulasan...";
        submitBtn.disabled = true;

        const payload = {
            type: "rating",
            name: document.getElementById('reviewer-name').value,
            company: document.getElementById('reviewer-company').value,
            review: document.getElementById('reviewer-desc').value,
            rating: finalRating
        };

        try {
            // METODE FIRE-AND-FORGET: Kirim ke Google Apps Script tanpa await JSON yang bikin macet
            fetch(API_CONFIG.BASE_URL, {
                method: "POST",
                mode: "no-cors", // bypass CORS agar request aman sampai ke server Google
                body: JSON.stringify(payload)
            });
            
            // Langsung eksekusi notifikasi sukses tanpa nungguin respons hang dari browser
            if (parseInt(finalRating) === 5) {
                alert('Terima kasih! Ulasan bintang 5 Anda telah disimpan dan akan langsung ditampilkan di halaman utama.');
            } else {
                alert('Terima kasih atas masukannya! Ulasan Anda telah kami simpan sebagai bahan evaluasi internal perusahaan.');
            }
            
            // Reset form dan bintang-bintang ke kondisi awal
            this.reset();
            ratingStarsContainer.setAttribute('data-rated', '0');
            if (typeof highlightStars === 'function') highlightStars(0);
            ratingMessage.textContent = "";
            
            // Kasih jeda waktu 2 detik sebelum reload data agar Google Sheets selesai menulis data di background
            if (typeof fetchDataFromCMS === 'function') {
                setTimeout(async () => {
                    const freshData = await fetchDataFromCMS();
                    if (typeof renderContent === 'function') renderContent(freshData);
                }, 2000);
            }

        } catch (error) {
            console.error("Error sending rating data:", error);
            alert('Terjadi kesalahan jaringan saat mengirim ulasan.');
        } finally {
            // Setelah seluruh proses kelar, buka kembali kunci tombolnya
            isSubmitting = false;
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// --- ACTIVE LINK ON SCROLL ---
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (pageYOffset >= sectionTop - 200) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href").includes(current)) {
      link.classList.add("active");
    }
  });
});

// --- SIMPLE FORM HANDLING ---
// document.getElementById('feedback-form').addEventListener('submit', function(e) {
//     e.preventDefault();
//     alert('Terima kasih! Pesan Anda telah terkirim.');
//     this.reset();
// });
