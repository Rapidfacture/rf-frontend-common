/** meta dialog directive
 * @desc Gloabal dialog box. Can be triggered from anywhere by event.
 * manages animated box and quit function
 *
 * @version 0.2.1
 *
 * place this in the index html:
 * <rf-modal></rf-modal>
 *
 * @example simple
 *  //                          type
 * $scope.$broadcast('modal', "about");
 *
 * @example complex
 *     //                       type        message      obj put in $scope.rfModal
 *     $scope.$emit('modal', "confirm", "removeDrawing", {onSuccess: function() {
 *              http.post('removedrawing', {
 *                  'data': $scope.drawing._id
 *              }, function(response) {
 *                  if (response.err) {
 *                      $scope.$emit("error", response.err);
 *                  }
 *                  $state.go('drawing.list');
 *              });
 *          }
 *      });
 *
 * @todo
 * own child scope for childeren, that can be destroyed
 * multiple modals
 */

app.directive('rfModal', ['$compile', '$timeout', '$rootScope', 'langFactory', function ($compile, $timeout, $rootScope, langFactory) {
   return {
      restrict: 'E', // attribute or element
      templateUrl: 'global/common/modal/mainModal/main.html',
      scope: true,
      link: function ($scope, elem, attr, ctrl) {
         $scope.visible = false; // init: hide modal

         // refesh language in scope
         $scope.lang = langFactory.getTranslations();
         $scope.$on('languageSet', function (meta, lang) { // reload on change
            $scope.lang = langFactory.getTranslations();
         });

         $rootScope.$on('modal', function (event, type, message, forwardObject) {
            // use keys in forwardObject:
            // onSuccess
            // beforeQuit
            // afterQuit
            // console.log(forwardObject);
            forwardObject = forwardObject || {};
            $scope.rfModal = forwardObject;
            $scope.rfModal.type = type || 'confirm';
            $scope.rfModal.message = langFactory.translate(message) || '';
            $scope.rfModal.headerText = forwardObject.headerText || '';
            $scope.rfModal.quit = function (callback) {
               callback = callback || function () {};
               if ($scope.rfModal.beforeQuit) {
                  $scope.rfModal.beforeQuit();
               }
               close(function () {
                  callback();
                  if ($scope.rfModal.afterQuit) {
                     $scope.rfModal.afterQuit();
                  }
               });
            };

            $scope.greyLayerClick = function () {
               if ($scope.rfModal.disableGreyLayerClose) {
                  $scope.showClosingInfo = true;
                  $timeout(function () {
                     $scope.showClosingInfo = false;
                  }, 1200);
               } else {
                  $scope.rfModal.quit();
               }
            };


            // press "ESC" to close modal
            document.onkeydown = function (event) {
               if (event.which === 27) {
                  $scope.rfModal.quit();
               }
            };

            function close (callback) {
               callback = callback || function () {};
               $scope.fade = false;
               $timeout(function () {
                  $scope.visible = false;
                  callback();
               }, 160);
            };

            var modalBody = elem.find('modal-body');
            modalBody.html('<rf-modal-' + $scope.rfModal.type + ' lang="lang" modal="rfModal"></rf-modal-' + $scope.rfModal.type + '>');
            $compile(elem.contents())($scope);

            // show dialohttpg
            $scope.visible = true;
            $timeout(function () {
               $scope.fade = true;
            }, 40);
         });
      }
   };
}]);
