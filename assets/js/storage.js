/* LocalStorage Wrapper */
import { API } from './api.js';

const KEY_PORTFOLIO = 'stocksense_portfolio';
const KEY_ALERTS = 'stocksense_alerts';

export const Storage = {
    getPortfolio() {
        try {
            const data = localStorage.getItem(KEY_PORTFOLIO);
            if (!data) {
                return [];
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading portfolio from Storage:', error);
            return [];
        }
    },

    savePortfolio(portfolio) {
        try {
            localStorage.setItem(KEY_PORTFOLIO, JSON.stringify(portfolio));
        } catch (error) {
            console.error('Error saving portfolio to Storage:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Storage limit reached. Cannot save changes.');
            }
        }
    },

    addToPortfolio(symbol, qty, buyPrice) {
        const list = this.getPortfolio();
        const existing = list.find(s => s.symbol === symbol);
        if (existing) {
            const totalCost = (existing.qty * existing.buyPrice) + (qty * buyPrice);
            existing.qty += qty;
            existing.buyPrice = totalCost / existing.qty;
            this.savePortfolio(list); // Save updated list
        } else {
            list.push({ symbol, qty, buyPrice });
            this.savePortfolio(list);
        }

        // Sync to Google Sheets Backend (Fire & Forget)
        API.addPortfolio({
            symbol: symbol,
            quantity: qty,
            buy_price: buyPrice,
            stoploss: "",
            target: ""
        });
    },

    removeFromPortfolio(symbol) {
        let list = this.getPortfolio();
        list = list.filter(s => s.symbol !== symbol);
        this.savePortfolio(list);
    },

    getAlerts() {
        try {
            return JSON.parse(localStorage.getItem(KEY_ALERTS) || '[]');
        } catch (error) {
            console.error('Error reading alerts from Storage:', error);
            return [];
        }
    },

    addAlert(alert) {
        const alerts = this.getAlerts();
        alerts.push(alert);
        try {
            localStorage.setItem(KEY_ALERTS, JSON.stringify(alerts));
        } catch (error) {
            console.error('Error saving alerts to Storage:', error);
        }

        // Sync to Google Sheets Backend (Fire & Forget)
        API.addAlert({
            symbol: alert.symbol,
            condition: alert.condition || "price_above",
            targetValue: alert.value,
            email: alert.email || "user@stocksense.app"
        }).catch(err => console.error("Error syncing alert to backend:", err));
    },

    clearPortfolio() {
        this.savePortfolio([]);
    },

    setPortfolio(stock) {
        this.savePortfolio([stock]);
    }
};
