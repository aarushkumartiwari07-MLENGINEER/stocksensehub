/*
StockSense Hub — Alpha+ Prediction Engine
Pure Mathematical Technical Analysis Engine
No external libraries
*/

const ENGINE_VERSION = "Alpha 1.2";

/* -----------------------------
UTILITY FUNCTIONS
----------------------------- */

function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
    const avg = average(arr);
    const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(average(squareDiffs));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/* -----------------------------
SMA
----------------------------- */

function calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return average(slice);
}

/* -----------------------------
EMA
----------------------------- */

function calculateEMA(prices, period) {
    if (prices.length < period) return null;

    const k = 2 / (period + 1);
    let ema = calculateSMA(prices.slice(0, period), period);

    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
}

/* -----------------------------
RSI
----------------------------- */

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }

    const rs = gains / (losses || 1);
    return 100 - (100 / (1 + rs));
}

/* -----------------------------
MOMENTUM
----------------------------- */

function calculateMomentum(prices, period = 10) {
    if (prices.length < period + 1) return null;

    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];

    return current - past;
}

/* -----------------------------
BOLLINGER BANDS
----------------------------- */

function calculateBollinger(prices, period = 20) {
    if (prices.length < period) return null;

    const slice = prices.slice(-period);
    const sma = average(slice);
    const std = standardDeviation(slice);

    return {
        middle: sma,
        upper: sma + std * 2,
        lower: sma - std * 2,
        std
    };
}

/* -----------------------------
MACD
----------------------------- */

function calculateMACD(prices) {
    if (prices.length < 26) return null;

    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);

    const macdLine = ema12 - ema26;

    // approximate signal using small window
    const signal = macdLine * 0.8;

    return {
        macd: macdLine,
        signal: signal,
        histogram: macdLine - signal
    };
}

/* -----------------------------
TREND DETECTION
----------------------------- */

function detectTrend(price, sma20, sma50) {

    if (price > sma20 && sma20 > sma50) return "bullish";
    if (price < sma20 && sma20 < sma50) return "bearish";

    return "sideways";
}

/* -----------------------------
TREND STRENGTH
----------------------------- */

function calculateTrendStrength(price, sma20, sma50, ema20) {

    let score = 0;

    if (price > sma20) score += 1;
    if (sma20 > sma50) score += 1;

    if (price < sma20) score -= 1;
    if (sma20 < sma50) score -= 1;

    return clamp(score, -2, 2);
}

/* -----------------------------
CROSSOVER DETECTION
----------------------------- */

function detectCrossover(prices) {

    if (prices.length < 51) return "none";

    const prevSMA20 = calculateSMA(prices.slice(0, -1), 20);
    const prevSMA50 = calculateSMA(prices.slice(0, -1), 50);

    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);

    if (prevSMA20 < prevSMA50 && sma20 > sma50) return "golden";
    if (prevSMA20 > prevSMA50 && sma20 < sma50) return "death";

    return "none";
}

/* -----------------------------
VOTING ENGINE
----------------------------- */

function generateVotes(data) {

    const votes = {
        rsi: 0,
        trend: 0,
        momentum: 0,
        crossover: 0,
        bollinger: 0,
        macd: 0
    };

    /* RSI */

    if (data.rsi !== null) {
        if (data.rsi < 25) votes.rsi = 2;
        else if (data.rsi < 35) votes.rsi = 1;
        else if (data.rsi > 75) votes.rsi = -2;
        else if (data.rsi > 65) votes.rsi = -1;
    }

    /* Trend */

    if (data.trend === "bullish") votes.trend = 2;
    if (data.trend === "bearish") votes.trend = -2;

    /* Momentum */

    if (data.momentum > 0) votes.momentum = 1;
    if (data.momentum < 0) votes.momentum = -1;

    /* Crossover */

    if (data.crossover === "golden") votes.crossover = 2;
    if (data.crossover === "death") votes.crossover = -2;

    /* Bollinger */

    if (data.price < data.bollinger.lower) votes.bollinger = 1;
    if (data.price > data.bollinger.upper) votes.bollinger = -1;

    /* MACD */

    if (data.macd.histogram > 0) votes.macd = 1;
    if (data.macd.histogram < 0) votes.macd = -1;

    return votes;
}

/* -----------------------------
FINAL PREDICTION
----------------------------- */

export function runPrediction(prices, userPosition = null) {

    if (!prices || prices.length < 20) {
        return {
            signal: "HOLD",
            confidence: 10,
            reason: "Not enough data"
        };
    }

    const price = prices[prices.length - 1];

    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const ema20 = calculateEMA(prices, 20);

    const rsi = calculateRSI(prices);
    const momentum = calculateMomentum(prices);
    const bollinger = calculateBollinger(prices);
    const macd = calculateMACD(prices);

    const trend = detectTrend(price, sma20, sma50);
    const crossover = detectCrossover(prices);

    const trendStrength = calculateTrendStrength(price, sma20, sma50, ema20);

    const votes = generateVotes({
        rsi,
        trend,
        momentum,
        crossover,
        bollinger,
        macd,
        price
    });

    let score = Object.values(votes).reduce((a, b) => a + b, 0);

    /* quantity weighting */

    if (userPosition && userPosition.quantity) {
        const weight = Math.log10(userPosition.quantity + 1);
        score = score * weight;
    }

    /* signal */

    let signal = "HOLD";

    if (score >= 3) signal = "BUY";
    if (score <= -3) signal = "SELL";

    /* confidence */

    const maxScore = 10;
    let confidence = Math.abs(score) / maxScore * 100;

    confidence = clamp(confidence, 10, 95);

    /* portfolio analysis */

    let positionAnalysis = null;

    if (userPosition && userPosition.avgBuyPrice) {

        const profitLoss =
            (price - userPosition.avgBuyPrice) *
            (userPosition.quantity || 1);

        const profitLossPercent =
            ((price - userPosition.avgBuyPrice) /
                userPosition.avgBuyPrice) * 100;

        positionAnalysis = {
            profitLoss,
            profitLossPercent
        };
    }

    return {

        signal,
        confidence: Math.round(confidence),

        score,

        votes,

        indicators: {
            rsi,
            sma20,
            sma50,
            ema20,
            momentum,
            trend,
            trendStrength,
            crossover,
            macd: macd?.macd || null,
            macdSignal: macd?.signal || null,
            macdHistogram: macd?.histogram || null,
            bollinger
        },

        positionAnalysis,

        meta: {
            currentPrice: price,
            dataPoints: prices.length,
            generatedAt: new Date().toISOString(),
            engineVersion: ENGINE_VERSION
        }
    };
}

/* -----------------------------
BATCH ENGINE
----------------------------- */

export function runBatchPredictions(stockMap) {

    const results = {};

    for (const ticker in stockMap) {

        const { prices, position } = stockMap[ticker];

        results[ticker] =
            runPrediction(prices, position);
    }

    return results;
}
