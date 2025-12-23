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

      // Copy JS file
      const jsFile = path.join(distPath, 'QencodeWebRTC.js');
      const jsDest = path.join(demoPath, 'QencodeWebRTC.js');
      if (fs.existsSync(jsFile)) {
        fs.copyFileSync(jsFile, jsDest);
        console.log(`Copied ${jsFile} to ${jsDest}`);
      }
    });
  }
}

const config = [
  {
    mode: 'development',
    entry: './src/QencodeWebRTC.ts',
    output: {
      path: path.resolve(__dirname + '/dist'),
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
    plugins: [new CopyToDemoPlugin()],
  },
];

module.exports = config;
