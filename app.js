#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var
bundles = require('./lib/bundles'),
cors = require('cors'),
components = require('./lib/components'),
connectFonts = require('connect-fonts'),
enableRedirects = require('./routes/redirects'),
engine = require('ejs-locals'),
express = require('express'),
fs = require("fs"),
helmet = require('helmet'),
http = require('http'),
i18n = require('webmaker-i18n'),
lessMiddleware = require('less-middleware'),
localeBuild = require('./lib/localeBuild'),
middleware = require('./lib/middleware'),
path = require('path'),
habitat = require('habitat');

habitat.load();

var
env = new habitat(),
postmark = require("postmark")(env.get("POSTMARK_API_KEY")),
uuid = require('node-uuid'),
version = require('./package').version,
emulate_s3 = env.get("S3_EMULATION") || !env.get("S3_KEY"),
WebmakerAuth = require('webmaker-auth');

try {
  // This does a pretty great job at figuring out booleans.
  if (env.get("LAUNCH_STATSD_IN_PROCESS") && !!JSON.parse(env.get("LAUNCH_STATSD_IN_PROCESS"))){
    require('./statsd');
  }
}
catch(e) {
  if (e.name === "SyntaxError"){
    throw("Invalid value for env LAUNCH_STATSD_IN_PROCESS.");
  }
  else{
    throw(e);
  }
}


var os = require('os');
var interfaces = os.networkInterfaces();
var ipv4Address;

['PUBLISH_HOST','ASSET_HOST'].forEach(function (key) {
  if (env.get(key)) {
    if (env.get(key).indexOf('{{ip}}') > -1) {
      if (!ipv4Address) {
        Object.keys(interfaces).forEach(function (device) {
          interfaces[device].forEach(function(details){
            if (details.family === 'IPv4') {
              ipv4Address = details.address;
            }
          });
        });
      }
      env.set(key, env.get(key).replace('{{ip}}', ipv4Address));
    }
    console.log(key + ' set to ' + env.get(key));
  }
  else {
    console.warn('Warning: ' + key + ' is unset. See README.md for more info.');
  }
});

var urls = require('./lib/urls');
var s3Store = require('./lib/s3-store');
var makeAPIPublisher = require('./lib/makeapi-publisher').create(env.get("MAKEAPI_URL"), env.get("MAKEAPI_ID"), env.get("MAKEAPI_SECRET"));

// Cache fonts for 180 days.
var MAX_FONT_AGE_MS = 1000 * 60 * 60 * 24 * 180;

var webmakerAuth = new WebmakerAuth({
  loginURL: env.get("LOGINAPI"),
  authLoginURL: env.get("LOGINAPI_WITH_AUTH"),
  secretKey: env.get("COOKIE_SECRET"),
  forceSSL: env.get("FORCE_SSL"),
  domain: env.get("COOKIE_DOMAIN")
});

var app = express();

app.engine('ejs', engine);

app.configure(function(){
  app.set('port', env.get("PORT") || 3000);

  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(express.logger(function(tokens, req, res) {
    if (res.statusCode >= 400) // or whatever you want logged
      return express.logger.dev(tokens, req, res);
    return null;
  }));

  app.use(express.bodyParser());
  app.use(webmakerAuth.cookieParser());

  app.use(webmakerAuth.cookieSession());

  bundles.configure(app, env.get("BUNDLE"));

  // Setup locales with i18n
  app.use(i18n.middleware({
    supported_languages: ["*"],
    default_lang: "en-US",
    mappings: require("webmaker-locale-mapping"),
    translation_directory: path.resolve( __dirname, "locale" )
  }));

  var authLocaleJSON = require("./public/vendor/webmaker-auth-client/locale/en_US/create-user-form.json");
  i18n.addLocaleObject({
    "en-US": authLocaleJSON
  }, function (result) {});

  app.use(express.favicon());

  if (env.get("HSTS_DISABLED") != 'true') {
    // Use HSTS
    app.use(helmet.hsts());
  }

  if (env.get("DISABLE_XFO_HEADERS_DENY") != 'true') {
    // No xframes allowed
    app.use(helmet.xframe('deny'));
  }

  if (env.get("IEXSS_PROTECTION_DISABLED") != 'true') {
  // Use XSS protection
    app.use(helmet.iexss());
  }

  app.use(function(req, res, next) {
    res.removeHeader("x-powered-by");
    next();
  });

  app.use(express.methodOverride());

  app.use(app.router);

  app.use(connectFonts.setup({
    fonts: [require('connect-fonts-sourcesanspro')],
    allow_origin: env.get("ASSET_HOST"),
    ua: 'all',
    maxage: MAX_FONT_AGE_MS
  }));

  // enable cors for test relevant assets
  app.use("/test_assets/ceci/", cors());
  app.use("/test_assets/ceci/", express.static(path.join(__dirname, 'public', 'ceci')));
  app.use("/test_assets/vendor/", cors());
  app.use("/test_assets/vendor/", express.static(path.join(__dirname, 'public', 'vendor')));

  app.use(lessMiddleware({
    src: __dirname + '/public',
    compress: true
  }));

  app.use('/', cors());
  app.use('/', express.static(path.join(__dirname, 'public')));

  enableRedirects(app);
});

var store;
store = s3Store.init(env.get("S3_KEY"), env.get("S3_SECRET"), env.get("S3_BUCKET"), env.get("S3_DOMAIN"), emulate_s3);

var urlManager = new urls.URLManager(env.get("PUBLISH_HOST_PREFIX"), env.get("PUBLISH_HOST"), env.get("S3_OBJECT_PREFIX"), !emulate_s3);
routes = require('./routes')(
  store,
  __dirname + '/views',
  urlManager,
  require('./lib/mailer')(postmark),
  makeAPIPublisher
);


app.configure('development', function(){
  app.use(express.errorHandler());
  if (!env.get('PERSONA_AUDIENCE')){
    console.log("Setting PERSONA_AUDIENCE to be http://localhost:" + app.get('port'));
    env.set('PERSONA_AUDIENCE', 'http://localhost:' + app.get('port'));
  }
  // Test pages for publish and install
  app.get('/test/install', routes.testInstall);
  app.get('/test/publish', routes.testPublish);
});


require("express-persona")(app, {
  audience: env.get("PERSONA_AUDIENCE")
});


var langmap = i18n.getAllLocaleCodes();

app.locals({
  languages: i18n.getSupportLanguages(),
  locales: Object.keys(langmap),
  langmap: langmap,
  currentPath: ''
});


app.post('/verify', webmakerAuth.handlers.verify);
app.post('/authenticate', webmakerAuth.handlers.authenticate);
app.post('/create', webmakerAuth.handlers.create);
app.post('/logout', webmakerAuth.handlers.logout);
app.post('/check-username', webmakerAuth.handlers.exists);

app.get('/', routes.index);
app.all('/designer', routes.designer);

// remix and publish email notification routes
app.get('/remix', routes.remix);
app.get('/notify', routes.notify);


//TODO: Security: https://github.com/mozilla-appmaker/appmaker/issues/602
app.get('/api/proxy-component-*', cors(), routes.proxy.gitHubComponent);
app.get('/component-*', cors(), routes.proxy.gitHubComponent);
app.get('/component/:org/:component/*', cors(), routes.proxy.component);

env.set("ARTIFICIAL_CORS_DELAY", parseInt(env.get("ARTIFICIAL_CORS_DELAY"), 10));
// if ARTIFICIAL_CORS_DELAY is set, we use a different proxy route
if ((env.get("ARTIFICIAL_CORS_DELAY")) && (env.get("ARTIFICIAL_CORS_DELAY") > 0)){
  // This route is only to test race conditions/loading issues with external resources
  app.get('/cors/:host/*', cors(), routes.proxy.delayedCors);
}
else{
  app.get('/cors/:host/*', cors(), routes.proxy.cors);
}

// This is a route that we use for client-side localization to return the JSON
// when we do the XHR request to this route.
if(env.get("PRODUCTION")) {
  app.get( "/strings/:lang?", middleware.crossOrigin, i18n.stringsRoute( "en-US", { strict: true } ));
} else {
  var basedir = "./public/bundles/components/";
  var componentPaths = fs.readdirSync(basedir);
  componentPaths = componentPaths.filter(function(fileName) {
    return fileName.indexOf("component-") > -1;
  }).map(function(v) {
    return basedir + v;
  });
  componentPaths.push("./locale/en_US/msg.json");
  app.get( "/strings/:lang?", middleware.crossOrigin, i18n.devStringsRoute( "en-US", componentPaths ));
}
app.get( "/components/localization.js", function(req, res) { res.render( "localization/localization" ); });

app.post('/api/publish', routes.publish.publish(app));

// routes for publishing and retrieving components
app.get('/api/component', routes.componentRegistry.components);
app.get('/api/component/:id', routes.componentRegistry.component);
app.post('/api/component', routes.componentRegistry.addComponent);
app.delete('/api/component/:id', routes.componentRegistry.deleteComponent);
app.get('/api/myapps', routes.my.apps);
app.post('/api/save_app', routes.my.saveApp);
app.delete('/api/delete_app', routes.my.deleteApp);
app.get('/api/app', routes.my.app);
app.post('/api/rename_app', routes.my.renameApp);
app.post('/api/update_app', routes.my.updateApp);

app.get('/api/componentlinks', routes.my.components);
app.post('/api/componentlinks', routes.my.learnComponent);
app.delete('/api/componentlinks', routes.my.forgetComponent);

// DEVOPS - Healthcheck
app.get('/healthcheck', function( req, res ) {
  var healthcheckObject = {
    http: 'okay',
    version: version
  };
  res.json(healthcheckObject);
});

app.get('/api/remix-proxy', routes.proxy.remix);

if (env.get("MAKEAPI_URL")) {
  var makeapiSearch = new require('makeapi-client')({
    apiURL: env.get("MAKEAPI_URL")
  });

  app.get('/apps/:user', function (req, res) {
    makeapiSearch
      .contentType('Appmaker')
      .user(req.params.user)
      .limit(50)
      .then(function(err, makes) {
        if (err) {
          res.json({error: err, makes: makes}, 500);
        }
        else {
          res.json({error: null, makes: makes}, 200);
        }
      });

  });
}

module.exports = app;

if (!module.parent) {
  // Load components from various sources

  components.load(env.get("BUNDLE"), env.get("COMPONENT_DIR"), env.get("BUNDLE_MINIFY"), env.get("EXCLUDED_COMPONENTS"), function(components) {
    if(process.platform.indexOf("win") === 0) {
      components = components.map(function(name) {
        return name.replace(/\\/g,'/');
      });
    }
    app.locals.components = components.map(function(v) {
      return v.replace(/public/g,'');
    });
    localeBuild(components, ["en-US"], function(map) {
      i18n.addLocaleObject(map, function(err) {
        if(!err) {
          http.createServer(app).listen(app.get('port'), function(){
            console.log("Express server listening on port " + app.get('port'));
          });
        }
        else{
          console.log(err);
        }
      });
    });
  });
}

// If we're in running in emulated S3 mode, run a mini
// server for serving up the "s3" published content.
if (emulate_s3) {
  require( "mox-server" ).runServer( env.get("MOX_PORT") || 12319 );
}
