
const auth = require('./auth/auth.js');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());
const cors = require('cors')
const emptyPromise = require('empty-promise')
const env = require('dotenv');
const WebSocket = require('ws');
const fs = require("fs")
// web socket server
const wss = new WebSocket.Server({ server: server });
// cross origin
app.use(cors());
// setup env
env.config()
const fetch = require('node-fetch');

const swaggerUi = require('swagger-ui-express'),
  swaggerDocument = require('./swagger.json');
const { disconnect } = require('process');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// map of clients
const clients = [];
// map of responses {id, promise}
const responseMap = [];
// map of response messages//
const messageMap = [];//

wss.on('connection', function connection(ws) {
  ws.send(JSON.stringify({ type: "Connected" }));
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'sendCredentials') {

      const date = new Date()
      console.log("Client connected: " + "Client: " + message.name + " " + message.ip + " " + date.toUTCString());
      ws.name = message.name;
      ws.location = message.location;
      ws.ip = message.ip;
      ws.path = message.path;
      ws.status = "Online";
      clients[message.name + message.location + message.ip] = ws;
      responseMap[message.name + message.location + message.ip] = emptyPromise();
    }
    else if (message.type === "command_result") {
      messageMap[message.name + message.location + message.ip].message = message.message;//
      responseMap[message.name + message.location + message.ip].resolve(messageMap[message.name + message.location + message.ip]);
    } else if (message.type === "sendScreenshot") {
      messageMap[message.name + message.location + message.ip].message = message.message;//
      responseMap[message.name + message.location + message.ip].resolve(messageMap[message.name + message.location + message.ip]);
    } else if (message.type === "sendFile") {
      //messageMap[message.name + message.location].message = message.message;//
      //check if file exists
      let buff = new Buffer.from(message.data, 'base64');

      fs.writeFile(message.fileName, buff, function (err) {
        if (err) {
          console.log("error: " + err)
        }
        else {
          console.log("done")
        }
      });
      // responseMap[message.name + message.location].resolve(messageMap[message.name + message.location]);
    }
  });

});

/*alidator for all /api routes, checks if token is valid**/
/*app.use('/api', async function (req, res, next) {
 const { name, location, ip, command } = req.body;
 const authHeader = req.headers.authorization;
 const validation = await auth.validateJWT(authHeader);
 if (validation.status != 200) {
   res.status(validation.status);
   res.send("Token not valid");
   return;
 }else{
   var x=await validation.json();

   const messageResponse = //
     {
       token: x.accessToken,//
       message : ""//
     }
    messageMap[name + location + ip] = messageResponse;//

 }
 
 next();
});*/

app.post('/api/command', async (req, res) => {
  const { name, location, ip, command } = req.body;
  let ws = clients[name + location + ip];
  // console.log("Dobio sam komandu "+name+" "+location+" "+command)
  if (ws !== undefined) {
    var response = {
      type: "command",
      command: command,
      parameters: parameters
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, name, location, ip);
    responseMap[name + location + ip].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[name + location + ip] = emptyPromise();

      res.json(val);
    }).catch((err) => {
      res.statusCode = 404;
      res.json(err);
    });
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      name: name,
      location: location
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.get('/online', (req, res) => {

  const niz = [];
  for (var k in clients) {
    const toAdd = { name: clients[k].name, location: clients[k].location, ip: clients[k].ip, status: clients[k].status };
    niz.push(toAdd);
  }

  res.send(niz);

});

app.get('/onlineClients', async (req, res) => {
  var clientArray = [];

  for (let client of clients) {
    clientArray.push({ name: client.name, location: client.location, ip: client.ip })
  }

  res.send(clientArray)
});

app.post('/agent/disconnect', async (req, res) => {

  const { name, location, ip } = req.body;

  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    clients[name + location + ip].close();
    var res = {
      type: "disconnected"
    }
    res.json(res);
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      name: name,
      location: location
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.post('/agent/connect', async (req, res) => {
  const { name, location, ip } = req.body;

  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    clients[name + location + ip].open();
    var res = {
      type: "connected"
    }
    res.json(res);
  }
  else {
    var errResp = {
      error: "Device is not found!",
      name: name,
      location: location
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.post('/api/screenshot', async (req, res) => {
  const { name, location, ip } = req.body;
  let ws = clients[name + location + ip];
  //console.log("Dobio sam screen request "+name+" "+location);
  if (ws !== undefined) {
    var response = {
      type: "getScreenshot",
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, name, location);
    responseMap[name + location + ip].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[name + location + ip] = emptyPromise();
      res.json(val);
    }).catch((err) => {
      res.statusCode = 404;
      res.json(err);
    });
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      name: name,
      location: location,
      ip: ip
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

/*app.post('/api/file', async (req, res) => {
 const { name, location, ip, file_name, path} = req.body;
 let ws = clients[name + location + ip];
 if (ws !== undefined) {
     var response = {
         type: "getFile",
         file_name: file_name,
         path: path
     }
   ws.send(JSON.stringify(response));
   const errorTimeout = setTimeout(errFunction, 10000, name, location, ip); 
   responseMap[name + location + ip].then((val) => {
     clearTimeout(errorTimeout);
     responseMap[name + location + ip] = emptyPromise();
     res.json(val);
   }).catch((err) => {
     res.statusCode = 404;
     res.json(err);
   });
 }
 else {
   var errResp = {
     error: "Device is not connected to the server!",
     name: name,
     location: location,
     ip: ip
   }
   res.statusCode = 404;
   res.json(errResp);
 }
});
*/

/*
/agent/getFile
*/

app.post('/web/getFile', async (req, res) => {
  const { name, location, ip, fileName } = req.body;

  fs.readFile(name + location + ip + "/" + fileName, { encoding: 'base64' }, function (err, data) {
    if (err) {
      console.log("error: " + err)
    }
    else {
      var response = {
        fileName: fileName,
        base64Data: data
      }
      res.status = 200;
      res.send(response);
    }
  });
});

app.post('/web/putFile', async (req, res) => {
  const { name, location, ip, fileName, base64Data } = req.body;

  let buff = new Buffer.from(base64Data, 'base64');

  fs.writeFile(name + location + ip + "/" + fileName, buff, function (err) {
    if (err) {
      console.log("error: " + err)
    }
    else {
      console.log("done");
      res.json({ message: "Done!" });
    }
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Up and running.</h1>');
})

function errFunction(name, location, ip) {
  var errResp = {
    error: "Client took too long to respond",
    name: name,
    location: location,
    ip: ip
  }
  responseMap[name + location + ip].reject(errResp);
}



const PORT = process.env.PORT || 25565;
server.listen(PORT, () => console.log("Listening on port " + PORT));