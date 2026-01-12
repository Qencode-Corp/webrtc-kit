const path = require('path');
const fs = require('fs');

// Ensure output directory exists
const outputPath = path.resolve(__dirname, 'demo', 'css');
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

const config = [
  {
    mode: 'production',
    entry: './src/QencodeWebRTC.ts',
    output: {
      path: outputPath,
      filename: 'QencodeWebRTC.min.js',
      library: 'QencodeWebRTC',
      libraryTarget: 'umd',
      libraryExport: 'default',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    devtool: 'source-map',
  },
];

module.exports = config;
