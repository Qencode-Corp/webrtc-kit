const path = require('path');

const config = [
  {
    mode: 'development',
    entry: './src/QencodeWebRTC.ts',
    output: {
      path: path.resolve(__dirname + '/demo/js'),
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
    devServer: {
      contentBase: path.join(__dirname, 'demo'),
      compress: true,
      port: 8080,
      open: 'index.html',
    },
  },
];

module.exports = config;
