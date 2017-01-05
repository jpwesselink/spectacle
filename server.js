/* eslint-disable */

var path = require("path");
var bodyParser = require("body-parser");
var express = require("express");
var webpack = require("webpack");
var SSE = require("sse");
var uuid = require("uuid");
var http = require("http");
var config = require("./webpack.config");

var app = express();
var compiler = webpack(config);

// this is where a list of client ids is being kept
// mostly for connection pool handling
var clients = {};

app.use(require("webpack-dev-middleware")(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath
}));

app.use(require("webpack-hot-middleware")(compiler));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

// once a client posts something...
app.post("/sse-post", (req, res) => {
  // we iterate over the list of clients ...
    Object.keys(clients)
      .forEach(clientUuid => {
        // and pass it forward to all clients but the client who sent it
        if(clientUuid !== req.body.uuid){
          // tada, and we're done.
          clients[clientUuid].send(serialize(req.body));
        }
      });
      // this can go :D
});

app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

// here I had to shuffle some stuff around to get a reference to server
var server = http.createServer(app);

const serialize = (value) => JSON.stringify(value instanceof Object? value : { text: value });

server.listen(3000, "localhost", function (err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log("Listening at http://localhost:3000");


  // once the server is up it can listen for event source socket requests
  var sse = new SSE(server);

  sse.on("connection", (client) => {
    // ever client gets a unique id, and we pass it down the pipe
      client.uuid = uuid.v4();
      client.send(serialize({ uuid: client.uuid }));
      clients[client.uuid] = client;

      var closeListener = () => {
        delete clients[client.uuid];
        client.req.removeListener("close", closeListener);
      };
      client.req.addListener("close", closeListener );
  });
});


// and basically this is all :D
