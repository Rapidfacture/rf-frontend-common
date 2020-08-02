/**
 * @module langFactory
 * @desc fetch language as json data from server, provide current language
 * @version 0.1.5
 *
 */

app.factory('langFactory', ['$http', '$q', '$rootScope', 'config', function ($http, $q, $rootScope, config) {

   var dictionary = {};

   config.globalSettings = config.globalSettings || {};

   var Services = {

      defaultLanguage: 'en',

      supportedLang: config.globalSettings.availableLanguages || ['en', 'de'],

      currentLang: null,

      languageSet: false,

      translate: _translate, // translates word in current language:    translate("wordToTranslate")
      // translates in other language:          translate("wordToTranslate", "en")

      getDictionary: _getDictionary,

      getCurrentDictionary: _getCurrentDictionary, // returns obj dictionary["en"]

      setLanguage: _setLanguage, // setLanguage("de")

      extendLang: _extendLang,

      initLanguage: _initLanguage,

      parseTemplateString: _parseTemplateString // parseTemplateString('Hello ${(gender == "m") ? "Mr." : "Ms."} Schmitz', {gender: 'm'})
   };


   function _parseTemplateString (string, data) {
      string = string || '';
      data = data || {};
      return string.replace(/\${(.*?)}/g, function (value, code) {
         var scoped = code.replace(/(["'.\w$]+)/g, function (match) {
            return /["']/.test(match[0]) ? match : 'scope.' + match;
         });
         try {
            /* eslint-disable-next-line */
            return new Function('scope', 'return ' + scoped)(data);
         } catch (e) { return ''; }
      });
   };

   function _translate (key, data, opts) {
      opts = opts || {};
      var lang = opts.language || Services.currentLang;

      var bestOtherTranslation = (dictionary.en && dictionary.en[key]) ? dictionary.en[key] : key;

      if (data) bestOtherTranslation = _parseTemplateString(bestOtherTranslation, data);


      if (!languageSupported(lang)) {
         return bestOtherTranslation;

      // translation available
      } else if (dictionary[lang] && dictionary[lang][key]) {
         if (data) {
            return _parseTemplateString(dictionary[lang][key], data);
         } else {
            return dictionary[lang][key];
         }

      // key not found
      } else if (dictionary[lang] && key) {
         // show missing translation
         console.log("error: lang key '" + key + "' does not exist");
         return bestOtherTranslation;

      // translation not fetched yet
      } else if (!translationFetched(lang)) {
         _fetch(lang);
         console.log("error: translation for lang.'" + lang + "' was not fetched yet");
         return bestOtherTranslation;
      }
   }


   function _getDictionary (lang) {
      if (translationFetched(lang)) {
         return dictionary[lang];
      } else {
         _fetch(lang);
      }
   }

   function _getCurrentDictionary () {
      return dictionary[Services.currentLang];
   }

   function _setLanguage (lang, callback) {
      callback = callback || function () {};
      _checkLanguage(lang, function (lang) {
         Services.currentLang = lang;
         Services.languageSet = true;
         $rootScope.$broadcast('languageSet', lang);
         callback(lang);
      });
   }


   function _initLanguage (lang) {
      // console.log('_initLanguage', lang);

      // 1. load main language
      _setLanguage(lang, function () {

         // 2. now fetch other languages
         loadNextLang();
      });

      var otherLangIndex = 0;
      var activeLangIndex = Services.supportedLang.indexOf(lang);
      var otherLanguages = Services.supportedLang.slice();
      otherLanguages.splice(activeLangIndex, 1); // remove current lang

      function loadNextLang () {
         _checkLanguage(otherLanguages[otherLangIndex], function () {
            otherLangIndex++;
            if (otherLanguages[otherLangIndex]) {
               setTimeout(function () {
                  loadNextLang();
               }, 100);
            }
         });
      }
   }

   function _checkLanguage (lang, callback) {
      callback = callback || function () {};


      if (translationFetched(lang)) {
         callback(lang);

      } else if (languageSupported(lang)) {
         // console.log("no data for " + lang + " in factory  =>  fetch from server");
         _fetch(lang,
            function (lang) { // then
               callback(lang);
            });

      // unsupported language => guess
      } else {

         // guess
         var guessedLang = _getFirstBrowserLanguage();

         // available or take default?
         guessedLang = languageSupported(guessedLang) ? guessedLang : Services.defaultLanguage;
         console.log('error language ' + lang + ' not supported, try to guess language: ', guessedLang);
         callback(guessedLang);
      }
   }

   function translationFetched (lang) {
      return dictionary[lang];
   }

   function languageSupported (lang) {
      return (Services.supportedLang.indexOf(lang) !== -1);
   }

   // merge a tranlation object into current dictionary
   function _extendLang (translations) { // translations: {"de": {...}, "en": {...}}

      // go through all translation languages
      for (var tanslationLang in translations) {
         // merge supported languages
         if (languageSupported(tanslationLang)) {
            if (dictionary[tanslationLang]) {
               _merge(dictionary[tanslationLang], translations[tanslationLang]);
               // console.log("merged lang " + tanslationLang)
            } // else: this language might not yet be fetched
         } else {
            console.log("[langFactory]:could not extend Lang '" + tanslationLang + "' because it is not supported, supported are: ", Services.supportedLang);
         }
      }
      // console.log("dictionary after _extendLang ", dictionary)
   }



   /* -------------------- helper functions ---------------------------- */


   function _merge (obj1, obj2) { // merge obj2 into obj1
      Object.assign(obj1, obj2);
      return obj1;
   }


   var retryCount = 0;
   function _fetch (lang, func) {
      if (!lang) return;
      $http.get('json/lang/' + lang + '.json').then(function (response) {
         if (typeof response.data === 'object') { // successfull fetch
            // merge config.translations into language file

            // TODO: exted original json with additional languale jsons dynamic

            var dict;
            if (config.translations) {
               dict = _merge(response.data, config.translations[lang]);
            } else {
               dict = response.data;
            }

            // store the data local in factory
            dictionary[lang] = dict;
            if (func) {
               func(lang);
            }
            $rootScope.$broadcast('languageFetched', lang);
         } else { // invalid response data: something went wrong
            retry(lang);
         }
      }, function () { // invalid http answer: something went wrong
         retry(lang);
      });

      function retry (lang) {
         retryCount++;
         if (retryCount < 2) {
            _fetch(lang); // retry
         }
      }
   }

   function _getFirstBrowserLanguage () {
      var nav = window.navigator,
         browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'],
         i,
         language = Services.defaultLanguage,
         match = Services.supportedLanguages;

      // HTML 5.1 "navigator.languages"
      if (Array.isArray(nav.languages)) {
         for (i = 0; i < nav.languages.length; i++) {
            language = convertLang(nav.languages[i]);
            if (language && language.length && (!match || match.indexOf(language) !== -1)) {
               break;
            }
         }
      } else {
         // other well known properties in browsers
         for (i = 0; i < browserLanguagePropertyKeys.length; i++) {
            language = convertLang(nav[browserLanguagePropertyKeys[i]]);
            if (language && language.length && (!match || match.indexOf(language) !== -1)) {
               break;
            }
         }
      }

      // prevent other languages, when no match
      if (match && match.indexOf(language) === -1) {
         console.log('language');
         language = match[0];
      }

      function convertLang (lang) {
         if (lang.indexOf('-') !== -1) {
            lang = lang.split('-')[0];
         }
         return lang.toLowerCase();
      }

      return language;
   }


   return Services;
}]);
