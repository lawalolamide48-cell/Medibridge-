(function () {
  const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
  const PROJECT_OWNER = "lawalolamide48-cell";
  const fallbackDepartments = [
    { slug: "cardiology", name: "Cardiology", category: "Medical", icon: "❤️", specialists: 5, summary: "Heart and cardiovascular care.", overview: "Care for heart health, blood pressure, rhythm concerns, and prevention.", services: ["Blood pressure care", "ECG review", "Chest pain assessment"], doctors: ["Dr. Amelia Chen"], whenToVisit: ["Chest pain", "Palpitations"] },
    { slug: "neurology", name: "Neurology", category: "Medical", icon: "🧠", specialists: 5, summary: "Brain and nervous system care.", overview: "Support for headaches, seizures, weakness, memory, and nerve symptoms.", services: ["Headache care", "Seizure evaluation", "Stroke follow-up"], doctors: ["Dr. Emily Carter"], whenToVisit: ["Severe headaches", "Weakness"] },
    { slug: "pediatrics", name: "Pediatrics", category: "Women & Children", icon: "🧒", specialists: 5, summary: "Healthcare for children and teens.", overview: "Child-focused illness care, vaccines, growth, nutrition, and family guidance.", services: ["Well-child checks", "Vaccines", "Fever care"], doctors: ["Dr. Ada Bello"], whenToVisit: ["Fever", "Routine immunization"] },
    { slug: "general-practice", name: "General Practice", category: "Medical", icon: "🩺", specialists: 5, summary: "Primary care and referrals.", overview: "The first stop for common symptoms, prevention, chronic conditions, and referrals.", services: ["General consultation", "Medication review", "Referrals"], doctors: ["Dr. Sarah Johnson"], whenToVisit: ["New symptoms", "Checkups"] }
  ];

  const escapeHTML = value => String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function addOwnership() {
    const hero = document.querySelector(".hero-inner");
    if (hero && !hero.querySelector(".project-credit")) {
      hero.insertAdjacentHTML("beforeend", `<div class="project-credit">A full-stack healthcare project by ${PROJECT_OWNER}</div>`);
    }

    document.querySelectorAll(".footer-inner, .site-footer").forEach(footer => {
      if (!footer.querySelector(".owner-ribbon")) {
        footer.insertAdjacentHTML("beforeend", `<span class="owner-ribbon">Project by ${PROJECT_OWNER}</span>`);
      }
    });

    document.querySelectorAll("a").forEach(link => {
      const label = link.textContent.trim().toLowerCase();
      if (label === "privacy policy") link.href = "privacy.html";
      if (label === "terms of service" || label === "terms") link.href = "terms.html";
    });
  }

  async function getDepartments() {
    try {
      const data = await api("/api/departments");
      return data.departments || fallbackDepartments;
    } catch {
      return fallbackDepartments;
    }
  }

  function detailHTML(dept, dashboard = false) {
    const services = (dept.services || []).map(item => `<li>${escapeHTML(item)}</li>`).join("");
    const doctors = (dept.doctors || []).map(item => `<li>${escapeHTML(item)}</li>`).join("");
    const visits = (dept.whenToVisit || []).map(item => `<li>${escapeHTML(item)}</li>`).join("");
    const bookAction = dashboard ? "openBookModal()" : "window.location.href='auth.html'";
    return `
      <div class="dept-detail-card" tabindex="-1">
        <div class="dept-detail-top">
          <div class="dept-detail-title">
            <div class="dept-detail-icon">${escapeHTML(dept.icon)}</div>
            <div>
              <h2>${escapeHTML(dept.name)}</h2>
              <div class="dept-detail-category">${escapeHTML(dept.category)} · ${Number(dept.specialists || 0)} Specialists</div>
            </div>
          </div>
          <button class="dept-detail-close" type="button" aria-label="Close department details" onclick="this.closest('.dept-detail-panel').hidden = true">×</button>
        </div>
        <div class="dept-detail-body">
          <div>
            <p>${escapeHTML(dept.overview || dept.summary)}</p>
            <h3>Services</h3>
            <ul class="dept-detail-list">${services}</ul>
          </div>
          <aside class="dept-detail-side">
            <h3>When to visit</h3>
            <ul class="dept-detail-list">${visits}</ul>
            <h3 style="margin-top:18px;">Care team</h3>
            <ul class="dept-detail-list">${doctors}</ul>
          </aside>
        </div>
        <div class="dept-detail-actions">
          <button class="btn-primary btn-book" type="button" onclick="${bookAction}">Book Appointment</button>
          <button class="btn-view-dept" type="button" onclick="window.MediBridge.askAI('What should I prepare for a ${escapeHTML(dept.name)} appointment?')">Ask AI about this department</button>
        </div>
      </div>`;
  }

  function showDepartmentDetail(dept, dashboard = false) {
    const grid = dashboard ? document.querySelector(".dept-grid-dash") : document.querySelector(".dept-cards-grid");
    if (!grid) return;
    let panel = grid.parentElement.querySelector(".dept-detail-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "dept-detail-panel";
      grid.insertAdjacentElement("afterend", panel);
    }
    panel.hidden = false;
    panel.innerHTML = detailHTML(dept, dashboard);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    panel.querySelector(".dept-detail-card")?.focus();
  }

  function renderLandingDepartments(departments) {
    const homeGrid = document.querySelector("#page-home .dept-grid");
    if (homeGrid) {
      homeGrid.innerHTML = departments.slice(0, 8).map(dept => `
        <button class="dept-card" type="button" data-dept="${escapeHTML(dept.slug)}">
          <div class="dept-icon">${escapeHTML(dept.icon)}</div>
          <h3>${escapeHTML(dept.name)}</h3>
        </button>`).join("");
    }

    const fullGrid = document.querySelector("#page-departments .dept-cards-grid");
    if (fullGrid) {
      fullGrid.innerHTML = departments.map(dept => `
        <article class="dept-card-full" tabindex="0" role="button" data-dept="${escapeHTML(dept.slug)}" data-category="${escapeHTML(dept.category)}">
          <span class="dept-specialist-badge">${Number(dept.specialists || 0)} Specialists</span>
          <div class="dept-icon">${escapeHTML(dept.icon)}</div>
          <h3>${escapeHTML(dept.name)}</h3>
          <p>${escapeHTML(dept.summary)}</p>
          <button class="btn-view-dept" type="button">View Department</button>
        </article>`).join("");
    }

    document.querySelectorAll("#page-home .dept-card, #page-departments .dept-card-full").forEach(card => {
      const dept = departments.find(item => item.slug === card.dataset.dept);
      card.addEventListener("click", event => {
        event.preventDefault();
        if (document.getElementById("page-departments")) window.showPage?.("page-departments");
        if (dept) setTimeout(() => showDepartmentDetail(dept), 50);
      });
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") card.click();
      });
    });
  }

  function renderDashboardDepartments(departments) {
    const grid = document.querySelector(".dept-grid-dash");
    if (!grid) return;
    grid.innerHTML = departments.map(dept => `
      <button class="dept-dash-card" type="button" data-dept="${escapeHTML(dept.slug)}">
        <div class="dept-dash-icon">${escapeHTML(dept.icon)}</div>
        <div class="dept-dash-name">${escapeHTML(dept.name)}</div>
        <div class="dept-dash-count">${Number(dept.specialists || 0)} Specialists</div>
      </button>`).join("");
    grid.querySelectorAll(".dept-dash-card").forEach(card => {
      const dept = departments.find(item => item.slug === card.dataset.dept);
      card.addEventListener("click", () => dept && showDepartmentDetail(dept, true));
    });
  }

  function localMedicalFallback(message) {
    const text = String(message || "").toLowerCase();
    if (["chest pain", "cannot breathe", "trouble breathing", "stroke", "severe bleeding"].some(word => text.includes(word))) {
      return "This may be urgent. Please seek emergency care now or call your local emergency number if symptoms are severe, sudden, or worsening.";
    }
    if (text.includes("headache")) return "Headaches can come from stress, dehydration, poor sleep, eye strain, migraine, or infection. Seek care urgently for sudden severe headache, weakness, confusion, fever with stiff neck, vision loss, or worsening symptoms.";
    if (text.includes("fever")) return "Fever often points to infection or inflammation. Rest, drink fluids, and monitor it. Seek care for high fever, dehydration, confusion, breathing problems, stiff neck, rash, or symptoms that persist.";
    if (text.includes("medicine") || text.includes("medication")) return "Please follow your clinician's instructions and do not change doses without medical advice. A pharmacist or doctor can check side effects and interactions safely.";
    return "I can share general health guidance, but I cannot diagnose you. Please describe when it started, severity, related symptoms, medicines taken, and any warning signs. Contact a clinician if symptoms are severe, sudden, or worsening.";
  }

  async function askMedicalAI(message) {
    try {
      const data = await api("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message })
      });
      return data.reply;
    } catch {
      return localMedicalFallback(message);
    }
  }

  function setTyping(containerId, rowClass, avatarClass, bubbleClass) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    const div = document.createElement("div");
    div.className = rowClass;
    div.innerHTML = `<div class="${avatarClass}">🏥</div><div class="${bubbleClass} typing">MediBridge AI is thinking...</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  window.sendAiMsg = async function sendAiMsg() {
    const input = document.getElementById("ai-input");
    const text = input?.value.trim();
    if (!text) return;
    window.addUserMsg?.(text);
    input.value = "";
    const typing = setTyping("ai-messages", "ai-msg-row", "ai-avatar", "ai-bubble");
    const reply = await askMedicalAI(text);
    typing?.remove();
    window.addAiMsg?.(reply);
  };

  window.sendChip = async function sendChip(btn) {
    const text = btn.textContent.trim();
    window.addUserMsg?.(text);
    const typing = setTyping("ai-messages", "ai-msg-row", "ai-avatar", "ai-bubble");
    const reply = await askMedicalAI(text);
    typing?.remove();
    window.addAiMsg?.(reply);
  };

  window.sendDashAiMsg = async function sendDashAiMsg() {
    const input = document.getElementById("dash-ai-input");
    const text = input?.value.trim();
    if (!text) return;
    window.addDashUserMsg?.(text);
    input.value = "";
    const typing = setTyping("dash-ai-messages", "ai-row", "ai-bot-icon", "ai-msg-bubble");
    const reply = await askMedicalAI(text);
    typing?.remove();
    window.addDashAiMsg?.(reply);
  };

  window.sendDashChip = async function sendDashChip(btn) {
    const text = btn.textContent.trim();
    window.addDashUserMsg?.(text);
    const typing = setTyping("dash-ai-messages", "ai-row", "ai-bot-icon", "ai-msg-bubble");
    const reply = await askMedicalAI(text);
    typing?.remove();
    window.addDashAiMsg?.(reply);
  };

  window.MediBridge = {
    askAI(question) {
      const dashboardInput = document.getElementById("dash-ai-input");
      const publicInput = document.getElementById("ai-input");
      if (dashboardInput) {
        window.switchPage?.("ai");
        dashboardInput.value = question;
        window.sendDashAiMsg();
        return;
      }
      if (publicInput) {
        window.showPage?.("page-ai");
        publicInput.value = question;
        window.sendAiMsg();
      }
    }
  };

  async function wireAuth() {
    if (!document.getElementById("login-id")) return;
    const originalLogin = window.handleLogin;
    let activationVerificationId = "";
    let lastActivationPayload = null;
    window.handleLogin = async function handleLogin() {
      const patientId = document.getElementById("login-id").value.trim();
      const password = document.getElementById("login-pw").value.trim();
      if (!patientId || !password) return window.showToast?.("Please fill in all fields");
      try {
        window.showToast?.("Signing in...");
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ patientId, password })
        });
        localStorage.setItem("medibridgeUser", JSON.stringify(data.user));
        setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
      } catch (error) {
        window.showToast?.(`${error.message}. Demo login: MB-2026-001 / password123`);
        if (typeof originalLogin === "function") setTimeout(originalLogin, 1200);
      }
    };

    window.handleIdentity = async function handleIdentity() {
      const patientId = document.getElementById("signup-id").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const phone = document.getElementById("signup-phone").value.trim();
      if (!patientId || !email || !phone) return window.showToast?.("Please fill in all fields");
      try {
        window.showToast?.("Sending secure verification code...");
        const data = await api("/api/auth/activate", { method: "POST", body: JSON.stringify({ patientId, email, phone }) });
        activationVerificationId = data.verificationId;
        lastActivationPayload = { patientId, email, phone };
        const delivered = (data.delivery || []).filter(item => item.sent).map(item => item.channel).join(" and ");
        window.showToast?.(data.setupRequired
          ? "OTP generated, but email/SMS providers need setup on the server."
          : `Verification code sent by ${delivered || "email/SMS"}.`);
        setTimeout(() => window.showScreen?.("screen-signup-2"), 900);
      } catch (error) {
        window.showToast?.(error.message || "Could not send verification code");
      }
    };

    window.resendCode = async function resendCode() {
      const payload = lastActivationPayload || {
        patientId: document.getElementById("signup-id").value.trim(),
        email: document.getElementById("signup-email").value.trim(),
        phone: document.getElementById("signup-phone").value.trim()
      };
      if (!payload.patientId || !payload.email || !payload.phone) return window.showToast?.("Enter your details first");
      try {
        window.showToast?.("Sending a new code...");
        const data = await api("/api/auth/activate", { method: "POST", body: JSON.stringify(payload) });
        activationVerificationId = data.verificationId;
        lastActivationPayload = payload;
        document.querySelectorAll(".otp-input").forEach(input => {
          input.value = "";
          input.classList.remove("filled");
        });
        window.startOTPTimer?.();
        window.showToast?.(data.setupRequired ? "Provider setup needed before real delivery works." : "New verification code sent.");
      } catch (error) {
        window.showToast?.(error.message || "Could not resend code");
      }
    };

    window.handleOTP = async function handleOTP() {
      const otpInputs = document.querySelectorAll(".otp-input");
      const code = [...otpInputs].map(input => input.value).join("");
      if (code.length < 6) return window.showToast?.("Please enter the 6-digit code");
      if (!activationVerificationId) return window.showToast?.("Please request a new code first");
      try {
        window.showToast?.("Verifying code...");
        await api("/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ verificationId: activationVerificationId, code })
        });
        window.showToast?.("Verification successful");
        setTimeout(() => window.showScreen?.("screen-signup-3"), 700);
      } catch (error) {
        window.showToast?.(error.message || "Incorrect verification code");
      }
    };

    window.handleForgot = async function handleForgot() {
      const email = document.getElementById("forgot-email").value.trim();
      if (!email) return window.showToast?.("Please enter your email address");
      try {
        window.showToast?.("Sending password reset code...");
        const data = await api("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email })
        });
        window.showToast?.(data.setupRequired ? "Provider setup needed before real delivery works." : "Password reset code sent.");
        setTimeout(() => window.showScreen?.("screen-reset"), 1200);
      } catch (error) {
        window.showToast?.(error.message || "Could not send password reset code");
      }
    };
  }

  document.addEventListener("DOMContentLoaded", async () => {
    addOwnership();
    wireAuth();
    const departments = await getDepartments();
    renderLandingDepartments(departments);
    renderDashboardDepartments(departments);
  });
})();
