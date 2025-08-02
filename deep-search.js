import { 
    getProject, 
    getProjectRevisions, 
    getProjectDescendants, 
    getProjectDetailedStats,
    getUser,
    getUserStats,
    getUserProjects,
    getComments,
    getAssets,
    getProjectRevisionScreenshots,
    getUserFollowers,
    getUserFollowing,
    getUserLikes
} from './api-client.js';

class DeepSearchEngine {
    constructor() {
        this.currentProject = null;
        this.currentData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
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
        const projectId = this.extractProjectId(document.getElementById('projectIdInput').value);
        if (!projectId) {
            alert('Please enter a valid project ID or URL');
            return;
        }

        this.showLoading(true);
        
        try {
            const options = this.getSearchOptions();
            const data = await this.deepSearch(projectId, options);
            this.currentData = data;
            this.displayResults(data);
        } catch (error) {
            console.error('Search failed:', error);
            alert('Search failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    extractProjectId(input) {
        // Handle various formats:
        // - raw ID: abc123...
        // - URL: https://websim.com/p/abc123...
        // - URL: https://websim.com/c/def456...
        
        const idMatch = input.match(/[a-z0-9_-]{20}/);
        return idMatch ? idMatch[0] : null;
    }

    getSearchOptions() {
        return {
            includePrompts: document.getElementById('includePrompts').checked,
            includeRevisions: document.getElementById('includeRevisions').checked,
            includeCreator: document.getElementById('includeCreator').checked,
            includeStats: document.getElementById('includeStats').checked,
            includeAssets: document.getElementById('includeAssets').checked,
            includeComments: document.getElementById('includeComments').checked,
            includeDescendants: document.getElementById('includeDescendants').checked,
            includeScreenshots: document.getElementById('includeScreenshots').checked,
            includeFollowers: document.getElementById('includeFollowers').checked,
            includeLikes: document.getElementById('includeLikes').checked
        };
    }

    async deepSearch(projectId, options) {
        const project = await getProject(projectId);
        const data = { project };

        // Get all revisions
        if (options.includeRevisions) {
            const revisions = await getProjectRevisions(projectId);
            data.revisions = revisions;
        }

        // Get latest revision for additional data
        const latestRevision = await getProject(projectId, { include: ['members', 'permissions'] });

        // Get prompt history
        if (options.includePrompts && latestRevision.site) {
            const site = latestRevision.site;
            data.prompts = this.extractPromptHistory(site);
        }

        // Get creator details
        if (options.includeCreator) {
            const creator = await getUser(project.created_by.username);
            const creatorStats = await getUserStats(project.created_by.username);
            const creatorProjects = await getUserProjects(project.created_by.username);
            
            data.creator = {
                ...creator,
                stats: creatorStats,
                projects: creatorProjects
            };

            if (options.includeFollowers) {
                data.creator.followers = await getUserFollowers(project.created_by.username);
                data.creator.following = await getUserFollowing(project.created_by.username);
            }
        }

        // Get project stats
        if (options.includeStats) {
            data.stats = await getProjectDetailedStats(projectId);
        }

        // Get assets
        if (options.includeAssets && latestRevision.project_revision) {
            const assets = await getAssets(projectId, latestRevision.project_revision.version);
            data.assets = assets;
        }

        // Get comments
        if (options.includeComments) {
            const comments = await getComments(projectId);
            data.comments = comments;
        }

        // Get screenshots
        if (options.includeScreenshots && latestRevision.project_revision) {
            const screenshots = await getProjectRevisionScreenshots(
                projectId, 
                latestRevision.project_revision.version
            );
            data.screenshots = screenshots;
        }

        // Get descendants
        if (options.includeDescendants) {
            const descendants = await getProjectDescendants(projectId);
            data.descendants = descendants;
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
            case 'prompts':
                content.innerHTML = this.renderPrompts();
                break;
            case 'versions':
                content.innerHTML = this.renderVersions();
                break;
            case 'creator':
                content.innerHTML = this.renderCreator();
                break;
            case 'assets':
                content.innerHTML = this.renderAssets();
                break;
            case 'stats':
                content.innerHTML = this.renderStats();
                break;
            case 'comments':
                content.innerHTML = this.renderComments();
                break;
        }
    }

    renderOverview() {
        const { project, creator } = this.currentData;
        
        return `
            <div class="overview-grid">
                <div class="info-card">
                    <h3>Project Details</h3>
                    <p><strong>Title:</strong> ${project.title || 'Untitled'}</p>
                    <p><strong>ID:</strong> ${project.id}</p>
                    <p><strong>Visibility:</strong> ${project.visibility}</p>
                    <p><strong>Created:</strong> ${new Date(project.created_at).toLocaleDateString()}</p>
                    <p><strong>Updated:</strong> ${new Date(project.updated_at).toLocaleDateString()}</p>
                    <p><strong>Current Version:</strong> ${project.current_version || 'N/A'}</p>
                </div>
                
                <div class="info-card">
                    <h3>Creator</h3>
                    <div class="creator-info">
                        <img src="${creator.user.avatar_url}" alt="${creator.user.username}" class="avatar">
                        <div>
                            <p><strong>@${creator.user.username}</strong></p>
                            <p>Projects: ${creator.projects.data.length}</p>
                            <p>Followers: ${creator.followers?.data?.length || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPrompts() {
        const { prompts } = this.currentData;
        
        return `
            <div class="prompts-list">
                <h3>Prompt History</h3>
                ${prompts.map((prompt, index) => `
                    <div class="prompt-card">
                        <div class="prompt-header">
                            <span class="prompt-number">#${prompts.length - index}</span>
                            <span class="prompt-date">${new Date(prompt.created_at).toLocaleString()}</span>
                        </div>
                        <div class="prompt-content">
                            ${prompt.prompt.text || prompt.prompt}
                        </div>
                        <div class="prompt-meta">
                            Model: ${prompt.model} | State: ${prompt.state}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderVersions() {
        const { revisions } = this.currentData;
        
        return `
            <div class="versions-list">
                <h3>Version History</h3>
                ${revisions.data.map(rev => `
                    <div class="version-card">
                        <div class="version-header">
                            <span class="version-number">v${rev.project_revision.version}</span>
                            <span class="version-date">${new Date(rev.project_revision.created_at).toLocaleDateString()}</span>
                        </div>
                        <p>Created by: @${rev.project_revision.created_by.username}</p>
                        ${rev.site ? `<p>Prompt: ${rev.site.prompt.text || 'N/A'}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCreator() {
        const { creator } = this.currentData;
        
        return `
            <div class="creator-profile">
                <h3>Creator Profile</h3>
                <div class="profile-card">
                    <img src="${creator.user.avatar_url}" alt="${creator.user.username}" class="avatar-large">
                    <h4>@${creator.user.username}</h4>
                    <p>Joined: ${new Date(creator.user.created_at).toLocaleDateString()}</p>
                    
                    <div class="stats-grid">
                        <div class="stat">
                            <strong>${creator.projects.data.length}</strong>
                            <span>Projects</span>
                        </div>
                        <div class="stat">
                            <strong>${creator.stats.stats.total_likes}</strong>
                            <span>Total Likes</span>
                        </div>
                        <div class="stat">
                            <strong>${creator.stats.stats.total_views}</strong>
                            <span>Total Views</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAssets() {
        const { assets } = this.currentData;
        
        return `
            <div class="assets-grid">
                <h3>Project Assets</h3>
                ${assets.assets.map(asset => `
                    <div class="asset-card">
                        <img src="${asset.asset_url}" alt="${asset.filename}" class="asset-thumbnail">
                        <p>${asset.filename}</p>
                        <small>${asset.content_type}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderStats() {
        const { stats } = this.currentData;
        
        return `
            <div class="stats-section">
                <h3>Usage Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Total Views</h4>
                        <span class="stat-number">${stats.views || 0}</span>
                    </div>
                    <div class="stat-card">
                        <h4>Total Tips</h4>
                        <span class="stat-number">${stats.total_tip_amount || 0}</span>
                    </div>
                    <div class="stat-card">
                        <h4>Mobile Ratio</h4>
                        <span class="stat-number">${(stats.mobile_ratio * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderComments() {
        const { comments } = this.currentData;
        
        return `
            <div class="comments-section">
                <h3>Project Comments</h3>
                ${comments.comments.data.map(comment => `
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
        `;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new DeepSearchEngine();
});

