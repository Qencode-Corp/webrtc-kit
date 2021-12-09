const path = require("path");

const config = [
    {
        mode: 'development',
        entry: "./src/QencodeWebRTC.js",
        output: {
            path: path.resolve(__dirname + "/dist"),
            filename: "QencodeWebRTC.js",
            library: "QencodeWebRTC",
            libraryTarget: "umd",
            libraryExport: "default",
        }
    }
];

module.exports = config;