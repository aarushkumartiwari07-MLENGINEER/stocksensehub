/*************************************************
 CONFIG
 *************************************************/
const CONFIG = {
  FINNHUB_API_KEY: PropertiesService.getScriptProperties().getProperty("FINNHUB_API_KEY"),
  STOCK_SHEET_NAME: "Stocks",
  ALERTS_SHEET_NAME: "Alerts",
  HISTORY_SHEET_NAME: "AlertHistory"
};

/*************************************************
 JSON RESPONSE
 *************************************************/
function jsonResponse(data){
  return ContentService
  .createTextOutput(JSON.stringify(data))
  .setMimeType(ContentService.MimeType.JSON);
}

/*************************************************
 HEALTH CHECK
 *************************************************/
function doGet(){
  return jsonResponse({
    status:"running",
    service:"StockSense API",
    time:new Date().toISOString()
  });
}

/*************************************************
 MAIN ROUTER
 *************************************************/
function doPost(e){

  try{

    let data = {};

    if(e.postData && e.postData.contents){
      data = JSON.parse(e.postData.contents);
    }else{
      data = e.parameter;
    }

    const action = data.action;
    let result;

    switch(action){

      case "getStocks":
        result = getTrendingStocks();
      break;

      case "updateStocks":
        updateTrendingStocks();
        result = {status:"updated"};
      break;

      case "addAlert":
        result = handleAddAlert(data);
      break;

      case "getAlerts":
        result = getAlerts();
      break;

      case "toggleAlert":
        result = toggleAlert(data);
      break;

      case "deleteAlert":
        result = deleteAlert(data);
      break;

      case "getAlertHistory":
        result = getAlertHistory();
      break;

      case "searchStocks":
        result = searchStocks(data);
      break;

      case "getHistoricalData":
        result = getHistoricalData(data);
      break;

      case "getPortfolioHistoricalData":
        result = getPortfolioHistoricalData(data);
      break;
      
      case "sendImmediateEmail":
        result = handleImmediateEmail(data);
      break;

      default:
        result = {error:"Unknown action"};
    }

    return jsonResponse(result);

  }catch(error){

    Logger.log(error);

    return jsonResponse({
      error:error.toString()
    });

  }

}

/*************************************************
 GET STOCKS FROM SHEET
 *************************************************/
function getTrendingStocks(){

  try{

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.STOCK_SHEET_NAME);

    if(!sheet) return [];

    const values = sheet.getDataRange().getValues();

    if(values.length <=1) return [];

    const rows = values.slice(1);

    const stocks = [];

    rows.forEach(row=>{

      stocks.push({

        Symbol: row[0],
        Price: Number(row[1]),
        Change: Number(row[2]),
        PercentChange: Number(row[3]),
        High: Number(row[4]),
        Low: Number(row[5]),
        Open: Number(row[6]),
        PrevClose: Number(row[7]),
        Timestamp: row[8]

      });

    });

    return stocks;

  }catch(err){

    Logger.log(err);
    return [];

  }

}

/*************************************************
 UPDATE STOCKS FROM FINNHUB (Throttled for Free Tier)
 *************************************************/
function updateTrendingStocks(){

  try{

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.STOCK_SHEET_NAME);
    if(!sheet) sheet = ss.insertSheet(CONFIG.STOCK_SHEET_NAME);

    // --- API THROTTLING (For Free Tier Safety) ---
    const lastUpdateVal = sheet.getLastRow() >= 2 ? sheet.getRange(2, 9).getValue() : null;
    if (lastUpdateVal && (lastUpdateVal instanceof Date)) {
      const now = new Date();
      const diffMs = now.getTime() - lastUpdateVal.getTime();
      const diffMins = diffMs / (1000 * 60);
      
      // If data is less than 2 minutes old, skip update to save API calls
      if (diffMins < 2) {
        Logger.log("Skipping Update: Data is fresh (" + Math.round(diffMins * 60) + "s old)");
        return; 
      }
    }

    const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "AMD", "DIS", "JPM", "COIN", "V", "WMT", "COST"];

    sheet.clear();
    sheet.appendRow([
      "Symbol", "Price", "Change", "PercentChange", "High", "Low", "Open", "PrevClose", "Timestamp"
    ]);

    symbols.forEach(symbol=>{
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${CONFIG.FINNHUB_API_KEY}`;
      try{
        const response = UrlFetchApp.fetch(url);
        const data = JSON.parse(response.getContentText());

        const price = Number(data.c);
        const prev = Number(data.pc);
        const change = price - prev;
        const percent = prev ? (change/prev)*100 : 0;

        sheet.appendRow([
          symbol, price, change, percent,
          Number(data.h), Number(data.l), Number(data.o),
          prev, new Date()
        ]);
      }catch(err){
        Logger.log(symbol+" error "+err);
      }
    });

  }catch(err){
    Logger.log(err);
  }
}

/*************************************************
 SEARCH STOCKS
 *************************************************/
function searchStocks(params){

  const query = (params.query || "").toLowerCase();

  const list = [
    {symbol:"AAPL",name:"Apple"},
    {symbol:"MSFT",name:"Microsoft"},
    {symbol:"GOOGL",name:"Alphabet"},
    {symbol:"AMZN",name:"Amazon"},
    {symbol:"TSLA",name:"Tesla"},
    {symbol:"NVDA",name:"NVIDIA"},
    {symbol:"META",name:"Meta"},
    {symbol:"NFLX",name:"Netflix"},
    {symbol:"AMD",name:"Advanced Micro Devices"},
    {symbol:"DIS",name:"Disney"},
    {symbol:"JPM",name:"JPMorgan Chase"},
    {symbol:"COIN",name:"Coinbase"},
    {symbol:"V",name:"Visa"},
    {symbol:"WMT",name:"Walmart"},
    {symbol:"COST",name:"Costco"}
  ];

  return list.filter(s =>
    s.symbol.toLowerCase().includes(query) ||
    s.name.toLowerCase().includes(query)
  );

}

/*************************************************
 HISTORICAL DATA (MOCK)
 *************************************************/
function getHistoricalData(params){

  const symbol = params.symbol || "AAPL";
  const range = params.range || "1M";
  const data = [];
  
  let days = 30;
  if (range === "3M") days = 90;
  else if (range === "1Y") days = 365;
  else if (range === "ALL") days = 730;

  // Try to get a better base price from current trending stocks if available
  const currentStocks = getTrendingStocks();
  const stock = currentStocks.find(s => s.Symbol === symbol);
  const basePrice = stock ? stock.Price : 150;

  for(let i=days; i>=0; i--){
    const d = new Date();
    d.setDate(d.getDate()-i);

    // Scaling factor that approaches 1 as i approaches 0
    const progress = (days - i) / days; 
    const trend = progress * 0.1; // 10% movement potential
    const noise = (Math.random() * 0.06 - 0.03);
    
    // Anchor the last point (i=0) to exactly basePrice
    let price;
    if (i === 0) {
      price = basePrice;
    } else {
      // Walk backwards from basePrice
      price = basePrice * (1 - (0.1 - (progress * 0.1)) + noise);
    }

    data.push({
      date: Utilities.formatDate(d, "GMT", "MMM dd"),
      close: price
    });
  }

  return {symbol, data, range};
}

/*************************************************
 PORTFOLIO HISTORY
 *************************************************/
function getPortfolioHistoricalData(params){
  const range = params.range || "1M";
  
  // If portfolio items are provided, try to calculate a combined base price
  let baseValue = 1000; // Default
  
  if (params && params.portfolio && Array.isArray(params.portfolio)) {
    baseValue = params.portfolio.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.buyPrice) || 100;
      return sum + (qty * price);
    }, 0);
  }

  // Pass the range to getHistoricalData
  const result = getHistoricalData({symbol: "Portfolio", range: range});
  
  // Adjust result to match baseValue
  // Assuming getHistoricalData uses ~150 as a default basePrice if "Portfolio" is not found in trending
  const referencePrice = 150; 
  result.data = result.data.map(point => {
    return {
      date: point.date,
      close: (point.close / referencePrice) * baseValue
    };
  });

  return result;
}
/*************************************************
 * SEND IMMEDIATE EMAIL
 *************************************************/
function handleImmediateEmail(data) {
  try {
    if (!data.email || !data.symbol) {
      return { error: "Missing email or symbol" };
    }
    
    // Use the function from alertengine.gs
    return sendAlertEmail(data);
  } catch (error) {
    Logger.log("Immediate Email Error: " + error.toString());
    return { error: error.toString() };
  }
}
