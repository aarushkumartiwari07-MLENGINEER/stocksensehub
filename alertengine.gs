/*************************************************
 ADD ALERT
 *************************************************/
function handleAddAlert(data){

  try{

    if(!data.email || !data.symbol){
      return {error:"Missing fields"};
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let sheet = ss.getSheetByName(CONFIG.ALERTS_SHEET_NAME);

    if(!sheet){

      sheet = ss.insertSheet(CONFIG.ALERTS_SHEET_NAME);

      sheet.appendRow([
        "ID",
        "Email",
        "Symbol",
        "Type",
        "TargetValue",
        "Status",
        "CreatedAt"
      ]);

    }

    const id = Utilities.getUuid();

    sheet.appendRow([
      id,
      data.email,
      data.symbol,
      data.condition,
      data.targetValue,
      "ACTIVE",
      new Date()
    ]);

    // Send confirmation email
    checkAndSendConfirmation(data.email, data.symbol, data.condition, data.targetValue);

    return {
      success:true,
      id:id
    };

  }catch(err){

    Logger.log(err);

    return {error:err.toString()};

  }

}

/*************************************************
 GET ALERTS
 *************************************************/
function getAlerts(){

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.ALERTS_SHEET_NAME);

  if(!sheet) return [];

  const values = sheet.getDataRange().getValues();

  if(values.length<=1) return [];

  const rows = values.slice(1);

  const alerts=[];

  rows.forEach(r=>{

    alerts.push({

      id:r[0],
      email:r[1],
      symbol:r[2],
      type:r[3],
      targetValue:r[4],
      status:r[5],
      createdAt:r[6]

    });

  });

  return alerts;

}

/*************************************************
 TOGGLE ALERT
 *************************************************/
function toggleAlert(data){

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.ALERTS_SHEET_NAME);

  if(!sheet) return {error:"Sheet missing"};

  const values = sheet.getDataRange().getValues();

  for(let i=1;i<values.length;i++){

    if(values[i][0]===data.id){

      const newStatus = values[i][5]==="ACTIVE"
      ? "INACTIVE"
      : "ACTIVE";

      sheet.getRange(i+1,6).setValue(newStatus);

      return {success:true};

    }

  }

  return {error:"Alert not found"};

}

/*************************************************
 DELETE ALERT
 *************************************************/
function deleteAlert(data){

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.ALERTS_SHEET_NAME);

  if(!sheet) return {error:"Sheet missing"};

  const values = sheet.getDataRange().getValues();

  for(let i=1;i<values.length;i++){

    if(values[i][0]===data.id){

      sheet.deleteRow(i+1);

      return {success:true};

    }

  }

  return {error:"Alert not found"};

}

/*************************************************
 ALERT HISTORY
 *************************************************/
function getAlertHistory(){

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.HISTORY_SHEET_NAME);

  if(!sheet) return [];

  const values = sheet.getDataRange().getValues();

  if(values.length<=1) return [];

  const rows = values.slice(1);

  const history=[];

  rows.forEach(r=>{

    history.push({

      symbol:r[0],
      email:r[1],
      target:r[2],
      triggeredPrice:r[3],
      timestamp:r[4],
      alertType:r[5],
      notificationSent:r[6]

    });

  });

  return history;

}

/*************************************************
 MONITOR ALERTS AND SEND EMAILS (Trigger)
 *************************************************/
function checkAlerts(){

  const alerts = getAlerts();
  if(alerts.length === 0) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName(CONFIG.STOCK_SHEET_NAME);
  if(!stockSheet) return;
  
  const stockData = stockSheet.getDataRange().getValues();
  if(stockData.length <= 1) return;

  // Map latest stock prices
  const currentPrices = {};
  for(let i=1; i<stockData.length; i++){
    currentPrices[stockData[i][0]] = Number(stockData[i][1]);
  }

  alerts.forEach(alert => {
    if(alert.status !== "ACTIVE") return;
    
    const price = currentPrices[alert.symbol];
    if(price === undefined) return;
    
    let triggered = false;
    const target = Number(alert.targetValue);

    if(alert.type === "price_above" || alert.type === "above"){
      triggered = price >= target;
    } else if(alert.type === "price_below" || alert.type === "below"){
      triggered = price <= target;
    } else if (alert.type === "range"){
        const parts = alert.targetValue.toString().split('-');
        if (parts.length === 2) {
          const min = parseFloat(parts[0]);
          const max = parseFloat(parts[1]);
          triggered = price <= min || price >= max;
        }
    }

    if(triggered){
      // Send Email
      const subject = `🚨 Stock Alert: ${alert.symbol} Triggered!`;
      const body = `Your alert for ${alert.symbol} has been triggered.\n\nCurrent Price: $${price}\nAlert Condition: ${alert.type} ${alert.targetValue}\n\nCheck your dashboard: StockSense Hub`;
      
      try {
        MailApp.sendEmail(alert.email, subject, body);
        
        // Log to History
        const historySheet = ss.getSheetByName(CONFIG.HISTORY_SHEET_NAME) || ss.insertSheet(CONFIG.HISTORY_SHEET_NAME);
        historySheet.appendRow([alert.symbol, alert.email, alert.targetValue, price, new Date(), alert.type, "Yes"]);

        // Turn off the alert after triggering
        toggleAlert({ id: alert.id });
      } catch(e) {
        Logger.log("Mail Error: " + e.toString());
      }
    }
  });
}

/*************************************************
 SEND CONFIRMATION EMAIL (On Add)
 *************************************************/
function checkAndSendConfirmation(email, symbol, condition, targetValue) {
  try {
    const subject = `✅ Alert Created: Tracking ${symbol}`;
    
    let conditionText = "";
    if (condition === "above" || condition === "price_above") {
      conditionText = `rises above $${targetValue}`;
    } else if (condition === "below" || condition === "price_below") {
      conditionText = `drops below $${targetValue}`;
    } else if (condition === "range") {
      const parts = targetValue.toString().split('-');
      conditionText = `moves outside the range of $${parts[0]} and $${parts[1]}`;
    } else {
      conditionText = `${condition} $${targetValue}`;
    }

    const body = `Success! 🎉\n\nYou have successfully set a real-time tracking alert for ${symbol}.\n\nAlert Details:\n• Stock Symbol: ${symbol}\n• Tracking Condition: We will notify you the moment the price ${conditionText}.\n\nSit back and relax. We'll send you an email right here when your condition is met.\n\n- StockSenseHub - Aarush Tiwari`;
    
    MailApp.sendEmail(email, subject, body);
  } catch(e) {
    Logger.log("Confirmation Mail Error: " + e.toString());
  }
}

/*************************************************
 SEND ALERT EMAIL (Reusable)
 *************************************************/
function sendAlertEmail(data) {
  try {
    const subject = `🚨 Stock Alert: ${data.symbol} Triggered!`;
    
    // Determine condition text for the email
    let conditionText = "";
    if (data.condition === "above" || data.condition === "price_above") {
        conditionText = `rose above $${data.targetValue}`;
    } else if (data.condition === "below" || data.condition === "price_below") {
        conditionText = `dropped below $${data.targetValue}`;
    } else if (data.condition === "range") {
        conditionText = `moved outside your specified range ($${data.targetValue})`;
    } else {
        conditionText = `met your condition (${data.condition} $${data.targetValue})`;
    }

    const body = `Stock Alert Triggered! 🔔\n\nYour alert for ${data.symbol} is active.\n\nAlert Details:\n• Condition: Price ${conditionText}\n• Current Price: $${data.currentPrice || 'Market Price'}\n• Triggered At: ${new Date().toLocaleString()}\n\nView Your Dashboard: StockSense Hub\n\n- Automated Alert System`;
    
    MailApp.sendEmail(data.email, subject, body);
    
    // Log to History
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historySheet = ss.getSheetByName(CONFIG.HISTORY_SHEET_NAME) || ss.insertSheet(CONFIG.HISTORY_SHEET_NAME);
    historySheet.appendRow([
        data.symbol, 
        data.email, 
        data.targetValue, 
        data.currentPrice || 0, 
        new Date(), 
        data.condition, 
        "Yes"
    ]);

    return { success: true, message: "Email sent and history updated" };
  } catch(e) {
    Logger.log("Send Alert Email Error: " + e.toString());
    return { error: e.toString() };
  }
}
