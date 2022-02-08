const webpack = require("webpack");
const path = require("path");
const camelCase = require("camelcase");
const CleanWebpackPlugin = require("clean-webpack-plugin");

const PACKAGE_ROOT_PATH = process.cwd();

const config = {
  entry: ["./src/component/component.js"],
  output: {
    path: path.resolve(PACKAGE_ROOT_PATH, "build"),
    filename: "pdb-ligand-env-component-init.js"
  },
  target: "web",
  devtool: "source-map",
  resolve: {
    extensions: [".js"]
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          "style-loader",
          { loader: "css-loader", options: { importLoaders: 1 } }
        ]
      },
      {
        test: /.(jpg|jpeg|png|svg)$/,
        use: ['url-loader'],
      },
      {
        test: /\.(js)$/,
        exclude: function excludeCondition(path) {

          const nonEs5SyntaxPackages = [
            'lit-element',
            'lit-html'
          ]

          // DO transpile these packages
          if (nonEs5SyntaxPackages.some(pkg => path.match(pkg))) {
            return false;
          }

          // Ignore all other modules that are in node_modules
          if (path.match(/node_modules\\/)) { return true; }

          else return false;
        },
        use: {
          loader: "babel-loader",
          options: {
            babelrc: false,
            presets: [],
            plugins: [
              [
                "@babel/plugin-transform-runtime",
                {
                  regenerator: true
                }
              ]
            ]
          }
        }
      }
    ]
  }
};

module.exports = config;