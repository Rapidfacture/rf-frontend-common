/**
 * @module langFactory
 * @desc fetch language as json data from server, provide current language
 * @version 1.0.0
 *
 */

app.factory('langFactory', ['$http', '$q', '$rootScope', 'config', function ($http, $q, $rootScope, config) {

   config.globalSettings = config.globalSettings || {};

   var translations = {};

   var Services = {

      // translate one key
      translate: _translate,
      // translate word in current language:    translate("wordToTranslate")
      // translate in other language:           translate("wordToTranslate", "en")

      parseTemplateString: _parseTemplateString,
      // parseTemplateString('Hello ${(gender == "m") ? "Mr." : "Ms."} Schmitz', {gender: 'm'})

      // get translation keys
      getTranslations: getTranslations,
      // getTranslations() => current translations
      // getTranslations('de') => specific translations

      // variables
      supportedLang: config.globalSettings.availableLanguages || ['en', 'de'],
      defaultLanguage: 'en',
      currentLang: null,

      // set translations
      setLanguage: _setLanguage, // setLanguage("de")
      initLanguage: _initLanguage, // load all languages
      languageSet: false, // true after a language was set the first itme
      extendLang: _extendLang

   };


   function _translate (key, data, opts) {
      opts = opts || {};
      var lang = opts.language || Services.currentLang;

      if (!languageSupported(lang)) {
         return getBestOtherTranslation(key, data);

      // translation available
      } else if (translations[lang] && translations[lang][key]) {
         return _parseTemplateString(translations[lang][key], data);

      // lang there, but not key
      } else if (translations[lang] && key) {
         // show missing translation
         console.log("error: lang key '" + key + "' does not exist");
         return getBestOtherTranslation(key, data);

      // translation not fetched yet
      } else if (!translationFetched(lang)) {
         _fetch(lang);
         console.log("error: translation for lang.'" + lang + "' was not fetched yet");
         return getBestOtherTranslation(key, data);
      }
   }


   function _parseTemplateString (string, data) {
      string = string || '';

      if (!data) return string;

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


   function getTranslations (lang) {
      lang = lang || Services.currentLang; // current language if unset
      if (translationFetched(lang)) {
         return translations[lang];
      } else {
         _fetch(lang);
      }
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


   // merge a tranlation object into current translations
   function _extendLang (newTranslations) { // translations: {"de": {...}, "en": {...}}

      // go through all translation languages
      for (var tanslationLang in newTranslations) {
         // merge supported languages
         if (languageSupported(tanslationLang)) {

            // init if not fetched yet
            translations[tanslationLang] = translations[tanslationLang] || {};

            _merge(translations[tanslationLang], newTranslations[tanslationLang]);
         } else {
            console.log("[langFactory]:could not extend Lang '" + tanslationLang + "' because it is not supported, supported are: ", Services.supportedLang);
         }
      }
      // console.log("translations after _extendLang ", translations)
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

   var retryCount = 0;
   function _fetch (lang, callback) {
      if (!lang) return;
      $http.get('json/lang/' + lang + '.json').then(function (response) {
         if (typeof response.data === 'object') { // successfull fetch

            // add translation keys
            translations[lang] = translations[lang] || {};
            _merge(translations[lang], response.data);

            // add missing keys from default language
            if (lang !== Services.defaultLanguage) {
               var defaultTrans = getDefaultTranslations();

               for (var key in defaultTrans) {
                  if (!translations[lang][key]) {
                     translations[lang][key] = defaultTrans[key];
                  }
               }
            }

            $rootScope.$broadcast('languageFetched', lang);
            if (callback) callback(lang);

         } else { // invalid response data: something went wrong
            retry(lang);
         }
      }, function () { // invalid http answer: something went wrong
         retry(lang);
      });

      function retry (lang) {
         retryCount++;
         if (retryCount < 2) {
            _fetch(lang, callback); // retry
         }
      }
   }

   /* -------------------- helper functions ---------------------------- */
   function _merge (obj1, obj2) { // merge obj2 into obj1
      obj1 = obj1 || {};
      obj2 = obj2 || {};
      Object.assign(obj1, obj2);
      return obj1;
   }

   function translationFetched (lang) {
      return translations[lang];
   }

   function languageSupported (lang) {
      return (Services.supportedLang.indexOf(lang) !== -1);
   }

   function getBestOtherTranslation (key, data) {
      var defaultTrans = getDefaultTranslations();
      if (defaultTrans && defaultTrans[key]) {
         return _parseTemplateString(translations.en[key], data);
      } else {
         return key;
      }
   }

   function getDefaultTranslations (lang) {
      return translations[Services.defaultLanguage];
   }

   function _checkLanguage (lang, callback) {
      callback = callback || function () {};

      if (translationFetched(lang)) {
         callback(lang);

      } else if (languageSupported(lang)) {
         // console.log("no data for " + lang + " in factory  =>  fetch from server");
         _fetch(lang, callback);

      // unsupported language => guess
      } else {

         var guessedLang = _getFirstBrowserLanguage();

         // available or take default?
         guessedLang = languageSupported(guessedLang) ? guessedLang : Services.defaultLanguage;
         console.log('error language ' + lang + ' not supported, try to guess language: ', guessedLang);
         callback(guessedLang);
      }
   }


   return Services;
}]);
