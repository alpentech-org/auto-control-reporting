require('dotenv').config();
const config = require('./config/config');
const express = require('express');
const request = require('request');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = config.port;
const path = require('path');

app.use(express.static('public'));

app.use('/home', function(req, res) {
  res.sendFile(path.join(__dirname + '/report.html'));
})

app.use('/', function(req, res) {

  //Take the baseurl from your api and also supply whatever
  //route you use with that url
  let url = config.apiUrl + req.url;
  //Pipe is through request, this will just redirect
  //everything from the api to your own server at localhost.
  //It will also pipe your queries in the url
  req.pipe(request({ uri: url, headers: {apikey: config.apiKey } })).pipe(res);
});


//Start the server by listening on a port
app.listen(port, () => {
  console.log("+---------------------------------------+");
  console.log("|                                       |");
  console.log(`|  [\x1b[34mSERVER\x1b[37m] Listening on port: ${port}     |`);
  console.log("|                                       |");
  console.log("\x1b[37m+---------------------------------------+");
});
