// Centralized API client for websim interactions
const BASE_URL = '/api/v1';

async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
}

export async function getProject(id, options = {}) {
    const params = new URLSearchParams();
    if (options.include) params.append('include', options.include.join(','));
    
    const response = await apiCall(`/projects/${id}?${params}`);
    return response.project;
}

export async function getProjectRevisions(id, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/projects/${id}/revisions?${params}`);
    return response.revisions;
}

export async function getProjectDescendants(id, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/projects/${id}/descendants?${params}`);
    return response.projects;
}

export async function getProjectDetailedStats(id) {
    const response = await apiCall(`/projects/${id}/stats`);
    return response;
}

export async function getUser(user) {
    const response = await apiCall(`/users/${user}`);
    return response.user;
}

export async function getUserStats(user) {
    const response = await apiCall(`/users/${user}/stats`);
    return response;
}

export async function getUserProjects(user, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/users/${user}/projects?${params}`);
    return response.projects;
}

export async function getComments(projectId, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/projects/${projectId}/comments?${params}`);
    return response.comments;
}

export async function getAssets(projectId, version) {
    const response = await apiCall(`/projects/${projectId}/revisions/${version}/assets`);
    return response;
}

export async function getProjectRevisionScreenshots(projectId, version) {
    const response = await apiCall(`/projects/${projectId}/revisions/${version}/screenshots`);
    return response;
}

export async function getUserFollowers(user, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/users/${user}/followers?${params}`);
    return response.followers;
}

export async function getUserFollowing(user, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/users/${user}/following?${params}`);
    return response.following;
}

export async function getUserLikes(user, options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
        if (options[key] !== undefined) params.append(key, options[key]);
    });
    
    const response = await apiCall(`/users/${user}/likes?${params}`);
    return response.likes;
}

