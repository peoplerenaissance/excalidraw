'use strict';

const fs = require('fs');
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const redirectServedPath = require('react-dev-utils/redirectServedPathMiddleware');
const paths = require('./paths');
const getHttpsConfig = require('./getHttpsConfig');

const host = process.env.HOST || '0.0.0.0';
const sockHost = process.env.WDS_SOCKET_HOST;
const sockPath = process.env.WDS_SOCKET_PATH; // default: '/sockjs-node'
const sockPort = process.env.WDS_SOCKET_PORT;

module.exports = function (proxy, allowedHost) {
  return {
    allowedHosts: "all", 
    compress: true,
    client: {
      logging: "info",
      overlay: false,
      webSocketURL: {
        hostname: sockHost,
        pathname: sockPath,
        port: sockPort,
      },
    },
    proxy, 
    port: 3000, 
    static: {
      // By default WebpackDevServer serves physical files from current directory
      // in addition to all the virtual build products that it serves from memory.
      // This is confusing because those files won’t automatically be available in
      // production build folder unless we copy them. However, copying the whole
      // project directory is dangerous because we may expose sensitive files.
      // Instead, we establish a convention that only files in `public` directory
      // get served. Our build script will copy `public` into the `build` folder.
      // In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
      // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
      // In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
      // Note that we only recommend to use `public` folder as an escape hatch
      // for files like `favicon.ico`, `manifest.json`, and libraries that are
      // for some reason broken when imported through webpack. If you just want to
      // use an image, put it in `src` and `import` it from JavaScript instead.
      directory: paths.appPublic,
      publicPath: paths.publicUrlOrPath,
      // By default files from `contentBase` will not trigger a page reload.
      //    watch: true,
      serveIndex: true,
      staticOptions: {}, 
      watch: {
        ignored: ignoredFiles(paths.appSrc),
      },      
    },
    // Use 'ws' instead of 'sockjs-node' on server since we're using native
    // websockets in `webpackHotDevClient`.
    webSocketServer: 'ws',
    devMiddleware: {
      // It is important to tell WebpackDevServer to use the same "publicPath" path as
      // we specified in the webpack config. When homepage is '.', default to serving
      // from the root.
      // remove last slash so user can land on `/test` instead of `/test/`
      publicPath: paths.publicUrlOrPath.slice(0, -1),
    },
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebook/create-react-app/issues/293
    // src/node_modules is not ignored to support absolute imports
    // https://github.com/facebook/create-react-app/issues/1065
    https: getHttpsConfig(),
    host,
    open: ["./"], 
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true,
      index: paths.publicUrlOrPath,
    },
    proxy,
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
          throw new Error('webpack-dev-server is not defined')
      }
  
      if (fs.existsSync(paths.proxySetup)) {
          require(paths.proxySetup)(devServer.app)
      }
  
      middlewares.push(
          evalSourceMapMiddleware(devServer),
          errorOverlayMiddleware(),
          redirectServedPath(paths.publicUrlOrPath),
          noopServiceWorkerMiddleware(paths.publicUrlOrPath)
      )
  
      return middlewares;
    },
  };
};
