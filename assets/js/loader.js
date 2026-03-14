/* Premium Loading Controller - Stock Market Themed */

class LoaderController {
    constructor() {
        this.preloader = document.getElementById('preloader');
        this.loadingStates = new Set();
        this.init();
    }

    init() {
        // Only show the preloader initially if the intro has NOT been seen
        const hasSeenIntro = localStorage.getItem('stocksense_intro_seen');
        if (!hasSeenIntro && this.preloader) {
            this.preloader.classList.add('active');
        }
    }

    // Full-screen overlay loader
    show(message = 'Loading Market Data...') {
        this.loadingStates.add('fullscreen');
        this.updateLoaderMessage(message);
        this.preloader.classList.add('active');
    }

    hide() {
        this.loadingStates.delete('fullscreen');
        if (this.loadingStates.size === 0) {
            this.preloader.classList.remove('active');
        }
    }

    showInitialLoader() {
        this.show('Initializing StockSense Hub...');
    }

    hideInitialLoader() {
        this.hide();
    }

    // Inline card loaders
    showCardLoader(cardElement) {
        if (!cardElement) return;

        const loader = document.createElement('div');
        loader.className = 'card-loader active';
        loader.innerHTML = `
            <div class="mini-chart-loader">
                <div class="mini-bar"></div>
                <div class="mini-bar"></div>
                <div class="mini-bar"></div>
                <div class="mini-bar"></div>
                <div class="mini-bar"></div>
            </div>
        `;

        cardElement.style.position = 'relative';
        cardElement.appendChild(loader);
        this.loadingStates.add(cardElement);
    }

    hideCardLoader(cardElement) {
        if (!cardElement) return;

        const loader = cardElement.querySelector('.card-loader');
        if (loader) {
            loader.classList.remove('active');
            setTimeout(() => {
                loader.remove();
            }, 200);
        }
        this.loadingStates.delete(cardElement);
    }

    // Update loader message
    updateLoaderMessage(message) {
        const tickerLoader = this.preloader.querySelector('.ticker-loader');
        const loadingText = this.preloader.querySelector('.loading-text');

        if (tickerLoader) tickerLoader.textContent = message;
        if (loadingText) loadingText.textContent = this.getSubtext(message);
    }

    getSubtext(message) {
        const subtexts = {
            'Loading Market Data...': 'Fetching real-time stock prices',
            'Updating Stocks...': 'Refreshing latest market data',
            'Creating Alert...': 'Setting up your price alert',
            'Loading Portfolio...': 'Calculating your investments',
            'Analyzing Stock...': 'Running AI analysis',
            'Initializing StockSense Hub...': 'Preparing your dashboard'
        };
        return subtexts[message] || 'Processing your request...';
    }

    // API call wrapper with loading
    async withLoading(apiCall, message = 'Loading Market Data...') {
        this.show(message);
        try {
            const result = await apiCall();
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        } finally {
            this.hide();
        }
    }

    // Card API call wrapper with inline loader
    async withCardLoading(cardElement, apiCall) {
        this.showCardLoader(cardElement);
        try {
            const result = await apiCall();
            return result;
        } catch (error) {
            console.error('Card API call failed:', error);
            throw error;
        } finally {
            this.hideCardLoader(cardElement);
        }
    }
}

// Global loader instance
window.Loader = new LoaderController();

// Export for module usage
export default window.Loader;
