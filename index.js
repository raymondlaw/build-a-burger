const fs = require("fs");
const url = require("url");
const http = require("http");

const Jimp = require("jimp");

const port = 3000;
const host = "localhost";
let cache_enabled = true;

const open_assets = function () {
    const assets = [
        {id: "b", path: "assets/bun.png"},
        {id: "p", path: "assets/patty.png"},
        {id: "c", path: "assets/cheese.png"},
        {id: "l", path: "assets/lettuce.png"},
        {id: "t", path: "assets/tomato.png"},
        {id: "e", path: "assets/egg.png"}
    ];
    let assets_read = 0;
    const open_asset = function (asset) {
        Jimp.read(asset.path, function (err, resource) {
            if (err) {
                throw err;
            }
            asset.resource = resource;
            assets_read += 1;
            if (assets_read === assets.length) {
                console.log("All images loaded into memory");
                create_server(assets);
            }
        });
    };
    assets.forEach(open_asset);
};

const create_server = function (assets) {
    const new_connection = function (req, res) {
        if (req.url === "/") {
            res.writeHead(200, {"Content-Type": "text/html"});
            fs
                .createReadStream("./html/index.html")
                .pipe(res);
        }
        else if (req.url.startsWith("/build")) {
            let order = url.parse(req.url, true).query.q;
            parse_order(order, assets, res);
        }
        else {
            res.writeHead(404);
            res.end();
        }
    };
    const server = http.createServer(new_connection);
    server.listen(port, host);
    console.log(`Now Listening On ${host}:${port}`);
};

const parse_order = function (order, assets, res) {
    let burger = [];
    let ids = assets.map((x) => x.id);
    let validated_order = "";
    [...order].forEach(function (letter) {
        let i = ids.indexOf(letter);
        if (i !== -1) {
            burger.push(assets[i]);
            validated_order += letter;
        }
    });
    let filename = `tmp/${validated_order}.png`;
    fs.access(filename, function (does_not_exist) {
        if (does_not_exist  || !cache_enabled) {
            create_burger(burger, filename, res);
        }
        else {
            console.log("Cache Hit");
            let image_stream = fs.createReadStream(filename);
            res.writeHead(200, {"Content-Type": "image/jpeg"});
            image_stream.pipe(res);
        }
    });
};

const create_burger = function (burger, filename, res) {
    let height = 130 + (25 * burger.length - 1);
    new Jimp(326, height, function (err, canvas) {
        if (err) {
            throw err;
        }
        let yaxis = 0;
        burger.forEach(function (component) {
            canvas.blit(component.resource, 0, yaxis);
            yaxis += 25;
        });
        canvas
            .flip(false, true)
            .write(filename, function () {
                res.writeHead(200, {"Content-Type": "image/jpeg"});
                fs
                    .createReadStream(filename)
                    .pipe(res);
            });
    });
};

open_assets();
