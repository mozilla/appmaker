/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(
  ["designer/utils", "ceci/ceci-designer"],
  function(Util, Ceci) {
    "use strict";

    var knownComponents = [];

    function addComponentsFromRegistry () {
      var trayComponentContainer = document.getElementById('components');

      Ceci.forEachComponent(function (name, component) {

        // Avoid adding components that are already in the tray
        if (trayComponentContainer.querySelector('designer-component-tray-item[name="' + name + '"]')) return;

        var item = document.createElement('designer-component-tray-item');
        var meta;

        // This part is ugly. Reach into CustomElements and pull out a <template>.

        try {
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = component.ctor.prototype.element.querySelector('template').innerHTML.replace(/&quot;/g, '"');
          meta = JSON.parse(tempDiv.querySelector('script#ceci-definition').innerText);
        }
        catch (e) {
          meta = null;
        }

        if (!meta) {
          throw new TypeError("Ceci component, \"" + name + "\" is lacking ceci definitions. Likely it shouldn't be returned from ceci-designer.");
        }

        item.setAttribute('name', name);
        item.setAttribute('thumbnail', meta.thumbnail);
        item.setAttribute('label', Util.prettyName(name));

        item.setAttribute('description', meta.description);
        item.setAttribute('author', meta.author);
        item.setAttribute('updatedat', meta.updatedAt);

        item.addEventListener('click', function (e) {
          var card = document.querySelector('ceci-card[visible]');

          if (card) {
            var newElement = document.createElement(name);
            card.appendChild(newElement);
            window.dispatchEvent(new CustomEvent(
              'CeciElementAdded',
              {
                bubbles: true,
                detail: newElement
              }
            ));
          }
        }, false);

        trayComponentContainer.appendChild(item);
      });
    }

    // Load elements that might exist already, but also wait for WebComponentsReady in case
    // we load this module early.
    window.addEventListener('WebComponentsReady', addComponentsFromRegistry, false);
    addComponentsFromRegistry();
  }
);


