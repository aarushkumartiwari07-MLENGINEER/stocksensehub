/* Chart.js Global Config & Helpers */

const PRIMARY_COLOR = '#2d7a6e'; // Royal teal to match CSS
const ACCENT_COLOR = '#6b9080'; // Sage green accent

// Polyfill/Check for Chart.js
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#6b7f7a';
    Chart.defaults.borderColor = 'rgba(107, 127, 122, 0.1)';
} else {
    console.warn('Chart.js is not loaded. Charts will not be initialized.');
}

export const Charts = {
    createAreaChart(ctx, labels, data, label = 'Value') {
        if (typeof Chart === 'undefined' || !ctx) return null;

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(45, 122, 110, 0.5)'); // Royal teal with opacity
        gradient.addColorStop(1, 'rgba(45, 122, 110, 0.0)');

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: PRIMARY_COLOR,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                return `$${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 8 }
                    },
                    y: {
                        grid: { display: true, borderDash: [4, 4] },
                        ticks: {
                            callback: function (value) { return '$' + value; }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            }
        });
    },

    createPredictionChart(ctx) {
        if (typeof Chart === 'undefined' || !ctx) return null;

        // Dual line chart: Historical vs Predicted
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const historical = [150, 152, 149, 153, 155];
        const predicted = [null, null, null, null, 155, 158, 162]; // Starts where hist ends

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Historical',
                        data: historical,
                        borderColor: '#94a3b8',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: 'Forecasted Price',
                        data: predicted,
                        borderColor: '#2d6a4f', // Success green
                        borderDash: [5, 5],
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
};
