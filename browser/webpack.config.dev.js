var path = require('path');
var fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './src/ts/client',
  output: {
    path: path.resolve(__dirname, "static/public"),
    filename: 'mudslinger-[hash].js',
    // Bundle absolute resource paths in the source-map,
    // so VSCode can match the source file.
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  },
  plugins: [
    new CleanWebpackPlugin({
      /*dry: true,*/
      verbose: true,
      cleanOnceBeforeBuildPatterns: ['*.hot-update.json', '*.js', '!jquery*'],
    }),
    new CopyPlugin({
      patterns: [
        {
          // If absolute path is a `glob` we replace backslashes with forward slashes, because only forward slashes can be used in the `glob`
          from: "src/cacheServiceWorker.js",
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: "./src/html/template.html",
      filename: path.resolve(__dirname, "static/public", "index.html")
  })],
  mode: 'development',
  devtool: 'eval-source-map', 
  resolve: {
    modules: ['node_modules'],
    extensions: ['.ts','.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader'
      }
    ]
  },
  devServer: {
    host: 'localhost',
    hot: true,
    open:false,
    /*https: true,
    host: 'mars.local',
    key: fs.readFileSync("file:///C://openssl-1.1//x64//bin//mars.local.key"),
    cert: fs.readFileSync("file:///C://openssl-1.1//x64//bin//mars.local.crt"),*/
    port: 8080,
    static: {
      directory: path.resolve(__dirname, "static/public/"),
      serveIndex: true,
      watch: true,
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
};