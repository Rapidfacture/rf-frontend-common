app.directive('rfConfirm', ['$timeout', 'langFactory', '$rootScope', function ($timeout, langFactory, $rootScope) {
   return {
      restrict: 'E',
      templateUrl: 'global/common/modal/confirmStandalone/template.html',
      scope: true,
      link: function ($scope, elem, attr, ctrl) {
         $scope.visible = false; // init: hide modal
         $scope.rfModal = {};

         // refesh language in scope
         $scope.lang = langFactory.getTranslations();
         $scope.$on('languageSet', function (meta, lang) { // reload on change
            $scope.lang = langFactory.getTranslations();
         });

         $rootScope.$on('confirm', function (event, message, forwardObject) {
            // use keys in forwardObject:
            // onSuccess
            // beforeQuit
            // afterQuit
            // console.log(forwardObject);
            message = message || 'reallyContinue';
            forwardObject = forwardObject || {};
            $scope.rfModal = forwardObject;
            $scope.rfModal.message = langFactory.translate(message) || '';
            $scope.rfModal.headerText = forwardObject.headerText || '';
            $scope.rfModal.quit = function (callback) {
               callback = callback || function () {};
               if ($scope.rfModal.beforeQuit) {
                  $scope.rfModal.beforeQuit();
               }
               $scope.rfModal.close(function () {
                  callback();
                  if ($scope.rfModal.afterQuit) {
                     $scope.rfModal.afterQuit();
                  }
               });
            };

            // press "ESC" to close modal
            document.onkeydown = function (event) {
               if (event.which === 27) {
                  $scope.rfModal.quit();
               }
            };

            $scope.rfModal.close = function (callback) {
               callback = callback || function () {};
               $scope.fade = false;
               $timeout(function () {
                  $scope.visible = false;
                  callback();
               }, 160);
            };

            // show dialohttpg
            $scope.visible = true;
            $timeout(function () {
               $scope.fade = true;
            }, 40);
         });
      }
   };
}]);
