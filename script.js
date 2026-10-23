// Libra Library Management System
// This front-end demo saves data in this browser using localStorage.

const STORAGE_KEY = "libraLibraryDataV1";
const ACTIVITY_KEY = "libraLibraryActivityV1";
let library = loadLibrary();
let activity = loadActivity();
let toastTimer;

function loadLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.books) && Array.isArray(saved.records)) return saved;
  } catch (error) { console.warn("Could not read library data", error); }
  return { books: [], records: [] };
}
function loadActivity() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVITY_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) { return []; }
}
function saveLibrary() { localStorage.setItem(STORAGE_KEY, JSON.stringify(library)); }
function saveActivity() { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 8))); }
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function makeId() { return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
function todayString() {
  const now = new Date(), local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"});
}
function logActivity(message) {
  activity.unshift({id:makeId(),message,time:new Date().toISOString()});
  activity = activity.slice(0,8); saveActivity();
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function getBook(id) { return library.books.find(book => book.id === id); }
function issuedCount(id) { return library.records.filter(record => record.bookId === id && record.status === "Issued").length; }
function availableCount(book) { return Math.max(0, Number(book.copies) - issuedCount(book.id)); }
function refreshAll() {
  saveLibrary(); renderDashboard(); renderBooks(); renderIssueBookOptions(); renderBorrowers(); renderCategoryFilter();
}
function renderDashboard() {
  const copies = library.books.reduce((sum, book) => sum + Number(book.copies), 0);
  const issued = library.records.filter(record => record.status === "Issued").length;
  const available = library.books.reduce((sum, book) => sum + availableCount(book), 0);
  document.getElementById("stat-titles").textContent = library.books.length;
  document.getElementById("stat-copies").textContent = copies;
  document.getElementById("stat-issued").textContent = issued;
  document.getElementById("stat-available").textContent = available;
  const activityBox = document.getElementById("recent-activity");
  activityBox.innerHTML = activity.length ? activity.slice(0,5).map(item => {
    const date = new Date(item.time);
    return `<div class="activity-item"><span class="activity-icon">↗</span><div><strong>${escapeHTML(item.message)}</strong><small>${escapeHTML(date.toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}))}</small></div></div>`;
  }).join("") : '<p class="empty-state">No activity yet. Add a book to get started.</p>';
  const counts = {};
  library.books.forEach(book => counts[book.category] = (counts[book.category] || 0) + 1);
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,6);
  const categoryBox = document.getElementById("category-chart");
  categoryBox.innerHTML = entries.length ? entries.map(([name,count]) => `<div><div class="category-top"><span>${escapeHTML(name)}</span><strong>${count}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/Math.max(...entries.map(e=>e[1]))*100)}%"></div></div></div>`).join("") : '<p class="empty-state">Add books to see category information.</p>';
}
function renderCategoryFilter() {
  const select = document.getElementById("category-filter"), selected = select.value;
  const categories = [...new Set(library.books.map(book => book.category))].sort();
  select.innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  if (categories.includes(selected)) select.value = selected;
}
function renderBooks() {
  const query = document.getElementById("book-search").value.trim().toLowerCase();
  const category = document.getElementById("category-filter").value;
  const books = library.books.filter(book => `${book.title} ${book.author} ${book.isbn || ""}`.toLowerCase().includes(query) && (!category || book.category === category));
  document.getElementById("books-empty").classList.toggle("hidden", books.length > 0);
  document.getElementById("books-table").innerHTML = books.map(book => `<tr><td><span class="book-name">${escapeHTML(book.title)}</span>${book.isbn ? `<span class="book-isbn">ISBN: ${escapeHTML(book.isbn)}</span>` : ""}</td><td>${escapeHTML(book.author)}</td><td><span class="pill">${escapeHTML(book.category)}</span></td><td>${Number(book.copies)}</td><td>${availableCount(book)}</td><td><button class="table-action" data-edit="${book.id}">Edit</button><button class="table-action danger" data-delete="${book.id}">Delete</button></td></tr>`).join("");
}
function renderIssueBookOptions() {
  const select = document.getElementById("issue-book"), selected = select.value;
  const books = library.books.filter(book => availableCount(book) > 0);
  select.innerHTML = '<option value="">Select an available book</option>' + books.map(book => `<option value="${book.id}">${escapeHTML(book.title)} (${availableCount(book)} available)</option>`).join("");
  if (books.some(book => book.id === selected)) select.value = selected;
}
function renderBorrowers() {
  const filter = document.getElementById("record-filter").value;
  const records = [...library.records].filter(r => filter === "active" ? r.status === "Issued" : filter === "returned" ? r.status === "Returned" : true).sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  document.getElementById("borrowers-empty").classList.toggle("hidden", records.length > 0);
  document.getElementById("borrowers-table").innerHTML = records.map(record => {
    const book = getBook(record.bookId);
    const status = record.status === "Returned" ? '<span class="pill returned">Returned</span>' : record.dueDate < todayString() ? '<span class="pill overdue">Overdue</span>' : '<span class="pill">Issued</span>';
    const details = `${escapeHTML(record.studentId)}${record.phone ? `<span class="book-isbn">${escapeHTML(record.phone)}</span>` : ""}`;
    return `<tr><td><span class="book-name">${escapeHTML(record.name)}</span><span class="book-isbn">${details}</span></td><td>${escapeHTML(book ? book.title : "Book removed")}</td><td>${formatDate(record.issueDate)}</td><td>${formatDate(record.dueDate)}</td><td>${status}</td><td>${record.status === "Issued" ? `<button class="table-action" data-return="${record.id}">Return</button>` : "—"}</td></tr>`;
  }).join("");
}
function openBookDialog(book = null) {
  document.getElementById("book-form").reset();
  document.getElementById("book-id").value = book ? book.id : "";
  document.getElementById("book-dialog-title").textContent = book ? "Edit a book" : "Add a book";
  document.getElementById("book-title").value = book ? book.title : "";
  document.getElementById("book-author").value = book ? book.author : "";
  document.getElementById("book-category").value = book ? book.category : "";
  document.getElementById("book-isbn").value = book ? (book.isbn || "") : "";
  document.getElementById("book-copies").value = book ? book.copies : 1;
  document.getElementById("book-dialog").showModal();
}
function closeBookDialog() { document.getElementById("book-dialog").close(); }
function saveBook(event) {
  event.preventDefault();
  const id = document.getElementById("book-id").value;
  const title = document.getElementById("book-title").value.trim();
  const author = document.getElementById("book-author").value.trim();
  const category = document.getElementById("book-category").value.trim();
  const isbn = document.getElementById("book-isbn").value.trim();
  const copies = Number(document.getElementById("book-copies").value);
  if (!title || !author || !category || !Number.isInteger(copies) || copies < 1) return showToast("Please enter valid book details.");
  if (id) {
    const book = getBook(id);
    if (!book) return;
    if (copies < issuedCount(id)) return showToast(`At least ${issuedCount(id)} copies must remain because they are issued.`);
    Object.assign(book,{title,author,category,isbn,copies}); logActivity(`Updated book: ${title}`); showToast("Book details updated.");
  } else {
    library.books.push({id:makeId(),title,author,category,isbn,copies}); logActivity(`Added book: ${title}`); showToast("Book added successfully.");
  }
  closeBookDialog(); refreshAll();
}
function deleteBook(id) {
  const book = getBook(id);
  if (!book) return;
  if (issuedCount(id) > 0) return showToast("Return issued copies before deleting this book.");
  if (!confirm(`Delete "${book.title}" from the inventory?`)) return;
  library.books = library.books.filter(item => item.id !== id);
  logActivity(`Deleted book: ${book.title}`); refreshAll(); showToast("Book deleted.");
}
function issueBook(event) {
  event.preventDefault();
  const name = document.getElementById("borrower-name").value.trim();
  const studentId = document.getElementById("student-id").value.trim();
  const phone = document.getElementById("borrower-phone").value.trim();
  const bookId = document.getElementById("issue-book").value;
  const issueDate = document.getElementById("issue-date").value;
  const dueDate = document.getElementById("due-date").value;
  const book = getBook(bookId);
  if (!name || !studentId || !book || !issueDate || !dueDate) return showToast("Please complete all required fields.");
  if (dueDate < issueDate) return showToast("Due date cannot be earlier than issue date.");
  if (availableCount(book) < 1) return showToast("No copies of this book are available.");
  library.records.push({id:makeId(),name,studentId,phone,bookId,issueDate,dueDate,status:"Issued",createdAt:new Date().toISOString()});
  logActivity(`Issued "${book.title}" to ${name}`);
  document.getElementById("issue-form").reset(); setDefaultDates(); refreshAll(); showToast("Book issued successfully.");
}
function returnBook(id) {
  const record = library.records.find(item => item.id === id);
  if (!record || record.status !== "Issued") return;
  record.status = "Returned"; record.returnedAt = new Date().toISOString();
  const book = getBook(record.bookId);
  logActivity(`Returned "${book ? book.title : "a book"}" from ${record.name}`);
  refreshAll(); showToast("Book returned successfully.");
}
function setDefaultDates() {
  const today = todayString();
  document.getElementById("issue-date").value = today;
  const due = new Date(`${today}T00:00:00`); due.setDate(due.getDate() + 14);
  document.getElementById("due-date").value = new Date(due.getTime() - due.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.add("hidden"));
  document.getElementById(`${name}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active",button.dataset.view === name));
  document.getElementById("page-title").textContent = ({dashboard:"Dashboard",books:"Book Inventory",borrowers:"Borrowers"})[name] || "Dashboard";
}
document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
document.getElementById("quick-add-book").addEventListener("click", () => {showView("books");openBookDialog();});
document.getElementById("add-book-btn").addEventListener("click", () => openBookDialog());
document.getElementById("close-dialog").addEventListener("click", closeBookDialog);
document.getElementById("cancel-dialog").addEventListener("click", closeBookDialog);
document.getElementById("book-form").addEventListener("submit", saveBook);
document.getElementById("issue-form").addEventListener("submit", issueBook);
document.getElementById("book-search").addEventListener("input", renderBooks);
document.getElementById("category-filter").addEventListener("change", renderBooks);
document.getElementById("record-filter").addEventListener("change", renderBorrowers);
document.getElementById("books-table").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]"), del = event.target.closest("[data-delete]");
  if (edit) openBookDialog(getBook(edit.dataset.edit));
  if (del) deleteBook(del.dataset.delete);
});
document.getElementById("borrowers-table").addEventListener("click", event => {
  const button = event.target.closest("[data-return]");
  if (button) returnBook(button.dataset.return);
});
setDefaultDates();
refreshAll();
