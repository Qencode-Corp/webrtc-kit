const path = require('path');
const fs = require('fs');

// Custom plugin to copy files after build
class CopyToDemoPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('CopyToDemoPlugin', (compilation) => {
      const distPath = path.resolve(__dirname, 'dist');
      const demoPath = path.resolve(__dirname, 'demo/js');

      // Ensure demo/js directory exists
      if (!fs.existsSync(demoPath)) {
        fs.mkdirSync(demoPath, { recursive: true });
      }

      // Copy minified JS file
      const jsFile = path.join(distPath, 'QencodeWebRTC.min.js');
      const jsDest = path.join(demoPath, 'QencodeWebRTC.min.js');
      if (fs.existsSync(jsFile)) {
        fs.copyFileSync(jsFile, jsDest);
        console.log(`Copied ${jsFile} to ${jsDest}`);
      }

      // Copy source map file
      const mapFile = path.join(distPath, 'QencodeWebRTC.min.js.map');
      const mapDest = path.join(demoPath, 'QencodeWebRTC.min.js.map');
      if (fs.existsSync(mapFile)) {
        fs.copyFileSync(mapFile, mapDest);
        console.log(`Copied ${mapFile} to ${mapDest}`);
      }
    });
  }
}

const config = [
  {
    mode: 'production',
    entry: './src/QencodeWebRTC.js',
    output: {
      path: path.resolve(__dirname + '/dist'),
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
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    devtool: 'source-map',
    plugins: [new CopyToDemoPlugin()],
  },
];

module.exports = config;
