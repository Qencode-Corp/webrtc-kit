const path = require("path");

const config = [
    {
        mode: 'production',
        entry: "./src/QencodeWebRTC.js",
        output: {
            path: path.resolve(__dirname + "/dist"),
            filename: "QencodeWebRTC.min.js",
            library: "QencodeWebRTC",
            libraryTarget: "umd",
            libraryExport: "default",
        },
        devtool: 'source-map',
    }
];

module.exports = config;