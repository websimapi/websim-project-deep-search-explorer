import { 
    getUser,
    getUserStats,
    getUserProjects,
    getUserFollowers,
    getUserFollowing,
    getUserLikes,
    getProjectRevisions,
    getProjectDescendants,
    getProjectDetailedStats,
    getComments,
    getAssets
} from './api-client.js';

class UserDeepSearchEngine {
    constructor() {
        this.currentUser = null;
        this.currentData = null;
        this.init();
    }

    async init() {
        await this.loadCreatorProfile();
        this.setupEventListeners();
        this.setupTabs();
    }

    async loadCreatorProfile() {
        try {
            // Get the creator of the current page
            const creator = await window.websim.getCreator();
            if (creator) {
                this.currentUser = creator;
                this.renderCreatorPreview();
            } else {
                // Fallback to current user if creator not available
                const user = await window.websim.getUser();
                this.currentUser = user;
                this.renderCreatorPreview();
            }
        } catch (error) {
            console.error('Failed to load creator:', error);
            document.getElementById('creatorPreview').innerHTML = '<p>Error loading creator profile</p>';
        }
    }

    renderCreatorPreview() {
        const preview = document.getElementById('creatorPreview');
        preview.innerHTML = `
            <div class="creator-info">
                <img src="${this.currentUser.avatar_url}" alt="${this.currentUser.username}" class="avatar-large">
                <div>
                    <h3>@${this.currentUser.username}</h3>
                    <p>Ready to analyze all projects and activity</p>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const advancedToggle = document.getElementById('advancedToggle');
        
        searchBtn.addEventListener('click', () => this.performSearch());
        advancedToggle.addEventListener('click', () => {
            const advancedOptions = document.getElementById('advancedOptions');
            advancedOptions.classList.toggle('hidden');
        });

        // Enter key search
        document.getElementById('projectIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    }

    setupTabs() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                const tabs = document.querySelectorAll('.nav-tab');
                tabs.forEach(tab => tab.classList.remove('active'));
                e.target.classList.add('active');
                
                const tabName = e.target.dataset.tab;
                this.loadTabContent(tabName);
            }
        });
    }

    async performSearch() {
        if (!this.currentUser) {
            alert('User profile not loaded');
            return;
        }

        this.showLoading(true);
        
        try {
            const options = this.getSearchOptions();
            const data = await this.deepUserSearch(this.currentUser.username, options);
            this.currentData = data;
            this.displayResults(data);
        } catch (error) {
            console.error('Search failed:', error);
            alert('Search failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    getSearchOptions() {
        return {
            includeProjects: document.getElementById('includeProjects').checked,
            includeProjectRevisions: document.getElementById('includeProjectRevisions').checked,
            includePrompts: document.getElementById('includePrompts').checked,
            includeStats: document.getElementById('includeStats').checked,
            includeAssets: document.getElementById('includeAssets').checked,
            includeComments: document.getElementById('includeComments').checked,
            includeFollowers: document.getElementById('includeFollowers').checked,
            includeFollowing: document.getElementById('includeFollowing').checked,
            includeLikes: document.getElementById('includeLikes').checked,
            includeDescendants: document.getElementById('includeDescendants').checked
        };
    }

    async deepUserSearch(username, options) {
        const data = { user: username };

        // Get user profile and stats
        const userProfile = await getUser(username);
        const userStats = await getUserStats(username);
        
        data.profile = userProfile;
        data.stats = userStats;

        // Get all projects
        if (options.includeProjects) {
            const projects = await getUserProjects(username, { 
                first: 100,
                sort_by: 'updated_at'
            });
            data.projects = projects;

            // Get detailed info for each project
            if (projects.data.length > 0) {
                const detailedProjects = await Promise.all(
                    projects.data.map(async (project) => {
                        const projectData = { project: project.project };
                        
                        // Get revisions for each project
                        if (options.includeProjectRevisions) {
                            const revisions = await getProjectRevisions(project.project.id);
                            projectData.revisions = revisions;
                        }

                        // Get prompt history
                        if (options.includePrompts && project.site) {
                            projectData.prompts = this.extractPromptHistory(project.site);
                        }

                        // Get stats
                        if (options.includeStats) {
                            try {
                                const stats = await getProjectDetailedStats(project.project.id);
                                projectData.stats = stats;
                            } catch (e) {
                                projectData.stats = null;
                            }
                        }

                        // Get assets
                        if (options.includeAssets && project.project_revision) {
                            try {
                                const assets = await getAssets(project.project.id, project.project_revision.version);
                                projectData.assets = assets;
                            } catch (e) {
                                projectData.assets = null;
                            }
                        }

                        // Get comments
                        if (options.includeComments) {
                            try {
                                const comments = await getComments(project.project.id);
                                projectData.comments = comments;
                            } catch (e) {
                                projectData.comments = null;
                            }
                        }

                        // Get descendants
                        if (options.includeDescendants) {
                            try {
                                const descendants = await getProjectDescendants(project.project.id);
                                projectData.descendants = descendants;
                            } catch (e) {
                                projectData.descendants = null;
                            }
                        }

                        return projectData;
                    })
                );
                data.detailedProjects = detailedProjects;
            }
        }

        // Get social data
        if (options.includeFollowers) {
            const followers = await getUserFollowers(username);
            data.followers = followers;
        }

        if (options.includeFollowing) {
            const following = await getUserFollowing(username);
            data.following = following;
        }

        if (options.includeLikes) {
            const likes = await getUserLikes(username);
            data.likes = likes;
        }

        return data;
    }

    extractPromptHistory(site) {
        const prompts = [];
        let current = site;
        
        while (current) {
            if (current.prompt) {
                prompts.unshift({
                    prompt: current.prompt,
                    created_at: current.created_at,
                    model: current.model,
                    state: current.state
                });
            }
            
            current = current.parent_id ? { parent_id: current.parent_id } : null;
        }
        
        return prompts;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');
        
        if (show) {
            loading.classList.remove('hidden');
            results.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
            results.classList.remove('hidden');
        }
    }

    displayResults(data) {
        document.getElementById('results').classList.remove('hidden');
        this.loadTabContent('overview');
    }

    loadTabContent(tabName) {
        const content = document.getElementById('tab-content');
        
        switch(tabName) {
            case 'overview':
                content.innerHTML = this.renderOverview();
                break;
            case 'projects':
                content.innerHTML = this.renderProjects();
                break;
            case 'prompts':
                content.innerHTML = this.renderAllPrompts();
                break;
            case 'versions':
                content.innerHTML = this.renderAllVersions();
                break;
            case 'stats':
                content.innerHTML = this.renderAllStats();
                break;
            case 'assets':
                content.innerHTML = this.renderAllAssets();
                break;
            case 'comments':
                content.innerHTML = this.renderAllComments();
                break;
            case 'network':
                content.innerHTML = this.renderNetwork();
                break;
        }
    }

    renderOverview() {
        const { profile, stats, projects, followers, following, likes } = this.currentData;
        
        return `
            <div class="overview-grid">
                <div class="info-card">
                    <h3>Creator Profile</h3>
                    <div class="creator-info">
                        <img src="${profile.avatar_url}" alt="${profile.username}" class="avatar-large">
                        <div>
                            <h4>@${profile.username}</h4>
                            <p>Joined: ${new Date(profile.created_at).toLocaleDateString()}</p>
                            <p>Discord: ${profile.discord_username || 'Not linked'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>Overall Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-number">${projects.data.length}</span>
                            <span>Total Projects</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${stats.stats.total_likes}</span>
                            <span>Total Likes</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${stats.stats.total_views}</span>
                            <span>Total Views</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${followers?.data?.length || 0}</span>
                            <span>Followers</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${following?.data?.length || 0}</span>
                            <span>Following</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${likes?.data?.length || 0}</span>
                            <span>Liked Projects</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderProjects() {
        const { detailedProjects } = this.currentData;
        
        return `
            <div class="projects-list">
                <h3>All Projects (${detailedProjects.length})</h3>
                ${detailedProjects.map((item, index) => `
                    <div class="project-card">
                        <div class="project-header">
                            <h4>${item.project.title || 'Untitled Project'}</h4>
                            <span class="project-id">${item.project.id}</span>
                        </div>
                        <div class="project-meta">
                            <p>Views: ${item.project.stats.views} | Likes: ${item.project.stats.likes} | Comments: ${item.project.stats.comments}</p>
                            <p>Created: ${new Date(item.project.created_at).toLocaleDateString()}</p>
                            <p>Versions: ${item.project.current_version || 0}</p>
                            ${item.descendants ? `<p>Descendants: ${item.descendants.data.length}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAllPrompts() {
        const { detailedProjects } = this.currentData;
        
        return `
            <div class="all-prompts">
                <h3>All Prompts Across Projects</h3>
                ${detailedProjects.map(item => `
                    <div class="project-prompts">
                        <h4>${item.project.title || item.project.id}</h4>
                        ${item.prompts ? item.prompts.map((prompt, index) => `
                            <div class="prompt-card">
                                <div class="prompt-header">
                                    <span class="prompt-number">#${item.prompts.length - index}</span>
                                    <span class="prompt-date">${new Date(prompt.created_at).toLocaleString()}</span>
                                </div>
                                <div class="prompt-content">
                                    ${prompt.prompt.text || prompt.prompt}
                                </div>
                                <div class="prompt-meta">
                                    Model: ${prompt.model} | State: ${prompt.state}
                                </div>
                            </div>
                        `).join('') : '<p>No prompts found</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAllVersions() {
        const { detailedProjects } = this.currentData;
        
        return `
            <div class="all-versions">
                <h3>All Project Versions</h3>
                ${detailedProjects.map(item => `
                    <div class="project-versions">
                        <h4>${item.project.title || item.project.id}</h4>
                        ${item.revisions ? item.revisions.data.map(rev => `
                            <div class="version-card">
                                <div class="version-header">
                                    <span class="version-number">v${rev.project_revision.version}</span>
                                    <span class="version-date">${new Date(rev.project_revision.created_at).toLocaleDateString()}</span>
                                </div>
                                <p>Created by: @${rev.project_revision.created_by.username}</p>
                            </div>
                        `).join('') : '<p>No revisions found</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAllStats() {
        const { detailedProjects } = this.currentData;
        
        return `
            <div class="all-stats">
                <h3>Project Statistics</h3>
                ${detailedProjects.map(item => `
                    <div class="project-stats">
                        <h4>${item.project.title || item.project.id}</h4>
                        ${item.stats ? `
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <span class="stat-number">${item.stats.views || 0}</span>
                                    <span>Views</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-number">${item.stats.total_tip_amount || 0}</span>
                                    <span>Total Tips</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-number">${(item.stats.mobile_ratio * 100).toFixed(1)}%</span>
                                    <span>Mobile Ratio</span>
                                </div>
                            </div>
                        ` : '<p>No stats available</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAllAssets() {
        const { detailedProjects } = this.currentData;
        
        return `
            <div class="all-assets">
                <h3>All Assets Across Projects</h3>
                ${detailedProjects.map(item => `
                    <div class="project-assets">
                        <h4>${item.project.title || item.project.id}</h4>
                        ${item.assets ? `
                            <div class="assets-grid">
                                ${item.assets.assets.map(asset => `
                                    <div class="asset-card">
                                        <img src="${asset.asset_url}" alt="${asset.filename}" class="asset-thumbnail">
                                        <p>${asset.filename}</p>
                                        <small>${asset.content_type}</small>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p>No assets found</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAllComments() {
        const { detailedProjects } = this.currentData;
        
        return `
            <div class="all-comments">
                <h3>All Comments Across Projects</h3>
                ${detailedProjects.map(item => `
                    <div class="project-comments">
                        <h4>${item.project.title || item.project.id}</h4>
                        ${item.comments ? `
                            <div class="comments-section">
                                ${item.comments.comments.data.map(comment => `
                                    <div class="comment-card">
                                        <div class="comment-header">
                                            <img src="${comment.comment.author.avatar_url}" alt="${comment.comment.author.username}" class="avatar-small">
                                            <span>@${comment.comment.author.username}</span>
                                            <span class="comment-date">${new Date(comment.comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div class="comment-content">
                                            ${comment.comment.content}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p>No comments found</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNetwork() {
        const { followers, following, likes } = this.currentData;
        
        return `
            <div class="network-analysis">
                <h3>Creator Network</h3>
                
                <div class="network-section">
                    <h4>Followers (${followers?.data?.length || 0})</h4>
                    ${followers ? `
                        <div class="network-grid">
                            ${followers.data.map(item => `
                                <div class="network-user">
                                    <img src="${item.follow.user.avatar_url}" alt="${item.follow.user.username}" class="avatar">
                                    <span>@${item.follow.user.username}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No followers found</p>'}
                </div>

                <div class="network-section">
                    <h4>Following (${following?.data?.length || 0})</h4>
                    ${following ? `
                        <div class="network-grid">
                            ${following.data.map(item => `
                                <div class="network-user">
                                    <img src="${item.follow.user.avatar_url}" alt="${item.follow.user.username}" class="avatar">
                                    <span>@${item.follow.user.username}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>Not following anyone</p>'}
                </div>

                <div class="network-section">
                    <h4>Liked Projects (${likes?.data?.length || 0})</h4>
                    ${likes ? `
                        <div class="network-grid">
                            ${likes.data.map(item => `
                                <div class="liked-project">
                                    <a href="https://websim.com/p/${item.like.site.project_id}" target="_blank">
                                        ${item.site.title || 'Untitled Project'}
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No liked projects</p>'}
                </div>
            </div>
        `;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new UserDeepSearchEngine();
});