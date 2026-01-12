const path = require('path');

const config = [
  {
    mode: 'development',
    entry: './src/QencodeWebRTC.ts',
    output: {
      path: path.resolve(__dirname + '/demo/js'),
      filename: 'QencodeWebRTC.js',
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
  },
];

module.exports = config;
