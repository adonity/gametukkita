const express = require("express");
const mysql = require("mysql");
const fetch = require("cross-fetch");

const app = express();
app.set('trust proxy', true);
app.use(express.static("public"));
app.use(express.json());

// const con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "baltic_v1",
// });
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Frank1sHere",
  database: "baltic_v1",
});

con.connect(function (error) {
  if (error) {
    console.log("Database Connection FAILED");
    console.error(error);
  }
});

app.get("/", function (request, response) {
  response.sendFile(__dirname + "/public/index.html");
});
app.get("/favicon.ico", function (request, response) {
  response.sendFile(__dirname + "/public/index.html");
});

app.get("/:campname", function (request, response) {
  let campname = request.params.campname;
  // let sql = `SELECT * FROM links WHERE campname='${campname}' LIMIT 1`;
  let sql = `SELECT * FROM links WHERE campname='${campname}'`;
  con.query(sql, function (error, result) {
    if (error) {
      console.error(error);
      response.status(500).json({
        status: "notok",
        message: "OOPS! Something Went Wrong",
      });
    } else {
      console.log("id valid");
      const clientIP =
        request.headers["x-real-ip"] ||
        request.headers["x-forwarded-for"] ||
        request.connection.remoteAddress;
      const parts = clientIP.split(":");
      const ipv4 = parts[parts.length - 1];

      console.log("ip Proxy = "+ clientIP);
      console.log("ipv4 = "+ ipv4);

      fetch(`https://ifconfig.co/json?ip=${ipv4}`)
        .then((res) => {
          if (res.status >= 400) {
            throw new Error("Bad response from server");
          }
          return res.json();
        })
        .then((user) => {
          const referer = request.headers.referer;
          const campname = request.params.campname;
          const ipaddress = user.ip;
          const country = user.country;
          const region = user.region_name;
          const city = user.city;
          const user_agent = request.headers["user-agent"];
          const isp = user.asn_org;
          const sql = `INSERT INTO visitor (linkid, ipaddress, country, region, city, referer, browser, isp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
          const redirect1 = result[0].blackurl;
          const redirect2 = result[0].whiteurl;

          con.query(
            sql,
            [
              result[0].id,
              ipaddress,
              country,
              region,
              city,
              referer,
              user_agent,
              isp,
            ],
            function (error, result) {
              if (error) {
                console.error(error);
                response.status(500).json({
                  status: "notok",
                  message: "OOPS! Something Went Wrong",
                });
              } else if (country === "Indonesia") {
                  console.log(user_agent);
                  console.log(country);
                  console.log("Beliau ini Human");
                  console.log("redirect moneysite");
                  response.redirect(redirect1);
                } else {
                  console.log(user_agent);
                  console.log(country);
                  console.log("Beliau ini Penyusup");
                  response.redirect(redirect2);
                  console.log("redirect putih");
                }
            }
          );
        })
        .catch((err) => {
          console.error(err);
        });
    }
  });
});

app.all("*", (req, res) => {
  res.status(404).send("<h1>404! Page not found</h1>");
});
app.listen(8082);
console.log("SERVER RUNNING PORT : 8081");
