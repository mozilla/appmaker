/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var fs = require('fs');
var path = require('path');

var EXCLUDED_COMPONENTS = [];
if (process.env.EXCLUDED_COMPONENTS) {
  EXCLUDED_COMPONENTS = process.env.EXCLUDED_COMPONENTS.split(",");
}

function isComponentExcluded(repoOrFolderName) {
  return EXCLUDED_COMPONENTS.indexOf(repoOrFolderName) > -1;
}

function getUrlFromName(name){
  return '/components/' + name + '/component.html';
}

function unique(array){
  return array.slice().filter(function(v,i) {
    return array.indexOf(v) === i;
  });
};


function addLocalComponents(componentsDir) {
  if (!componentsDir) {
    return [];
  }
  components = fs.readdirSync(componentsDir).filter(function(dirName) {
    if (isComponentExcluded(dirName)) {
      return false;
    }
    return fs.existsSync(path.join(componentsDir, dirName, 'component.html'));
  }).map(function(dirName) {
    return getUrlFromName(dirName);
  });
  return components;
}


module.exports = {
  load: function(callback){
    var components = addLocalComponents(process.env.COMPONENTS_DIR);
    console.log("Loaded " + components.length + " local components from \"" + process.env.COMPONENTS_DIR + "\"");
    callback(unique(components));
  }
};
