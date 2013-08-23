/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(
  ["jquery", "ceci", "ceci-app", "jquery-ui"],
  function($, Ceci) {
    "use strict";

    var selection = [];

    var zIndex = 100;
    function moveToFront(element) {
      element.css('z-index', ++zIndex);
    }

    var app = new Ceci.App({
      container: $('#flathead-app')[0],
      onComponentAdded: function (component) {
        component = $(component);
        if(component.find("input[type=text],textarea,button").length > 0){
          component.on('mouseenter', function () {
            component.append('<div class="handle"></div>')
          })
          .on('mouseleave', function () {
            $('.handle').remove()
          });
        }

        component.on('mousedown', function(evt) {
          selectComponent($(evt.currentTarget));
        });

        selectComponent(component);
      },
      onload: function (components) {
        Object.keys(components).forEach(function (tag) {
          var thumb = $('<div class="clearfix draggable" name="' + tag + '" value="' + tag + '"><div class="thumb" value="' + tag + '">' + tag.replace('app-', '') + '</div></div>');
          $('.library-list').append(thumb);
          thumb.draggable({
            connectToSortable: ".drophere",
            helper: "clone",
            appendTo: document.body,
            start : function(event,ui){
              var clone = ui.helper;
              $(clone).find(".thumb").addClass("im-flying");
            },
            addClass: "clone"
          })
        });
        $('.library-list').removeClass("library-loading");
      }
    });

    function Channel(name, title, hex) {
      // make sure the name is a string
      this.name = String(name);
      this.title = title;
      this.hex = hex;
    }

    var channels = [
      new Channel('blue', 'Blue Moon', '#358CCE'),
      new Channel('red', 'Red Baloon', '#e81e1e'),
      new Channel('pink', 'Pink Heart', '#e3197b'),
      new Channel('purple', 'Purple Horseshoe', '#9f27cf'),
      new Channel('green', 'Green Clover', '#71b806'),
      new Channel('yellow', 'Yellow Pot of Gold', '#e8d71e'),
      new Channel('orange', 'Orange Star', '#ff7b00'),
      //new Channel(Ceci.emptyChannel, 'Disabled', '#444')
    ];


    //TODO: Angular this up
    // generate the channels list (colored clickable boxes) and append to the page
    function getChannelStrip(forAttribute) {
      var strip = $('<div class="colorstrip" id="strip' + (forAttribute ? '-' + forAttribute : '') + '"></div>');

      for (var i in channels) {
        var rdata = channels[i];

        strip.append(
          $('<div class="color '+ rdata.name +'" value="'+ rdata.hex +'" name="'+ rdata.name +'" title="'+ rdata.title +'" style="background-color: '+ rdata.hex +'"></div>')
        );
      }
      return strip;
    }

    var listChannels = function () {
      var strip = getChannelStrip();
      $('.broadcast-options').append(strip);
    }

    // get a Channel object given a channel name
    function getChannelByChannelName(channelName) {
      for (var i in channels) {
        if(channels[i].name === channelName) {
          return channels[i];
        }
      }
      return false;
    }

    // empty the list of currently selected elements on the page
    var clearSelection = function() {
      selection.forEach(function(element) {
        $(document).off("click", ".color", element.onSelectFunction);
      });
      selection = [];
      $(".selected").removeClass("selected");
      $(".inspector").addClass('hidden');
    }

    // jQuery-UI property for reordering items in the designer
    function enableReorder() {
      return $(".phone-canvas,.fixed-top,.fixed-bottom").disableSelection().sortable({
        connectWith: ".drophere",
        placeholder: "ui-state-highlight",
        start : function(){ $(".phone-container").addClass("dragging")},
        stop : function(){ $(".phone-container").removeClass("dragging")}
      });
      return $(".phone-canvas,.fixed-top,.fixed-bottom").sortable("enable");
    }

    var disableReorder = function() {
      return $(".phone-canvas,.fixed-top,.fixed-bottom").sortable("disable");
    }

    listChannels();
    clearSelection();
    enableReorder();

    $(document).on('click', '.container', function (evt) {
      if ($(evt.target).hasClass('container')) {
        clearSelection();
      }
    });

    // document-level key handling
    $(document).on('keydown', function(event) {
      // escape hides all modal dialogs
      if (event.which === 27) {
        $('.color-modal').removeClass('flex');
        // and clears the selection non-destructively
        clearSelection();
      }
      // delete removes all selected items.
      else if (event.which === 46) {
        var elements = selection.slice();
        clearSelection();
        elements.forEach(function(element) {
          element.removeSafely();
        });
      }
    });

    var displayBroadcastChannel = function (channelName) {
      var rdata = getChannelByChannelName(channelName);
      if(!rdata) {
        rdata = getChannelByChannelName(Ceci.emptyChannel);
      }
      $('.inspector .broadcast-channel')
          .text(rdata.title)
          .css({'color': rdata.hex, 'border-color': rdata.hex});
    };

    var getPotentialListeners = function(element) {
      return element.subscriptionListeners.map(function(listener) {
        var subscription;
        element.subscriptions.forEach(function(s) {
          if(s.listener === listener) {
            subscription = s;
          }
        });
        if(!subscription) {
          subscription = {
            channel: Ceci.emptyChannel,
            listener: listener
          };
        }
        return subscription;
      });
    };

    var displayListenChannels = function (potentialListeners) {
      var lc = $('.inspector .listen-channel'),
          attrBar,
          attribute;
      lc.html("");

      potentialListeners.forEach(function(pair) {
        var rdata = getChannelByChannelName(pair.channel);
        var attrBar = $('<div class="listener' + (pair.channel === Ceci.emptyChannel ? ' custom':'') + '"></div>');
        // listening function name
        attrBar.append('<span class="channel-listener">' + pair.listener + '</span>');
        // color strip
        attribute = $('<span class="channel-label"></span>')
          .text(rdata.title)
          .css({'color': rdata.hex, 'border-color': rdata.hex});
        attrBar.append(attribute);
        attrBar.append(getChannelStrip(pair.listener));
        lc.append(attrBar);
      });
    };

    var getAttributeUIElement = function(element, attributeName, definition) {
      var value = element.getAttribute(attributeName);
      value = value !== null ? value : '';

      switch(definition.type) {
        case "text": return (function() {
                        // TODO: This would be a fine place for angular
                        var e = $("<div><label>" +
                          definition.title +
                          "</label><input type=\"text\" value=\"" +
                          value +
                          "\"></input></div>"
                        );

                        e.on("change", function(evt) {
                          element.setAttribute(attributeName, evt.target.value);
                        });
                        return e[0];
                      });
        case "number": return (function() {
                        // TODO: This would be a fine place for angular
                        var e = $(
                          "<div><label>" +
                          definition.title +
                          "</label><input type=\"number\" min=\"" +
                          definition.min +
                          "\" max=\"" +
                          definition.max +
                          "\" value=\"" +
                          value + "\" /></div>"
                        );
                        e.on("change", function(evt) {
                          element.setAttribute(attributeName, evt.target.value);
                        });
                        return e[0];
                      });
        case "boolean": return (function() {
                        // TODO: This would be a fine place for angular
                        var e = $(
                          "<div><label>" +
                          definition.title +
                          "</label><input type=\"checkbox\" " +
                          (value == "true" ? " checked=\"true\" " : "") + "\" value=\"" +
                          value + "\" /></div>"
                        );
                        e.on("change", function(evt) {
                          evt.target.value = evt.target.value == "true" ? "false" : "true";
                          element.setAttribute(attributeName, evt.target.value == "true" ? true : false);
                        });
                        return e[0];
                      });

      }
      return $("<span>"+definition.type+" not implemented yet</span>");
    };

    var displayAttributes = function(element) {
      $('.inspector .editables').html("");
      if (element.getEditableAttributes().length > 0) {
        $('.editables-section').show();
      } else {
        $('.editables-section').hide();
      }
      var attributes = element.getEditableAttributes();
      var attributeList = $("<div class='editable-attributes'></div>");

      attributes.forEach(function(attribute) {
        var definition = element.getAttributeDefinition(attribute);
        var uiElement = getAttributeUIElement(element, attribute, definition);
        attributeList.append(uiElement);
      });
      $('.inspector .editables').append(attributeList);
    };

    var selectComponent = function(comp) {
      clearSelection();
      var element = comp[0];
      var compId = element.id
      selection.push(element);
      comp.addClass("selected");
      moveToFront(comp);

      $('.description').text('')
      if ('description' in element) {
        var description = element.description.innerHTML
        $('.description').text(description)
      }

      //Show connectable listeners
      if(getPotentialListeners(element).length > 0) {
        $('.listen-section').show();
      } else {
        $('.listen-section').hide();
      }
      displayListenChannels(getPotentialListeners(element));

      //temp code to show broadcasts
      if(element.broadcastChannel !== Ceci.emptyChannel) {
        $('.broadcast-section').show()
      } else {
        $('.broadcast-section').hide()
      }

      //Show broadcast channel
      var currentBroadcast = element.broadcastChannel;
      displayBroadcastChannel(currentBroadcast);

      //Show editable attributes
      displayAttributes(element);

      //Changes component channel
      var onSelectFunction = function () {
        var comp = $(this);
        var channel = {
          hex: comp.attr('value'),
          name: comp.attr('name'),
          title: comp.attr('title')
        };

        // change broadcast "color"
        if (comp.parents().hasClass('broadcast-options')) {
          element.setBroadcastChannel(channel.name);
          displayBroadcastChannel(channel.name);
        }

        // change listening "color"
        else {
          var attribute = comp.parent().attr("id").replace("strip-",'');
          if(attribute) {
            element.setSubscription(channel.name, attribute);
            displayListenChannels(getPotentialListeners(element));
          }
        }
      };

      // listen for color clicks
      $(document).on('click', '.color', onSelectFunction);

      // give the element the function we just added, so we
      // can unbind it when the element gets unselected.
      element.onSelectFunction = onSelectFunction;

      var componentName = element.tagName.toLowerCase();
      $(".inspector .name").text(componentName);
      $(".inspector").removeClass('hidden');
    }

    // logs messages
    $(document).on('broadcast', function (event, message) {
      var log = $('.log .inner p').append('<div>' + message + '</div>');
      var scroll = $(".scroll")[0];
      scroll.scrollTop = scroll.scrollHeight;
    });

    // this options object makes components drag/droppable when passed
    // to the jQueryUI "sortable" function.
    var sortableOptions = {
      accept: '.draggable',
      receive: function (event, ui) {
        if (ui.helper) {
          var helper = $(ui.helper);

          app.addComponent(helper.attr('value'), function(component){
            component = $(component);

            var dropTarget = $(".drophere").find(".draggable");
            dropTarget.replaceWith(component);

            component.draggable({
              handle: 'handle'
            })

            $('.thumb[name='+component.id+']').not(ui.helper).draggable( "disable" ).removeClass('draggable');
          });
        }
      }
    };

    $('.drophere').sortable(sortableOptions);

    var createCard = function() {
      // create real card
      var card = Ceci.createCard();

      $('.drophere', card).sortable(sortableOptions);
      $('#flathead-app').append(card);
      card.showCard();
      enableReorder();

      // create card thumbnail
      var newthumb = $('<div class="card">' + ($(".card").length + 1) + '</div>');
      newthumb.click(function() {
        card.showCard();
      });
      $(".cards").append(newthumb);
    };

    $(".cards .btn-add").click(createCard);

    // create first card as a default card
    createCard();

    $('.publish').click(function(){
      var htmlData = $('.phone-canvas')[0].outerHTML;
      $.ajax('/publish', {
        data: { html: htmlData },
        type: 'post',
        success: function (data) {
          $('.publish-url').html(data.filename);
          $('.publish-url').attr('href', data.filename);
        },
        error: function (data) {
          console.error('Error while publishing content:');
          console.error(data);
        }
      });
    });
  }
);
