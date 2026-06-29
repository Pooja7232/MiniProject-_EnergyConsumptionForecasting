// Supabase Authentication Handling
let supabaseClient = null;

// Helper to show alerts
function showAlert(type, message) {
    const alertBox = document.getElementById('auth-alert');
    if (!alertBox) return;
    
    alertBox.className = `alert alert-${type}`;
    alertBox.querySelector('.alert-msg').textContent = message;
    alertBox.classList.remove('hidden');
}

// Initialize Supabase and Check Session
async function initAuth() {
    try {
        // Fetch Supabase configuration from Flask backend
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (!config.supabaseUrl || config.supabaseUrl.includes('your-supabase-project')) {
            console.warn("Supabase credentials not configured in .env file. Running in demo/bypass mode.");
            setupDemoMode();
            return;
        }
        
        // Initialize Supabase client
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
        
        // Check current session
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const isLoginPage = window.location.pathname === '/login';
        
        if (session) {
            // User is logged in
            if (isLoginPage) {
                window.location.href = '/';
            } else {
                // We are on the dashboard
                document.body.classList.remove('hidden');
                const userEmailSpan = document.getElementById('user-email');
                if (userEmailSpan) userEmailSpan.textContent = session.user.email;
                setupDashboardLogout();
            }
        } else {
            // User is not logged in
            if (!isLoginPage) {
                window.location.href = '/login';
            } else {
                // We are on the login page
                setupLoginPageEvents();
            }
        }
        
        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            const isCurrentLoginPage = window.location.pathname === '/login';
            if (event === 'SIGNED_IN') {
                if (isCurrentLoginPage) {
                    window.location.href = '/';
                }
            } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                if (!isCurrentLoginPage) {
                    window.location.href = '/login';
                }
            }
        });
        
    } catch (error) {
        console.error("Error initializing authentication:", error);
        setupDemoMode();
    }
}

// Setup Event Listeners for Login Page
function setupLoginPageEvents() {
    const authForm = document.getElementById('auth-form');
    const signupForm = document.getElementById('signup-form');
    const btnSignupToggle = document.getElementById('btn-signup-toggle');
    const btnLoginToggle = document.getElementById('btn-login-toggle');
    
    // Toggle between Login and Signup forms
    if (btnSignupToggle && btnLoginToggle) {
        btnSignupToggle.addEventListener('click', () => {
            authForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        });
        
        btnLoginToggle.addEventListener('click', () => {
            signupForm.classList.add('hidden');
            authForm.classList.remove('hidden');
        });
    }
    
    // Login Form Submission
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btnText = document.querySelector('#btn-login .btn-text');
            
            btnText.textContent = 'Signing In...';
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showAlert('success', 'Login successful! Redirecting...');
            } catch (error) {
                showAlert('error', error.message || 'Failed to sign in');
                btnText.textContent = 'Sign In';
            }
        });
    }
    
    // Signup Form Submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const btnText = document.querySelector('#btn-register .btn-text');
            
            btnText.textContent = 'Registering...';
            
            try {
                const { data, error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                
                // Supabase typically sends a confirmation email
                if (data.user && data.session === null) {
                    showAlert('success', 'Registration successful! Please check your email for the confirmation link.');
                } else {
                    showAlert('success', 'Registration successful! Redirecting...');
                }
            } catch (error) {
                showAlert('error', error.message || 'Failed to register');
                btnText.textContent = 'Register';
            }
        });
    }
}

// Setup Logout on Dashboard
function setupDashboardLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            } else {
                // Demo mode logout
                localStorage.removeItem('demo_logged_in');
                window.location.href = '/login';
            }
        });
    }
}

// Fallback Demo Mode if Supabase is not configured yet
function setupDemoMode() {
    console.log("Setting up Demo / Bypass Mode. Use any credentials to sign in.");
    const isLoginPage = window.location.pathname === '/login';
    const isLoggedIn = localStorage.getItem('demo_logged_in') === 'true';
    
    if (isLoggedIn) {
        if (isLoginPage) {
            window.location.href = '/';
        } else {
            document.body.classList.remove('hidden');
            const userEmailSpan = document.getElementById('user-email');
            if (userEmailSpan) userEmailSpan.textContent = "demo.user@energypulse.ai (Demo Mode)";
            setupDashboardLogout();
        }
    } else {
        if (!isLoginPage) {
            window.location.href = '/login';
        } else {
            setupDemoLoginPageEvents();
        }
    }
}

function setupDemoLoginPageEvents() {
    const authForm = document.getElementById('auth-form');
    const signupForm = document.getElementById('signup-form');
    const btnSignupToggle = document.getElementById('btn-signup-toggle');
    const btnLoginToggle = document.getElementById('btn-login-toggle');
    
    if (btnSignupToggle && btnLoginToggle) {
        btnSignupToggle.addEventListener('click', () => {
            authForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        });
        
        btnLoginToggle.addEventListener('click', () => {
            signupForm.classList.add('hidden');
            authForm.classList.remove('hidden');
        });
    }
    
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('demo_logged_in', 'true');
            showAlert('success', 'Demo Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('demo_logged_in', 'true');
            showAlert('success', 'Demo Registration successful! Redirecting...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        });
    }
}

// Start Auth
document.addEventListener('DOMContentLoaded', initAuth);
