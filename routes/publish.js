/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var knox = require('knox');
var moniker = require('moniker');
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var lynx = require('lynx');
var metrics = new lynx('localhost', 8125);
var dbModels = require('../lib/db-models');

module.exports = function (store, viewsPath, urlManager, makeAPIPublisher, dbconn) {
  var Component = dbModels.get('Component');

  var templates = {
    publish: null,
    install: null
  };

  fs.readFile(viewsPath + '/publish.ejs', 'utf8', function (err, publishHTMLData) {
    templates.publish = ejs.compile(publishHTMLData, {
      // for partial include access
      filename: viewsPath + '/publish.ejs'
    });
  });

  fs.readFile(viewsPath + '/install.ejs', 'utf8', function (err, installHTMLData) {
    templates.install = ejs.compile(installHTMLData, {
      // for partial include access
      filename: viewsPath + '/publish.ejs'
    });
  });

  function getUserComponents (req, callback) {
    if (! req.session.email) {
      console.error('Need to be signed in to retrieve components.');
      callback([]);
      return;
    }
    Component.find({author: req.session.email}, function (err, components) {
      if (err){
        console.error('Unable to retrieve components.');
        callback([]);
        return;
      }
      callback(components.map(function (c) {
        return c.url;
      }));
    });
  }

  return {
    publish: function(app) {
      return function(req, res) {
        var inputData = req.body;
        var manifest = inputData.manifest || {};

        var requestHTML = inputData.html;
        var appName = inputData.name;

        var installHTMLFilename =  'install.html';
        var appHTMLFilename = 'index.html';
        var manifestFilename = 'manifest.webapp';

        var remoteURLPrefix = urlManager.createURLPrefix(appName);

        var remoteURLs = {
          install: remoteURLPrefix + installHTMLFilename,
          app: remoteURLPrefix + appHTMLFilename,
          manifest: remoteURLPrefix + manifestFilename
        };

        function cleanString (str, removeQuotes) {
          str = str.replace(/>/g, '&gt;').replace(/</g, '&lt;');
          if (removeQuotes) {
            str = str.replace(/'/g, '').replace(/"/g, '')
          }
          return str;
        }

        // core appmaker components
        var coreComponents = app.locals.components;
        var appComponents = [
          //... mine the requestHTML for these? ...
        ];

        getUserComponents(req, function (userComponents) {

          var appStr = templates.publish({
            appHTML: requestHTML,
            folderName: appName,
            appName: appName,
            gettext: req.gettext,
            ceciComponentURL: process.env.ASSET_HOST,
            remixURL: encodeURIComponent(encodeURIComponent(remoteURLs.app)),
            bundles: app.locals.bundles,
            components: coreComponents.concat(appComponents),
            userComponents: userComponents
          });

          var installStr = templates.install({
            iframeSrc: remoteURLs.app,
            manifestUrl: remoteURLs.manifest,
            gettext: req.gettext
          });

          var manifestJSON = {
            "name": 'My App - ' + appName,
            "description": 'My App - ' + appName,
            "launch_path": '/index.html',
            "developer": {
              "name": "Flathead",
              "url": "https://appmaker.mozillalabs.com/"
            },
            "icons": {
              "60": "/style/icons/icon-60.png",
              "79": "/style/icons/icon-79.png"
            },
            "default_locale": "en"
          };

          var outputFiles = [
            {filename: urlManager.objectPrefix + '/' + appName + '/' + manifestFilename,
              data: JSON.stringify(manifestJSON),
              // According to https://developer.mozilla.org/en-US/docs/Web/Apps/Manifest#Serving_manifests
              contentType: 'application/x-web-app-manifest+json'},
            {filename: urlManager.objectPrefix + '/' + appName + '/' + appHTMLFilename,
              data: appStr},
            {filename: urlManager.objectPrefix + '/' + appName + '/' + installHTMLFilename,
              data: installStr}
          ];

          var filesDone = 0;

          outputFiles.forEach(function (description) {
            store.write(description.filename, description.data, function (result) {
              if (200 !== result.statusCode) {
                console.error('Trouble writing ' + description.filename + ' to S3 (' + result.statusCode + ').');
              }
              if (++filesDone === outputFiles.length) {
                res.json({error: null,
                  app: remoteURLs.app,
                  install: remoteURLs.install,
                  manifest: remoteURLs.manifest
                }, 200);

                // Don't wait for the MakeAPI to deliver url to user
                makeAPIPublisher.publish({
                  url: remoteURLs.install,
                  remix: remoteURLs.app,
                  thumbnail: 'http://appmaker.mozillalabs.com/images/mail-man.png',
                  tags: ['appmaker'],
                  description: 'Appmaker ' + appName,
                  title: 'Appmaker ' + appName,
                  email: req.session.email
                }, function (err, make) {
                  if (err) {
                    console.error(err);
                  }
                });
              }
            }, description.contentType);
          });
          metrics.increment('appmaker.live.app_published');
        });
      };
    }
  };
};
