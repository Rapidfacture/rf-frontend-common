/**
 * @module langFactory
 * @desc fetch language as json data from server, provide current language
 * @version 2.0.0
 *
 */

app.factory('langFactory', function ($http, $q, $rootScope, config) {
   config.globalSettings = config.globalSettings || {};

   var Services = {

      // translate one key
      translate: translate,
      // translate word in current language:    translate("wordToTranslate")
      // translate in other language:           translate("wordToTranslate", "en")

      // get translation keys
      getTranslations: getTranslations,
      // getTranslations() => current translation object
      // getTranslations('de') => specific translation object

      // set translations
      setLanguage: setLanguage, // setLanguage("de")
      initLanguage: initLanguage, // load all languages

      getFirstBrowserLanguage: getFirstBrowserLanguage,

      // variables
      supportedLang: config.globalSettings.availableLanguages || ['en', 'de'],
      defaultLanguage: 'en',
      currentLang: null,
      languageSet: false, // true after a language was set the first item
      allTranslations: { } // all translations stored by language
   };


   function translate (key, data, opts) {
      opts = opts || {};
      var lang = opts.language || Services.currentLang;
      var t = Services.allTranslations;

      if (!languageSupported(lang)) {
         return getBestOtherTranslation(key, data);

      // translation available
      } else if (t[lang] && t[lang][key]) {
         return parseTemplateString(t[lang][key], data);

      // lang there, but not key
      } else if (t[lang] && key) {
         // show missing translation
         console.log("error: lang key '" + key + "' does not exist");
         return getBestOtherTranslation(key, data);

      // translation not fetched yet
      } else if (!translationFetched(lang)) {
         fetch(lang);
         console.log("error: translation for lang.'" + lang + "' was not fetched yet");
         return getBestOtherTranslation(key, data);
      }
   }


   function getTranslations (lang, callback) {
      callback = callback || function () {};
      var t = Services.allTranslations;
      lang = lang || Services.currentLang; // current language if unset
      if (translationFetched(lang)) {
         callback(t[lang]);
         return t[lang];
      } else {
         fetch(lang, function () {
            callback(t[lang]);
         });
      }
   }


   function setLanguage (lang, callback) {
      callback = callback || function () {};
      checkLanguage(lang, function (lang) {
         Services.currentLang = lang;
         Services.languageSet = true;
         $rootScope.$broadcast('languageSet', lang);
         callback(lang);
      });
   }


   function initLanguage (lang) {
      // console.log('initLanguage', lang);

      var otherLangIndex = 0;
      var activeLangIndex = Services.supportedLang.indexOf(lang);
      var otherLanguages = Services.supportedLang.slice();
      otherLanguages.splice(activeLangIndex, 1); // remove current lang

      // 1. load main language
      setLanguage(lang, function () {

         // 2. now fetch other languages
         loadNextLang();
      });

      function loadNextLang () {
         checkLanguage(otherLanguages[otherLangIndex], function () {
            otherLangIndex++;
            if (otherLanguages[otherLangIndex]) {
               setTimeout(function () {
                  loadNextLang();
               }, 100);
            }
         });
      }
   }


   function getFirstBrowserLanguage () {
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


   /* -------------------- fetch language file function ---------------------------- */
   function fetch (langKey, callback) {
      if (!langKey) return;
      var split = langKey.split('-');
      var lang = split[0];
      var locale = split[1];
      var translations = Services.allTranslations;

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
   function parseTemplateString (string, data) {
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

   function getDefaultTranslations (lang) {
      return Services.allTranslations[Services.defaultLanguage];
   }

   function translationFetched (lang) {
      return Services.allTranslations[lang];
   }

   function languageSupported (lang) {
      return (Services.supportedLang.indexOf(lang) !== -1);
   }

   function getBestOtherTranslation (key, data) {
      var defaultTrans = getDefaultTranslations();
      if (defaultTrans && defaultTrans[key]) {
         return parseTemplateString(Services.allTranslations.en[key], data);
      } else {
         return key;
      }
   }

   function checkLanguage (lang, callback) {
      callback = callback || function () {};

      if (translationFetched(lang)) {
         callback(lang);

      } else if (languageSupported(lang)) {
         // console.log("no data for " + lang + " in factory  =>  fetch from server");
         fetch(lang, callback);

      // unsupported language => guess
      } else {

         var guessedLang = getFirstBrowserLanguage();

         // available or take default?
         guessedLang = languageSupported(guessedLang) ? guessedLang : Services.defaultLanguage;
         console.log('error language ' + lang + ' not supported, try to guess language: ', guessedLang);
         callback(guessedLang);
      }
   }


   return Services;
});
