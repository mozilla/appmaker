/**
 * Test script for automated bundling using vulcanize
 */

var fs = require("fs"),
    vulcanize = require("vulcanize"),
    __base__ = "public/bundles/";

/**
 * Vulcanize a single component, in a bit of a wonky way
 * because vulcanize was not written as a pipe utility,
 * but a file consume/writing utility.
 */
function vulcanizeComponent(componentName, callback) {
  var __temp__output__ = componentName + ".vulcan";
	vulcanize.setOptions({
		input: __base__ + componentName + "/component.html",
		inline: true,
		output: __temp__output__
	}, function() {
		vulcanize.processDocument();
		var data = fs.readFileSync(__temp__output__);
		fs.unlink(__temp__output__);
		data = data.toString();
		callback(data);
	});
}

/**
 * When all components have been vulcanised, we can
 * do all sorts of cool stuff! Instead we just write
 * it to a file in the bundles dir.
 */
function processAggregate(data, outputFile, whenDone) {
  var output = __base__ + outputFile;
  fs.writeFileSync(output, data, "utf8");
  fs.readFile(output, function(err, data) {
    whenDone(err, data.toString());
  });
}

/**
 * Run through all the components that are currently part
 * of our bundle, and vulcanize them one by one.
 */
module.exports = {
  vulcanize: function(outputFile, whenDone) {
    fs.readdir(__base__, function(err, files) {
      var aggregate = "";
      (function next() {
        if(files.length === 0) {
          return setTimeout(function() {
            processAggregate(aggregate, outputFile, whenDone);
          }, 1);
        }
        var componentName = files.pop();
        if (!fs.statSync(__base__ + componentName).isDirectory()) {
          return next();
        }
        vulcanizeComponent(componentName, function(vulcanized) {
          aggregate += vulcanized;
          next();
        });
      }());
    });
  }
};
