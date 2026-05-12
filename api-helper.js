// Farm Seva - API & Storage Helper Functions
// Use this file in your HTML pages to interact with the backend

const API_URL = 'http://localhost:8000/api';

// ==================== AUTHENTICATION HELPERS ====================

/**
 * Get stored JWT token
 */
function getAuthToken() {
    return localStorage.getItem('token');
}

/**
 * Get stored user data
 */
function getUserData() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return getAuthToken() !== null && getUserData() !== null;
}

/**
 * Redirect to login if not authenticated
 */
function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Logout user
 */
async function logout() {
    try {
        const token = getAuthToken();
        if (token) {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// ==================== PROFILE HELPERS ====================

/**
 * Get farmer profile from database
 */
async function getFarmerProfile() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/farmer/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            return data.farmer;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

/**
 * Update farmer profile
 */
async function updateFarmerProfile(profileData) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/farmer/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        const data = await response.json();
        if (data.success) {
            // Update cached user data
            const user = getUserData();
            const updatedUser = { ...user, ...profileData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return true;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        return false;
    }
}

// ==================== CROP HELPERS ====================

/**
 * Get all crops for logged-in farmer
 */
async function getFarmerCrops() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/crops`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            return data.crops || [];
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error fetching crops:', error);
        return [];
    }
}

/**
 * Add new crop record
 */
async function addCrop(cropData) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/crops`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cropData)
        });

        const data = await response.json();
        if (data.success) {
            return { success: true, cropId: data.cropId };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Error adding crop:', error);
        return { success: false, message: error.message };
    }
}

// ==================== SUBSIDY HELPERS ====================

/**
 * Apply for subsidy
 */
async function applySubsidy(subsidyData) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/subsidy/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subsidyData)
        });

        const data = await response.json();
        if (data.success) {
            return { success: true, applicationId: data.applicationId };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Error applying for subsidy:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Get all subsidy applications for farmer
 */
async function getSubsidyApplications() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/subsidy/applications`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            return data.applications || [];
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error fetching applications:', error);
        return [];
    }
}

// ==================== UI HELPERS ====================

/**
 * Display farmer name in header/dashboard
 */
function displayFarmerName() {
    const user = getUserData();
    if (user && user.name) {
        const nameElement = document.getElementById('farmerName');
        if (nameElement) {
            nameElement.textContent = user.name;
        }
        return user.name;
    }
    return null;
}

/**
 * Display farmer details on profile page
 */
async function displayFarmerDetails() {
    const profile = await getFarmerProfile();
    if (profile) {
        // Populate profile fields
        const fields = ['name', 'email', 'phone', 'state', 'district', 'village', 'landArea', 'cropType'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.value = profile[toCamelCase(field)] || '';
            }
        });
    }
}

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => notification.remove(), 5000);
}

// ==================== EXPORT FOR MODULE USE ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAuthToken,
        getUserData,
        isLoggedIn,
        checkAuth,
        logout,
        getFarmerProfile,
        updateFarmerProfile,
        getFarmerCrops,
        addCrop,
        applySubsidy,
        getSubsidyApplications,
        displayFarmerName,
        displayFarmerDetails,
        formatDate,
        showNotification
    };
}
