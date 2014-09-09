(function() {

  var WARNING_WAIT_TIME = 500;

  var ACCEPTED_UA_LIST = {
    "Chromium": 17,
    "Chrome": 17,
    "Firefox": 10,
    "IE": 9,
    "Safari": 6,
    "Opera": 12
  },

  MOBILE_OS_BLACKLIST = [
    "Android",
    "iOS",
    "BlackBerry",
    "MeeGo",
    "Windows Phone OS",
    "Firefox OS",
    // For BB Playbook
    "RIM Tablet OS"
  ];

  require(["ua-parser", "l10n"],
         function(UAParser, l10n){

    // ua-parser uses the current browsers UA by default
    var ua = new UAParser().getResult(),
        name = ua.browser.name,
        major = ua.browser.major,
        os = ua.os.name,
        acceptedUA = false;

    for (var uaName in ACCEPTED_UA_LIST) {
      if (ACCEPTED_UA_LIST.hasOwnProperty(uaName) && MOBILE_OS_BLACKLIST.indexOf(os) === -1) {
        if (name === uaName) {
          if (+major >= ACCEPTED_UA_LIST[uaName]) {
            acceptedUA = true;
          }
        }
      }
    }

    if ( !acceptedUA ) {
      var warningText = l10n.get("UA_WARNING_TEXT") + " " + l10n.get( "Click to remove warning" );
      var warningDiv = document.createElement("div");
      warningDiv.classList.add("ua-warning");
      warningDiv.innerHTML = warningText;

      setTimeout(function() {
        document.body.appendChild(warningDiv);
      }, WARNING_WAIT_TIME);
      warningDiv.getElementsByClassName("close-button")[0].onclick = function () {
        document.body.removeChild(warningDiv);
      };
    }
  });
}());
