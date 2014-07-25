var async = require('async');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

module.exports = function (components, locales, callback) {
  var globalMap = {};
  var paths = [];
  var counter = 0;
  var success = 0;

  components.forEach(function (component) {
    var componentMatch = component.match("/components/.*");
    locales.forEach(function (locale) {
      globalMap[locale] = {};
      if (componentMatch) {
        paths.push([componentMatch, locale]);
      }
    });
  });

  function iterator(where, done) {
  	counter++;
    var options = {};
    var component = where[0];
    var locale = where[1];
    if (component) {

      var componentPath = component.input.replace('/components', process.env.COMPONENTS_DIR).replace('/component.html', '');
      componentPath = path.normalize(path.join(componentPath, "locale", locale + '.json'));
      fs.exists(componentPath, function (result) {
        if (result) {
          fs.readFile(componentPath, 'utf8', function (err, localeData) {
            try {
              _.extend(globalMap[locale], JSON.parse(localeData));
              success++;
            } catch (e) {
              console.error(e);
            }
            done(null, null);
          });
        }
        else {
          done(null, null);
        }
      });

    }
  };

  async.map(paths, iterator, function (err, results) {
    if (err) {
      console.log(err);
    } else {
      console.log(counter + ' locale files requested and ' + success + ' object added successfully');
    }
    callback(globalMap);
  });
};
