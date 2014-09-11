/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var fs = require('fs');
var path = require('path');

var EXCLUDED_COMPONENTS = [];

function isComponentExcluded(componentDirName) {
  return EXCLUDED_COMPONENTS.indexOf(componentDirName) > -1;
}

// note that components must live in public/bundles -- this is non-negotiable.
function addLocalComponents(componentDir, exclude) {
  if (exclude) {
    EXCLUDED_COMPONENTS = exclude.split(",");
  }
  components = fs.readdirSync(componentDir).filter(function(dirName) {
    return (dirName.indexOf("component-") > -1) && !isComponentExcluded(dirName);
  }).map(function(dirName) {
    return path.join(componentDir, dirName, 'component.html');
  }).filter(function(fileName) {
    return fs.existsSync(fileName);
  });
  return components;
}

module.exports = {
  load: function(bundle, componentDir, minify, exclude, callback) {
    var components = addLocalComponents(componentDir, exclude);
    if(!!bundle) {
      // simply automatically redo bundling at startup.
      require("./bundle-components").load(componentDir, minify);
    }
    console.log("Loaded " + components.length + " local components from ./public/bundles");
    callback(components);
  }
};
