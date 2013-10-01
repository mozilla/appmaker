/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(
  ["jquery", "ceci-app", "ceci", "inflector", "ceci-ui", "jquery-ui"],
  function($, App, Ceci, Inflector) {
    "use strict";

    var selection = [];

    var app;

    function init () {
      app = new Ceci.App({
        container: $('#flathead-app')[0],
        onComponentAdded: function (component) {
          component = $(component);

          var dropTarget = $(".drophere").find(".draggable");
          dropTarget.replaceWith(component);

          component.addClass("component");
          component.draggable({
            handle: 'handle'
          });

          component.on('mousedown', function(evt) {
            selectComponent($(evt.currentTarget));
          });

          component.append($('<div class="handle"></div>'));

          selectComponent(component);
        },
        onload: function (components) {
          this.sortComponents();
          Ceci.registerCeciPlugin("onChange", function(){
            if (saveTimer) {
              clearTimeout(saveTimer);
            }
            saveTimer = setTimeout(saveApp, 500);
          });
          document.addEventListener("onselectionchanged", app.sortComponents);

          $('.library-list').removeClass("library-loading");
          $('.drophere').sortable(sortableOptions);
        },
        onCardChange: function (card) {
          var thumbId = "card-thumb-" + card.id.match(/(\d+)$/)[0];
          $(".card").removeClass('selected');
          $("#" + thumbId).addClass('selected');
        },
        onCardAdded: function (card) {
          Array.prototype.forEach.call(card.children, function (element) {
            element.classList.add('drophere');
          });

          // create card thumbnail
          var cardNumber = $(".card").length + 1;
          var newthumb = $('<div class="card">Card ' + cardNumber + '</div>');
          newthumb.attr('id', "card-thumb-" + cardNumber);
          newthumb.click(function() {
            card.show();
          });
          $(".cards").append(newthumb);
          $('.drophere').sortable(sortableOptions);
          card.show();
        }
      });

      app.sortComponents = function() {
        var components = Ceci._components;
        var sortedComponentNames = Object.keys(components);
        sortedComponentNames.sort();
        var fullList = $('.library-list');
        fullList.html('');
        fullList.append('<div class="suggested-components heading">Suggested</div>');
        var suggestionCount = 0;

        var suggestions = [];
        var suggestors =  [];
        var friends = [];
        var component;
        var i,j;
        for (i=0; i < selection.length; i++) {
          suggestors.push(selection[i].localName);
        }
        for (i=0; i < suggestors.length; i++) {
          component = suggestors[i];
          friends = components[component].friends;
          if (friends) {
            for (j=0; j<friends.length; j++) {
              suggestions.push(friends[j]);
            }
          }
        }
        var card = Ceci.currentCard;
        for (i=0; i < card.elements.length; i++) {
          component = card.elements[i];
          friends = component.friends;
          if (friends) {
            for (j=0; j<friends.length; j++) {
              suggestions.push(friends[j]);
            }
          }
        }
        /* these are what we suggest with a blank app */
        // suggestions.push('app-fireworks');
        // suggestions.push('app-button');
        var alreadyMadeSuggestions = {};
        var suggestion;
        for (i = 0; i < Math.min(10, suggestions.length); i++) {
          suggestion = suggestions[i];
          if (suggestion in alreadyMadeSuggestions) continue;
          addThumb(components[suggestion], suggestion, fullList);
          alreadyMadeSuggestions[suggestion] = true;
        }
        fullList.append('<div class="lb"></div>');
        sortedComponentNames.forEach(function (name) {
          addThumb(components[name], name, fullList);
        });
      };
    }

    Ceci.registerCeciPlugin('onElementRemoved', function(element){
      $(document).off("click", ".color-ui .color", element.onColorSelectFunction);
    });

    if (window.location.search.length > 0) {
      var match = window.location.search.match(/[?&]template=([\w-_\.]+)/);
      if (match[1]) {
        $.get('/templates/' + match[1] + '.html',
          function (data) {
            var tmpContainer = document.createElement('div');
            tmpContainer.innerHTML = data;
            $('#flathead-app').html(tmpContainer.querySelector('#flathead-app').innerHTML);
            init();
          }).fail(function () {
            init();
          });
      }
    }
    else if (localStorage.draft){
      $('#flathead-app').html(localStorage.draft);
      init();
    }

    var saveTimer = null;

    function convertHex(hex,opacity){
      hex = hex.replace('#','');
      if (hex.length == 3) {
        hex = hex[0]+hex[0] + hex[1]+hex[1]+hex[2]+hex[2];
      }
      var r = parseInt(hex.substring(0,2), 16);
      var g = parseInt(hex.substring(2,4), 16);
      var b = parseInt(hex.substring(4,6), 16);

      var result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
      return result;
    }

    var zIndex = 100;
    function moveToFront(element) {
      element.css('z-index', ++zIndex);
    }

    // these options object makes components drag/droppable when passed
    // to the jQueryUI "sortable" function.
    var sortableOptions = {
      accept: '.draggable',
      distance : 10,
      tolerance : "pointer",
      connectWith: ".drophere",
      placeholder: "ui-state-highlight",
      handle : ".handle",
      start : function() { $(".phone-container").addClass("dragging"); },
      stop : function() { $(".phone-container").removeClass("dragging"); },
      receive: function (event, ui) {
        if (ui.helper) {
          var helper = $(ui.helper);
          app.addComponent(helper.attr('value'));
        }
      }
    };

    function addThumb(component, name, list) {
      var previewContent;
      var preview = component.thumbnail;
      if(! preview){
        previewContent = '<div class="missing-image">?</div>';
      } else {
        previewContent = preview.innerHTML;
      }
      var thumb = $('<div class="preview"><div class="flipper"><div class="front"><div class="preview-icon">'+ previewContent +'</div><div class="thumb" value="' + name + '">' + name.replace('app-', '') + '</div></div><div class="back"><div class="draggable" name="' + name + '" value="' + name + '"><div class="preview-icon">'+ previewContent +'</div><div class="thumb" value="' + name + '">' + name.replace('app-', '') + '</div><div class="component-instruction">Drag Me</div></div></div></div></div>');
      list.append(thumb);
      $('.draggable').draggable({
        connectToSortable: ".drophere",
        helper: "clone",
        appendTo: document.body,
        start: function(event, ui){
          var clone = ui.helper;
          $(clone).removeClass("back");
        },
        addClass: "clone"
      });
      
      if (component && component.description) {
        var componentDescription = component.description.innerHTML;
        thumb.attr('description', componentDescription);
      } else {
        thumb.attr('description', 'No description');
      }
    }

    var saveApp = function(){
      localStorage.draft = app.serialize();

      var now = new Date();
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var seconds = now.getSeconds();
      hours = (hours < 10) ? "0" + hours : hours;
      minutes = (minutes < 10) ? "0" + minutes : minutes;
      seconds = (seconds < 10) ? "0" + seconds : seconds;

      now = hours + ':' + minutes + ":" + seconds;

      $('.note').show();
      $('#time').text(now);

      console.log('Draft saved:', now);
    };

    $('#add-card').click(function(){
      app.addCard();
    });

    $(document).on('mouseenter', '.draggable', function () {
      $(this).children('.info-btn').show();
    }).on('mouseleave', '.draggable', function () {
      $(this).children('.info-btn').hide();
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
      new Channel(Ceci.emptyChannel, 'Disabled', '#444')
    ];

    //TODO: Angular this up
    // generate the channels list (colored clickable boxes) and append to the page
    function getChannelStrip(forAttribute) {
      var strip = $('<div class="colorstrip" id="strip-' + forAttribute + '"></div>');

      for (var i in channels) {
        var rdata = channels[i];

        strip.append(
          $('<div class="colorChoice '+ rdata.name +'" value="'+ rdata.hex +'" name="'+ rdata.name +'" title="'+ rdata.title +'" style="background-color: '+ rdata.hex +'"></div>')
        );
      }
      return strip;
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
      selection = [];
      $(".editable-section").hide();
      $(".phone-container .selected").removeClass("selected");
      $(".inspector").addClass('hidden');
      var event = new Event('onselectionchanged');
      document.dispatchEvent(event);
    };

    var disableReorder = function() {
      $(".phone-canvas,.fixed-top,.fixed-bottom").sortable("disable");
    };

    clearSelection();

    $(document).on('click', '.container', function (evt) {
      if ($(evt.target).hasClass('container')) {
      clearSelection();
      }
    });

    // document-level key handling
    $(document).unbind('keydown').bind('keydown', function(event) {
      var keys = {
        esc: 27,
        del: 46,
        backspace: 8
      };

      switch (event.which) {
        case (keys.esc):
          // escape hides all modal dialogs
          $('.color-modal').removeClass('flex');
          // and clears the selection non-destructively
          clearSelection();
          break;

        // delete removes all selected items.
        case (keys.del):
          var elements = selection.slice();
          clearSelection();
          elements.forEach(function(element) {
            element.removeSafely();
          });
          break;

        case (keys.backspace):
          // Cancel "back" navigation
          if (event.target.tagName.toLowerCase() === 'body'){
            event.preventDefault();
          }
      }
    });

    $(document).on("mousedown",'.delete-btn',function () {
      if(confirm("Delete this component?")){
        var elements = selection.slice();
        clearSelection();
        elements.forEach(function(element) {
          element.removeSafely();
        });
      }
    });

    var displayBroadcastChannel = function () {
      var bo = $(".broadcast-options");
      bo.html("");
      var strip = getChannelStrip("broadcast");
      bo.append(strip);
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

    var displayListenChannel = function (attribute) {
      var lo = $(".listen-options");
      lo.html("");
      var strip = getChannelStrip(attribute);
      lo.append(strip);
    };

    var getAttributeUIElement = function(element, attributeName, definition) {
      var value = element.getAttribute(attributeName);
      value = value !== null ? value : '';

      var title = Inflector.titleize(Inflector.underscore(attributeName));

      switch(definition.type) {
      case "multiple": return (function() {
                      var options = JSON.parse(value);
                      var e = $("<div>" +
                        "<label>"+title + "</label>" +
                        "<div class=\"option-list\"></div>" +
                        "</div>"
                      );

                      for (var key in options) {
                        e.find(".option-list").append("<input type=\"text\" value=\"" +options[key]+"\" />");
                      }

                      var add = $("<a class=\"add\" href=\"#\">Add Another</a>");
                      e.append(add);

                      e.on("click",".add", function(){
                        e.find(".option-list").append("<input type=\"text\" value=\"\" />");
                      });

                      e.on("keyup", function(evt) {
                        var options = [];
                        e.find("input").each(function(){
                          options.push($(this).val());
                        });
                        element.setAttribute(attributeName, JSON.stringify(options));
                      });
                      return e[0];
                    });
        case "select": return (function() {
                      var e = $("<div><label>" +
                        title +
                        "</label><select type=\"text\" value=\"" +
                        value +
                        "\"> "+
                        "</select></div>"
                      );
                      $(definition.options).each(function(i,k){
                        var option = document.createElement("option");                      
                        $(option).attr("value",k);
                        $(option).text(k);
                        e.find("select").append(option);
                      });
                      e.find("select").val(value);
                      e.on("change", function(evt) {
                        element.setAttribute(attributeName, evt.target.value);
                        console.log(evt.target.value);
                      });
                      return e[0];
                    });
        case "text": return (function() {
                        // TODO: This would be a fine place for angular
                        var e = $("<div><label>" +
                          title +
                          "</label><input type=\"text\" value=\"" +
                          value +
                          "\"></input></div>"
                        );
                        e.on("keyup", function(evt) {
                          element.setAttribute(attributeName, evt.target.value);
                        });
                        return e[0];
                      });
        case "number": return (function() {
                        // TODO: This would be a fine place for angular
                        var e = $(
                          "<div><label>" +
                          title +
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
                          "<input type=\"checkbox\" " +
                          (value == "true" ? " checked=\"true\" " : "") + "\" value=\"" +
                          value + "\" />" + title + " </div>"
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

      var attributeList = $(".editable-attributes");

      attributeList.html("");

      var attributes = element.getEditableAttributes();

      attributes.forEach(function(attribute) {
        var definition = element.getAttributeDefinition(attribute);
        var uiElement = getAttributeUIElement(element, attribute, definition);
        attributeList.append(uiElement);
      });

      var editables = $(".editable-section");
      editables.show();
    };

    //Toggle customize
    $(document).on("mousedown",".customize-btn",function () {
      var section = $(this).closest(".selected").find('.editables-section').toggle();
      section.css("top",-1 * section.outerHeight() -2);
    });

    //Toggle the log
    $('.log-toggle').click(function () {
      if ($(this).hasClass('selected-button')) {
        $('.log-wrapper').removeClass('expanded');
        $('.container').removeClass('log-expanded');
        $(this).removeClass('selected-button');
      }
      else {
        $('.log-wrapper').addClass('expanded');
        $('.container').addClass('log-expanded');
        $(this).addClass('selected-button');
      }
    });

    //Generate or remove the channel menu
    $(document).on('mouseleave','.channel-visualisation',function(){
      $(this).find(".channel-menu").remove();
    });

    $('ul.tabs').each(function(){
      var $active, $content, $links = $(this).find('a');

      // If the location.hash matches one of the links, use that as the active tab.
      // If no match is found, use the first link as the initial active tab.
      $active = $($links.filter('[href="'+location.hash+'"]')[0] || $links[0]);
      $active.addClass('active-tab');
      $content = $($active.attr('href'));

      // Hide the remaining content
      $links.not($active).each(function () {
        $($(this).attr('href')).hide();
      });

      $(this).on('click', 'a', function(e){
        // Make the old tab inactive.
        $active.removeClass('active-tab');
        $content.hide();
        $active = $(this);
        $content = $($(this).attr('href'));
        $active.addClass('active-tab');
        $content.show();

        e.preventDefault();
      });
    });


    $(document).on('mouseover','.channel-visualisation',function(){
      var channelType;

      if($(this)[0].tagName == "LISTEN"){
        channelType = "subscription";
      } else {
        channelType = "broadcast";
      }

      //If there is no menu
      if($(this).find(".channel-menu").length === 0 && $(this).find(".channel").length > 0) {
        var menu = $(".channel-menu-template").clone();
        menu.removeClass("channel-menu-template");
        menu.addClass(channelType + "-menu");

        var channels = $(this).find(".channel");

        //Build out the Subscription Channels
        channels.each(function(key, channel){
          var subItem = menu.find(".channel-template").clone();
          subItem.removeClass("channel-template");
          var title = $(channel).attr("title");
          var color = $(channel).attr("color");
          subItem.attr("title",title);
          subItem.find(".chosen-color").attr("color",color);
          subItem.find(".color[color="+color+"]").addClass("ui-chosen-color");
          subItem.find(".channel-name").text(Inflector.titleize(Inflector.underscore(title)));
          menu.append(subItem);
        });
        menu.find(".channel-template").remove();
        $(this).append(menu);
        menu.addClass("menu-in");
        menu.css("margin-top",-1 * menu.outerHeight()/2 -1);
      }
    });

    //Channel Menu Label Click
    $(document).on("click", ".channel-menu label", function(){
      var menu = $(this).closest(".channel-menu");
      var color = $(this).find(".chosen-color").attr("color");
      var colorList = $(this).closest(".channel-option").find(".color-ui");
      menu.find("label").show();
      menu.find(".color-ui").hide();
      $(this).hide();
      colorList.find(".color").removeClass("ui-chosen-color");
      colorList.find(".color[color="+color+"]").addClass("ui-chosen-color");
      colorList.show();
    });

    //Subscription Menu Color Click
    $(document).on("click", ".channel-option .color", function(){

      var thisChannel = $(this).closest(".channel-option");
      var color = $(this).attr("color");
      $(this).closest(".channel-option").removeClass("disabled-subscription");

      if(color == "false"){
        $(this).closest(".channel-option").addClass("disabled-subscription");
      }
      var title = thisChannel.attr("title");
      thisChannel.find(".chosen-color").attr("color",color);
      thisChannel.find("label").show();
      // $(this).closest(".channel-visualisation").find(".channel-menu-toggle").removeClass("open-toggle");
      // $(this).closest(".channel-menu").remove();
      $(this).parent().hide();
    });
    function clearLog() {
      document.querySelector('.log .scroll').innerHTML = '';
      Ceci.log("New app, clean log.");
    }
    document.addEventListener('log', function(event) {
      try {
        var scroll = $('.log .scroll');
        var eltthum;
        if (event.detail.speaker) {
          eltthum = $("<a class='speaker' elementid='" + event.detail.speaker.id + "'>" + event.detail.speaker.localName.replace('app-', '') + "</a>");
          eltthum.on('click', function(elt) {
            var eltid = elt.currentTarget.getAttribute('elementid');
            var newelt = $("#" + eltid)[0];
            Ceci.elementWantsAttention(newelt);
            selectComponent($(newelt));
          });
        }
        var line = $('<li></li>');
        var channelthumb;
        if (event.detail.channel) {
          var channel = getChannelByChannelName(event.detail.channel);
          channelthumb = $("<span class='channel'></span>");
          channelthumb.css('backgroundColor', convertHex(channel.hex, 70));
        } else {
          channelthumb = $("<span class='channel'>&nbsp;</span>");
          channelthumb.css('backgroundColor', "#31353C");
        }
        line.append(channelthumb);
        var payload = $("<div class='payload new'/>");
        if (eltthum) payload.append(eltthum);
        payload.append(" <span class='message'>" + event.detail.message + "</span>");
        line.append(payload);
        scroll.append(line);
        payload.focus(); // needed for bg animation
        payload.removeClass('new');
        if (event.detail.severity == Ceci.LOG_WTF) {
          line.addClass('severity').addClass('wtf');
        }
        scroll[0].scrollTop = scroll[0].scrollHeight;
      } catch (e) {
        console.log(e);
        console.log(e.message);
      }
    });
    Ceci.log("AppMaker designer is ready.", "");

    var selectComponent = function(comp) {

      if(comp.find(".channel-menu").length === 0){
        $(".channel-menu:not('.channel-menu-template')").remove();
      }

      if(comp.find(".channel-chooser").length === 0){
        $(".channel-chooser").appendTo("body").hide();
      }

      //Clear out the listener since we're adding it again later
      //I'm not sure why we can't do this once somewhere
      selection.forEach(function(element) {
        $(document).off("click", ".color-ui .color", element.onColorSelectFunction);
      });

      if(comp[0] != selection[0]){
        clearSelection();
        selection.push(comp[0]);
        var event = new Event('onselectionchanged');
        document.dispatchEvent(event);
        setTimeout(function(){
          displayAttributes(comp[0]);
        },0);
      }

      var element = comp[0];
      var compId = element.id;

      comp.addClass("selected");

      moveToFront(comp);


      //Changes component channel
      var onColorSelectFunction = function () {

        var comp = $(this);

        var channel = {
          hex: comp.attr('value'),
          name: comp.attr('name'),
          title: comp.attr('title')
        };

        // change broadcast "color"
        if (comp.parents().hasClass('broadcast-menu')) {
          element.setBroadcastChannel(channel.name);
          displayBroadcastChannel(channel.name);
        }

        // change listening "color"
        else {
          var attribute = comp.closest(".subscription-option").attr("title");
          if(attribute) {
            element.setSubscription(channel.name, attribute);
            displayListenChannel(attribute);
          }

        }
      };

      // listen for color UI clicks

      $(document).on('click', '.color-ui .color', onColorSelectFunction);

      // give the element the function we just added, so we
      // can unbind it when the element gets unselected.
      element.onColorSelectFunction = onColorSelectFunction;

      var componentName = element.tagName.toLowerCase();
      $(".editable-section .name").text(componentName);

      //add mailbox info to right column
      /*
      $('.mailboxes').html('');

      for (var i=0; i < element.subscriptions.length; i++) {
        var channelProperty = element.subscriptions[i].listener;
        var mailboxColor = element.subscriptions[i].channel;
        var mailbox = $('<div class="mail"></div>').html(channelProperty).addClass(mailboxColor);
        $('.mailboxes').append(mailbox);
      }

      //add outgoing mail info to right column
      $('.outgoing-mail').html('');
      var mailColor = element.broadcastChannel;
      var outgoingMail = $('<div class="mail">Mail</div>').addClass(mailColor);
      $('.outgoing-mail').append(outgoingMail);*/
    };

    //shows component description
    var showComponentDescription = function (xPos, yPos, component, compDescription) {
      var componentDescription = $('<div class="component-description"></div>');
      componentDescription.css({top: yPos, left: xPos});
      componentDescription.text(compDescription);
      $(document.body).append(componentDescription);
    };

    $(document).on('mouseenter', '.info-btn', function () {
      var yPos = $(this).offset().top - 9 + 'px';
      var xPos = $(this).offset().left + 40 + 'px';
      var component = $(this).parents('.draggable').attr('value');
      var compDescription = $(this).parents('.draggable').attr('description');
      showComponentDescription(xPos, yPos, component, compDescription);
    }).on('mouseleave', '.info-btn', function () {
      $('.component-description').remove();
    });


    $('.new').click(function(){
      $('.card').remove();
      clearSelection();
      app.clear();
      clearLog();
    });

    $('.publish').click(function(){

      var html = '';
      var appTreeClone = document.querySelector('#flathead-app').cloneNode(true);
      var cards = appTreeClone.querySelectorAll('.ceci-card');
      var allElements = [];

      // XXXsecretrobotron: This is an unfortunate workaround for the lack of consistent <broadcast>/<listen>
      // support in ceci.
      // TODO: Fix ceci to twiddle <broadcast> and <listen> elements instead of fabricating them here.

      function collectComponentsFromContainer (container) {
        var elements = [];
        Array.prototype.forEach.call(container.children, function (child) {
          if (child.localName.indexOf('app-') === 0) {
            elements.push(child);
          }
        });
        return elements;
      }

      if (cards.length > 0) {
        Array.prototype.forEach.call(cards, function (card) {
          allElements = allElements.concat(collectComponentsFromContainer(card.querySelector('.fixed-top')))
            .concat(collectComponentsFromContainer(card.querySelector('.phone-canvas')))
            .concat(collectComponentsFromContainer(card.querySelector('.fixed-bottom')));
        });

        allElements.forEach(function (element) {
          var cloneElement = appTreeClone.querySelector('#' + element.id);
          var broadcast, listen;
          while (true) {
            broadcast = cloneElement.querySelector('broadcast');
            if (!broadcast) { break; }
            cloneElement.removeChild(broadcast);
          }
          while (true) {
            listen = cloneElement.querySelector('listen');
            if (!listen) { break; }
            cloneElement.removeChild(listen);
          }

          broadcast = document.createElement('broadcast');
          cloneElement.appendChild(broadcast);
          broadcast.innerHTML = '';
          broadcast.setAttribute('on', element.broadcastChannel);

          element.subscriptions.forEach(function (subscription) {
            if (subscription.channel !== 'false') {
              listen = document.createElement('listen');
              listen.setAttribute('on', subscription.channel);
              listen.setAttribute('for', subscription.listener);
              cloneElement.appendChild(listen);
            }
          });
        });
    
        html = appTreeClone.outerHTML;
      }

      $.ajax('/publish', {
        data: {
          html: html
        },
        type: 'post',
        success: function (data) {
          $(".publishdialog .failure").hide();
          $(".publishdialog .spinner").hide();
          $('.publish-url').html(data.install);
          $('.publish-url').attr('href', data.install);
          $('.modal-publish-link').html(data.install);
          $('.modal-publish-link').attr('href', data.install);
          $(".publishdialog .success").show();
          console.log('From publisher: ', data);
        },
        error: function (data) {
          $(".publishdialog .spinner").hide();
          $(".publishdialog .success").hide();
          if (data.responseJSON) {
            $(".failure .message").html(data.responseJSON.error.message);
          }
          else {
            $(".failure .message").html('Unexpected server error');
          }
          console.error('Error while publishing content:');
          console.error(data);
          $(".publishdialog .failure").show();
        }
      });
    });

    //Publish modal
    $('.publish').click(function () {
      $(".publishdialog .failure").hide();
      $(".publishdialog .success").hide();
      $(".publishdialog .spinner").show();
      $('.modal-wrapper').addClass('flex');
    });

    $('.return-btn').click(function () {
      $('.modal-wrapper').removeClass('flex');
    });

    // AMD module return
    return {
      Ceci: Ceci,
      App: Ceci.App
    };
  }
);
