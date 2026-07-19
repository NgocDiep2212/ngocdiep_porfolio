(function () {
  var launcher = document.getElementById("chat-launcher");
  var panel = document.getElementById("chat-panel");
  var closeBtn = document.getElementById("chat-close");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var sendBtn = document.getElementById("chat-send");
  var messages = document.getElementById("chat-messages");
  var suggestions = document.getElementById("chat-suggestions");
  var hint = document.getElementById("chat-hint");
  var hintTimer = null;

  if (!launcher || !panel || !form || !input || !messages) return;

  var meta = document.querySelector('meta[name="portfolio-chat-api"]');
  var API_URL = (meta && meta.getAttribute("content")) || "/api/chat";

  var DEFAULT_SUGGESTIONS = [
    "How many years of experience?",
    "Tell me about the RAG triage project",
    "Diep có nhận remote không?",
    "What AI tools does Diep use?",
  ];

  var SECTION_LABEL = {
    projects: "Project",
    experience: "Experience",
    faq: "FAQ",
    skills: "Skills",
    profile: "Profile",
    career: "Career",
    education: "Education",
    links: "Links",
  };

  var clientHits = [];
  // Soft cap for recruiters exploring the portfolio (not spam-tight)
  var CLIENT_LIMIT = 40;
  var CLIENT_WINDOW_MS = 60 * 60 * 1000;
  var MIN_GAP_MS = 1500;
  var lastAskAt = 0;

  function hideChatHint() {
    if (!hint || hint.hidden) return;
    hint.classList.remove("is-visible");
    hint.classList.add("is-hiding");
    launcher.classList.remove("is-hinting");
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    setTimeout(function () {
      hint.hidden = true;
      hint.classList.remove("is-hiding");
    }, 450);
    try {
      sessionStorage.setItem("portfolio_chat_hint_seen", "1");
    } catch (e) {}
  }

  function showChatHint() {
    if (!hint) return;
    try {
      if (sessionStorage.getItem("portfolio_chat_hint_seen") === "1") return;
    } catch (e) {}
    hint.hidden = false;
    // next frame so transition runs
    requestAnimationFrame(function () {
      hint.classList.add("is-visible");
      launcher.classList.add("is-hinting");
    });
    hintTimer = setTimeout(hideChatHint, 4500);
  }

  function openPanel() {
    hideChatHint();
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    input.focus();
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Lightweight markdown → HTML (bold + line breaks + bullets). Escapes first. */
  function formatAnswerHtml(text) {
    var safe = escapeHtml(text || "");
    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/(^|\n)\*\s+/g, "$1• ");
    safe = safe.replace(/(^|\n)-\s+/g, "$1• ");
    safe = safe.replace(/\n/g, "<br>");
    return safe;
  }

  function citationLabel(c) {
    var section = SECTION_LABEL[c.section] || c.section || "Source";
    var title = (c.title || c.doc_id || "").replace(/^Q:\s*/i, "");
    return section + " · " + title;
  }

  function appendBubble(text, role, citations) {
    var el = document.createElement("div");
    el.className = "chat-bubble " + role;

    if (role === "bot") {
      var body = document.createElement("div");
      body.className = "chat-answer";
      body.innerHTML = formatAnswerHtml(text);
      el.appendChild(body);
    } else {
      el.textContent = text;
    }

    if (citations && citations.length) {
      var wrap = document.createElement("div");
      wrap.className = "chat-citations";
      var label = document.createElement("div");
      label.className = "chat-citations-label";
      label.textContent = "Sources";
      wrap.appendChild(label);
      citations.slice(0, 3).forEach(function (c) {
        var chip = document.createElement("span");
        chip.className = "chat-cite";
        chip.textContent = citationLabel(c);
        wrap.appendChild(chip);
      });
      el.appendChild(wrap);
    }

    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function renderSuggestions(list) {
    suggestions.innerHTML = "";
    (list || DEFAULT_SUGGESTIONS).forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-sug";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        input.value = label;
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      });
      suggestions.appendChild(btn);
    });
  }

  function clientRateOk() {
    var now = Date.now();
    if (now - lastAskAt < MIN_GAP_MS) return "slow";
    clientHits = clientHits.filter(function (t) {
      return now - t < CLIENT_WINDOW_MS;
    });
    if (clientHits.length >= CLIENT_LIMIT) return "limit";
    clientHits.push(now);
    lastAskAt = now;
    return "ok";
  }

  async function ask(question) {
    var rate = clientRateOk();
    if (rate === "slow") {
      appendBubble("Please wait a moment before sending another question.", "bot");
      return;
    }
    if (rate === "limit") {
      appendBubble(
        "You've reached the hourly chat limit. Please try again later, or email ngocdiep04112002@gmail.com.",
        "bot"
      );
      return;
    }

    appendBubble(question, "user");
    var typing = appendBubble("Thinking…", "bot");
    typing.classList.add("typing");
    sendBtn.disabled = true;
    input.disabled = true;

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      typing.remove();
      if (!res.ok) {
        appendBubble(
          data.error ||
            "Chat is temporarily unavailable. Please email ngocdiep04112002@gmail.com.",
          "bot"
        );
        return;
      }
      appendBubble(data.answer || "No answer returned.", "bot", data.citations || []);
      if (data.suggested_followups && data.suggested_followups.length) {
        renderSuggestions(data.suggested_followups);
      }
    } catch (err) {
      typing.remove();
      appendBubble(
        "Could not reach the chat API. If you are browsing the static site, deploy the Vercel API and set meta portfolio-chat-api.",
        "bot"
      );
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", function () {
    if (panel.classList.contains("is-open")) closePanel();
    else openPanel();
  });
  if (closeBtn) closeBtn.addEventListener("click", closePanel);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = (input.value || "").trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });

  appendBubble(
    "Hi — ask me about Diep's experience, projects, skills, or availability. I answer only from the portfolio knowledge base.",
    "bot"
  );
  renderSuggestions(DEFAULT_SUGGESTIONS);

  // First-visit nudge toward the chat button
  setTimeout(showChatHint, 700);
  if (hint) {
    hint.addEventListener("click", function () {
      openPanel();
    });
  }
})();
