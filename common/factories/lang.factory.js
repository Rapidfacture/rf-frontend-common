/**
 * @module langFactory
 * @desc fetch language as json data from server, provide current language
 * @version 1.0.2
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

      getFirstBrowserLanguage: _getFirstBrowserLanguage,

      // legacyCode - TODO: remove in 2021 or 2022; currently used in thermorouter, cad, maybe srs
      getCurrentDictionary: getTranslations,
      getDictionary: getTranslations,


      // variables
      supportedLang: config.globalSettings.availableLanguages || ['en', 'de'],
      defaultLanguage: 'en',
      currentLang: null,

      // set translations
      setLanguage: _setLanguage, // setLanguage("de")
      initLanguage: _initLanguage, // load all languages
      languageSet: false // true after a language was set the first item
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

      // Advantage of this structure:
      // - No globals
      // - Replaces word by word
      // - More reliable as no undefined could interrupt parsing

      // 1. Find all string elements to replace
      return string.replace(/\${(.*?)}/g, function (value, code) {
         // 2. Find and extend all keys with scope. for parsing function
         var scoped = code.replace(/(["'.\w\\$]+)/g, function (match) {
            return /["'\\+]/.test(match[0]) ? match : 'scope.' + match;
         });

         // 3. Parse scoped
         try {
            /* eslint-disable-next-line */
            return new Function('scope', 'return ' + scoped + ' || ""')(data);
         } catch (e) { return ''; }
      });
   }



   function getTranslations (lang, callback) {
      callback = callback || function () {};
      lang = lang || Services.currentLang; // current language if unset
      if (translationFetched(lang)) {
         callback(translations[lang]);
         return translations[lang];
      } else {
         _fetch(lang, function () {
            callback(translations[lang]);
         });
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

      var otherLangIndex = 0;
      var activeLangIndex = Services.supportedLang.indexOf(lang);
      var otherLanguages = Services.supportedLang.slice();
      otherLanguages.splice(activeLangIndex, 1); // remove current lang

      // 1. load main language
      _setLanguage(lang, function () {

         // 2. now fetch other languages
         loadNextLang();
      });

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

   function _fetch (langKey, callback) {
      if (!langKey) return;
      var split = langKey.split('-');
      var lang = split[0];
      var locale = split[1];

      var newLang = {};

      getEnglish();

      function getEnglish () {
         if ('en' in translations) {
            newLang = JSON.parse(JSON.stringify(translations.en));
            getLanguage();

         } else {
            getTranslationFile('en', function (result) {
               newLang = JSON.parse(JSON.stringify(result));
               if (langKey !== 'en') translations.en = result;

               $rootScope.$broadcast('languageFetched', langKey);

               getLanguage();
            });
         }
      }

      function getLanguage () {
         if (lang in translations) {
            newLang = JSON.parse(JSON.stringify(translations[lang]));
            getLocale();

         } else {
            getTranslationFile(lang, function (result) {
               Object.assign(newLang, result);
               $rootScope.$broadcast('languageFetched', langKey);

               getLocale();
            });
         }
      }

      function getLocale () {
         if (locale) {
            getTranslationFile(langKey, function (result) {
               Object.assign(newLang, result);
               $rootScope.$broadcast('languageFetched', langKey);

               translations[langKey] = newLang;
               if (callback) callback(langKey);
            });

         } else {
            translations[langKey] = newLang;
            if (callback) callback(lang);
         }
      }

      var retryCount = 0;
      function getTranslationFile (lang, callback) {
         var source = (lang.split('-').length === 1 ? 'json/lang/' : 'json/locale/');

         $http.get(source + lang + '.json').then(function (response) {
            if (typeof response.data === 'object') { // successfull fetch
               if (callback) callback(response.data);

            } else { // invalid response data: something went wrong
               retry(lang);
            }
         }, function () { // invalid http answer: something went wrong
            retry(lang);
         });

         function retry (lang) {
            retryCount++;
            if (retryCount < 2) {
               getTranslationFile(lang, callback); // retry
            }
         }
      }
   }

   /* -------------------- helper functions ---------------------------- */
   function getDefaultTranslations (lang) {
      return translations[Services.defaultLanguage];
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
