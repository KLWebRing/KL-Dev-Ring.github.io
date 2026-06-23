/**
 * utils.js — Shared utilities for KL Dev-Ring pages.
 *
 * Imported by app.js and leaderboard.js.
 * Must remain side-effect free: no DOM access, no fetch calls at module level.
 */

/**
 * Returns 1–2 uppercase initials derived from a full name.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Builds the inner HTML for a builder profile modal or standalone profile sheet.
 * The caller is responsible for injecting the returned string into the appropriate
 * container element and calling showModal() on the <dialog>.
 *
 * @param {{ handle: string, name: string, rank: number, district: string,
 *           country: string, joined: string, score: number, bio: string,
 *           badges: Array<{icon:string,label:string}>,
 *           projects: Array<{name:string,url:string,description:string}>,
 *           site: string, github: string, stats?: object }} node
 * @returns {string} HTML string
 */
export function buildProfileHTML(node) {
  const hue = node.hue ?? 38;
  const skills = node.skills ?? [];
  const languages = node.languages ?? [];
  const featured = node.featuredRepos ?? [];
  const orgs = node.organizations ?? [];

  // Seeded values to complete gamified statistics
  const seedStars = Math.floor(seeded(node.handle, 11) * 200) + 12;
  const starsEarned = featured.reduce((sum, r) => sum + r.stars, 0) || seedStars;
  
  // Game Level Progression Calculation
  const totalPoints = starsEarned * 15 + node.repoCount * 25 + node.followers * 10 + node.contributionStats * 2;
  const level = Math.floor(Math.sqrt(totalPoints / 80)) + 1;
  const xpCurrent = Math.round(totalPoints % 1000);
  const xpPercent = Math.max(5, (xpCurrent / 1000) * 100);

  // Generate skills tags
  const skillsHTML = skills.map(s => `<span>${s}</span>`).join("");

  // Generate Contribution Heatmap and calculate Streaks
  let weeksHTML = "";
  let currentStreak = 0;
  let longestStreak = 0;
  const heatmapColors = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let monthLabelsHTML = "";
  
  const hasRealCalendar = node.calendar && Array.isArray(node.calendar) && node.calendar.length > 0;
  
  if (hasRealCalendar) {
    // 1. Map of date -> contribution item
    const calMap = {};
    let lastDateStr = "";
    let maxTime = 0;
    
    for (const item of node.calendar) {
      if (item && item.date) {
        calMap[item.date] = item;
        const t = new Date(item.date).getTime();
        if (t > maxTime) {
          maxTime = t;
          lastDateStr = item.date;
        }
      }
    }
    
    // Parse last date to get the calendar year (usually current year, e.g. 2026)
    // If not found, use current local year
    let graphYear = new Date().getFullYear();
    if (lastDateStr) {
      const parts = lastDateStr.split("-");
      if (parts.length === 3) {
        const yearVal = parseInt(parts[0], 10);
        if (!isNaN(yearVal)) {
          graphYear = yearVal;
        }
      }
    }
    
    // Sunday of the week containing January 1st of graphYear
    const jan1 = new Date(graphYear, 0, 1);
    const jan1DayOfWeek = jan1.getDay(); // 0 (Sun) to 6 (Sat)
    const gridStartDate = new Date(jan1);
    gridStartDate.setDate(jan1.getDate() - jan1DayOfWeek);
    
    // Saturday of the week containing December 31st of graphYear
    const dec31 = new Date(graphYear, 11, 31);
    const dec31DayOfWeek = dec31.getDay(); // 0 (Sun) to 6 (Sat)
    const gridEndDate = new Date(dec31);
    gridEndDate.setDate(dec31.getDate() + (6 - dec31DayOfWeek));
    
    const diffTime = Math.abs(gridEndDate - gridStartDate);
    const daysInGrid = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const numWeeks = Math.round(daysInGrid / 7);
    
    // Build array of grid dates
    const gridDates = [];
    const tempDate = new Date(gridStartDate);
    for (let i = 0; i < daysInGrid; i++) {
      const y = tempDate.getFullYear();
      const m = String(tempDate.getMonth() + 1).padStart(2, '0');
      const d = String(tempDate.getDate()).padStart(2, '0');
      gridDates.push(`${y}-${m}-${d}`);
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    // Determine today's date in local YYYY-MM-DD
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = String(today.getMonth() + 1).padStart(2, '0');
    const todayD = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayY}-${todayM}-${todayD}`;
    const dateLimitStr = lastDateStr > todayStr ? lastDateStr : todayStr;
    
    // Build columns of weeks
    for (let w = 0; w < numWeeks; w++) {
      let daysHTML = "";
      for (let d = 0; d < 7; d++) {
        const dateStr = gridDates[w * 7 + d];
        const contrib = calMap[dateStr];
        let level = 0;
        let count = 0;
        if (contrib) {
          level = contrib.level ?? 0;
          count = contrib.count ?? 0;
        }
        
        // Render future dates (beyond dateLimitStr) as empty/transparent
        const isFuture = dateStr > dateLimitStr;
        const color = isFuture ? "transparent" : heatmapColors[level];
        const tooltip = isFuture ? "" : `${count} contribution${count === 1 ? "" : "s"} on ${dateStr}`;
        
        daysHTML += `<div class="passport-day-cell" style="background: ${color}" title="${tooltip}"></div>`;
      }
      weeksHTML += `<div class="passport-week-column">${daysHTML}</div>`;
    }
    
    // Generate Month Labels dynamically starting from gridStartDate
    let lastMonthName = "";
    for (let w = 0; w < numWeeks; w++) {
      const weekStartDate = new Date(gridStartDate);
      weekStartDate.setDate(gridStartDate.getDate() + w * 7);
      const monthName = monthNames[weekStartDate.getMonth()];
      
      let labelText = "";
      if (monthName !== lastMonthName) {
        labelText = monthName;
        lastMonthName = monthName;
      }
      
      monthLabelsHTML += `<div style="width: 5.5px; position: relative; font: 400 8px var(--mono); color: #8b949e; height: 10px;">
        ${labelText ? `<span style="position: absolute; left: 0; top: 0; white-space: nowrap;">${labelText}</span>` : ""}
      </div>`;
    }
    
    // 3. Compute current and longest streaks from calendar
    const sortedCalendar = [...node.calendar].sort((a, b) => a.date.localeCompare(b.date));
    let tempStreak = 0;
    let maxStreak = 0;
    
    for (const item of sortedCalendar) {
      if (item.date > dateLimitStr) continue;
      
      if (item.count > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }
    longestStreak = maxStreak;
    
    let curr = 0;
    const indexLimit = sortedCalendar.findIndex(item => item.date === dateLimitStr);
    const startIndex = indexLimit !== -1 ? indexLimit : sortedCalendar.length - 1;
    
    for (let i = startIndex; i >= 0; i--) {
      const item = sortedCalendar[i];
      if (item.date > dateLimitStr) continue;
      
      if (item.count > 0) {
        curr++;
      } else {
        if (item.date === dateLimitStr) {
          continue; // Allow streak to remain active if today hasn't had any commits yet but yesterday did
        } else {
          break;
        }
      }
    }
    currentStreak = curr;
    longestStreak = Math.max(longestStreak, currentStreak);
    
  } else {
    // Fallback: Seeded random contribution graph (50 weeks)
    for (let w = 0; w < 50; w++) {
      let daysHTML = "";
      for (let d = 0; d < 7; d++) {
        const noise = seeded(node.handle, w * 7 + d);
        let colorIdx = 0;
        if (noise > 0.88) colorIdx = 4;
        else if (noise > 0.72) colorIdx = 3;
        else if (noise > 0.48) colorIdx = 2;
        else if (noise > 0.24) colorIdx = 1;
        daysHTML += `<div class="passport-day-cell" style="background: ${heatmapColors[colorIdx]}"></div>`;
      }
      weeksHTML += `<div class="passport-week-column">${daysHTML}</div>`;
    }
    
    // Fallback Streaks
    currentStreak = node.stats?.streak || Math.floor(seeded(node.handle, 1) * 20) + 1;
    longestStreak = Math.max(currentStreak, Math.floor(seeded(node.handle, 2) * 50) + 12);
    
    // Fallback hardcoded month labels HTML
    monthLabelsHTML = `
      <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
    `;
  }

  let monthLabelsContainerHTML = "";
  if (hasRealCalendar) {
    monthLabelsContainerHTML = `
      <div class="passport-months-labels" style="justify-content: flex-start; gap: 2.2px;">
        ${monthLabelsHTML}
      </div>
    `;
  } else {
    monthLabelsContainerHTML = `
      <div class="passport-months-labels">
        ${monthLabelsHTML}
      </div>
    `;
  }

  // Top Repos list
  const topReposHTML = featured.slice(0, 5).map(r => `
    <a class="passport-repo-item" href="${r.url}" target="_blank" rel="noreferrer">
      <div class="passport-repo-info">
        <span class="passport-repo-name">
          <i>📁</i> ${r.name}
        </span>
        <span class="passport-repo-desc">${r.description}</span>
      </div>
      <span class="passport-repo-stars">★ ${r.stars}</span>
    </a>
  `).join("");

  // Dynamic Achievements list
  const achievements = [
    node.contributionStats > 100 && { badge: "🏆", title: "Top Contributor", desc: "Top 10% in Kerala" },
    skills.includes("opensource") && { badge: "🚀", title: "Open Source Hero", desc: "50+ PRs Merged" },
    currentStreak > 2 && { badge: "🔥", title: "Weekly Champion", desc: `Active ${currentStreak} Weeks` },
    { badge: "💻", title: "Problem Solver", desc: `${Math.floor(seeded(node.handle, 3) * 120) + 20}+ Issues Closed` },
    { badge: "⭐", title: "Rising Star", desc: "Fastest Growing Signal" }
  ].filter(Boolean);

  const achievementsHTML = achievements.slice(0, 4).map(a => `
    <div class="passport-achievement-item">
      <span class="passport-achievement-badge">${a.badge}</span>
      <div class="passport-achievement-info">
        <h5>${a.title}</h5>
        <span>${a.desc}</span>
      </div>
    </div>
  `).join("");

  return `
    <div class="profile-sheet premium-passport" style="--node-hue: ${hue}">
      
      <!-- Top Profile Row -->
      <div class="passport-top-row">
        <div class="passport-profile-info">
          <div class="passport-avatar-container" style="border-color: hsl(${hue}, 85%, 60%)">
            <img src="${node.avatar}" alt="${node.name}" />
          </div>
          <div class="passport-identity">
            <h2>${node.name} <span class="verified-badge" title="Verified Builder">✓</span></h2>
            <span class="passport-handle">@${node.handle}</span>
            <span class="passport-meta-item">📍 ${node.city || "Kerala"}, India</span>
            <span class="passport-meta-item">🔗 <a href="https://github.com/${node.handle}" target="_blank" rel="noreferrer" style="color:#58a6ff">github.com/${node.handle}</a></span>
          </div>
        </div>
        
        <!-- Gamified XP and Level -->
        <div class="passport-level-card">
          <div class="passport-level-header">
            <span>LEVEL</span>
            <h3>${level}</h3>
          </div>
          <div class="passport-level-bar">
            <i style="width: ${xpPercent}%; background: hsl(${hue}, 85%, 60%)"></i>
          </div>
          <span class="passport-level-xp">${xpCurrent.toLocaleString()} / 1,000 XP</span>
        </div>
      </div>

      <!-- Navigation tabs row -->
      <div class="passport-tabs">
        <button class="passport-tab active">Overview</button>
        <button class="passport-tab" onclick="window.open('https://github.com/${node.handle}?tab=repositories','_blank')">Repositories</button>
        <button class="passport-tab" onclick="window.open('https://github.com/${node.handle}','_blank')">Projects</button>
        <button class="passport-tab">Achievements</button>
        <button class="passport-tab">Activity</button>
      </div>

      <!-- Stats boxes dashboard -->
      <div class="passport-stats-grid">
        <div class="passport-stat-card">
          <div class="passport-stat-icon" style="background: rgba(16,185,129,0.1); color: #10b981;">💻</div>
          <div class="passport-stat-info">
            <span>Contributions</span>
            <h4>${node.contributionStats.toLocaleString()}</h4>
          </div>
        </div>
        <div class="passport-stat-card">
          <div class="passport-stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;">📁</div>
          <div class="passport-stat-info">
            <span>Repositories</span>
            <h4>${node.repoCount}</h4>
          </div>
        </div>
        <div class="passport-stat-card">
          <div class="passport-stat-icon" style="background: rgba(59,130,246,0.1); color: #3b82f6;">👥</div>
          <div class="passport-stat-info">
            <span>Followers</span>
            <h4>${node.followers}</h4>
          </div>
        </div>
        <div class="passport-stat-card">
          <div class="passport-stat-icon" style="background: rgba(255,204,0,0.1); color: #ffcc00;">★</div>
          <div class="passport-stat-info">
            <span>Stars Earned</span>
            <h4>${starsEarned}</h4>
          </div>
        </div>
        <div class="passport-stat-card">
          <div class="passport-stat-icon" style="background: rgba(236,72,153,0.1); color: #ec4899;">🤝</div>
          <div class="passport-stat-info">
            <span>Following</span>
            <h4>${node.following}</h4>
          </div>
        </div>
      </div>

      <!-- Heatmap Panel -->
      <div class="passport-graph-panel">
        <span class="passport-graph-title">Contribution Graph</span>
        <div class="passport-graph-container">
          <div class="passport-calendar-wrap">
            ${monthLabelsContainerHTML}
            <div class="passport-calendar-grid">
              <div class="passport-days-labels">
                <span>Mon</span><span>Wed</span><span>Fri</span>
              </div>
              <div class="passport-weeks">
                ${weeksHTML}
              </div>
            </div>
          </div>
          
          <div class="passport-graph-streaks">
            <div class="passport-streak-item">
              <span class="passport-streak-icon">🔥</span>
              <div class="passport-streak-info">
                <span>Current Streak</span>
                <b>${currentStreak} days</b>
              </div>
            </div>
            <div class="passport-streak-item">
              <span class="passport-streak-icon">⭐</span>
              <div class="passport-streak-info">
                <span>Longest Streak</span>
                <b>${longestStreak} days</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Three column details -->
      <div class="passport-bottom-row">
        <!-- Col 1: About -->
        <div class="passport-column">
          <h4 class="passport-column-title">About</h4>
          <div class="passport-about-info">
            <p class="passport-about-bio">${node.bio}</p>
            <div class="passport-about-item">
              <i>🎓</i> ${node.college || "Amrita Vishwa Vidyapeetham"}
            </div>
            <div class="passport-about-item">
              <i>💻</i> ${skills[0] === "ai" ? "Computer Science & AI" : "Computer Science"}
            </div>
            <div class="passport-about-item">
              <i>🛠️</i> Languages: ${languages.slice(0, 4).join(", ") || "JS, Python, Rust"}
            </div>
          </div>
        </div>

        <!-- Col 2: Top Repos -->
        <div class="passport-column">
          <h4 class="passport-column-title">Top Repositories</h4>
          <div class="passport-repos-list">
            ${topReposHTML}
          </div>
        </div>

        <!-- Col 3: Achievements -->
        <div class="passport-column">
          <h4 class="passport-column-title">Achievements</h4>
          <div class="passport-achievements-list">
            ${achievementsHTML}
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="passport-actions-row">
        <button class="passport-action-btn passport-btn-hollow" data-teleport-to="${node.handle}">Visit House</button>
        <button class="passport-action-btn passport-btn-hollow" onclick="window.open('${node.featuredRepos[0]?.url || 'https://github.com/' + node.handle}', '_blank')">View Projects</button>
        <button class="passport-action-btn passport-btn-solid-green follow-btn">Follow</button>
      </div>
      
    </div>
  `;
}

// Utility: seedable pseudo-random helper
function seeded(value, salt = 0) {
  let hash = 2166136261 + salt * 101;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}
