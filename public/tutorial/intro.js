define(
  [ "jquery",
    "ejs",
    "l10n",
    "tutorial/index",
    "text!tutorial/intro.ejs"
  ],
  function ($, Ejs, l10n, Tutorial, content) {

    content = Ejs.render(content, {
      gettext: l10n.get
    });
    var $content = $(content);
    $content.find('[data-controls]').remove().appendTo($content.find('[data-step]:not(:last-child)'));

    function matchTarget(offset, elements) {
      $(this).css({
        width: elements.target.width,
        height: elements.target.height,
        left: elements.target.left,
        top: elements.target.top,
        'box-sizing': 'border-box'
      });
    }

    var Intro = function() {
      return new Tutorial([
        {
          name: "welcome",
          position: {
            my: "center",
            at: "center",
            of: document.querySelector('ceci-app'),
            using: matchTarget
          }
        },
        {
          name: "bricks",
          position: {
            my: "left center",
            at: "right+20 center",
            of: $('#components')
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-left"
        },
        {
          name: "customize",
          position: {
            my: "right top",
            at: "left-20 top+50",
            of: $('.right-column')
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-right",
          init: function() {
            var app = document.querySelector('ceci-app');
            this.button = app.addComponentToCard('ceci-button', {append: true});
          },
          destroy: function() {
            $(this.button).remove();
          }
        },
        {
          name: "project-settings",
          position: {
            my: "right top",
            at: "left-20 top+50",
            of: $('.right-column')
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-right",
          init: function() {
            var tab = "project-settings";
            // From designer/js/modes.js changeEditableTab()
            // FIXME: expose this method in modes.js and use it here
            $(".tray-tabs").find("a").removeClass("selected-tab");
            $(".tray-tabs [tab='"+tab+"']").addClass("selected-tab");
            $(".tab-sections .section").hide();
            $(".tab-sections .section-" + tab).show();
            $(".tab-sections .section-" + tab + " textarea").focus();
          }
        },
        {
          name: "pages",
          position: {
            my: "center top",
            at: "center bottom+20",
            of: $('.add-card')
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-top",
        },
        {
          name: "channels",
          position: {
            my: "right center",
            at: "left-175 top+37",
            of: $("ceci-app")
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-right",
          init: function() {
            var app = document.querySelector('ceci-app');
            this.hands = app.addComponentToCard('ceci-jazzhands', {append: true});
            this.button = app.addComponentToCard('ceci-button', {append: true});
          }
        },
        {
          name: "colors",
          position: {
            my: "right center",
            at: "left-175 top+168",
            of: $("ceci-app")
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-right",
          init: function() {
            var app = document.querySelector('ceci-app');
            this.drum = app.addComponentToCard('ceci-kickdrum', {append: true});
            this.button2 = app.addComponentToCard('ceci-button', {append: true});
            setTimeout(function() {
              $('ceci-kickdrum ceci-channel-menu[channeltype="listen"]')[0].toggleMenu();
            }, 100);
          }
         },
         {
          name: "switch",
          position: {
            my: "right center",
            at: "left-175 top+168",
            of: $("ceci-app")
          },
          dialogClass: "tutorial-dialog-arrow tutorial-dialog-arrow-right",
          destroy: function() {
            $(this.button).remove();
            $(this.hands).remove();
            $(this.button2).remove();
            $(this.drum).remove();
          }
        },
        {
          name: "end",
          position: {
            my: "center",
            at: "center",
            of: document.querySelector('ceci-app'),
            using: matchTarget
          },
          init: function() {
            var _this = this;
            setTimeout(function() {
              $(document).one("click", function () {
                _this.next();
              });
            }, 0);
          }
        }
      ], $content);
    }

    return Intro;
  }
);
