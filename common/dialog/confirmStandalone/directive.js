app.directive('rfConfirm', ['$timeout', 'langFactory', '$rootScope', function ($timeout, langFactory, $rootScope) {
   return {
      restrict: 'E',
      templateUrl: 'global/common/dialog/confirmStandalone/template.html',
      scope: true,
      link: function ($scope, elem, attr, ctrl) {
         $scope.visible = false; // init: hide dialog
         $scope.rfDialog = {};

         // refesh language in scope
         $scope.lang = langFactory.getTranslations();
         $scope.$on('languageSet', function (meta, lang) { // reload on change
            $scope.lang = langFactory.getTranslations();
         });


         // @example: $scope.$emit('reallyDelete', function () { });
         $rootScope.$on('reallyDelete', function (event, successFunction) {
            dialogFunction(event, 'reallyDelete', { onSuccess: successFunction});
         });

         // @example: $scope.$emit('confirm', function () { });
         // @example: $scope.$emit('confirm', 'areYouSure', function () { });
         $rootScope.$on('confirm', function (event, message, successFunction, failureFunction) {
            var opts = {};

            if (typeof message === 'function') {
               successFunction = message;
               message = 'reallyContinue';
            }

            if (typeof successFunction === 'function') {
               opts = { onSuccess: successFunction };
            } else {
               opts = successFunction;
            }

            if (failureFunction) opts.onFailure = failureFunction;

            dialogFunction(event, message, opts);
         });

         function dialogFunction (event, message, forwardObject) {
            // use keys in forwardObject:
            // onSuccess
            // beforeQuit
            // afterQuit
            // console.log(forwardObject);
            message = message || 'reallyContinue';
            forwardObject = forwardObject || {};
            $scope.rfDialog = forwardObject;
            $scope.rfDialog.message = langFactory.translate(message) || '';
            $scope.rfDialog.headerText = forwardObject.headerText || '';
            $scope.rfDialog.quit = function (callback) {
               callback = callback || function () {};
               if ($scope.rfDialog.beforeQuit) {
                  $scope.rfDialog.beforeQuit();
               }
               $scope.rfDialog.close(function () {
                  callback();
                  if ($scope.rfDialog.afterQuit) {
                     $scope.rfDialog.afterQuit();
                  }
               });
            };

            // press "ESC" to close dialog
            document.onkeydown = function (event) {
               if (event.which === 27) {
                  $scope.rfDialog.quit();
               }
            };

            $scope.rfDialog.close = function (callback) {
               callback = callback || function () {};
               $scope.fade = false;
               $timeout(function () {
                  $scope.visible = false;
                  callback();
               }, 160);
            };

            // show dialog
            $scope.visible = true;
            $timeout(function () {
               $scope.fade = true;
               if ($scope.autofocus) $scope.autofocus();
            }, 40);
         }



      }
   };
}]);
