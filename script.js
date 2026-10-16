/* ===== Hàm tiện ích ===== */
const $  = (s, p = document) => p.querySelector(s);          // lấy 1 phần tử
const $$ = (s, p = document) => [...p.querySelectorAll(s)];  // lấy nhiều phần tử
const load = (k) => JSON.parse(localStorage.getItem(k) || "[]"); // đọc dữ liệu đã lưu
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v)); // lưu dữ liệu

/* ===== 1. Menu điện thoại (nút ☰) ===== */
const toggle = $(".menu-toggle");
if (toggle) toggle.addEventListener("click", () => $(".nav-links").classList.toggle("open"));

/* ===== 2. Tô sáng trang hiện tại trên menu ===== */
const page = location.pathname.split("/").pop() || "home.html";
$$(".nav-links a").forEach((a) => {
  if (a.getAttribute("href") === page) a.classList.add("active");
});

/* ===== 3. Yêu thích (lưu bằng localStorage) ===== */
function updateFavButtons() {
  const favs = load("wishlist");
  $$(".card[data-id]").forEach((card) => {
    const btn = $(".btn-fav", card);
    const on = favs.some((f) => f.id === card.dataset.id);
    btn.textContent = on ? "♥ Đã lưu" : "♡ Yêu thích";
    btn.classList.toggle("saved", on);
  });
  syncModalFav();
}
function toggleFav(card) {
  let favs = load("wishlist");
  const d = card.dataset;
  if (favs.some((f) => f.id === d.id)) favs = favs.filter((f) => f.id !== d.id);
  else favs.push({ id: d.id, name: d.name, kind: d.kind, address: d.address });
  save("wishlist", favs);
  updateFavButtons();
}
$$(".card .btn-fav").forEach((b) => b.addEventListener("click", () => toggleFav(b.closest(".card"))));

/* ===== 4. Bộ lọc + tìm kiếm ===== */
const filters = { area: "all", type: "all", cat: "all", price: "all", q: "" };
function applyFilters() {
  $$(".card[data-id]").forEach((card) => {
    let show = true;
    for (const g of ["area", "type", "cat", "price"]) {
      if (filters[g] !== "all" && card.dataset[g] !== filters[g]) show = false;
    }
    if (filters.q && !card.dataset.name.toLowerCase().includes(filters.q)) show = false;
    card.hidden = !show;
  });
  $("#empty").hidden = $$(".card[data-id]:not([hidden])").length > 0;
}
$$(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    $$(`.chip[data-group="${chip.dataset.group}"]`).forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filters[chip.dataset.group] = chip.dataset.value;
    applyFilters();
  })
);
if ($("#empty")) {
  // Lấy từ khóa từ ô tìm kiếm ở trang chủ (đường dẫn dạng du-lich.html?q=...)
  filters.q = (new URLSearchParams(location.search).get("q") || "").toLowerCase().trim();
  applyFilters();
}

/* ===== 5. Cửa sổ chi tiết (modal) ===== */
const modal = $("#modal");
let current = null;
function openModal(card) {
  current = card;
  const d = card.dataset;
  $("#m-title").textContent = d.name;
  $("#m-img").setAttribute("style", $(".thumb", card).getAttribute("style") || "");
  $("#m-gallery").innerHTML = [1, 2, 3]
    .map((i) => `<div class="thumb" style="--img:url('images/${d.id}-${i}.jpg')"></div>`)
    .join("");
  $("#m-desc").textContent = d.desc;
  $("#m-info").innerHTML =
    `<li><b>Địa chỉ:</b> ${d.address}</li>` +
    `<li><b>Giờ mở cửa / bán:</b> ${d.hours}</li>` +
    `<li><b>Giá tham khảo:</b> ${d.pricetext}</li>` +
    (d.review ? `<li><b>Review ngắn:</b> ${d.review}</li>` : "");
  $("#m-near").textContent = d.near;
  $("#m-map").src = "https://maps.google.com/maps?q=" + encodeURIComponent(d.name + ", Hà Nội") + "&output=embed";
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  syncModalFav();
}
function closeModal() {
  modal.hidden = true;
  $("#m-map").src = "";
  document.body.style.overflow = "";
}
function syncModalFav() {
  if (!modal || !current) return;
  const on = load("wishlist").some((f) => f.id === current.dataset.id);
  $("#m-fav").textContent = on ? "♥ Đã lưu" : "♡ Yêu thích";
}
if (modal) {
  $$(".btn-detail").forEach((b) => b.addEventListener("click", () => openModal(b.closest(".card"))));
  $("#m-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  $("#m-fav").addEventListener("click", () => toggleFav(current));
}
updateFavButtons();

/* ===== 6. Planner: tab, yêu thích, lịch trình riêng ===== */
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $$(".panel").forEach((p) => (p.hidden = p.id !== tab.dataset.panel));
  })
);

// Vẽ lại 2 danh sách: Yêu thích và Lịch trình của tôi
function renderPlanner() {
  if (!$("#wishlist")) return;
  const favs = load("wishlist"), plan = load("plan");
  $("#wishlist").innerHTML = favs.length
    ? favs.map((f) => `<li><div><b>${f.name}</b><span class="note">${f.kind} · ${f.address}</span></div>
        <div><button class="btn btn-small" data-add="${f.id}">+ Lịch trình</button>
        <button class="btn btn-ghost btn-small" data-del="${f.id}">Xóa</button></div></li>`).join("")
    : '<li class="empty">Chưa có mục yêu thích. Hãy chọn ở ô "Thêm nhanh" phía trên.</li>';
  $("#plan").innerHTML = plan.length
    ? plan.map((f, i) => `<li><div><b>${i + 1}. ${f.name}</b><span class="note">${f.kind}</span></div>
        <div><button class="btn btn-ghost btn-small" data-up="${i}" ${i === 0 ? "disabled" : ""}>▲</button>
        <button class="btn btn-ghost btn-small" data-down="${i}" ${i === plan.length - 1 ? "disabled" : ""}>▼</button>
        <button class="btn btn-ghost btn-small" data-rm="${f.id}">Bỏ</button></div></li>`).join("")
    : '<li class="empty">Bấm "+ Lịch trình" để ghép thành lịch trình riêng của bạn.</li>';
}

// Bấm các nút trong danh sách: thêm vào lịch trình, xóa, bỏ, đổi thứ tự
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-add],[data-del],[data-rm],[data-up],[data-down]");
  if (!b) return;
  let favs = load("wishlist"), plan = load("plan");
  const d = b.dataset;
  if (d.add) {
    const f = favs.find((x) => x.id === d.add);
    if (f && !plan.some((p) => p.id === f.id)) plan.push(f);
  }
  if (d.del) favs = favs.filter((x) => x.id !== d.del);
  if (d.rm) plan = plan.filter((x) => x.id !== d.rm);
  if (d.up) { const i = +d.up; if (i > 0) { [plan[i - 1], plan[i]] = [plan[i], plan[i - 1]]; } }
  if (d.down) { const i = +d.down; if (i < plan.length - 1) { [plan[i + 1], plan[i]] = [plan[i], plan[i + 1]]; } }
  save("wishlist", favs); save("plan", plan);
  renderPlanner();
});

// Ô "Thêm nhanh": chọn địa điểm / quán ăn ngay tại trang Planner
function addFromSelect(alsoPlan) {
  const o = $("#add-select").selectedOptions[0];
  const item = { id: o.value, name: o.dataset.name, kind: o.dataset.kind, address: o.dataset.address };
  const favs = load("wishlist"), plan = load("plan");
  if (!favs.some((f) => f.id === item.id)) favs.push(item);
  if (alsoPlan && !plan.some((p) => p.id === item.id)) plan.push(item);
  save("wishlist", favs); save("plan", plan);
  renderPlanner();
}
if ($("#add-select")) {
  $("#add-fav").addEventListener("click", () => addFromSelect(false));
  $("#add-plan").addEventListener("click", () => addFromSelect(true));
}
renderPlanner();

/* ===== 7. Kiểm tra form liên hệ ===== */
const form = $("#contact-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();          // chặn gửi form để tự kiểm tra
    let ok = true;
    function check(id, isValid, message) {
      const input = $("#" + id), error = $("#" + id + "-error");
      const bad = !isValid(input.value.trim());
      error.textContent = bad ? message : "";
      input.classList.toggle("invalid", bad);
      if (bad) ok = false;
    }
    check("name", (v) => v.length >= 2, "Vui lòng nhập họ tên (ít nhất 2 ký tự).");
    check("email", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email chưa đúng định dạng.");
    check("message", (v) => v.length >= 10, "Nội dung cần ít nhất 10 ký tự.");
    $("#form-success").hidden = !ok;
    if (ok) form.reset();
  });
}

/* ===== 8. Hiệu ứng: đổ bóng menu, hiện dần khi cuộn, đếm số ===== */
const navBar = $(".nav");
window.addEventListener("scroll", () => navBar.classList.toggle("scrolled", window.scrollY > 20));

function countUp(el) {
  const end = +el.dataset.count;
  let n = 0;
  const timer = setInterval(() => {
    n++;
    el.textContent = n;
    if (n >= end) clearInterval(timer);
  }, 90);
}
// IntersectionObserver: báo khi phần tử xuất hiện trên màn hình
const observer = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    el.classList.add("show");
    observer.unobserve(el);
    const num = el.querySelector("[data-count]");
    if (num) countUp(num);
    // Sau khi hiện xong, bỏ class để hiệu ứng hover của card hoạt động bình thường
    setTimeout(() => { el.classList.remove("reveal", "show"); el.style.transitionDelay = ""; }, 900);
  });
}, { threshold: 0.12 });
$$(".card, .box, h2, .stat").forEach((el, i) => {
  el.classList.add("reveal");
  el.style.transitionDelay = (i % 3) * 0.08 + "s";
  observer.observe(el);
});
