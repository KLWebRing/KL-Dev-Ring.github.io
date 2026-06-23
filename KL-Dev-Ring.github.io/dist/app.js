/**
 * app.js - Main Application Entrypoint & 3D Bridge
 * Connects the 3D World engine with interactive HUD modals, local registries,
 * and dynamic GitHub profiles.
 */

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { initWorld } from "./world.js";
import { fetchGitHubProfile } from "./github.js";
import { initials, buildProfileHTML } from "./utils.js";

const state = {
  data: null,
  nodes: [],
  active: null,
  query: "",
  activeTab: "all-time",
  activeModal: null
};

const $ = (selector) => document.querySelector(selector);

async function init() {
  // 1. Fetch registry data
  try {
    state.data = await fetch("./data/network.json").then((res) => res.json());
    state.nodes = state.data.nodes || [];
  } catch (error) {
    console.error("Failed to load network registry:", error);
    state.nodes = [];
  }

  // 2. Render initial static statistics
  renderStats();
  renderLeaderboard();

  // 3. Initialize 3D World Engine
  const worldContainer = $("#worldContainer");
  if (worldContainer && state.nodes.length > 0) {
    window.worldEngine = initWorld(THREE, worldContainer, state.nodes, handleWorldInteraction);
  }

  // 4. Bind DOM interactions
  bindEvents();
  boot();
  scheduleJoinAlerts();
}

// ── TELEMETRY & STATS ──────────────────────────────────────────────────
function renderStats() {
  const statsEl = $("#topbarStats");
  if (!statsEl) return;

  if (state.nodes.length === 0 || !state.data?.stats) {
    statsEl.innerHTML = `<span>00 BUILDERS ONLINE</span>`;
    return;
  }

  const s = state.data.stats;
  statsEl.innerHTML = `
    <span><b>${String(s.builders).padStart(2, "0")}</b> BUILDERS</span>
    <span><b>${String(s.districts).padStart(2, "0")}</b> DISTRICTS</span>
    <span><b>${String(s.projects).padStart(2, "0")}</b> PROJECTS</span>
  `;
}

// ── WORLD INTERACTION DISPATCHER ───────────────────────────────────────
async function handleWorldInteraction(event) {
  if (event.type === "passport") {
    // 1. Open modal in loading state
    const modal = $("#profileModal");
    const content = $("#profileContent");
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="padding: 60px; text-align: center; font-family: var(--mono); color: var(--muted); font-size: 11px;">
        <span class="live-dot" style="margin-bottom: 12px; display: inline-block;"></span><br>
        HANDSHAKING GITHUB SATELLITE...<br>
        <span style="font-size: 9px; opacity: 0.7;">PULLING REAL-TIME PROFILE & REPOSITORIES</span>
      </div>
    `;
    modal.showModal();

    // 2. Fetch dynamic GitHub profile
    const githubData = await fetchGitHubProfile(event.member.github, event.member);
    
    // Inject the member's coordinate hue for personalization
    githubData.hue = event.member.hue;

    // 3. Render premium passport sheet
    content.innerHTML = buildProfileHTML(githubData);
  } 
  else if (event.type === "chat") {
    const modal = $("#chatOverlay");
    if (modal) {
      renderChat();
      modal.showModal();
    }
  } 
  else if (event.type === "leaderboard") {
    const modal = $("#leaderboardOverlay");
    if (modal) {
      renderLeaderboard();
      modal.showModal();
    }
  }
}

// ── Notice Board Chat System ──────────────────────────────────────────
function renderChat() {
  const container = $("#chatMessages");
  if (!container) return;

  let messages = [];
  const totalBuilders = state.nodes.length;
  const totalDistricts = new Set(state.nodes.map(n => n.district)).size;
  const totalProjects = state.nodes.reduce((sum, n) => sum + (n.projects?.length || 0), 0);
  
  // Bot greetings
  messages.push({
    type: "chat",
    sender: "Telemetry Bot",
    handle: "telemetry-bot",
    text: `🤖 System telemetry online. Developer Town is populated by **${totalBuilders} builders** from **${totalDistricts} districts** representing **${totalProjects} projects**!`,
    time: "Town Init",
    hue: 272,
    isBot: true
  });

  // Builder joins
  state.nodes.forEach((node) => {
    messages.push({
      type: "system",
      text: `⚡ ${node.name} moved into neighborhood representing ${node.district}.`,
      time: node.joined
    });

    const projectNames = (node.projects || []).map(p => `**${p.name}**`).join(", ");
    const shippedText = projectNames ? ` and built workshop for: ${projectNames}` : "";
    
    messages.push({
      type: "chat",
      sender: "Telemetry Bot",
      handle: "telemetry-bot",
      text: `🤖 Welcomed resident **${node.name}** (@${node.github})! Set up house at rank **#${node.rank}** (Score: ${node.score})${shippedText}.`,
      time: node.joined,
      hue: 272,
      isBot: true
    });
  });

  // Load custom user messages
  let userMsgs = [];
  try {
    const stored = localStorage.getItem("kl-user-chat-messages");
    if (stored) userMsgs = JSON.parse(stored);
  } catch (e) {
    console.error(e);
  }

  messages = [...messages, ...userMsgs];

  if (state.query) {
    const q = state.query.toLowerCase();
    messages = messages.filter((m) => m.text?.toLowerCase().includes(q) || m.sender?.toLowerCase().includes(q));
  }

  container.innerHTML = messages.map((m) => {
    if (m.type === "system") {
      return `
        <div class="chat-message system">
          <span class="chat-system-tag">TOWN</span>
          <span class="chat-system-text">${m.text}</span>
          <span class="chat-time">${m.time}</span>
        </div>
      `;
    }

    const initialsChar = m.sender ? m.sender.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
    const isUser = m.sender === "You" ? "user-self" : "";
    const botTag = m.isBot ? `<span class="chat-bot-badge">BOT</span>` : "";
    return `
      <div class="chat-message user ${isUser}" style="--node-hue: ${m.hue ?? 38}">
        <div class="chat-avatar" style="background: hsl(${m.hue ?? 38} 80% 60%)">
          ${initialsChar}
        </div>
        <div class="chat-msg-body">
          <div class="chat-msg-header">
            <strong class="chat-sender">${m.sender}</strong>
            ${botTag}
            <span class="chat-time">${m.time}</span>
          </div>
          <p class="chat-text">${m.text}</p>
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

// ── Town Hall Leaderboard System ──────────────────────────────────────
function renderTableHeader() {
  const row = $("#leaderboardHeaderRow");
  if (!row) return;

  if (state.activeTab === "all-time") {
    row.innerHTML = `
      <th>RANK</th>
      <th>BUILDER</th>
      <th class="num-col">SCORE</th>
      <th class="num-col">STREAK</th>
    `;
  } else if (state.activeTab === "monthly") {
    row.innerHTML = `
      <th>RANK</th>
      <th>BUILDER</th>
      <th class="num-col">MONTHLY</th>
      <th class="num-col">SCORE</th>
    `;
  } else if (state.activeTab === "weekly") {
    row.innerHTML = `
      <th>RANK</th>
      <th>BUILDER</th>
      <th class="num-col">STREAK</th>
      <th class="num-col">SCORE</th>
    `;
  } else if (state.activeTab === "daily") {
    row.innerHTML = `
      <th>RANK</th>
      <th>BUILDER</th>
      <th class="num-col">DAILY</th>
      <th class="num-col">SCORE</th>
    `;
  } else if (state.activeTab === "districts") {
    row.innerHTML = `
      <th>RANK</th>
      <th>DISTRICT</th>
      <th class="num-col">SCORE</th>
      <th class="num-col">BUILDERS</th>
    `;
  } else if (state.activeTab === "colleges") {
    row.innerHTML = `
      <th>RANK</th>
      <th>COLLEGE</th>
      <th class="num-col">SCORE</th>
      <th class="num-col">BUILDERS</th>
    `;
  }
}

function renderLeaderboard() {
  const tbody = $("#leaderboardRows");
  if (!tbody) return;

  renderTableHeader();

  if (state.nodes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-rows">Waiting for town signups...</td></tr>`;
    return;
  }

  if (state.activeTab === "all-time") {
    tbody.innerHTML = state.nodes.map((node) => `
      <tr data-builder-handle="${node.handle}" data-search-tokens="${escapeAttr(node.name + " " + node.district + " " + node.handle + " " + node.tags.join(" "))}">
        <td><span class="rank-badge">${node.rank}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(${node.hue ?? 38} 80% 60%)">${initials(node.name)}</div>
            <div class="builder-meta">
              <strong>${node.name}</strong>
              <small>${node.district}</small>
            </div>
          </div>
        </td>
        <td class="num-col score-col"><strong>${node.score}</strong></td>
        <td class="num-col streak-col">${node.stats?.streak || 0}W</td>
      </tr>
    `).join("");
  } else if (state.activeTab === "monthly") {
    const monthlyNodes = [...state.nodes].sort((a, b) => (b.stats?.monthly || 0) - (a.stats?.monthly || 0) || b.score - a.score);
    tbody.innerHTML = monthlyNodes.map((node) => `
      <tr data-builder-handle="${node.handle}" data-search-tokens="${escapeAttr(node.name + " " + node.district)}">
        <td><span class="rank-badge">${node.rank}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(${node.hue ?? 38} 80% 60%)">${initials(node.name)}</div>
            <div class="builder-meta">
              <strong>${node.name}</strong>
              <small>${node.district}</small>
            </div>
          </div>
        </td>
        <td class="num-col score-col"><strong>+${node.stats?.monthly || 0}</strong></td>
        <td class="num-col streak-col">${node.score}</td>
      </tr>
    `).join("");
  } else if (state.activeTab === "weekly") {
    const weeklyNodes = [...state.nodes].sort((a, b) => (b.stats?.streak || 0) - (a.stats?.streak || 0) || b.score - a.score);
    tbody.innerHTML = weeklyNodes.map((node) => `
      <tr data-builder-handle="${node.handle}" data-search-tokens="${escapeAttr(node.name + " " + node.district)}">
        <td><span class="rank-badge">${node.rank}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(${node.hue ?? 38} 80% 60%)">${initials(node.name)}</div>
            <div class="builder-meta">
              <strong>${node.name}</strong>
              <small>${node.district}</small>
            </div>
          </div>
        </td>
        <td class="num-col streak-col"><strong>${node.stats?.streak || 0}W</strong></td>
        <td class="num-col score-col">${node.score}</td>
      </tr>
    `).join("");
  } else if (state.activeTab === "daily") {
    const dailyNodes = [...state.nodes].sort((a, b) => (b.stats?.daily || 0) - (a.stats?.daily || 0) || b.score - a.score);
    tbody.innerHTML = dailyNodes.map((node) => `
      <tr data-builder-handle="${node.handle}" data-search-tokens="${escapeAttr(node.name + " " + node.district)}">
        <td><span class="rank-badge">${node.rank}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(${node.hue ?? 38} 80% 60%)">${initials(node.name)}</div>
            <div class="builder-meta">
              <strong>${node.name}</strong>
              <small>${node.district}</small>
            </div>
          </div>
        </td>
        <td class="num-col score-col"><strong>+${node.stats?.daily || 0}</strong></td>
        <td class="num-col streak-col">${node.score}</td>
      </tr>
    `).join("");
  } else if (state.activeTab === "districts") {
    const distLeagues = state.data?.districtLeagues || [];
    const items = [...distLeagues].sort((a, b) => b.score - a.score);
    tbody.innerHTML = items.map((item, index) => `
      <tr data-search-tokens="${escapeAttr(item.name + " " + item.topBuilderName)}">
        <td><span class="rank-badge">${index + 1}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(38 80% 60%)">${item.name[0]}</div>
            <div class="builder-meta">
              <strong>${item.name}</strong>
              <small>${item.topBuilderName ? `Top: ${item.topBuilderName}` : "No builders"}</small>
            </div>
          </div>
        </td>
        <td class="num-col score-col"><strong>${item.score}</strong></td>
        <td class="num-col streak-col">${item.count}</td>
      </tr>
    `).join("");
  } else if (state.activeTab === "colleges") {
    const colLeagues = state.data?.collegeLeagues || [];
    const items = [...colLeagues].sort((a, b) => b.score - a.score);
    tbody.innerHTML = items.map((item, index) => `
      <tr data-search-tokens="${escapeAttr(item.name + " " + item.topBuilderName)}">
        <td><span class="rank-badge">${index + 1}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(153 80% 60%)">${item.name[0]}</div>
            <div class="builder-meta">
              <strong>${item.name}</strong>
              <small>${item.topBuilderName ? `Top: ${item.topBuilderName}` : "No builders"}</small>
            </div>
          </div>
        </td>
        <td class="num-col score-col"><strong>${item.score}</strong></td>
        <td class="num-col streak-col">${item.count}</td>
      </tr>
    `).join("");
  }
}

function filterLeaderboard() {
  const rows = document.querySelectorAll("#leaderboardRows tr");
  rows.forEach((row) => {
    if (!row.dataset.searchTokens) return;
    const match = !state.query || row.dataset.searchTokens.includes(state.query);
    row.style.display = match ? "" : "none";
  });
}

// ── EVENT BINDINGS ─────────────────────────────────────────────────────
function bindEvents() {
  // Leaderboard Category Tabs
  document.querySelectorAll(".leaderboard-tabs button")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".leaderboard-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeTab = btn.dataset.tab;
      renderLeaderboard();
      filterLeaderboard();
    });
  });

  // Modal Closures
  $("#closeProfile")?.addEventListener("click", () => $("#profileModal").close());
  $("#profileModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  $("#closeChatOverlay")?.addEventListener("click", () => $("#chatOverlay").close());
  $("#chatOverlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  $("#closeLeaderboardOverlay")?.addEventListener("click", () => $("#leaderboardOverlay").close());
  $("#leaderboardOverlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  // Notice board chat submit
  $("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    let userMsgs = [];
    try {
      const stored = localStorage.getItem("kl-user-chat-messages");
      if (stored) userMsgs = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const newMsg = {
      type: "chat",
      sender: "You",
      handle: "guest-builder",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hue: 45
    };

    userMsgs.push(newMsg);
    localStorage.setItem("kl-user-chat-messages", JSON.stringify(userMsgs));
    input.value = "";
    renderChat();

    // Trigger Bot Reply after 1 second
    setTimeout(() => {
      try {
        let botText = `🤖 System note processed! To add your profile, click 'Join the ring' in the topbar, edit \`members/your-name.json\`, and submit a Pull Request!`;
        const q = text.toLowerCase();
        if (q.includes("join") || q.includes("how to")) {
          botText = `🤖 To join Dev-Ring: fork the repository, copy \`members/_template.json\` to your username, fill it out, and submit a PR!`;
        } else if (q.includes("stats") || q.includes("status")) {
          botText = `🤖 Dev-Ring Telemetry status:\n- Active Builders: **${state.nodes.length}**\n- Districts Active: **${new Set(state.nodes.map(n => n.district)).size}**`;
        }

        const storedNow = localStorage.getItem("kl-user-chat-messages");
        const msgs = storedNow ? JSON.parse(storedNow) : userMsgs;
        msgs.push({
          type: "chat",
          sender: "Telemetry Bot",
          handle: "telemetry-bot",
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hue: 272,
          isBot: true
        });
        localStorage.setItem("kl-user-chat-messages", JSON.stringify(msgs));
        renderChat();
      } catch (e) {
        console.error(e);
      }
    }, 1000);
  });

  // Search input in Leaderboard Overlay
  $("#search")?.addEventListener("input", (event) => {
    state.query = event.target.value.toLowerCase().trim();
    filterLeaderboard();
  });

  // Recruiter Copy details button inside Modal
  document.body.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-copy-contact]");
    if (btn) {
      const handle = btn.dataset.copyContact;
      const node = state.nodes.find((n) => n.handle === handle);
      if (!node) return;

      const text = `KL DEV-RING BUILDER DETAILS:\n` +
        `Name: ${node.name}\n` +
        `District: ${node.district}\n` +
        `College: ${node.college || "N/A"}\n` +
        `GitHub: https://github.com/${node.github}\n` +
        `Website: ${node.site}\n` +
        `Score: ${node.score} (Rank #${node.rank})`;

      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "COPIED CARDS! ✓";
        btn.style.background = "var(--green)";
        btn.style.color = "#000";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = "";
          btn.style.color = "";
        }, 2000);
      });
    }

    // Teleport player to house
    const teleportBtn = event.target.closest("[data-teleport-to]");
    if (teleportBtn) {
      const handle = teleportBtn.dataset.teleportTo;
      $("#profileModal").close();
      if (window.worldEngine && window.worldEngine.teleportToHouse) {
        window.worldEngine.teleportToHouse(handle);
      }
    }

    // Toggle follow button state
    const followBtn = event.target.closest(".follow-btn");
    if (followBtn) {
      if (followBtn.textContent === "Follow") {
        followBtn.textContent = "Followed ✓";
        followBtn.style.background = "#218838";
        followBtn.style.borderColor = "#218838";
      } else {
        followBtn.textContent = "Follow";
        followBtn.style.background = "";
        followBtn.style.borderColor = "";
      }
    }

    // Clicking leaderboard rows can open passport directly
    const row = event.target.closest("tr[data-builder-handle]");
    if (row && !event.target.closest(".league-top-builder")) {
      const handle = row.dataset.builderHandle;
      const node = state.nodes.find(n => n.handle === handle);
      if (node) {
        $("#leaderboardOverlay").close();
        handleWorldInteraction({ type: "passport", member: node });
      }
    }
  });
}

function showToast(title, body, handle = "") {
  let container = $(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-alert";
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <div class="toast-alert-header">
      <span class="toast-alert-indicator"></span>
      <strong class="toast-alert-title">NEW RESIDENT SIGNAL</strong>
      <button class="toast-alert-close" aria-label="Close notification">×</button>
    </div>
    <div class="toast-alert-body">
      <p><strong>${title}</strong> ${body}</p>
      ${handle ? `<button class="toast-alert-action" data-open-builder="${handle}">VIEW PASSPORT ↗</button>` : ""}
    </div>
  `;

  container.appendChild(toast);

  toast.querySelector(".toast-alert-close").addEventListener("click", () => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  });

  if (handle) {
    toast.querySelector(".toast-alert-action").addEventListener("click", () => {
      const node = state.nodes.find((n) => n.handle === handle);
      if (node) {
        handleWorldInteraction({ type: "passport", member: node });
      }
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    });
  }

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }
  }, 6000);
}

function scheduleJoinAlerts() {
  if (state.nodes.length === 0) return;
  const latestBuilder = [...state.nodes].sort((a, b) => b.joined.localeCompare(a.joined))[0];
  
  setTimeout(() => {
    showToast(latestBuilder.name, `just set up their workshop in the neighborhood representing ${latestBuilder.district}!`, latestBuilder.handle);
  }, 4000);
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .toLowerCase();
}

function boot() {
  const el = $("#boot");
  if (localStorage.getItem("kl-town-booted")) {
    el?.classList.add("hidden");
    return;
  }
  el?.classList.remove("hidden");
  const lines = [
    ["Initializing Kerala Builder Network...", 20],
    ["Rendering 3D Neighborhoods...", 55],
    ["Spawning Residents & Workshops...", 80],
    ["Developer Town Ready. WASD to walk.", 100]
  ];
  let index = 0;
  const next = () => {
    const [line, progress] = lines[index];
    if ($("#bootLine")) $("#bootLine").textContent = line;
    if ($("#bootProgress")) $("#bootProgress").style.width = `${progress}%`;
    if ($("#bootMetrics")) {
      $("#bootMetrics").textContent = index === 3
        ? "SYSTEM ONLINE / WORLD VIEWPORT READY"
        : `PACKET SIGNAL ${index + 1} ESTABLISHED`;
    }
    index++;
    if (index < lines.length) {
      setTimeout(next, 400);
    } else {
      setTimeout(() => el?.classList.add("hidden"), 300);
      localStorage.setItem("kl-town-booted", "1");
    }
  };
  setTimeout(next, 100);
}

$("#skipBoot")?.addEventListener("click", () => {
  $("#boot")?.classList.add("hidden");
  localStorage.setItem("kl-town-booted", "1");
});

init().catch(console.error);
