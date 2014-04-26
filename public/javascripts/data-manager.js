/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([], function() {
  window.CeciData = window.CeciData || {};
  function checkFirebase(callback) {
    var ca = document.querySelector("ceci-app");
    if(!ca){
      var self = this;
      window.addEventListener("CeciDataConnectionLoaded", function(e){
        self.ca = document.querySelector("ceci-app");
        callback(self.ca);
      });
    } else {
      if(ca.firebase){
        callback(ca);
      } else {
        //ceci-app available but firebase not up yet
        window.addEventListener("CeciDataConnectionLoaded", function(e){
          var ca = document.querySelector("ceci-app");
          callback(ca);
        });
      }
    }
  }

  //if (!window.CeciData.collections) {
    function fieldObserver(added, removed, changed, getOldValueFn) {
      // We need to find the label and input based on the old value,
      // then update it to the new value.
      //checkFirebase( function(ca) {
        var oldValue = getOldValueFn("name");
        var detail = {"name": changed.name, oldName: oldValue};
        document.dispatchEvent(new CustomEvent('dataFieldNameChanged', {"detail":detail}));
      //});
    }
    function modelObserver(original) {
      return function(splices) {
        splices.forEach(function(splice) {
          if (splice.addedCount) {
            //checkFirebase( function(ca) {
              for (var i = 0; i < splice.addedCount; i++) {
                var added = original[splice.index+i];
                var detail = {"field": added};
                new ObjectObserver(added).open(fieldObserver);
                document.dispatchEvent(new CustomEvent('dataFieldAdded', {"detail":detail}));
              }
            //});
          } else {
            //checkFirebase( function(ca) {
              splice.removed.forEach(function(remove) {
                var detail = {"field": remove};
                var customEvent = new CustomEvent('dataFieldRemoved', {"detail":detail});
                document.dispatchEvent(customEvent);
              });
            //});
          }
        });
      };
    }
    function collectionObserver(splices) {
      splices.forEach(function(splice) {
        if (splice.addedCount) {
          //checkFirebase( function(ca) {
            for (var i = 0; i < splice.addedCount; i++) {
              var added = window.CeciData.collections[splice.index+i];
              var detail = {"collection": added};
              new ArrayObserver(added.model).open(modelObserver(added.model));
              document.dispatchEvent(new CustomEvent('dataCollectionAdded', {"detail":detail}));
            }
          //});
        } else {
          splice.removed.forEach(function(remove) {
            //checkFirebase( function(ca) {
              var detail = {"collection": remove};
              var customEvent = new CustomEvent('dataCollectionRemoved', {"detail":detail});
              document.dispatchEvent(customEvent);
            //});
          });
        }
      });
    }
    window.CeciData.collections = [];
    //new ArrayObserver(window.CeciData.collections).open(collectionObserver);
  //}

  return {
    on: function(event, listener) {
      document.addEventListener(event, listener);
    },
    off: function(event, listener) {
      document.removeEventListener(event, listener);
    },
    saveData: function() {
      checkFirebase(function(ca) {
        ca.setFirebaseObject('form-data',  window.CeciData);
        //ca.setFirebaseObject('form-data',  {});
      });
    },
    initData: function() {
      checkFirebase(function(ca) {
        ca.getFirebaseObject('form-data',"", function(data){
          window.CeciData.collections = [];
          new ArrayObserver(window.CeciData.collections).open(collectionObserver);
          if (data && data.collections.length) {
            window.CeciData.collections.push(data.collections[0]);
          } else {
            window.CeciData.collections.push({
              name: "",
              model: [],
              data: []
            });
          }
          // Data is ready, and events can start to listen for changes.
          var customEvent = new CustomEvent('dataCollectionReady');
          document.dispatchEvent(customEvent);
        });
      });
    }
  };
});
