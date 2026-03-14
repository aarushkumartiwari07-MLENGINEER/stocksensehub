/* Main Application Controller */

import { Storage } from './storage.js';
import { API } from './api.js';
import { Charts } from './charts.js';
import { runPrediction } from './prediction.js';

class StockSenseApp {
    constructor() {
        this.currentView = 'track-stock';
        this.charts = {};
        this.predictions = {};
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupNavigation();
        this.setupEventListeners();
        this.setupGlobalErrorHandler();
        this.setupMobileSidebar();

        // Start loading dashboard data in the background silently
        const dashboardLoadPromise = this.loadView('track-stock');
        this.refreshPredictionsBackground();

        // Show the intro slides for review (Temporarily forced for this turn)
        localStorage.removeItem('stocksense_intro_seen');
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('active');
            preloader.style.display = 'flex';
        }

        await dashboardLoadPromise;
    }

    /* ==================== INTRO SLIDES ==================== */
    nextSlide(slideNumber) {
        // Hide all slides
        document.querySelectorAll('.intro-slide').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.slide-dot').forEach(d => d.classList.remove('active'));

        // Show targets
        const targetSlide = document.getElementById(`slide-${slideNumber}`);
        const targetDot = document.querySelector(`.slide-dot[data-slide="${slideNumber}"]`);

        if (targetSlide) targetSlide.classList.add('active');
        if (targetDot) targetDot.classList.add('active');
    }

    finishIntro() {
        const preloader = document.getElementById('preloader');
        const content = document.getElementById('preloader-content');

        if (preloader) {
            // Mark intro as seen
            localStorage.setItem('stocksense_intro_seen', 'true');

            // Premium transition
            preloader.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            preloader.style.opacity = '0';
            preloader.style.transform = 'scale(1.1)';

            setTimeout(() => {
                preloader.style.display = 'none';
                this.showSuccess('Welcome back, Aarush!');
            }, 800);
        }
    }

    setupGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            console.error('Unhandled error:', event.error);
            // Optionally notify user with a toast if available
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = this.currentTheme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                await this.loadView(view);
            });
        });
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Add stock button logic removed per user request
    }

    setupMobileSidebar() {
        const hamburger = document.getElementById('hamburger-btn');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');

        const openSidebar = () => {
            sidebar?.classList.add('open');
            backdrop?.classList.add('visible');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        };
        const closeSidebar = () => {
            sidebar?.classList.remove('open');
            backdrop?.classList.remove('visible');
            document.body.style.overflow = ''; // Restore scroll
        };

        hamburger?.addEventListener('click', openSidebar);
        backdrop?.addEventListener('click', closeSidebar);

        // Close sidebar when a nav link is clicked on mobile
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });

        // Add swipe gesture support for mobile
        this.setupSwipeGestures(sidebar, closeSidebar);

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeSidebar();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
                closeSidebar();
            }
        });
    }

    setupSwipeGestures(sidebar, closeSidebar) {
        let touchStartX = 0;
        let touchEndX = 0;
        let isSwipe = false;

        // Handle swipe to close sidebar
        sidebar?.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            isSwipe = false;
        }, { passive: true });

        sidebar?.addEventListener('touchmove', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            
            // Detect swipe gesture
            if (Math.abs(diff) > 10) {
                isSwipe = true;
                // Add visual feedback during swipe
                if (diff > 0) {
                    sidebar.style.transform = `translateX(-${Math.min(diff, 100)}px)`;
                }
            }
        }, { passive: true });

        sidebar?.addEventListener('touchend', (e) => {
            const diff = touchStartX - touchEndX;
            
            // Reset transform
            sidebar.style.transform = '';
            
            // Close sidebar if swipe is significant
            if (isSwipe && diff > 50) {
                closeSidebar();
            }
        }, { passive: true });

        // Handle swipe to open sidebar from left edge
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            isSwipe = false;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            
            // Detect swipe from left edge
            if (touchStartX < 20 && Math.abs(diff) > 10) {
                isSwipe = true;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const diff = touchEndX - touchStartX;
            
            // Open sidebar if swipe from left edge is significant
            if (isSwipe && touchStartX < 20 && diff > 50 && !sidebar?.classList.contains('open')) {
                const openSidebar = () => {
                    sidebar?.classList.add('open');
                    const backdrop = document.getElementById('sidebar-backdrop');
                    backdrop?.classList.add('visible');
                    document.body.style.overflow = 'hidden';
                };
                openSidebar();
            }
        }, { passive: true });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.setupTheme();
    }

    async loadView(viewName) {
        this.currentView = viewName;
        const contentArea = document.getElementById('app-content');
        const pageTitle = document.getElementById('page-title');

        // Update page title
        const titles = {
            portfolio: 'Portfolio Overview',
            insights: 'Market Forecast',
            simulation: 'Trading Simulator',
            alerts: 'Price Alerts',
            'track-stock': 'Analyze Stock'
        };
        pageTitle.textContent = titles[viewName] || 'Dashboard';

        // Dynamic "Add Stock" button visibility removed

        // Setup global search in header
        this.setupGlobalSearch();

        // Show loading state
        contentArea.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 4rem; color: var(--text-muted);">
                <i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i>
                <p style="margin-top: 1rem;">Loading ${titles[viewName]}...</p>
            </div>
        `;

        try {
            // Fetch component HTML
            const response = await fetch(`components/${viewName}.html`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();

            contentArea.innerHTML = html;
            contentArea.classList.add('animate-fade-in');

            // Initialize view-specific functionality
            await this.initializeView(viewName);
        } catch (error) {
            console.error('Error loading view:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 4rem; color: var(--danger);">
                    <i class="ph ph-warning-circle" style="font-size: 3rem;"></i>
                    <p style="margin-top: 1rem;">Failed to load view (${error.message}). Please try again.</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }

    async initializeView(viewName) {
        switch (viewName) {
            case 'portfolio':
                await this.initPortfolio();
                break;
            case 'insights':
                await this.initInsights();
                break;
            case 'simulation':
                await this.initSimulation();
                break;
            case 'alerts':
                await this.initAlerts();
                break;
            case 'track-stock':
                await this.initTrackStock();
                break;
        }
    }

    /* ==================== TRACK STOCK VIEW ==================== */
    async initTrackStock() {
        console.log("🚀 initTrackStock() called - Starting track-stock view");

        // Initialize real-time updates for ticker and stats
        await this.updateTickerCards();
        this.updateMarketStatusDisplay(); 
        this.startAutoRefresh();

        console.log("✅ initTrackStock() completed successfully");
    }

    updateMarketStatusDisplay() {
        const dot = document.getElementById('market-status-dot');
        const text = document.getElementById('market-status-text');
        const container = document.getElementById('market-status-container');
        const sessionText = document.getElementById('market-session-text');

        if (!dot || !text) return;

        // Get Current New York Time
        const nyTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
        const nyDate = new Date(nyTimeStr);
        const day = nyDate.getDay(); 
        const hours = nyDate.getHours();
        const mins = nyDate.getMinutes();
        const currentTime = hours + (mins / 60);

        // US Market Constants (ET)
        const marketOpenET = 9.5; // 9:30 AM
        const marketCloseET = 16.0; // 4:00 PM

        // Convert Market Times to User's Local (IST)
        // We do this by creating a date object for today at 9:30 AM ET and 4:00 PM ET
        const openDateET = new Date(nyDate);
        openDateET.setHours(9, 30, 0, 0);
        const closeDateET = new Date(nyDate);
        closeDateET.setHours(16, 0, 0, 0);

        const istOption = { hour: '2-digit', minute: '2-digit', hour12: true };
        const openTimeIST = openDateET.toLocaleTimeString('en-IN', istOption);
        const closeTimeIST = closeDateET.toLocaleTimeString('en-IN', istOption);

        // Logic
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = currentTime >= marketOpenET && currentTime < marketCloseET;
        const isOpen = isWeekday && isMarketHours;

        if (isOpen) {
            dot.className = 'status-indicator live';
            text.textContent = 'Market is currently Open';
            if (container) {
                container.style.background = 'rgba(16, 185, 129, 0.05)';
                container.style.color = 'var(--success)';
            }
            if (sessionText) sessionText.textContent = `Closes at ${closeTimeIST} IST`;
        } else {
            dot.className = 'status-indicator';
            dot.style.background = 'var(--text-muted)';
            dot.style.boxShadow = 'none';
            dot.style.animation = 'none';
            text.textContent = 'Market is currently Closed';
            if (container) {
                container.style.background = 'rgba(107, 127, 122, 0.1)';
                container.style.color = 'var(--text-muted)';
            }
            
            // Determine if it opens today or Monday
            if (day === 0 || (day === 5 && currentTime >= marketCloseET) || day === 6) {
                if (sessionText) sessionText.textContent = `Opens Monday ${openTimeIST} IST`;
            } else if (currentTime < marketOpenET) {
                if (sessionText) sessionText.textContent = `Opens Today ${openTimeIST} IST`;
            } else {
                if (sessionText) sessionText.textContent = `Opens Tomorrow ${openTimeIST} IST`;
            }
        }
    }

    async handleTrackStock(action) {
        const symbolInput = document.getElementById('stock-symbol');
        const qtyInput = document.getElementById('stock-qty');
        const priceInput = document.getElementById('stock-price');
        const analyzeBtn = document.getElementById('btn-analyze');
        const addBtn = document.getElementById('btn-add-portfolio');

        const symbol = symbolInput?.value.trim().toUpperCase();
        const qty = parseInt(qtyInput?.value);
        const price = parseFloat(priceInput?.value) || 0;

        // Reset errors
        document.querySelectorAll('.inline-error').forEach(el => el.textContent = '');

        let hasError = false;

        if (!symbol) {
            document.getElementById('error-symbol').textContent = 'Please enter a stock symbol';
            hasError = true;
        }

        if (isNaN(qty) || qty <= 0) {
            document.getElementById('error-qty').textContent = 'Quantity must be a positive number';
            hasError = true;
        }

        if (hasError) return;

        // Disable buttons
        if (analyzeBtn) analyzeBtn.disabled = true;
        if (addBtn) addBtn.disabled = true;
        if (analyzeBtn) analyzeBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';

        try {
            // Validate symbol with API
            const stockData = await API.getStockPrice(symbol);
            if (!stockData || !stockData.price) throw new Error('Invalid symbol or API unavailable');

            const buyPrice = (price && price > 0) ? price : stockData.price;

            if (action === 'analyze') {
                // Clear portfolio and add only this one as per requirement
                Storage.setPortfolio({ symbol, qty, buyPrice: buyPrice });

                // Redirect to portfolio
                const portfolioLink = document.querySelector('.nav-link[data-view="portfolio"]');
                if (portfolioLink) portfolioLink.click();
            } else {
                // Add to existing portfolio
                Storage.addToPortfolio(symbol, qty, buyPrice);

                // feedback
                if (addBtn) {
                    addBtn.innerHTML = '<i class="ph ph-check"></i> Added';
                    setTimeout(() => {
                        addBtn.innerHTML = '<i class="ph ph-plus"></i> Add to Portfolio';
                        addBtn.disabled = false;
                    }, 2000);
                }

                // Redirect to portfolio
                const portfolioLink = document.querySelector('.nav-link[data-view="portfolio"]');
                if (portfolioLink) portfolioLink.click();
            }
        } catch (error) {
            document.getElementById('error-symbol').textContent = error.message || 'Error fetching stock data';
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = 'Analyze Stock';
            }
            if (addBtn && action !== 'add') {
                addBtn.disabled = false;
            }
        }
    }

    /* ==================== PORTFOLIO VIEW ==================== */
    async initPortfolio() {
        // Setup portfolio search functionality for both empty and active states
        this.setupPortfolioSearch();
        this.setupEmptyPortfolioSearch();
        await this.loadPortfolioData();
        this.initPortfolioChart();
        this.setupChartFilters();
    }

    /* setupPortfolioForm removed */

    setupPortfolioSearch() {
        const portfolioSymbolInput = document.getElementById('portfolio-symbol');
        const portfolioDropdown = document.getElementById('portfolio-symbol-dropdown');
        
        if (!portfolioSymbolInput || !portfolioDropdown) return;

        let searchTimeout;
        let currentResults = [];

        // Setup search functionality similar to other views
        portfolioSymbolInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) clearTimeout(searchTimeout);
            
            // Hide dropdown if query is empty
            if (query.length === 0) {
                portfolioDropdown.style.display = 'none';
                document.getElementById('current-price-display').style.display = 'none';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    currentResults = await API.searchStocks(query);
                    this.showPortfolioSearchResults(portfolioDropdown, currentResults, portfolioSymbolInput);
                } catch (error) {
                    console.error('Portfolio search error:', error);
                    portfolioDropdown.style.display = 'none';
                }
            }, 300);
        });

        // Handle result selection
        portfolioDropdown.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const symbol = resultItem.dataset.symbol;
                portfolioSymbolInput.value = symbol;
                portfolioDropdown.style.display = 'none';
                
                // Fetch and display current price
                this.fetchCurrentPrice(symbol);
            }
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!portfolioSymbolInput.contains(e.target) && !portfolioDropdown.contains(e.target)) {
                portfolioDropdown.style.display = 'none';
            }
        });
    }

    showPortfolioSearchResults(dropdown, results, inputElement) {
        if (!results || results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        const html = results.map(stock => `
            <div class="search-result-item" data-symbol="${stock.symbol}" style="
                padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-color);
                transition: background 0.2s;
            " onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='transparent'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-main);">${stock.symbol}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${stock.name || stock.type || ''}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--text-main);">$${(stock.price || '0.00')}</div>
                        ${stock.change ? `<div style="font-size: 0.8rem; color: ${stock.change >= 0 ? 'var(--success)' : 'var(--danger)'};">${stock.change >= 0 ? '+' : ''}${stock.change}%</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }

    async fetchCurrentPrice(symbol) {
        try {
            const stockData = await API.getStockPrice(symbol);
            const priceDisplay = document.getElementById('current-price-display');
            const priceElement = document.getElementById('current-market-price');
            
            if (priceDisplay && priceElement) {
                priceElement.textContent = `$${stockData.price.toFixed(2)}`;
                priceDisplay.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching current price:', error);
            document.getElementById('current-price-display').style.display = 'none';
        }
    }

    addStockToPortfolio(action = 'add') {
        this.handleStockSubmission(action);
    }

    setupEmptyPortfolioSearch() {
        const emptySymbolInput = document.getElementById('empty-portfolio-symbol');
        const emptyDropdown = document.getElementById('empty-portfolio-dropdown');
        
        if (!emptySymbolInput || !emptyDropdown) return;

        let searchTimeout;
        let currentResults = [];

        // Setup search functionality for empty state
        emptySymbolInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) clearTimeout(searchTimeout);
            
            // Hide dropdown if query is empty
            if (query.length === 0) {
                emptyDropdown.style.display = 'none';
                document.getElementById('empty-current-price-display').style.display = 'none';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    currentResults = await API.searchStocks(query);
                    this.showEmptyPortfolioSearchResults(emptyDropdown, currentResults, emptySymbolInput);
                } catch (error) {
                    console.error('Empty portfolio search error:', error);
                    emptyDropdown.style.display = 'none';
                }
            }, 300);
        });

        // Handle result selection
        emptyDropdown.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const symbol = resultItem.dataset.symbol;
                emptySymbolInput.value = symbol;
                emptyDropdown.style.display = 'none';
                
                // Fetch and display current price
                this.fetchEmptyCurrentPrice(symbol);
            }
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!emptySymbolInput.contains(e.target) && !emptyDropdown.contains(e.target)) {
                emptyDropdown.style.display = 'none';
            }
        });
    }

    showEmptyPortfolioSearchResults(dropdown, results, inputElement) {
        if (!results || results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        const html = results.map(stock => `
            <div class="search-result-item" data-symbol="${stock.symbol}" style="
                padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-color);
                transition: background 0.2s;
            " onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='transparent'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-main);">${stock.symbol}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${stock.name || stock.type || ''}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--text-main);">$${(stock.price || '0.00')}</div>
                        ${stock.change ? `<div style="font-size: 0.8rem; color: ${stock.change >= 0 ? 'var(--success)' : 'var(--danger)'};">${stock.change >= 0 ? '+' : ''}${stock.change}%</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }

    async fetchEmptyCurrentPrice(symbol) {
        try {
            const stockData = await API.getStockPrice(symbol);
            const priceDisplay = document.getElementById('empty-current-price-display');
            const priceElement = document.getElementById('empty-current-market-price');
            
            if (priceDisplay && priceElement) {
                priceElement.textContent = `$${stockData.price.toFixed(2)}`;
                priceDisplay.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching empty state current price:', error);
            document.getElementById('empty-current-price-display').style.display = 'none';
        }
    }

    addStockFromEmptyState(action = 'add') {
        this.handleStockSubmission(action, true);
    }

    async handleStockSubmission(action = 'add', isEmptyState = false) {
        // Determine which form elements to use based on state
        const prefix = isEmptyState ? 'empty-' : '';
        const symbolInput = document.getElementById(`${prefix}portfolio-symbol`);
        const qtyInput = document.getElementById(`${prefix}portfolio-qty`);
        const priceInput = document.getElementById(`${prefix}portfolio-price`);
        const analyzeBtn = isEmptyState ? document.getElementById('empty-analyze-stock-btn') : document.getElementById('analyze-stock-btn');
        const addBtn = isEmptyState ? document.getElementById('empty-add-stock-btn') : document.getElementById('add-stock-btn');

        const symbol = symbolInput?.value.trim().toUpperCase();
        const qty = parseInt(qtyInput?.value);
        const price = parseFloat(priceInput?.value) || 0;

        // Reset errors
        const errorSymbol = document.getElementById(`${prefix}error-symbol`);
        const errorQty = document.getElementById(`${prefix}error-qty`);
        if (errorSymbol) errorSymbol.textContent = '';
        if (errorQty) errorQty.textContent = '';

        let hasError = false;

        if (!symbol) {
            if (errorSymbol) errorSymbol.textContent = 'Please enter a stock symbol';
            hasError = true;
        }

        if (isNaN(qty) || qty <= 0) {
            if (errorQty) errorQty.textContent = 'Quantity must be a positive number';
            hasError = true;
        }

        if (hasError) return;

        // Disable buttons
        if (analyzeBtn) analyzeBtn.disabled = true;
        if (addBtn) addBtn.disabled = true;
        if (analyzeBtn) analyzeBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';
        if (addBtn) addBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Adding...';

        try {
            // Validate symbol with API
            const stockData = await API.getStockPrice(symbol);
            if (!stockData || !stockData.price) throw new Error('Invalid symbol or API unavailable');

            const buyPrice = (price && price > 0) ? price : stockData.price;

            if (action === 'analyze') {
                // Clear portfolio and add only this one as per requirement
                Storage.setPortfolio({ symbol, qty, buyPrice: buyPrice });

                // Redirect to portfolio
                const portfolioLink = document.querySelector('.nav-link[data-view="portfolio"]');
                if (portfolioLink) portfolioLink.click();
            } else {
                // Add to existing portfolio
                Storage.addToPortfolio(symbol, qty, buyPrice);

                // feedback
                if (addBtn) {
                    addBtn.innerHTML = '<i class="ph ph-check"></i> Added';
                    setTimeout(() => {
                        addBtn.innerHTML = '<i class="ph ph-plus"></i> Add';
                        addBtn.disabled = false;
                    }, 2000);
                }

                // Redirect to portfolio
                const portfolioLink = document.querySelector('.nav-link[data-view="portfolio"]');
                if (portfolioLink) portfolioLink.click();
            }
        } catch (error) {
            if (errorSymbol) errorSymbol.textContent = error.message || 'Error fetching stock data';
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="ph ph-chart-line-up"></i> Analyze';
            }
            if (addBtn && action !== 'add') {
                addBtn.disabled = false;
            }
        }
    }

    setupStockSearch(inputElement) {
        if (!inputElement) return;

        // Create autocomplete dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'stock-search-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #ffffff;
            border: 2px solid #2563eb;
            border-radius: 12px;
            max-height: 240px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            margin-top: 4px;
        `;

        // Position dropdown relative to input
        inputElement.style.position = 'relative';
        inputElement.parentNode.style.position = 'relative';
        inputElement.parentNode.appendChild(dropdown);

        let searchTimeout;
        let currentResults = [];

        // Search on input
        inputElement.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            // Clear previous timeout
            clearTimeout(searchTimeout);

            // Hide dropdown if query is too short
            if (query.length < 2) {
                dropdown.style.display = 'none';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    currentResults = await API.searchStocks(query);
                    this.showSearchResults(dropdown, currentResults, inputElement);
                } catch (error) {
                    console.error('Search error:', error);
                    dropdown.style.display = 'none';
                }
            }, 300);
        });

        // Hide dropdown on blur
        inputElement.addEventListener('blur', () => {
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        });

        // Show dropdown on focus
        inputElement.addEventListener('focus', () => {
            if (inputElement.value.trim().length >= 2 && currentResults.length > 0) {
                dropdown.style.display = 'block';
            }
        });

        // Hide on escape
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }

    showSearchResults(dropdown, results, inputElement) {
        if (!results || results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = results.map(stock => `
            <div class="search-result-item" data-symbol="${stock.symbol || stock.Symbol}" style="
                padding: 16px 20px;
                cursor: pointer;
                border-bottom: 1px solid #e5e7eb;
                transition: all 0.2s ease;
                background: #ffffff;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <div style="
                                font-weight: 700; 
                                color: #1f2937; 
                                font-size: 0.95rem;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            ">
                                ${stock.symbol || stock.Symbol}
                            </div>
                            <div style="
                                background: #2563eb;
                                color: white;
                                padding: 2px 8px;
                                border-radius: 12px;
                                font-size: 0.7rem;
                                font-weight: 600;
                                text-transform: uppercase;
                            ">
                                US
                            </div>
                        </div>
                        <div style="
                            font-size: 0.85rem; 
                            color: #6b7280;
                            line-height: 1.3;
                        ">
                            ${stock.name || stock.description || stock.Name || ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="
                            font-weight: 600; 
                            color: #374151;
                            font-size: 0.8rem;
                        ">
                            ${stock.type || stock.exchange || 'STOCK'}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        dropdown.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.getAttribute('data-symbol');
                inputElement.value = symbol;
                dropdown.style.display = 'none';
                inputElement.focus();
            });

            item.addEventListener('mouseenter', () => {
                item.style.background = '#f3f4f6';
                item.style.borderLeft = '3px solid #2563eb';
                item.style.paddingLeft = '17px';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = '#ffffff';
                item.style.borderLeft = 'none';
                item.style.paddingLeft = '20px';
            });
        });

        dropdown.style.display = 'block';
    }

    setupGlobalSearch() {
        // Find the header search bar
        const headerSearchInput = document.querySelector('.top-actions .search-bar input');

        if (headerSearchInput && !headerSearchInput.hasAttribute('data-enhanced')) {
            // Mark as enhanced to avoid duplicate setup
            headerSearchInput.setAttribute('data-enhanced', 'true');

            // Setup enhanced search for header search
            this.setupStockSearch(headerSearchInput);

            // Add enter key handler for header search
            headerSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const symbol = e.target.value.trim().toUpperCase();
                    if (symbol) {
                        // Navigate to track-stock page and search
                        this.handleGlobalSearch(symbol);
                    }
                }
            });
        }
    }

    async handleGlobalSearch(symbol) {
        try {
            // Validate symbol exists
            await API.getStockPrice(symbol);

            // Navigate to Market Forecast (Insights) page as the primary analysis hub
            const insightsLink = document.querySelector('.nav-link[data-view="insights"]');
            if (insightsLink) {
                insightsLink.click();

                // Wait for page to load, then select and run forecast
                setTimeout(() => {
                    const forecastSelect = document.getElementById('forecast-stock');
                    if (forecastSelect) {
                        forecastSelect.value = symbol;
                        this.runForecast();
                    }
                }, 600);
            }
        } catch (error) {
            // Show error for invalid symbol
            this.showSearchError(`Stock ${symbol} not found. Please check the symbol.`);
        }
    }

    showSearchError(message) {
        // Create or update error notification
        let errorDiv = document.getElementById('search-error-notification');

        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'search-error-notification';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--danger);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 300px;
                animation: slideInRight 0.3s ease;
            `;
            document.body.appendChild(errorDiv);
        }

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }

    async loadPortfolioData() {
        const portfolio = Storage.getPortfolio();
        const tableBody = document.getElementById('portfolio-list');
        const emptyView = document.getElementById('empty-portfolio-view');
        const activeView = document.getElementById('active-portfolio-view');

        if (!tableBody) return;

        // Show/hide appropriate views
        if (portfolio.length === 0) {
            if (emptyView) emptyView.style.display = 'block';
            if (activeView) activeView.style.display = 'none';
            return;
        } else {
            if (emptyView) emptyView.style.display = 'none';
            if (activeView) activeView.style.display = 'block';
        }

        if (portfolio.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        No stocks in portfolio. Click "Add Stock" to get started.
                    </td>
                </tr>
            `;
            this.updatePortfolioStats(0, 0, null, 0);
            return;
        }

        // Fetch all stock data in parallel
        const stockDataPromises = portfolio.map(async (stock) => {
            try {
                const data = await API.getStockPrice(stock.symbol);
                return { ...stock, currentPrice: data.price, changePer: data.changePer, prevPrice: data.price / (1 + data.changePer / 100) };
            } catch (error) {
                console.error(`Error fetching ${stock.symbol}:`, error);
                return { ...stock, currentPrice: stock.buyPrice, changePer: 0, prevPrice: stock.buyPrice, error: true };
            }
        });

        const results = await Promise.all(stockDataPromises);

        let totalValue = 0;
        let totalCost = 0;
        let totalDayGain = 0;
        let rows = '';
        let topStock = null;
        let topReturn = -Infinity;

        results.forEach(stock => {
            const currentPrice = parseFloat(stock.currentPrice) || 0;
            const buyPrice = parseFloat(stock.buyPrice) || 0;
            const qty = parseInt(stock.qty) || 0;
            const changePer = parseFloat(stock.changePer) || 0;

            const currentValue = currentPrice * qty;
            const costBasis = buyPrice * qty;
            const profitLoss = currentValue - costBasis;
            const profitLossPer = costBasis !== 0 ? ((profitLoss / costBasis) * 100).toFixed(2) : '0.00';

            totalValue += currentValue;
            totalCost += costBasis;

            const prevPrice = stock.prevPrice || currentPrice;
            totalDayGain += (currentPrice - prevPrice) * qty;

            const returnPer = buyPrice !== 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;
            if (returnPer > topReturn) {
                topReturn = returnPer;
                topStock = stock.symbol;
            }

            const plClass = profitLoss >= 0 ? 'trend-up' : 'trend-down';
            const plIcon = profitLoss >= 0 ? 'ph-trend-up' : 'ph-trend-down';
            const errorBadge = stock.error ? '<i class="ph ph-warning" title="Connection error, showing last known price"></i>' : '';

            rows += `
                <tr>
                    <td><span class="stock-badge">${stock.symbol} ${errorBadge}</span></td>
                    <td>$${currentPrice.toFixed(2)}</td>
                    <td>
                        <span class="stat-trend ${changePer >= 0 ? 'trend-up' : 'trend-down'}">
                            <i class="ph ${changePer >= 0 ? 'ph-trend-up' : 'ph-trend-down'}"></i>
                            ${changePer >= 0 ? '+' : ''}${changePer}%
                        </span>
                    </td>
                    <td>${qty} shares</td>
                    <td>$${buyPrice.toFixed(2)}</td>
                    <td>$${currentValue.toFixed(2)}</td>
                    <td>
                        <span class="stat-trend ${plClass}">
                            <i class="ph ${plIcon}"></i>
                            ${profitLoss >= 0 ? '+' : ''}$${Math.abs(profitLoss).toFixed(2)} (${profitLossPer}%)
                        </span>
                    </td>
                    <td class="portfolio-prediction" style="font-weight: 700;">---</td>
                    <td>
                        <button class="btn-outline" style="padding: 0.3rem 0.6rem; border: none; color: var(--danger);" 
                            onclick="app.removeStock('${stock.symbol}')">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = rows;
        this.updatePortfolioStats(totalValue, totalCost, topStock, topReturn, totalDayGain);
        this.updatePortfolioPredictions();
    }

    updatePortfolioStats(totalValue, totalCost, topStock, topReturn, totalDayGain = 0) {
        const totalGain = totalValue - totalCost;
        const totalGainPer = totalCost !== 0 ? ((totalGain / totalCost) * 100).toFixed(2) : '0.00';

        // Safety check to prevent division by zero or NaN
        const prevDayValue = totalValue - totalDayGain;
        const dayGainPer = prevDayValue !== 0 && !isNaN(totalDayGain) ? ((totalDayGain / prevDayValue) * 100).toFixed(2) : '0.00';

        const balanceEl = document.getElementById('total-balance');
        const trendEl = document.getElementById('total-trend');
        const dayGainEl = document.getElementById('day-gain');
        const dayTrendEl = document.getElementById('day-trend');
        const topStockEl = document.getElementById('top-stock');
        const topReturnEl = document.getElementById('top-stock-return');

        if (balanceEl) balanceEl.textContent = `$${(totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (trendEl) {
            trendEl.innerHTML = `
                <i class="ph ${totalGain >= 0 ? 'ph-trend-up' : 'ph-trend-down'}"></i>
                ${totalGain >= 0 ? '+' : ''}${totalGainPer}%
            `;
            trendEl.className = `stat-trend ${totalGain >= 0 ? 'trend-up' : 'trend-down'}`;
        }

        if (dayGainEl) dayGainEl.textContent = `${totalDayGain >= 0 ? '+' : ''}$${Math.abs(totalDayGain || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (dayTrendEl) {
            dayTrendEl.innerHTML = `
                <i class="ph ${totalDayGain >= 0 ? 'ph-trend-up' : 'ph-trend-down'}"></i>
                ${totalDayGain >= 0 ? '+' : ''}${dayGainPer}%
            `;
            dayTrendEl.className = `stat-trend ${totalDayGain >= 0 ? 'trend-up' : 'trend-down'}`;
        }

        if (topStock && topStockEl && topReturnEl) {
            topStockEl.textContent = topStock;
            topReturnEl.innerHTML = `
                <i class="ph ph-trend-up"></i> +${topReturn.toFixed(2)}%
            `;
        } else if (topStockEl && topReturnEl) {
            topStockEl.textContent = 'None';
            topReturnEl.innerHTML = '--';
        }
    }

    async initPortfolioChart() {
        const canvas = document.getElementById('portfolioChart');
        const loader = document.getElementById('portfolio-chart-loader');
        if (!canvas) return;

        // Show loader
        if (loader) {
            loader.classList.remove('hidden');
        }

        const portfolio = Storage.getPortfolio();
        if (portfolio.length === 0) {
            if (this.charts.portfolio) {
                this.charts.portfolio.destroy();
                this.charts.portfolio = null;
            }
            // Hide loader when portfolio is empty
            if (loader) {
                loader.classList.add('hidden');
            }
            return;
        }

        const ctx = canvas.getContext('2d');

        try {
            // Get portfolio historical data (aggregated performance)
            const historyData = await API.getPortfolioHistoricalData(portfolio, '1M');

            if (this.charts.portfolio) {
                this.charts.portfolio.destroy();
            }

            this.charts.portfolio = Charts.createAreaChart(
                ctx,
                historyData.labels,
                historyData.data,
                'Portfolio Performance'
            );

            console.log('Portfolio chart initialized with real data');

            // Hide loader
            if (loader) {
                loader.classList.add('hidden');
            }

        } catch (error) {
            console.error('Failed to load portfolio chart data:', error);

            // Fallback to single stock chart if portfolio aggregation fails
            try {
                const symbol = portfolio[0].symbol;
                const stockHistoryData = await API.getHistoricalData(symbol, '1M');

                if (this.charts.portfolio) {
                    this.charts.portfolio.destroy();
                }

                this.charts.portfolio = Charts.createAreaChart(
                    ctx,
                    stockHistoryData.labels,
                    stockHistoryData.data,
                    `Value History: ${symbol}`
                );

                console.log('Portfolio chart initialized with single stock data');

                // Hide loader
                if (loader) {
                    loader.classList.add('hidden');
                }
            } catch (fallbackError) {
                console.error('Failed to load fallback chart data:', fallbackError);
                
                // Hide loader even on error
                if (loader) {
                    loader.classList.add('hidden');
                }
            }
        }
    }



    setupChartFilters() {
        const filterBtns = document.querySelectorAll('.chart-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const range = btn.getAttribute('data-range');
                await this.updatePortfolioChart(range);
            });
        });
    }

    async updatePortfolioChart(range) {
        if (!this.charts.portfolio) return;

        const loader = document.getElementById('portfolio-chart-loader');
        const portfolio = Storage.getPortfolio();
        if (portfolio.length === 0) return;

        // Show loader
        if (loader) {
            loader.classList.remove('hidden');
        }

        try {
            // Try to get portfolio historical data first
            const historyData = await API.getPortfolioHistoricalData(portfolio, range);

            this.charts.portfolio.data.labels = historyData.labels;
            this.charts.portfolio.data.datasets[0].data = historyData.data;
            this.charts.portfolio.options.plugins.title.text = `Portfolio Performance (${range})`;
            this.charts.portfolio.update();

            console.log(`Portfolio chart updated for ${range} with real data`);

        } catch (error) {
            console.error('Failed to update portfolio chart with aggregated data:', error);

            // Fallback to single stock data
            try {
                const symbol = portfolio[0].symbol;
                const stockHistoryData = await API.getHistoricalData(symbol, range);

                this.charts.portfolio.data.labels = stockHistoryData.labels;
                this.charts.portfolio.data.datasets[0].data = stockHistoryData.data;
                this.charts.portfolio.options.plugins.title.text = `Value History: ${symbol} (${range})`;
                this.charts.portfolio.update();

                console.log(`Portfolio chart updated for ${range} with single stock data`);
            } catch (fallbackError) {
                console.error('Failed to update chart with fallback data:', fallbackError);
            }
        }

        // Hide loader after update is complete
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    async refreshPrices() {
        await this.loadPortfolioData();
    }

    removeStock(symbol) {
        if (confirm(`Remove ${symbol} from portfolio?`)) {
            Storage.removeFromPortfolio(symbol);
            // Reload portfolio data which will handle empty/active view switching
            this.loadPortfolioData();
            // Reinitialize chart to reflect changes
            this.initPortfolioChart();
        }
    }

    /* Portfolio expansion methods removed */

    /* ==================== MARKET FORECAST VIEW ==================== */
    async initInsights() {
        console.log("📈 initForecast() called");
        const needle = document.getElementById('sentiment-needle');
        if (needle) needle.style.transform = 'rotate(-45deg)';

        // Start countdown if not running
        this.startForecastTimer();

        // Load default forecast
        this.runForecast('AAPL');
    }

    startForecastTimer() {
        if (this.forecastTimer) clearInterval(this.forecastTimer);
        let count = 60;
        this.forecastTimer = setInterval(() => {
            count--;
            const el = document.getElementById('forecast-countdown');
            if (el) el.textContent = `${count}s`;
            if (count <= 0) {
                count = 60;
                this.refreshPredictionsBackground();
            }
        }, 1000);
    }

    async runForecast(requestedRange = '1M') {
        const symbol = document.getElementById('forecast-stock')?.value || 'AAPL';
        const btn = document.getElementById('run-forecast-btn');
        const placeholder = document.getElementById('forecast-placeholder');
        const resultView = document.getElementById('forecast-result-view');
        const canvas = document.getElementById('predictionChart');

        // Update active filter UI
        const filterBtns = document.querySelectorAll('#forecast-chart-filters .chart-filter-btn');
        filterBtns.forEach(b => {
            b.classList.remove('active');
            if (b.getAttribute('data-range') === requestedRange) b.classList.add('active');
        });

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> CALCULATING...';
        }

        try {
            // Fetch historical data for requested range
            const hist = await API.getHistoricalData(symbol, requestedRange);
            if (!hist || hist.data.length < 5) throw new Error(`Insufficient data for ${requestedRange}`);

            // Find user position
            const portfolio = Storage.getPortfolio();
            const position = portfolio.find(s => s.symbol === symbol);

            // Run engine (always use 1M for the actual prediction math for consistency, but chart shows requested range)
            const result = runPrediction(hist.data, position ? {
                quantity: position.qty,
                avgBuyPrice: position.buyPrice
            } : null);

            this.predictions[symbol] = result;

            // Wait a bit for "math" effect
            await new Promise(r => setTimeout(r, 600));

            // Show UI
            if (placeholder) placeholder.style.display = 'none';
            if (resultView) resultView.style.display = 'block';

            this.renderPredictionResult(symbol, result);

            // Update Chart with the specific range label
            if (this.charts.prediction) this.charts.prediction.destroy();
            const ctx = canvas.getContext('2d');
            this.charts.prediction = this.createForecastChart(ctx, hist, result);
            this.charts.prediction.options.plugins.title.text = `${symbol} Projection (${requestedRange})`;
            this.charts.prediction.update();

        } catch (error) {
            console.error('Forecast error:', error);
            if (placeholder) {
                placeholder.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--danger);">
                        <i class="ph ph-warning-circle" style="font-size: 2rem; color: var(--danger); margin-bottom: 0.5rem;"></i>
                        <p style="color:var(--danger)"><strong>Error:</strong> ${error.message}</p>
                    </div>
                `;
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-lightning"></i> Calculate Forecast';
            }
        }
    }

    async refreshPredictionsBackground() {
        console.log("🔄 Background prediction refresh...");
        const stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
        for (const symbol of stocks) {
            try {
                const hist = await API.getHistoricalData(symbol, '1M');
                if (hist && hist.data.length >= 20) {
                    const portfolio = Storage.getPortfolio();
                    const pos = portfolio.find(s => s.symbol === symbol);
                    this.predictions[symbol] = runPrediction(hist.data, pos ? {
                        quantity: pos.qty,
                        avgBuyPrice: pos.buyPrice
                    } : null);
                }
            } catch (e) {
                console.warn(`Bg prediction failed for ${symbol}`);
            }
        }

        // If we are on insights view, update current display
        if (this.currentView === 'insights') {
            const currentSymbol = document.getElementById('forecast-stock')?.value;
            if (currentSymbol && this.predictions[currentSymbol]) {
                this.renderPredictionResult(currentSymbol, this.predictions[currentSymbol]);
            }
        }

        // Update portfolio if needed
        if (this.currentView === 'portfolio') {
            this.updatePortfolioPredictions();
        }
    }

    renderPredictionResult(symbol, res) {
        const header = document.getElementById('forecast-symbol-header');
        const badgeContainer = document.getElementById('forecast-badge-container');
        if (header) header.textContent = `${symbol} Market Outlook`;

        if (badgeContainer) {
            const colorClass = res.signal === 'BUY' ? 'badge-buy' : (res.signal === 'SELL' ? 'badge-sell' : 'badge-hold');
            const icon = res.signal === 'BUY' ? 'ph-arrow-up-right' : (res.signal === 'SELL' ? 'ph-arrow-down-right' : 'ph-arrows-left-right');
            badgeContainer.innerHTML = `<div class="prediction-badge ${colorClass}"><i class="ph-fill ${icon}"></i> CURRENT SIGNAL: ${res.signal}</div>`;
        }

        const confVal = document.getElementById('forecast-confidence-val');
        const confBar = document.getElementById('forecast-confidence-bar');
        if (confVal) confVal.textContent = `${res.confidence}%`;
        if (confBar) confBar.style.width = `${res.confidence}%`;

        const setVal = (id, val, color) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = val;
                if (color) el.style.color = color;
            }
        };

        const trendColor = res.indicators.trend === 'bullish' ? '#10b981' : (res.indicators.trend === 'bearish' ? '#ef4444' : '#f59e0b');
        setVal('val-trend', res.indicators.trend, trendColor);
        setVal('val-rsi', res.indicators.rsi.toFixed(2), (res.indicators.rsi > 70 ? '#ef4444' : (res.indicators.rsi < 30 ? '#10b981' : '')));
        setVal('val-momentum', `${res.indicators.momentum > 0 ? '+' : ''}${res.indicators.momentum.toFixed(2)}`, res.indicators.momentum >= 0 ? '#10b981' : '#ef4444');
        setVal('val-macd', res.indicators.macdHistogram?.toFixed(3) || '0.000', res.indicators.macdHistogram >= 0 ? '#10b981' : '#ef4444');

        const list = document.getElementById('indicators-list');
        if (list) {
            const votes = res.votes;
            const indicators = [
                { name: 'RSI Filter', score: votes.rsi, info: `Value: ${res.indicators.rsi.toFixed(1)}` },
                { name: 'Trend Line', score: votes.trend, info: res.indicators.trend },
                { name: 'MACD Zero-Line', score: votes.macd, info: `Histo: ${res.indicators.macdHistogram?.toFixed(2)}` },
                { name: 'Bollinger Band', score: votes.bollinger, info: `Vol: ${res.indicators.bollinger?.std.toFixed(1)}` }
            ];

            list.innerHTML = indicators.map(ind => {
                const icon = ind.score > 0 ? 'ph-check-circle' : (ind.score < 0 ? 'ph-warning-circle' : 'ph-circle');
                const color = ind.score > 0 ? '#10b981' : (ind.score < 0 ? '#ef4444' : 'var(--text-muted)');
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <i class="ph-fill ${icon}" style="color: ${color}; font-size: 1.25rem;"></i>
                            <span style="font-size: 0.95rem; font-weight: 500;">${ind.name}</span>
                        </div>
                        <div class="indicator-chip">${ind.info}</div>
                    </div>
                `;
            }).join('');
        }
    }

    createForecastChart(ctx, hist, res) {
        const lastPrice = hist.data[hist.data.length - 1];
        const predictedData = new Array(hist.data.length - 1).fill(null);
        predictedData.push(lastPrice);
        let currentP = lastPrice;
        const drift = res.signal === 'BUY' ? 1.015 : (res.signal === 'SELL' ? 0.985 : 1.0);
        for (let i = 0; i < 3; i++) {
            currentP *= (drift + (Math.random() * 0.01 - 0.005));
            predictedData.push(currentP);
        }
        const labels = [...hist.labels, 'P1', 'P2', 'P3'];
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Historical',
                        data: hist.data,
                        borderColor: '#2d7a6e',
                        borderWidth: 2.5,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.3
                    },
                    {
                        label: 'Projection',
                        data: predictedData,
                        borderColor: res.signal === 'BUY' ? '#10b981' : (res.signal === 'SELL' ? '#ef4444' : '#f59e0b'),
                        borderDash: [6, 4],
                        borderWidth: 3,
                        fill: false,
                        pointRadius: 5,
                        pointBackgroundColor: '#fff',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { maxTicksLimit: 9 }, grid: { display: false } },
                    y: { grid: { color: 'rgba(0,0,0,0.03)' } }
                }
            }
        });
    }

    updatePortfolioPredictions() {
        const rows = document.querySelectorAll('#portfolio-list tr');
        rows.forEach(row => {
            const sym = row.querySelector('td:nth-child(1)')?.textContent.trim();
            if (sym && this.predictions[sym]) {
                const res = this.predictions[sym];
                let predCell = row.querySelector('.portfolio-prediction');
                if (!predCell) {
                    predCell = document.createElement('div');
                    predCell.className = 'portfolio-prediction';
                    row.querySelector('td:nth-child(2)')?.appendChild(predCell);
                }
                const color = res.signal === 'BUY' ? '#10b981' : (res.signal === 'SELL' ? '#ef4444' : '#f59e0b');
                predCell.innerHTML = `<span style="color:${color}; font-size:0.75rem; font-weight:800;">• ${res.signal}</span>`;
            }
        });

        this.updateLandingPredictions();
    }

    updateLandingPredictions() {
        const container = document.getElementById('landing-predictions');
        if (!container) return;

        const mainStocks = ["AAPL", "MSFT", "TSLA"];
        const chips = mainStocks.map(sym => {
            const res = this.predictions[sym];
            if (!res) return `<div class="indicator-chip" style="opacity:0.5">${sym}: ...</div>`;
            const color = res.signal === 'BUY' ? '#10b981' : (res.signal === 'SELL' ? '#ef4444' : '#f59e0b');
            return `<div class="indicator-chip" style="border-color:${color}33;"><strong>${sym}:</strong> <span style="color:${color}">${res.signal} (${res.confidence}%)</span></div>`;
        });

        container.innerHTML = chips.join('');
    }

    /* ==================== SIMULATION VIEW ==================== */
    async initSimulation() {
        this.setupSimulationListeners();
        this.loadSimulationHistory();
    }

    setupSimulationListeners() {
        const symbolInput = document.getElementById('sim-symbol');
        const qtyInput = document.getElementById('sim-qty');

        if (symbolInput) {
            this.setupStockSearch(symbolInput);

            // Use debounce to prevent API spamming
            let debounceTimer;
            symbolInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.updateSimulationPreview(), 600);
            });
        }

        if (qtyInput) {
            qtyInput.addEventListener('input', () => this.updateSimulationPreview());
        }
    }

    async updateSimulationPreview() {
        const symbol = document.getElementById('sim-symbol')?.value.trim().toUpperCase();
        const qty = parseInt(document.getElementById('sim-qty')?.value) || 0;
        const priceEl = document.getElementById('sim-current-price');
        const totalEl = document.getElementById('sim-total');
        const feesEl = document.getElementById('sim-fees');

        if (!symbol || symbol.length < 2) return;

        if (priceEl) priceEl.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

        try {
            const data = await API.getStockPrice(symbol);
            if (!data || !data.price) throw new Error("Price not found");

            this.lastSimPrice = data.price; // Save numerical price for execution
            const total = data.price * qty;
            const fees = total * 0.001; // 0.1% fee

            if (priceEl) priceEl.textContent = `$${data.price.toFixed(2)}`;
            if (totalEl) totalEl.textContent = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            if (feesEl) feesEl.textContent = `$${fees.toFixed(2)}`;

            // Integrated Prediction Engine into Simulation Outcome
            await this.updateSimulationForecast(symbol, data.price);

        } catch (error) {
            if (priceEl) {
                priceEl.textContent = 'Invalid Sym';
                priceEl.style.color = 'var(--danger)';
                setTimeout(() => { if (priceEl) priceEl.style.color = ''; }, 2000);
            }
            console.error('Simulation preview error:', error);
        }
    }

    async updateSimulationForecast(symbol, currentPrice) {
        try {
            const hist = await API.getHistoricalData(symbol, '1M');
            if (!hist || !hist.data) return;

            // Run engine
            const prediction = runPrediction(hist.data);

            const gainEl = document.getElementById('sim-projected-gain');
            const bearEl = document.getElementById('sim-bear-case');
            const bullEl = document.getElementById('sim-bull-case');

            // Advanced Precision Calculation
            const indicators = prediction.indicators;
            const volatility = (indicators.bollinger.upper - indicators.bollinger.lower) / indicators.bollinger.middle;
            
            // Base projection factors in score + trend strength
            const baseProj = (prediction.score * 2.2) + (indicators.trendStrength * 1.8);
            
            // Spread factors in confidence + actual price volatility
            const confidenceFactor = prediction.confidence / 4.5;
            const volatilityFactor = volatility * 15;
            
            const bullProj = baseProj + confidenceFactor + volatilityFactor;
            const bearProj = baseProj - (confidenceFactor * 1.2) - volatilityFactor;
            
            if (gainEl) {
                gainEl.textContent = `${baseProj >= 0 ? '+' : ''}${baseProj.toFixed(2)}%`;
                gainEl.style.color = baseProj >= 0 ? '#10b981' : '#ef4444';
            }
            
            if (bearEl) bearEl.textContent = `${bearProj.toFixed(2)}%`;
            if (bullEl) bullEl.textContent = `${bullProj >= 0 ? '+' : ''}${bullProj.toFixed(2)}%`;
            
            const pTag = document.querySelector('.card:nth-child(2) p');
            if (pTag) pTag.textContent = `High-Precision 1Y Outlook (Volatility Adjusted: ${(volatility * 100).toFixed(1)}%)`;

        } catch (e) {
            console.warn('Could not load simulation forecast:', e);
            this.resetSimulationForecast();
        }
    }

    resetSimulationForecast() {
        const gainEl = document.getElementById('sim-projected-gain');
        const bearEl = document.getElementById('sim-bear-case');
        const bullEl = document.getElementById('sim-bull-case');
        const pTag = document.querySelector('.card:nth-child(2) p');

        if (gainEl) {
            gainEl.textContent = '0%';
            gainEl.style.color = 'var(--text-muted)';
        }
        if (bearEl) bearEl.textContent = '0%';
        if (bullEl) bullEl.textContent = '0%';
        if (pTag) pTag.textContent = 'Enter a symbol to see AI performance projection';
    }

    executeSimulation() {
        const symbolInput = document.getElementById('sim-symbol');
        const qtyInput = document.getElementById('sim-qty');
        const symbol = symbolInput?.value.trim().toUpperCase();
        const type = document.getElementById('sim-type')?.value;
        const qty = parseInt(qtyInput?.value) || 0;
        const price = this.lastSimPrice || 0;

        if (!symbol || !this.lastSimPrice) {
            this.showError('Invalid symbol or price data. Please wait for the price to load.');
            return;
        }

        if (qty <= 0) {
            this.showError('Please enter a valid quantity of at least 1.');
            return;
        }

        const historyTable = document.getElementById('simulation-history');
        if (!historyTable) return;

        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const totalValue = price * qty;

        const row = `
            <tr>
                <td>${now}</td>
                <td><span class="stock-badge" style="background: ${type === 'buy' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${type === 'buy' ? 'var(--success)' : 'var(--danger)'};">${type.toUpperCase()}</span></td>
                <td><strong style="color:var(--text-main)">${symbol}</strong></td>
                <td>${qty}</td>
                <td>$${price.toFixed(2)}</td>
                <td>$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
        `;

        if (historyTable.querySelector('td[colspan]')) {
            historyTable.innerHTML = row;
        } else {
            historyTable.insertAdjacentHTML('afterbegin', row);
        }

        // Reset form
        document.getElementById('sim-symbol').value = '';
        document.getElementById('sim-qty').value = '1';
        document.getElementById('sim-current-price').textContent = '$0.00';
        document.getElementById('sim-total').textContent = '$0.00';
        document.getElementById('sim-fees').textContent = '$0.00';

        // Success Feedback
        if (typeof this.showSuccess === 'function') {
            this.showSuccess(`Simulation order for ${symbol} executed successfully.`);
        }

        // Persist to local storage
        this.saveTradeToLocal({
            time: now,
            type: type.toUpperCase(),
            symbol: symbol,
            qty: qty,
            price: price,
            total: totalValue
        });
    }

    saveTradeToLocal(trade) {
        const history = JSON.parse(localStorage.getItem('stocksense_sim_history') || '[]');
        history.unshift(trade);
        localStorage.setItem('stocksense_sim_history', JSON.stringify(history.slice(0, 20))); // Keep last 20
    }

    loadSimulationHistory() {
        const historyTable = document.getElementById('simulation-history');
        if (!historyTable) return;

        const history = JSON.parse(localStorage.getItem('stocksense_sim_history') || '[]');
        if (history.length === 0) return;

        historyTable.innerHTML = history.map(t => `
            <tr>
                <td>${t.time}</td>
                <td><span class="stock-badge" style="background: ${t.type === 'BUY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${t.type === 'BUY' ? 'var(--success)' : 'var(--danger)'};">${t.type}</span></td>
                <td><strong style="color:var(--text-main)">${t.symbol}</strong></td>
                <td>${t.qty}</td>
                <td>$${parseFloat(t.price).toFixed(2)}</td>
                <td>$${parseFloat(t.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');
    }

    clearSimulationHistory() {
        if (confirm('Clear all simulation history?')) {
            localStorage.removeItem('stocksense_sim_history');
            const historyTable = document.getElementById('simulation-history');
            if (historyTable) {
                historyTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No simulations yet</td></tr>';
            }
            this.showSuccess('Simulation history cleared.');
        }
    }

    /* ==================== ALERTS VIEW ==================== */
    async initAlerts() {
        // Restore saved email from localStorage
        const savedEmail = localStorage.getItem('stocksense_alert_email');
        const emailInput = document.getElementById('alert-email-input');
        if (emailInput && savedEmail) emailInput.value = savedEmail;

        // Update last check time on the status card
        const lastCheckEl = document.getElementById('last-check-time');
        if (lastCheckEl) lastCheckEl.textContent = new Date().toLocaleTimeString();

        // Wire up the condition select to show/hide range inputs
        this.setupAlertConditionHandler();
        // Wire up autocomplete for alert symbol
        this.setupAlertSymbolAutocomplete();
        // Load alerts and history from backend
        await this.loadAlerts();
        await this.loadAlertHistory();
        this.updateAlertStatus();
    }

    setupAlertConditionHandler() {
        const conditionSelect = document.getElementById('alert-condition');
        const priceRangeInputs = document.getElementById('price-range-inputs');
        const singleValueInput = document.getElementById('single-value-input');

        if (conditionSelect) {
            conditionSelect.addEventListener('change', (e) => {
                if (e.target.value === 'range') {
                    if (priceRangeInputs) priceRangeInputs.style.display = 'grid';
                    if (singleValueInput) singleValueInput.style.display = 'none';
                } else {
                    if (priceRangeInputs) priceRangeInputs.style.display = 'none';
                    if (singleValueInput) singleValueInput.style.display = 'block';
                }
            });
        }
    }

    setupAlertSymbolAutocomplete() {
        const SUPPORTED = [
            { symbol: 'AAPL', name: 'Apple Inc.' },
            { symbol: 'MSFT', name: 'Microsoft Corporation' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.' },
            { symbol: 'TSLA', name: 'Tesla, Inc.' },
            { symbol: 'NVDA', name: 'NVIDIA Corporation' },
            { symbol: 'META', name: 'Meta Platforms Inc.' },
            { symbol: 'NFLX', name: 'Netflix, Inc.' },
            { symbol: 'AMD', name: 'Advanced Micro Devices' },
            { symbol: 'COIN', name: 'Coinbase Global, Inc.' }
        ];
        const input = document.getElementById('alert-symbol');
        const dropdown = document.getElementById('alert-symbol-dropdown');
        if (!input || !dropdown) return;

        const render = (results) => {
            if (!results.length) { dropdown.style.display = 'none'; return; }
            dropdown.innerHTML = results.map(s => `
                <div class="alert-symbol-option" data-symbol="${s.symbol}" style="
                    padding: 0.65rem 1rem; cursor: pointer; display: flex;
                    justify-content: space-between; align-items: center;
                    font-size: 0.9rem; transition: background 0.15s;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <span><strong>${s.symbol}</strong> &nbsp;<span style="color:var(--text-muted);">${s.name}</span></span>
                    <span class="stock-badge" style="font-size:0.72rem;">US</span>
                </div>
            `).join('');
            dropdown.querySelectorAll('.alert-symbol-option').forEach(item => {
                item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-body)');
                item.addEventListener('mouseleave', () => item.style.background = '');
                item.addEventListener('mousedown', () => {
                    input.value = item.dataset.symbol;
                    dropdown.style.display = 'none';
                });
            });
            dropdown.style.display = 'block';
        };

        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            if (!q) { render(SUPPORTED); return; }
            render(SUPPORTED.filter(s =>
                s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
            ));
        });
        input.addEventListener('focus', () => render(SUPPORTED));
        input.addEventListener('blur', () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
    }

    /* ==================== LIVE DATA UPDATES ==================== */

    async updateTickerCards() {
        console.log("🔄 updateTickerCards() called - Starting API fetch");

        // Show loader immediately when starting to fetch data
        if (window.Loader) {
            window.Loader.show('Loading Market Data...');
        }

        try {
            console.log("📡 About to call API.getLivePrices()");
            const liveData = await API.getLivePrices();
            console.log("📊 Received liveData:", liveData);

            // Update trending stocks section
            this.updateTrendingSection(liveData);

            // Update top gainers/losers
            this.updateMarketStats(liveData);

            // Update last updated time
            this.updateLastRefreshTime();

        } catch (error) {
            console.error('❌ Failed to update ticker cards:', error);

            // Show mock data as fallback so you can still see the interface
            console.log("🔄 Showing mock data as fallback");
            this.showMockData();
        } finally {
            // Hide loader
            if (window.Loader) {
                window.Loader.hide();
            }
        }
    }

    showTickerCardLoaders() {
        const tickerCards = document.querySelectorAll('.ticker-card');
        tickerCards.forEach(card => {
            if (window.Loader) {
                window.Loader.showCardLoader(card);
            }
        });
    }

    hideTickerCardLoaders() {
        const tickerCards = document.querySelectorAll('.ticker-card');
        tickerCards.forEach(card => {
            if (window.Loader) {
                window.Loader.hideCardLoader(card);
            }
        });
    }

    showMockData() {
        // Show mock data when API is not available
        const mockData = [
            { Symbol: 'AAPL', Price: 178.45, PercentChange: 2.15 },
            { Symbol: 'MSFT', Price: 412.33, PercentChange: -0.85 },
            { Symbol: 'GOOGL', Price: 142.78, PercentChange: 1.92 },
            { Symbol: 'AMZN', Price: 156.89, PercentChange: 3.41 },
            { Symbol: 'TSLA', Price: 245.67, PercentChange: -2.33 },
            { Symbol: 'NVDA', Price: 485.22, PercentChange: 4.18 }
        ];

        // Update trending stocks section with mock data
        this.updateTrendingSection(mockData);

        // Update top gainers/losers with mock data
        this.updateMarketStats(mockData);

        // Update last updated time
        this.updateLastRefreshTime();

        // Show a small indicator that this is mock data
        const tickerContainer = document.querySelector('.stock-ticker-container');
        if (tickerContainer) {
            const indicator = document.createElement('div');
            indicator.style.cssText = 'text-align: center; padding: 0.5rem; font-size: 0.75rem; color: var(--text-muted);';
            indicator.innerHTML = '<i class="ph ph-warning"></i> Showing demo data - Live data unavailable';
            tickerContainer.appendChild(indicator);
        }
    }

    updateTrendingSection(liveData) {
        const tickerCards = document.querySelectorAll('.ticker-card');
        const topStocks = liveData.slice(0, 15); // Handle up to 15 stocks for ticker

        tickerCards.forEach((card, index) => {
            if (index < topStocks.length) {
                const stock = topStocks[index];
                const symbolElement = card.querySelector('.ticker-header span');
                const changeElement = card.querySelector('.ticker-header span:last-child');
                const priceElement = card.querySelector('.ticker-price');
                const metaElement = card.querySelector('.ticker-meta');

                if (symbolElement) symbolElement.textContent = stock.Symbol;
                if (changeElement) {
                    const change = parseFloat(stock.PercentChange || 0);
                    changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    changeElement.className = change >= 0 ? 'price-up' : 'price-down';
                }
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(stock.Price || 0).toFixed(2)}`;
                }
                
                if (metaElement) {
                    const sectors = {
                        'AAPL': 'Technology • Large Cap',
                        'MSFT': 'Software • Large Cap',
                        'GOOGL': 'Internet • Alphabet',
                        'AMZN': 'Retail • E-commerce',
                        'TSLA': 'Automotive • EV',
                        'NVDA': 'Hardware • AI',
                        'META': 'Social • Meta',
                        'NFLX': 'Media • Streaming',
                        'AMD': 'Semiconductors',
                        'DIS': 'Entertainment',
                        'JPM': 'Banking • Financials',
                        'COIN': 'Fintech • Crypto',
                        'V': 'Fintech • Payments',
                        'WMT': 'Consumer • Retail',
                        'COST': 'Consumer • Wholesale'
                    };
                    metaElement.textContent = sectors[stock.Symbol] || 'Market • Standard Cap';
                }

                this.addLiveIndicator(card);
            }
        });
    }

    updateMarketStats(liveData) {
        // Sort for top gainers and losers
        const sortedByChange = [...liveData].sort((a, b) =>
            parseFloat(b.PercentChange || 0) - parseFloat(a.PercentChange || 0)
        );

        const sectorMap = {
            'AAPL': 'Tech', 'MSFT': 'Software', 'GOOGL': 'Web', 'AMZN': 'Retail', 
            'TSLA': 'Auto', 'NVDA': 'Hardware', 'META': 'Social', 'NFLX': 'Media',
            'AMD': 'Semi', 'DIS': 'Ent', 'JPM': 'Bank', 'COIN': 'Fintech',
            'V': 'Payments', 'WMT': 'Retail', 'COST': 'Wholesale'
        };

        // Update Gainers Table
        const gainers = sortedByChange.filter(s => parseFloat(s.PercentChange || 0) > 0).slice(0, 5);
        const gainerList = document.getElementById('top-gainers-list');
        if (gainerList) {
            gainerList.innerHTML = gainers.map(s => {
                const change = parseFloat(s.PercentChange || 0);
                return `
                <tr>
                    <td style="font-weight: 700;">${s.Symbol}</td>
                    <td style="color: var(--text-muted);">${sectorMap[s.Symbol] || 'Market'}</td>
                    <td>$${parseFloat(s.Price || 0).toFixed(2)}</td>
                    <td style="color: var(--success); font-weight: 700;">+${change.toFixed(2)}%</td>
                </tr>
            `}).join('');
        }

        // Update Losers Table
        const losers = [...sortedByChange].reverse().filter(s => parseFloat(s.PercentChange || 0) < 0).slice(0, 5);
        const loserList = document.getElementById('top-losers-list');
        if (loserList) {
            loserList.innerHTML = losers.map(s => {
                const change = parseFloat(s.PercentChange || 0);
                return `
                <tr>
                    <td style="font-weight: 700;">${s.Symbol}</td>
                    <td style="color: var(--text-muted);">${sectorMap[s.Symbol] || 'Market'}</td>
                    <td>$${parseFloat(s.Price || 0).toFixed(2)}</td>
                    <td style="color: var(--danger); font-weight: 700;">${change.toFixed(2)}%</td>
                </tr>
            `}).join('');
        }
    }

    addLiveIndicator(card) {
        // Remove existing indicators
        const existingDot = card.querySelector('.live-indicator-dot');
        if (existingDot) existingDot.remove();

        // Add new live indicator dot
        const dot = document.createElement('div');
        dot.className = 'live-indicator-dot';
        dot.title = 'Live Data';
        card.appendChild(dot);
    }

    updateLastRefreshTime() {
        let timeElement = document.getElementById('last-refresh-time');
        if (!timeElement) {
            // Create the element if it doesn't exist
            const titleElement = document.querySelector('.tt-card-title');
            if (titleElement) {
                timeElement = document.createElement('div');
                timeElement.id = 'last-refresh-time';
                timeElement.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;';
                titleElement.appendChild(timeElement);
            }
        }

        if (timeElement) {
            const now = new Date();
            timeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    showDataUnavailable() {
        const tickerContainer = document.querySelector('.stock-ticker-container');
        if (tickerContainer) {
            tickerContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="ph ph-warning-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>Data unavailable</p>
                    <p style="font-size: 0.85rem;">Please check your connection or try again later.</p>
                </div>
            `;
        }
    }

    startAutoRefresh() {
        // Clear existing interval if any
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Only start auto-refresh if API is working
        // Set up auto-refresh every 30 seconds
        this.refreshInterval = setInterval(async () => {
            try {
                await this.updateTickerCards();
            } catch (error) {
                console.error('Auto-refresh error:', error);
                // Stop auto-refresh if there are repeated errors
                this.stopAutoRefresh();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /* ==================== ENHANCED ALERT SYSTEM ==================== */

    initializeAlertSystem() {
        // Only initialize alert system if we're on the alerts page
        if (!document.getElementById('alerts-list')) {
            return; // Not on alerts page, don't initialize
        }

        // Request notification permissions
        this.requestNotificationPermission();

        // Setup condition change handler for price range
        this.setupAlertConditionHandler();

        // Start real-time alert monitoring
        this.startAlertMonitoring();

        // Load initial alert data
        this.loadAlerts();
        this.loadAlertHistory();
        this.updateAlertStatus();
    }

    setupAlertConditionHandler() {
        const conditionSelect = document.getElementById('alert-condition');
        const priceRangeInputs = document.getElementById('price-range-inputs');
        const targetPriceInput = document.getElementById('alert-value');

        if (conditionSelect && priceRangeInputs && targetPriceInput) {
            conditionSelect.addEventListener('change', (e) => {
                if (e.target.value === 'range') {
                    priceRangeInputs.style.display = 'grid';
                    targetPriceInput.parentElement.style.display = 'none';
                } else {
                    priceRangeInputs.style.display = 'none';
                    targetPriceInput.parentElement.style.display = 'block';
                }
            });
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            } catch (error) {
                console.error('Notification permission error:', error);
            }
        }
    }

    startAlertMonitoring() {
        // Check for alert updates every 30 seconds
        if (this.alertInterval) {
            clearInterval(this.alertInterval);
        }

        this.alertInterval = setInterval(() => {
            this.checkAlertUpdates();
        }, 30000);

        // Initial check
        this.checkAlertUpdates();
    }

    async checkAlertUpdates() {
        try {
            // Use the proper API service method
            const data = await API.getAlerts();

            // Check for any triggered alerts by comparing current prices
            if (Array.isArray(data)) {
                const livePrices = await API.getLivePrices();

                data.forEach(alert => {
                    if (alert.status === 'ACTIVE') {
                        const currentStock = livePrices.find(s => s.Symbol === alert.symbol);
                        if (currentStock) {
                            const currentPrice = parseFloat(currentStock.Price);
                            let triggered = false;

                            // Normalizing condition checks for both frontend and backend naming conventions
                            const type = alert.type || alert.condition;

                            if ((type === 'price_above' || type === 'above') && currentPrice >= alert.targetValue) {
                                triggered = true;
                            } else if ((type === 'price_below' || type === 'below') && currentPrice <= alert.targetValue) {
                                triggered = true;
                            } else if (type === 'range') {
                                const parts = (alert.targetValue || "").toString().split('-');
                                if (parts.length === 2) {
                                    const min = parseFloat(parts[0]);
                                    const max = parseFloat(parts[1]);
                                    if (currentPrice <= min || currentPrice >= max) {
                                        triggered = true;
                                    }
                                }
                            }

                            if (triggered) {
                                this.handleAlertUpdate({
                                    ...alert,
                                    condition: type, // Ensure we pass the normalized type
                                    currentPrice,
                                    triggered: true
                                });
                            }
                        }
                    }
                });
            }

            // Update last check time
            this.updateLastCheckTime(new Date().toISOString());
        } catch (error) {
            console.error('Alert check error:', error);
        }
    }

    handleAlertUpdate(alert) {
        // Show browser notification
        if (document.getElementById('alert-push')?.checked) {
            this.showBrowserNotification(alert);
        }

        // Send email notification
        if (document.getElementById('alert-email-notification')?.checked) {
            this.sendEmailNotification(alert);
        }

        // Show in-page notification
        this.showInPageNotification(alert);

        // Update UI
        this.loadAlerts();
        this.loadAlertHistory();
        this.updateAlertStatus();
    }

    sendEmailNotification(alert) {
        try {
            // Call the backend to send email
            API.sendEmailAlert({
                email: alert.email || 'user@stocksense.app',
                symbol: alert.symbol,
                condition: alert.condition,
                targetValue: alert.targetValue,
                currentPrice: alert.currentPrice,
                triggeredAt: new Date().toISOString()
            }).then(response => {
                console.log('Email notification sent successfully');
            }).catch(error => {
                console.error('Failed to send email notification:', error);
            });
        } catch (error) {
            console.error('Email notification error:', error);
        }
    }

    showBrowserNotification(alert) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`Stock Alert: ${alert.symbol}`, {
                body: `${alert.condition} ${alert.targetValue}\nCurrent: $${alert.currentPrice}`,
                icon: '/favicon.ico',
                tag: `alert-${alert.id}`,
                requireInteraction: false
            });

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        }
    }

    showInPageNotification(alert) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'alert-notification';
        notification.style.cssText = `
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--primary);
            border-radius: 8px;
            padding: 1rem;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            z-index: 1000;
        `;

        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                <strong style="color: var(--text-main);">🔔 Stock Alert</strong>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer;">✕</button>
            </div>
            <div style="color: var(--text-main); margin-bottom: 0.25rem;"><strong>${alert.symbol}</strong></div>
            <div style="color: var(--text-muted); font-size: 0.9rem;">${alert.condition}: $${alert.targetValue}</div>
            <div style="color: var(--success); font-size: 0.9rem;">Current: $${alert.currentPrice}</div>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    playAlertSound() {
        // Sound functionality removed as requested
        console.log('Sound alerts have been disabled');
    }

    updateLastCheckTime(timestamp) {
        const element = document.getElementById('last-check-time');
        if (element) {
            const time = new Date(timestamp);
            element.textContent = time.toLocaleTimeString();
        }
        // If element doesn't exist, we're not on alerts page, so just ignore
    }

    updateAlertStatus() {
        // Check if alert status elements exist
        const activeCountElement = document.getElementById('active-count');
        const triggeredCountElement = document.getElementById('triggered-count');
        const expiredCountElement = document.getElementById('expired-count');

        if (!activeCountElement || !triggeredCountElement || !expiredCountElement) {
            return; // Not on alerts page, don't update
        }

        // This would fetch actual counts from backend
        const activeCount = document.querySelectorAll('#alerts-list .alert-active').length;
        const triggeredCount = document.querySelectorAll('#alerts-list .alert-triggered').length;
        const expiredCount = document.querySelectorAll('#alerts-list .alert-expired').length;

        activeCountElement.textContent = activeCount;
        triggeredCountElement.textContent = triggeredCount;
        expiredCountElement.textContent = expiredCount;
    }

    async loadAlerts() {
        try {
            const alerts = await API.getAlerts();
            const alertsList = document.getElementById('alerts-list');
            if (!alertsList) return;

            if (!alerts || alerts.length === 0) {
                alertsList.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            <i class="ph ph-bell-slash" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                            No alerts set yet. Create your first alert above!
                        </td>
                    </tr>
                `;
                return;
            }

            alertsList.innerHTML = alerts.map(alert => {
                const isActive = alert.status === 'ACTIVE';
                const toggleIcon = isActive ? 'ph-pause' : 'ph-play';
                const toggleTitle = isActive ? 'Pause Alert' : 'Resume Alert';
                // Format targetValue display — range has no $ prefix for the whole string
                const displayValue = alert.type === 'range'
                    ? alert.targetValue
                    : `$${parseFloat(alert.targetValue).toFixed(2)}`;
                // Safe date parse
                let createdStr = 'N/A';
                try { createdStr = new Date(alert.createdAt).toLocaleDateString(); } catch (e) { }
                return `
                <tr class="alert-${(alert.status || 'active').toLowerCase()}">
                    <td><span class="stock-badge">${alert.symbol}</span></td>
                    <td>${this.formatAlertCondition(alert.type, alert.targetValue)}</td>
                    <td>${displayValue}</td>
                    <td>${alert.currentPrice ? '$' + parseFloat(alert.currentPrice).toFixed(2) : 'N/A'}</td>
                    <td>${this.getStatusBadge(alert.status)}</td>
                    <td>${createdStr}</td>
                    <td>
                        <button class="btn-outline" onclick="app.toggleAlert('${alert.id}')" title="${toggleTitle}" style="padding: 0.2rem 0.5rem; margin-right: 0.5rem;">
                            <i class="ph ${toggleIcon}"></i>
                        </button>
                        <button class="btn-outline" onclick="app.deleteAlert('${alert.id}')" title="Delete Alert" style="padding: 0.2rem 0.5rem; border: none; color: var(--danger);">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        } catch (error) {
            console.error('Load alerts error:', error);
            if (alertsList) {
                alertsList.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--danger);">
                            <i class="ph ph-warning-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                            Failed to load alerts from server. Please check your connection.
                        </td>
                    </tr>
                `;
            }
        }
    }

    loadAlertHistory() {
        return API.getAlertHistory().then(history => {
            const historyList = document.getElementById('alert-history');
            if (!historyList) return;
            if (!history || history.length === 0) {
                historyList.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            <i class="ph ph-clock-counter-clockwise" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                            No alert history yet. History populates automatically when alerts trigger.
                        </td>
                    </tr>
                `;
                return;
            }
            historyList.innerHTML = history.map(h => `
                <tr>
                    <td><span class="stock-badge">${h.symbol}</span></td>
                    <td>${this.formatAlertCondition(h.alertType, h.target)}</td>
                    <td>$${parseFloat(h.triggeredPrice || 0).toFixed(2)}</td>
                    <td>${this.formatRelativeTime(h.timestamp)}</td>
                    <td>${h.notificationSent === 'Yes' || h.notificationSent === true ? '\u2705 Sent' : '\u274C No'}</td>
                </tr>
            `).join('');
        }).catch(err => console.error('Load alert history error:', err));
    }

    /* Formats a date as relative time: "2 hours ago", "3 days ago" etc */
    formatRelativeTime(dateVal) {
        try {
            const d = new Date(dateVal);
            if (isNaN(d)) return String(dateVal);
            const diff = Date.now() - d.getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
            const days = Math.floor(hrs / 24);
            if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
            return d.toLocaleDateString();
        } catch { return String(dateVal); }
    }

    formatAlertCondition(type, value) {
        // Handle both naming conventions from frontend and backend
        if (type === 'above' || type === 'price_above') return `Price Rises Above $${value}`;
        if (type === 'below' || type === 'price_below') return `Price Drops Below $${value}`;
        if (type === 'range') {
            const parts = (value || '').toString().split('-');
            return parts.length === 2 ? `Within Range $${parts[0]} – $${parts[1]}` : `Range: ${value}`;
        }
        if (type === 'percent_up') return `% Increase > ${value}%`;
        if (type === 'percent_down') return `% Decrease > ${value}%`;
        return type || 'Unknown';
    }

    getStatusBadge(status) {
        const badges = {
            'ACTIVE': '<span class="stat-trend trend-up">Active</span>',
            'INACTIVE': '<span class="stat-trend trend-neutral">Paused</span>',
            'TRIGGERED': '<span class="stat-trend trend-neutral">Triggered</span>',
            'EXPIRED': '<span class="stat-trend trend-down">Expired</span>'
        };
        return badges[status] || status;
    }

    async refreshAlerts() {
        await this.loadAlerts();
        this.updateAlertStatus();
    }

    filterAlerts(filter) {
        const rows = document.querySelectorAll('#alerts-list tr');
        rows.forEach(row => {
            if (filter === 'all') {
                row.style.display = '';
            } else {
                const statusClass = `alert-${filter}`;
                row.style.display = row.classList.contains(statusClass) ? '' : 'none';
            }
        });
    }

    async toggleAlert(alertId) {
        try {
            await API.toggleAlert(alertId);
            await this.loadAlerts();
            this.updateAlertStatus();
            this.showSuccess('Alert status updated.');
        } catch (error) {
            console.error('Toggle alert error:', error);
            this.showError('Could not update alert status.');
        }
    }

    async deleteAlert(alertId) {
        if (!confirm('Are you sure you want to delete this alert?')) return;
        try {
            await API.deleteAlert(alertId);
            await this.loadAlerts();
            this.updateAlertStatus();
            this.showSuccess('Alert deleted successfully.');
        } catch (error) {
            console.error('Delete alert error:', error);
            this.showError('Could not delete alert.');
        }
    }

    async clearAlertHistory() {
        // This function is not available in your current backend
        this.showError('Clear history feature is not available in current backend version');
    }

    // Enhanced addAlert function
    async addAlert() {
        const symbolInput = document.getElementById('alert-symbol');
        const valueInput = document.getElementById('alert-value');
        const emailInput = document.getElementById('alert-email-input');
        const conditionSelect = document.getElementById('alert-condition');
        const minPriceInput = document.getElementById('alert-min-price');
        const maxPriceInput = document.getElementById('alert-max-price');

        const symbol = symbolInput?.value.trim().toUpperCase();
        let condition = conditionSelect?.value;
        const email = emailInput?.value.trim() || 'user@stocksense.app';
        let targetValue = "";

        // Validate symbol is one of the supported stocks
        const SUPPORTED_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'COIN'];
        if (!SUPPORTED_SYMBOLS.includes(symbol)) {
            this.showError(`"${symbol}" is not supported. Choose from: ${SUPPORTED_SYMBOLS.join(', ')}`);
            symbolInput?.focus();
            return;
        }

        // Persist email to localStorage for convenience
        if (email && email !== 'user@stocksense.app') {
            localStorage.setItem('stocksense_alert_email', email);
        }

        if (!symbol) {
            this.showError('Please enter a stock symbol');
            symbolInput?.focus();
            return;
        }

        if (condition === 'range') {
            const min = parseFloat(minPriceInput?.value);
            const max = parseFloat(maxPriceInput?.value);

            if (isNaN(min) || isNaN(max) || min >= max) {
                this.showError('Minimum limit must be strictly less than Maximum limit.');
                minPriceInput?.focus();
                return;
            }
            targetValue = `${min}-${max}`;
        } else {
            const value = parseFloat(valueInput?.value);
            if (isNaN(value) || value <= 0) {
                this.showError('Please enter a valid target limit amount.');
                valueInput?.focus();
                return;
            }
            targetValue = value;
        }

        const alertObj = {
            symbol,
            condition,
            targetValue,
            email,
            createdAt: new Date().toISOString()
        };

        try {
            // Show loader
            if (window.Loader) {
                window.Loader.show('Creating Alert...');
            }

            const result = await API.addAlert(alertObj);

            // FULL FORM RESET - restore "disappearing" behavior
            if (symbolInput) symbolInput.value = '';
            if (valueInput) valueInput.value = '';
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';

            // Revert email to the primary user email (from storage or system default)
            emailInput.value = localStorage.getItem('stocksense_alert_email') || 'user@stocksense.app';

            if (conditionSelect) conditionSelect.value = 'above';

            // Reset form UI visibility
            const rangeInputs = document.getElementById('price-range-inputs');
            if (rangeInputs) rangeInputs.style.display = 'none';
            if (valueInput) valueInput.parentElement.style.display = 'block';

            // Visual feedback on the button
            const addBtn = document.querySelector('button[onclick="app.addAlert()"]');
            if (addBtn) {
                const ogHtml = addBtn.innerHTML;
                addBtn.innerHTML = '<i class="ph ph-check"></i> Alert Created';
                setTimeout(() => addBtn.innerHTML = ogHtml, 2000);
            }

            // Reload alerts table and active count dynamically
            await this.loadAlerts();
            this.updateAlertStatus();

            this.showSuccess('Real-time tracking alert created successfully!');
            // Show email check notification
            this.showEmailCheckNotification();
        } catch (error) {
            console.error('Add alert error:', error);
            this.showError('Failed to create tracking alert. Please try again.');
        } finally {
            // Hide loader
            if (window.Loader) {
                window.Loader.hide();
            }
        }
    }

    showEmailCheckNotification() {
        const notificationHtml = `
            <div id="email-check-notification" style="
                position: fixed; top: 80px; right: 20px; z-index: 1001;
                background: var(--bg-card); border: 1px solid var(--primary);
                border-radius: var(--radius-md); padding: 1rem 1.5rem;
                box-shadow: var(--shadow-lg); max-width: 300px;
                animation: slideInRight 0.3s ease-out;
            ">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <i class="ph ph-envelope-simple-open" style="font-size: 1.5rem; color: var(--primary);"></i>
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">Check Your Email</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">Alert confirmation sent to your email</div>
                    </div>
                </div>
                <button onclick="app.closeEmailCheckNotification()" style="
                    background: none; border: none; color: var(--text-muted);
                    cursor: pointer; font-size: 0.8rem; padding: 0.25rem;
                    margin-left: auto; display: block;
                " onmouseover="this.style.color='var(--text-main)'" onmouseout="this.style.color='var(--text-muted)'">
                    <i class="ph ph-x"></i>
                </button>
            </div>
        `;

        // Add notification to the page
        document.body.insertAdjacentHTML('beforeend', notificationHtml);

        // Auto-hide after 8 seconds
        setTimeout(() => {
            this.closeEmailCheckNotification();
        }, 8000);
    }

    closeEmailCheckNotification() {
        const notification = document.getElementById('email-check-notification');
        if (notification) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    showError(message) {
        // Show error notification
        this.showInPageNotification({
            type: 'error',
            title: 'Error',
            message
        });
    }

    showSuccess(message) {
        // Show success notification
        this.showInPageNotification({
            type: 'success',
            title: 'Success',
            message
        });
    }
    /* ==================== ABOUT ADMIN ==================== */
    showAboutAarush() {
        const modalHtml = `
            <div id="about-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem; animation: fadeIn 0.3s ease;">
                <div style="background: var(--bg-card); max-width: 450px; width: 100%; border-radius: 24px; border: 1px solid var(--border-color); padding: 2.5rem; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center;">
                    <div style="width: 80px; height: 80px; background: var(--primary); color: white; border-radius: 50%; display: grid; place-items: center; font-size: 2rem; font-weight: 800; margin: 0 auto 1.5rem; box-shadow: 0 0 20px var(--primary-glow);">AT</div>
                    <h2 style="font-size: 1.75rem; color: var(--text-main); margin-bottom: 0.5rem;">Aarush Tiwari</h2>
                    <p style="color: var(--primary); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1.5rem;">Project Lead & Architecht</p>
                    
                    <div style="text-align: left; background: var(--input-bg); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));">
                        <p style="color: var(--text-main); line-height: 1.7; font-size: 0.95rem; margin: 0;">
                           Hey, I'm <strong>Aarush Tiwari</strong>. I built this automated dashboard during my freshman year to bridge the gap between complex market data and clean, high-performance UI. <br><br>
                           This <strong>Alpha version</strong> is optimized for core technical intelligence. Expect major architectural upgrades as the project scales. Locked in on vision. 
                        </p>
                    </div>

                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.5rem;">v1.2.0 • Build 2026.03.13</p>
                    
                    <button class="btn btn-primary" onclick="document.getElementById('about-modal').remove()" style="width: 100%; padding: 1rem; font-weight: 700;">
                        Let's Gooo!
                    </button>
                    
                    <button style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.5rem;" onclick="document.getElementById('about-modal').remove()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

// Initialize app when DOM is ready
window.app = new StockSenseApp();
