// webpack.plugin.config.js
const path = require("path");

const PACKAGE_ROOT_PATH = process.cwd();

const config = {
  entry: "./src/plugin/manager.ts",
  output: {
    path: path.resolve(PACKAGE_ROOT_PATH, "build"),
    filename: "pdb-ligand-env-plugin.js",
    library: {
      name: "PDBeLigandEnv",
      type: "umd"
    },
    globalObject: "this"
  },
  target: "web",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(jpg|jpeg|png|svg)$/,
        type: "asset/resource"
      }
    ]
  },
};

module.exports = config;
