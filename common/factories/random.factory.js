/**
 * @module randomFactory
 * @version 0.0.5
 */

app.factory('randomFactory', [function() {

   var Services = {
      generateId: _generateId,
      generateDrawingNumber: _generateDrawingNumber,
      generatePassword: _generatePassword
   };


   function _generateId(length) {
      length = length || 10;
      var ID = "",
         possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < length; i++) {
         ID += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return ("_" + ID);
   }


   function _generateDrawingNumber() {
      var ID = "",
         possible = "0123456789";

      for (var i = 0; i < 4; i++) {
         ID += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return ("RF - " + ID);
   }

   function _generatePassword(length) {
      /*
       * password-generator
       * Copyright(c) 2011-2015 Bermi Ferrer <bermi@bermilabs.com>
       * MIT Licensed
       */

      var localName, consonant, letter, password, vowel;
      letter = /[a-zA-Z]$/;
      vowel = /[aeiouAEIOU]$/;
      consonant = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ1234567890_()&=?!#+]$/;

      // Defines the name of the local variable the passwordGenerator library will use
      // this is specially useful if window.passwordGenerator is already being used
      // by your application and you want a different name. For example:

      // Declare before including the passwordGenerator library
      //  var localPasswordGeneratorLibraryName = 'pass';
      localName = window.localPasswordGeneratorLibraryName || "generatePassword";

      function getPassword(length, memorable, pattern, prefix) {

         var char = "",
            n, i, validChars = [];
         length = length || 10;
         memorable = memorable || true;
         pattern = pattern || /[\d\W\w\p]/;
         prefix = prefix || '';


         // Non memorable passwords will pick characters from a pre-generated
         // list of characters
         if (!memorable) {
            for (i = 33; 126 > i; i += 1) {
               char = String.fromCharCode(i);
               if (char.match(pattern)) {
                  validChars.push(char);
               }
            }

            if (!validChars.length) {
               throw new Error("Could not find characters that match the " +
                  "password pattern " + pattern + ". Patterns must match individual " +
                  "characters, not the password as a whole.");
            }
         }


         while (prefix.length < length) {
            if (memorable) {
               if (prefix.match(consonant)) {
                  pattern = vowel;
               } else {
                  pattern = consonant;
               }
               n = rand(33, 126);
               char = String.fromCharCode(n);
            } else {
               char = validChars[rand(0, validChars.length)];
            }

            if (memorable) {
               char = char.toLowerCase();
            }
            if (char.match(pattern)) {
               prefix = "" + prefix + char;
            }
         }
         return prefix;
      }


      function rand(min, max) {
         var key, value, arr = new Uint8Array(max);
         getRandomValues(arr);
         for (key in arr) {
            if (arr.hasOwnProperty(key)) {
               value = arr[key];
               if (value > min && value < max) {
                  return value;
               }
            }
         }
         return rand(min, max);
      }


      function getRandomValues(buf) {
         if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(buf);
         } else if (typeof window.msCrypto === "object" && typeof window.msCrypto.getRandomValues === 'function') {
            window.msCrypto.getRandomValues(buf);
         } else if (module.exports === password && typeof require !== "undefined") {
            var bytes = require("crypto").randomBytes(buf.length);
            buf.set(bytes);
         } else {
            throw new Error("No secure random number generator available.");
         }
      }


      return getPassword(length);

   }


   return Services;
}]);
