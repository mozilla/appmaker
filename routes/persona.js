/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var https = require('https'),
  url = require('url');

exports.index = function(req, res){
  var verifierOpts = {
    host: "verifier.login.persona.org",
    path: "/verify",
    method: "POST"
  };

  var verifyResponse = function(error, req, res, email) {
    var out;
    if (error) {
      out = { status: "failure", reason: error };
    } else {
      out = { status: "okay", email: email };
    }
    res.json(out);
  }

  var vreq = https.request(verifierOpts, function(verifierRes) {
   var body = '';

    verifierRes.on('error', function(error) {
      verifyResponse('Server-side exception', req, res);
    });

    verifierRes.on('data', function(chunk) {
      body = body + chunk;
    });

    verifierRes.on('end', function() {
      try {
        var response = JSON.parse(body),
          valid = response && response.status === "okay";

        if (valid) {
          if (req.session) {
            req.session['email'] = response.email;
          }

          verifyResponse(null, req, res, response.email);
        } else {
          verifyResponse(response.reason, req, res);
        }

      } catch (e) {
        verifyResponse("Server-side exception", req, res);
      }
    });
  });

  // SSL validation can fail, which will be thrown here
  vreq.on("error", function(error) {
    verifyResponse("Server-side exception", req, res);
  });
  vreq.setHeader("Content-Type", "application/json");

  var audience = req.headers['host'] ? req.headers['host'] : process.env.HOST;
  var data = JSON.stringify({
    assertion: req.body.assertion,
    audience: audience
  });

  vreq.setHeader('Content-Length', data.length);
  vreq.write(data);
  vreq.end();

  console.log("Verifying assertion!");
};

