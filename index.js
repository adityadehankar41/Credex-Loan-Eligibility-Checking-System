// ── STATE ──
const pages = ['home', 'products', 'loans', 'offers', 'news', 'netbanking'];
let isLoggedIn = false;
let loggedInUser = '';
let pendingLoanType = null;
const registeredUsers = {};

// ── PAGE NAVIGATION ──
function showPage(name) {
  pages.forEach(function (p) {
    document.getElementById('page-' + p).classList.remove('active');
    var el = document.getElementById('nav-' + p);
    if (el) el.classList.remove('active');
  });
  document.getElementById('page-' + name).classList.add('active');
  var navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');
  document.getElementById('main-footer').style.display = name === 'netbanking' ? 'none' : 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTab(el) {
  document.querySelectorAll('.nb-tab').forEach(function (t) { t.classList.remove('active'); });
  el.classList.add('active');
}

// ── NAVBAR ──
function updateNavForLogin() {
  var navBtn = document.querySelector('.nav-btn');
  var existing = document.querySelector('.nav-user-info');
  if (existing) existing.remove();
  if (isLoggedIn) {
    navBtn.style.display = 'none';
    var userInfo = document.createElement('div');
    userInfo.className = 'nav-user-info';
    userInfo.innerHTML = '<span class="nav-user-badge">👤 ' + loggedInUser + '</span><button class="nav-logout" onclick="logout()">Logout</button>';
    navBtn.parentNode.insertBefore(userInfo, navBtn.nextSibling);
  } else {
    navBtn.style.display = '';
  }
}

function logout() {
  isLoggedIn = false; loggedInUser = '';
  updateNavForLogin();
}

// ── NET BANKING LOGIN ──
function handleLogin() {
  var id = document.getElementById('nb-id').value.trim();
  var pw = document.getElementById('nb-pw').value.trim();
  if (!id || !pw) { alert('Please enter your Customer ID and Password.'); return; }
  if (registeredUsers.hasOwnProperty(id) && registeredUsers[id] !== pw) { alert('Incorrect PIN. Please try again.'); return; }
  isLoggedIn = true; loggedInUser = id;
  updateNavForLogin();
  alert('Login Successful! Welcome, ' + id + '!');
  showPage('home');
}

// ── LOAN MODAL OPEN/CLOSE ──
function openModal(type) {
  if (!isLoggedIn) { pendingLoanType = type; openLoginGate(type); return; }
  document.getElementById('modal-title').textContent = 'Apply for ' + type;
  var sel = document.getElementById('Loan_Purpose');
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].text.includes(type)) { sel.selectedIndex = i; break; }
  }
  document.getElementById('loan-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('loan-modal').classList.remove('open');
}

document.getElementById('loan-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// ════════════════════════════════
//  SUBMIT LOAN → BACKEND API
//  POST http://localhost:8000/predict
//  Response: { "prediction": 1 | 0 }
// ════════════════════════════════
async function submitLoanApp() {
  var income = document.getElementById('Applicant_Income').value;
  var loan = document.getElementById('Loan_Amount').value;
  var credit = document.getElementById('Credit_Score').value;
  var errEl = document.getElementById('loan-form-error');

  if (!income || !loan || !credit) {
    errEl.style.display = 'block';
    errEl.textContent = 'Please fill in required fields.';
    return;
  }
  errEl.style.display = 'none';

  // ✅ GET PHONE CORRECTLY
const phone = document.getElementById("phone").value;


  // ✅ PAYLOAD
  var payload = {
    Applicant_Income: parseFloat(document.getElementById('Applicant_Income').value) || 0,
    Coapplicant_Income: parseFloat(document.getElementById('Coapplicant_Income').value) || 0,
    Age: parseInt(document.getElementById('Age').value) || 0,
    Dependents: parseInt(document.getElementById('Dependents').value) || 0,
    Credit_Score: parseFloat(document.getElementById('Credit_Score').value) || 0,
    Existing_Loans: parseInt(document.getElementById('Existing_Loans').value) || 0,
    DTI_Ratio: parseFloat(document.getElementById('DTI_Ratio').value) || 0,
    Savings: parseFloat(document.getElementById('Savings').value) || 0,
    Collateral_Value: parseFloat(document.getElementById('Collateral_Value').value) || 0,
    Loan_Amount: parseFloat(document.getElementById('Loan_Amount').value) || 0,
    Loan_Term: parseInt(document.getElementById('Loan_Term').value) || 0,
    Education_Level: parseInt(document.getElementById('Education_Level').value) || 0,
    Gender: document.getElementById('Gender').value,
    Marital_Status: document.getElementById('Marital_Status').value,
    Employment_Status: document.getElementById('Employment_Status').value,
    Property_Area: document.getElementById('Property_Area').value,
    Loan_Purpose: document.getElementById('Loan_Purpose').value,
    Employer_Category: document.getElementById('Employer_Category').value,
    phone: phone   // ✅ FIXED
  };

  var submitBtn = document.querySelector('#loan-modal .modal-submit');
  var originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Processing...';

  try {
    var response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Server error");

    var data = await response.json();
    console.log("Backend Response:", data); // ✅ DEBUG

    closeModal();

    // ✅ SAFE CHECK
    if (data && typeof data.prediction !== "undefined") {
      showLoanResult(data.prediction, phone); // pass phone
    } else {
      alert("Invalid response from server");
    }

  } catch (err) {
    errEl.style.display = 'block';
    errEl.textContent = '⚠️ Server not running on localhost:8000';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ════════════════════════════════
//  SHOW RESULT  (banner only)
//  prediction: 1 = Approved
//              0 = Rejected
// ════════════════════════════════
function showLoanResult(prediction, phone) {
  var banner = document.getElementById('result-banner');
  var icon = document.getElementById('result-icon');
  var status = document.getElementById('result-status');
  var msg = document.getElementById('result-msg');

  let message = "";

  if (prediction === 1) {
    banner.style.background = '#f0fdf4';
    banner.style.border = '2px solid #86efac';
    icon.textContent = '🎉';
    status.style.color = '#15803d';
    status.textContent = 'Loan Approved!';
    msg.style.color = '#166534';
    msg.textContent = 'Your loan is approved!';

    message = "🎉 Your loan is APPROVED! Credex will contact you soon.";
  } else {
    banner.style.background = '#fef2f2';
    banner.style.border = '2px solid #fca5a5';
    icon.textContent = '❌';
    status.style.color = '#991b1b';
    status.textContent = 'Not Approved';
    msg.style.color = '#7f1d1d';
    msg.textContent = 'Your loan is not approved.';

    message = "❌ Your loan is NOT approved. Try again later.";
  }

  document.getElementById('loan-result-modal').classList.add('open');

  // ✅ WHATSAPP OPEN
  fetch('http://localhost:8000/send-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phone,
      message: message
    })
  })
    .then(res => res.json())
    .then(data => console.log("WhatsApp sent:", data))
    .catch(err => console.error("WhatsApp error:", err));
}

function closeLoanResult() {
  document.getElementById('loan-result-modal').classList.remove('open');
}

document.getElementById('loan-result-modal').addEventListener('click', function (e) {
  if (e.target === this) closeLoanResult();
});

// ── LOGIN GATE ──
function openLoginGate(loanType) {
  document.getElementById('gate-loan-hint').textContent = 'Please log in or register to apply for ' + loanType + '.';
  document.getElementById('gate-id').value = '';
  document.getElementById('gate-pw').value = '';
  document.getElementById('gate-error').style.display = 'none';
  document.getElementById('new-username').value = '';
  document.getElementById('new-pin').value = '';
  document.getElementById('new-pin-confirm').value = '';
  document.getElementById('new-mobile').value = '';
  document.getElementById('new-customer-error').style.display = 'none';
  var hasRegistered = Object.keys(registeredUsers).length > 0;
  document.getElementById('new-customer-panel').style.display = hasRegistered ? 'none' : 'block';
  document.getElementById('already-registered-note').style.display = hasRegistered ? 'block' : 'none';
  document.getElementById('login-gate-modal').classList.add('open');
}

function closeLoginGate() {
  document.getElementById('login-gate-modal').classList.remove('open');
  pendingLoanType = null;
}

document.getElementById('login-gate-modal').addEventListener('click', function (e) {
  if (e.target === this) closeLoginGate();
});

function handleGateLogin() {
  var id = document.getElementById('gate-id').value.trim();
  var pw = document.getElementById('gate-pw').value.trim();
  var errEl = document.getElementById('gate-error');
  if (!id || !pw) { errEl.style.display = 'block'; errEl.textContent = 'Please enter your Customer ID and Password / PIN.'; return; }
  if (registeredUsers.hasOwnProperty(id) && registeredUsers[id] !== pw) { errEl.style.display = 'block'; errEl.textContent = 'Incorrect PIN. Please try again.'; return; }
  errEl.style.display = 'none';
  isLoggedIn = true; loggedInUser = id;
  updateNavForLogin();
  document.getElementById('login-gate-modal').classList.remove('open');
  if (pendingLoanType) { var type = pendingLoanType; pendingLoanType = null; openModal(type); }
}

function registerNewCustomer() {
  var username = document.getElementById('new-username').value.trim();
  var pin = document.getElementById('new-pin').value.trim();
  var pinConf = document.getElementById('new-pin-confirm').value.trim();
  var mobile = document.getElementById('new-mobile').value.trim();
  var errEl = document.getElementById('new-customer-error');
  if (!username) { errEl.style.display = 'block'; errEl.textContent = 'Please choose a username.'; return; }
  if (username.length < 4) { errEl.style.display = 'block'; errEl.textContent = 'Username must be at least 4 characters.'; return; }
  if (registeredUsers.hasOwnProperty(username)) { errEl.style.display = 'block'; errEl.textContent = 'Username already taken.'; return; }
  if (!/^\d{6}$/.test(pin)) { errEl.style.display = 'block'; errEl.textContent = 'PIN must be exactly 6 digits.'; return; }
  if (pin !== pinConf) { errEl.style.display = 'block'; errEl.textContent = 'PINs do not match.'; return; }
  if (!mobile || mobile.replace(/\D/g, '').length < 10) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid 10-digit mobile number.'; return; }
  registeredUsers[username] = pin;
  errEl.style.display = 'none';
  isLoggedIn = true; loggedInUser = username;
  updateNavForLogin();
  document.getElementById('login-gate-modal').classList.remove('open');
  var type = pendingLoanType || 'Loan'; pendingLoanType = null;
  document.getElementById('modal-title').textContent = 'Apply for ' + type;
  document.getElementById('loan-modal').classList.add('open');
}

// ── OPEN ACCOUNT MODAL ──
function openAccountModal() {
  accShowStep(1);
  ['acc-name', 'acc-dob', 'acc-mobile', 'acc-email', 'acc-pan', 'acc-aadhaar', 'acc-income', 'acc-city', 'acc-address', 'acc-username', 'acc-pin', 'acc-pin-confirm'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  ['acc-error-1', 'acc-error-2', 'acc-error-3'].forEach(function (id) { document.getElementById(id).style.display = 'none'; });
  document.getElementById('account-modal').classList.add('open');
}

function closeAccountModal() { document.getElementById('account-modal').classList.remove('open'); }

document.getElementById('account-modal').addEventListener('click', function (e) { if (e.target === this) closeAccountModal(); });

function accShowStep(step) {
  [1, 2, 3].forEach(function (s) {
    document.getElementById('acc-step-' + s).style.display = s === step ? 'block' : 'none';
    var dot = document.getElementById('step-dot-' + s);
    if (s < step) { dot.style.background = '#16a34a'; dot.style.color = 'white'; dot.textContent = '✓'; }
    else if (s === step) { dot.style.background = '#0d1b3e'; dot.style.color = 'white'; dot.textContent = s; }
    else { dot.style.background = '#e5e7eb'; dot.style.color = '#9ca3af'; dot.textContent = s; }
  });
  document.getElementById('step-line-1').style.background = step > 1 ? '#16a34a' : '#e5e7eb';
  document.getElementById('step-line-2').style.background = step > 2 ? '#16a34a' : '#e5e7eb';
}

function accStep1Next() {
  var name = document.getElementById('acc-name').value.trim(), dob = document.getElementById('acc-dob').value,
    mobile = document.getElementById('acc-mobile').value.trim(), email = document.getElementById('acc-email').value.trim(),
    pan = document.getElementById('acc-pan').value.trim(), aadhaar = document.getElementById('acc-aadhaar').value.trim(),
    errEl = document.getElementById('acc-error-1');
  if (!name) { errEl.style.display = 'block'; errEl.textContent = 'Please enter your full name.'; return; }
  if (!dob) { errEl.style.display = 'block'; errEl.textContent = 'Please enter your date of birth.'; return; }
  if (!mobile || mobile.replace(/\D/g, '').length < 10) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid mobile number.'; return; }
  if (!email || !email.includes('@')) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid email.'; return; }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid PAN (e.g. ABCDE1234F).'; return; }
  if (aadhaar.length !== 12) { errEl.style.display = 'block'; errEl.textContent = 'Aadhaar must be exactly 12 digits.'; return; }
  errEl.style.display = 'none'; accShowStep(2);
}

function accStep2Next() {
  var income = document.getElementById('acc-income').value.trim(), city = document.getElementById('acc-city').value.trim(),
    address = document.getElementById('acc-address').value.trim(), errEl = document.getElementById('acc-error-2');
  if (!income || isNaN(income) || parseFloat(income) <= 0) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid annual income.'; return; }
  if (!city) { errEl.style.display = 'block'; errEl.textContent = 'Please enter your preferred branch city.'; return; }
  if (!address) { errEl.style.display = 'block'; errEl.textContent = 'Please enter your residential address.'; return; }
  errEl.style.display = 'none'; accShowStep(3);
}

function accStep2Back() { accShowStep(1); }
function accStep3Back() { accShowStep(2); }

function submitAccountApp() {
  // var username = document.getElementById('acc-username').value.trim(), pin = document.getElementById('acc-pin').value.trim(),
  //   pinConf = document.getElementById('acc-pin-confirm').value.trim(), errEl = document.getElementById('acc-error-3');
  // if (!username || username.length < 4) { errEl.style.display = 'block'; errEl.textContent = 'Username must be at least 4 characters.'; return; }
  // if (registeredUsers.hasOwnProperty(username)) { errEl.style.display = 'block'; errEl.textContent = 'Username already taken. Please choose another.'; return; }
  // if (!/^\d{6}$/.test(pin)) { errEl.style.display = 'block'; errEl.textContent = 'PIN must be exactly 6 digits.'; return; }
  // if (pin !== pinConf) { errEl.style.display = 'block'; errEl.textContent = 'PINs do not match.'; return; }
  // registeredUsers[username] = pin;
  // isLoggedIn = true; loggedInUser = username;
  // updateNavForLogin();
  // closeAccountModal();
  // var name = document.getElementById('acc-name').value.trim();
  // var type = document.getElementById('acc-type').value;
  // alert('🎉 Account Application Submitted!\n\nWelcome, ' + name + '!\nYour ' + type + ' application is under review.\nYou are now logged in as: ' + username + '\n\nA Credex representative will contact you within 24 hours.');

  let income = document.getElementById("Applicant_Income").value;
  let loan = document.getElementById("Loan_Amount").value;
  let credit = document.getElementById("Credit_Score").value;
  let phone = document.getElementById("loan-phone").value;
  alert("Button Clicked"); // DEBUG
  if (!income || !loan || !credit || !phone) {
    alert("Please fill all required fields");
    return;
  }

  let message = `📄 *New Loan Application*%0A
👤 Phone: ${phone}%0A
💰 Income: ₹${income}%0A
🏦 Loan Amount: ₹${loan}%0A
📊 Credit Score: ${credit}`;

  sendToWhatsApp(message);

}

// ── EMI CALCULATOR ──
function calcEMI() {
  var P = parseFloat(document.getElementById('calc-amount').value);
  var n = parseFloat(document.getElementById('calc-tenure').value) * 12;
  var selectedRate = parseFloat(document.getElementById('calc-type').value);
  document.getElementById('calc-rate').value = selectedRate;
  var r = selectedRate / 12 / 100;
  var emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  var totalPay = emi * n, totalInt = totalPay - P;
  document.getElementById('disp-amount').textContent = '₹' + formatNum(P);
  document.getElementById('disp-tenure').textContent = document.getElementById('calc-tenure').value + ' Years';
  document.getElementById('disp-rate').textContent = selectedRate.toFixed(2) + '%';
  document.getElementById('res-emi').textContent = '₹' + formatNum(Math.round(emi));
  document.getElementById('res-principal').textContent = '₹' + shortNum(P);
  document.getElementById('res-interest').textContent = '₹' + shortNum(Math.round(totalInt));
  document.getElementById('res-total').textContent = '₹' + shortNum(Math.round(totalPay));
}

function formatNum(n) { return n.toLocaleString('en-IN'); }
function shortNum(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000) return (n / 100000).toFixed(2) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}

// ── INIT ──
document.getElementById('main-footer').style.display = 'block';
calcEMI();
function sendToWhatsApp(message) {
  const phone = "91XXXXXXXXXX"; // ← put your WhatsApp number (with country code, no +)
  
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  
  window.open(url, "_blank");
}