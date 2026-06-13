import { profile } from "./data.js";

const heroLinks = document.querySelector("#hero-links");
const timelineList = document.querySelector("#timeline-list");
const projectList = document.querySelector("#project-list");

if (heroLinks) {
    const quickLinks = [
        ...profile.links.map((item) => ({ label: item.label, href: item.href })),
        ...profile.contact.map((item) => ({ label: item.label, href: item.href })),
    ];

    heroLinks.innerHTML = quickLinks
        .map(
            (item) => `
      <a class="hero-link" href="${item.href}" target="_blank" rel="noreferrer">${item.label}</a>
    `,
        )
        .join("");
}

timelineList.innerHTML = profile.timeline
    .map(
        (item) => `
      <li class="timeline-item">
        <div class="timeline-dot" aria-hidden="true"></div>
        <div>
          <p>${item.text}</p>
        </div>
      </li>
    `,
    )
    .join("");

projectList.innerHTML = profile.projects
    .map(
        (project, index) => `
      <div class="project-card">
        <img class="project-logo" src="${project.image}" alt="${project.imageAlt}" />
        <div class="project-content">
          <div class="project-top">
            <h3 class="project-title">${project.name}</h3>
                        <span class="project-badge" data-project-index="${index}">${project.badge ?? "Release"}</span>
          </div>
                    <p class="project-desc" data-project-index="${index}">${project.description ?? ""}</p>
          <div class="project-links">
            ${project.links
                .map(
                    (link) => `
                  <a class="link" href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>
                `,
                )
                .join("")}
          </div>
        </div>
      </div>
    `,
    )
    .join("");

function getRepoFullNameFromProject(project) {
    if (project.repo) {
        return project.repo;
    }

    const githubLink = project.links.find((link) => link.href.includes("github.com/"));
    if (!githubLink) {
        return null;
    }

    try {
        const url = new URL(githubLink.href);
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length < 2) {
            return null;
        }
        return `${parts[0]}/${parts[1]}`;
    } catch {
        return null;
    }
}

function formatReleaseVersion(version) {
    const trimmed = version.trim();
    if (!trimmed) {
        return "";
    }
    return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

async function enrichProjectDataFromGithub() {
    const tasks = profile.projects.map(async (project, index) => {
        const repoFullName = getRepoFullNameFromProject(project);
        if (!repoFullName) {
            return;
        }

        try {
            const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
                headers: {
                    Accept: "application/vnd.github+json",
                },
            });

            if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                const about = repoData?.description?.trim();
                if (about) {
                    const descEl = document.querySelector(`.project-desc[data-project-index="${index}"]`);
                    if (descEl) {
                        descEl.textContent = about;
                    }
                }
            }

            const releaseResponse = await fetch(`https://api.github.com/repos/${repoFullName}/releases/latest`, {
                headers: {
                    Accept: "application/vnd.github+json",
                },
            });

            if (releaseResponse.ok) {
                const releaseData = await releaseResponse.json();
                const version = formatReleaseVersion(releaseData?.tag_name ?? "");
                if (version) {
                    const badgeEl = document.querySelector(`.project-badge[data-project-index="${index}"]`);
                    if (badgeEl) {
                        badgeEl.textContent = version;
                    }
                }
            }
        } catch {
            // Keep local fallback values when request fails.
        }
    });

    await Promise.all(tasks);
}

void enrichProjectDataFromGithub();