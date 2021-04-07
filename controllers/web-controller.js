const Error = require('../models/error.js');
const fs = require("fs");
const WebSocketService = require('../ws/websocket-service.js');
const timeoutError = require('../models/timeout-error.js');
const dirTree = require("directory-tree");

async function getFile(req, res) {
    const { path, fileName, user } = req.body;
    if (fileName == undefined || user == undefined || path == undefined) {
        res.status(400);
        const error = new Error(7, "Body invalid.");
        res.send(error);
        return;
    }
    const fullPath = `allFiles/${user}/${path}/${fileName}`;
    fs.readFile(fullPath, { encoding: 'base64' }, function (err, data) {
        if (err) {
            const error = new Error(11, "File does not exist.");
            res.json(error);
        } else {
            var response = {
                fileName: fileName,
                base64: data
            }
            res.status = 200;
            res.send(response);
        }
    });
}

async function getFileFromAgent(req, res) {
    const { deviceUid, path, fileName, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || user == undefined) {
        const error = new Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${deviceUid}`;
    if (fileName === "config.json")
        dir = dir + "/config";
    else
        dir = dir + "/" + path
    fs.readFile(dir + "/" + fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
            console.log("/api/web/agent/file/get error: " + err)
            const error = new Error(11, "File does not exist.");
            res.json(error);
        } else {
            var response = {
                fileName: fileName,
                base64: data
            }
            res.status = 200;
            res.send(response);
        }
    });
}

async function putFileOnServer(req, res) {
    const { path, fileName, base64, user } = req.body;
    if (fileName == undefined || base64 == undefined || user == undefined) {
        res.status(400);
        const error = new Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let buff = new Buffer.from(base64, 'base64');
    let dir = `allFiles/${user}/${path}`;
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            const error = new Error(12, "Unkown error while making directories.")
            res.send(error);
            return;
        } else {
            fs.writeFile(dir + "/" + fileName, buff, function (err) {
                if (err) {
                    console.log("/api/web/user/file/put error: " + err)
                    res.status(404);
                    res.json({ error: err });
                } else {
                    console.log("done");
                    const response = {
                        success: true,
                        message: "File uploaded sucessfuly."
                    }
                    res.json(response);
                }
            });
        }
    });

}

async function putFileOnAgent(req, res) {
    const { deviceUid, path, fileName, base64, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || base64 == undefined || user == undefined) {
        res.status(400);
        const error = new Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let buff = new Buffer.from(base64, 'base64');
    let dir = `allFIles/${deviceUid}`;
    if (fileName === "config.json")
        dir = dir + "/config";
    else
        dir = dir + "/" + path;
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            res.status(404);
            const error = new Error(12, "Unkown error while making directories.")
            res.send(error);
            return;
        } else {
            fs.writeFile(dir + "/" + fileName, buff, function (err) {
                if (err) {
                    console.log("/api/web/agent/file/put error: " + err)
                    res.status(404);
                    res.json({ error: err });
                    return;
                } else {
                    if (fileName === "config.json") {
                        let ws = WebSocketService.getClient(deviceUid);
                        if (ws == undefined) {
                            const error = new Error(12, "Config saved but agent is not connected.");
                            res.statusCode = 210;
                            res.json(errResp);
                            return;
                        }
                        var response = {
                            type: "putFile",
                            fileName: fileName,
                            path: "",
                            data: base64,
                            user: user
                        }

                        ws.send(JSON.stringify(response));
                        const errorTimeout = setTimeout(timeoutError, 10000, deviceUid);
                        WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
                            clearTimeout(errorTimeout);
                            WebSocketService.clearResponsePromiseForDevice(deviceUid);
                            res.json(val);
                        }).catch((err) => {
                            res.statusCode = 404;
                            res.json(err);
                        });
                        return;
                    } else {
                        res.json({ success: true, message: "Succesfuly uploaded file." });
                    };
                }
            });
        }
    });
}

function getDirectoryTree(req, res) {
    const { deviceUid, user } = req.body;
    if (deviceUid == undefined || user == undefined) {
        res.status(400);
        const error = new Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let path = `allFiles/${deviceUid}`;
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    const tree = dirTree(path);
    res.status(200);
    res.send(tree);
}

function getUserDirectoryTree(req, res) { 
    const { user } = req.body;
    if (user == undefined) {
        res.status(400);
        const error = new Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let path = `allFiles/${user}`;
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    const tree = dirTree(path);
    res.status(200);
    res.send(tree);
}

function getTextFile(req, res)  { 
    const { deviceUid, path, fileName, user } = req.body;
    if (fileName == undefined || user == undefined) {
        res.status(400);
        const error = new Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    const dir = `allFiles/${deviceUid}/${path}`;
    fs.readFile(dir + "/" + fileName, { encoding: 'utf-8' }, function(err, fileText) {
        if (err) {
            console.log("error: " + err)
            const error = new Error(8,"File does not exist");
            res.send(error);
        } else {
            var response = {
                fileName: fileName,
                text: fileText
            }
            res.status = 200;
            res.send(response);
        }
    });
}

module.exports = {
    getFile,
    getFileFromAgent,
    putFileOnServer,
    putFileOnAgent,
    getDirectoryTree,
    getUserDirectoryTree,
    getTextFile
}