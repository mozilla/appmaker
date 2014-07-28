/**
 * Bundle all the appmaker components (including .css and .js)
 * into a single file, and minify it.
 */
var fs = require("fs"),
    vulcan = require("./vulcanize"),
    bundleName = "components/mozilla-appmaker.html",
    htmlMinifier = require('html-minifier');

vulcan.vulcanize(bundleName, function(err, data) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  var bundleSize = data.length;
  console.log("Finished bundling components to ./public/bundles/"+bundleName+" ("+bundleSize+" bytes).");

  var minified = htmlMinifier.minify(data, {
    removeComments: true,
    removeCDATASectionsFromCDATA: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeAttributeQuotes: true,
    useShortDoctype: true,
    minifyJS: {
      // no explicit options for now
    },
    minifyCSS: {
      // no explicit options for now
    }
  });

  var minSize = minified.length;
  bundleName = bundleName.replace('.html','-min.html');
  fs.writeFile("./public/bundles/"+bundleName, minified, "utf8", function(err, result) {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log("Finished minification to ./public/bundles/"+bundleName+" ("+minSize+" bytes).");
    var perc = minSize*100/bundleSize;
    perc = ((10*perc)|0) / 10;
    console.log("Minified to " + perc + "% size of original (" + (bundleSize-minSize) + " byte reduction).");
  });
});
