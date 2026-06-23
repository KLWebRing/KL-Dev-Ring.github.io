/**
 * github.js - Dynamic GitHub API Client for Builder Passports
 * Fetches real-time profile, repositories, languages, and organizations,
 * with localStorage caching (1 hour) and graceful fallback to local registry data.
 */

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function fetchGitHubProfile(username, fallbackData = {}) {
  const cacheKey = `github_profile_${username}`;
  try {
    // Check cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        return data;
      }
    }
  } catch (e) {
    console.warn("Failed to read localStorage cache for GitHub profile:", e);
  }

  // Define fallback object
  const fallbackProfile = {
    handle: username,
    name: fallbackData.name || username,
    avatar: `https://github.com/${username}.png`,
    bio: fallbackData.bio || "Active builder in the developer town.",
    skills: fallbackData.tags || [],
    languages: fallbackData.tags ? fallbackData.tags.filter(t => ["javascript", "python", "html", "css", "c++", "rust", "go", "java"].includes(t.toLowerCase())) : [],
    contributionStats: fallbackData.stats?.contributions || 0,
    followers: 0,
    following: 0,
    repoCount: fallbackData.projects?.length || 0,
    featuredRepos: fallbackData.projects ? fallbackData.projects.map(p => ({
      name: p.name,
      description: p.description,
      stars: 0,
      url: p.url,
      language: fallbackData.tags?.[0] || "Code"
    })) : [],
    organizations: [],
    calendar: []
  };

  try {
    // 1. Fetch General User Profile
    const profileRes = await fetch(`https://api.github.com/users/${username}`);
    if (!profileRes.ok) throw new Error(`GitHub API returned status ${profileRes.status}`);
    const profile = await profileRes.json();

    // 2. Fetch Repositories
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
    let repos = [];
    if (reposRes.ok) {
      repos = await reposRes.json();
    }

    // 3. Fetch Organizations
    const orgsRes = await fetch(`https://api.github.com/users/${username}/orgs`);
    let orgs = [];
    if (orgsRes.ok) {
      orgs = await orgsRes.json();
    }

    // 4. Fetch Contributions Calendar (real daily counts)
    let calendar = [];
    let totalContributions = 0;
    try {
      const calendarRes = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}`);
      if (calendarRes.ok) {
        const calData = await calendarRes.json();
        calendar = calData.contributions || [];
        if (calData.total) {
          totalContributions = Object.values(calData.total).reduce((sum, val) => sum + val, 0);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch contributions calendar for ${username}:`, err);
    }

    // Process Repositories data
    const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    
    // Extract languages and calculate counts
    const langMap = {};
    repos.forEach(r => {
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
    });
    const sortedLanguages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Featured repos: sort by stars descending, then updates
    const featuredRepos = [...repos]
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0) || new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 3)
      .map(r => ({
        name: r.name,
        description: r.description || "No description provided.",
        stars: r.stargazers_count || 0,
        url: r.html_url,
        language: r.language || "Code"
      }));

    const contributionStats = totalContributions || profile.public_repos * 10 + profile.followers * 2;

    const unifiedData = {
      handle: username,
      name: profile.name || fallbackData.name || username,
      avatar: profile.avatar_url || `https://github.com/${username}.png`,
      bio: profile.bio || fallbackData.bio || "Active builder in the developer town.",
      skills: fallbackData.tags || [],
      languages: sortedLanguages.slice(0, 5),
      contributionStats: contributionStats,
      followers: profile.followers || 0,
      following: profile.following || 0,
      repoCount: profile.public_repos || repos.length,
      featuredRepos: featuredRepos.length > 0 ? featuredRepos : fallbackProfile.featuredRepos,
      organizations: orgs.map(o => ({
        name: o.login,
        avatar: o.avatar_url
      })),
      calendar: calendar
    };

    // Override statistics with exact local registry statistics if available ONLY if we didn't get real contributions from GitHub
    if (!totalContributions && fallbackData.stats?.contributions) {
      unifiedData.contributionStats = fallbackData.stats.contributions;
    }

    // Cache results
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: unifiedData
      }));
    } catch (e) {
      console.warn("Failed to write localStorage cache for GitHub profile:", e);
    }

    return unifiedData;

  } catch (error) {
    console.error(`Failed to fetch dynamic GitHub data for ${username}, using fallback:`, error);
    return fallbackProfile;
  }
}
